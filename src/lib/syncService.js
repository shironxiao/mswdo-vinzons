import { supabase } from './supabase.js';
import {
  db,
  isOnline,
  getPendingMutations,
  removePendingMutation,
  markPendingMutationFailed,
  getPendingMutationsCount,
  getSyncMeta,
  setSyncMeta,
  notifySyncQueueChanged,
  SYNC_QUEUE_EVENT,
} from './offlineDb.js';
import { normalizeHousehold } from './householdService.js';
import { normalizeMonitoringLog } from './monitoringService.js';

let isSyncing = false;
let lastSyncError = null;

const SYNC_STATE_EVENT = 'vinzons-sync-state-changed';

function notifySyncState() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SYNC_STATE_EVENT));
  }
}

/**
 * Push pending local mutations to Supabase in FIFO order
 */
export async function flushPendingMutations() {
  if (!isOnline()) return { flushed: 0, pending: await getPendingMutationsCount() };

  const pendingList = await getPendingMutations();
  if (pendingList.length === 0) return { flushed: 0, pending: 0 };

  let flushedCount = 0;

  for (const item of pendingList) {
    try {
      const { type, payload } = item;

      if (type === 'CREATE_HOUSEHOLD') {
        // 1. Resolve room if needed
        let roomId = payload.roomId || null;
        if (payload.centerId && payload.room && payload.room !== 'Unassigned' && !roomId) {
          const { data: existingRoom } = await supabase
            .from('rooms')
            .select('id')
            .eq('center_id', payload.centerId)
            .eq('room_name', payload.room)
            .maybeSingle();

          if (existingRoom) {
            roomId = existingRoom.id;
          } else {
            const { data: newRoom } = await supabase
              .from('rooms')
              .insert({ center_id: payload.centerId, room_name: payload.room, capacity_individuals: 30 })
              .select('id')
              .maybeSingle();
            if (newRoom) roomId = newRoom.id;
          }
        }

        // 2. Insert into Supabase
        const { data: insertedH, error: hError } = await supabase
          .from('households')
          .insert({
            household_code: payload.householdCode,
            head_name: payload.head,
            head_age: Number(payload.age) || 35,
            head_sex: payload.sex || 'Male',
            head_occupation: payload.headOccupation || null,
            barangay: payload.barangay || 'Unassigned',
            purok: payload.purok || 'Unassigned',
            evacuee_status: payload.centerId ? 'Active' : 'Decamped',
            vulnerabilities: Array.isArray(payload.vulnerabilities) ? payload.vulnerabilities : [],
            center_id: payload.centerId || null,
            room_id: roomId,
            stub_code: payload.stubCode,
            stub_issued: Boolean(payload.stubIssued),
            stub_issued_at: payload.stubIssued ? new Date().toISOString() : null,
          })
          .select()
          .single();

        if (hError) throw hError;

        // Upsert household profile
        await supabase.from('household_profiles').upsert(
          {
            household_id: insertedH.id,
            monthly_income: payload.monthlyIncome ? Number(payload.monthlyIncome) : null,
            has_worked_dole: payload.hasWorkedDole ?? null,
            dole_employment_year: payload.doleEmploymentYear ? Number(payload.doleEmploymentYear) : null,
            has_received_government_assistance: payload.hasReceivedGovernmentAssistance ?? null,
            gov_assistance_availed: Array.isArray(payload.govAssistanceAvailed) ? payload.govAssistanceAvailed : [],
            government_assistance_year: payload.governmentAssistanceYear ? Number(payload.governmentAssistanceYear) : null,
            has_received_relief_assistance: payload.hasReceivedReliefAssistance ?? null,
            other_income_source: payload.otherIncomeSource || null,
            flood_depth_level: payload.floodDepthLevel || null,
            characteristics_remarks: payload.characteristicsRemarks || null,
          },
          { onConflict: 'household_id' }
        );

        // Members insert
        if (Array.isArray(payload.members) && payload.members.length > 0) {
          const membersWithNames = payload.members.filter((m) => m && m.name && m.name.trim());
          const memberRows = membersWithNames.map((m) => ({
            household_id: insertedH.id,
            full_name: m.name.trim(),
            age: Number(m.ageValue ?? m.age) || 0,
            age_value: Number(m.ageValue ?? m.age) || 0,
            age_unit: m.ageUnit || 'Years',
            sex: m.sex || 'Female',
            relationship_to_head: m.relationship || 'MEMBER',
            occupation: m.occupation || null,
            is_household_head: false,
            vulnerabilities: Array.isArray(m.vulnerabilities) ? m.vulnerabilities : [],
          }));

          if (memberRows.length > 0) {
            await supabase.from('household_members').insert(memberRows);
          }
        }

        // Update local Dexie record to replace temp id with server id
        if (payload.tempId) {
          await db.households.delete(payload.tempId);
        }
        await db.households.put({
          id: insertedH.id,
          householdCode: insertedH.household_code,
          headName: insertedH.head_name,
          age: insertedH.head_age,
          sex: insertedH.head_sex,
          occupation: insertedH.head_occupation,
          barangay: insertedH.barangay,
          purok: insertedH.purok,
          centerId: insertedH.center_id,
          roomId: insertedH.room_id,
          evacueeStatus: insertedH.evacuee_status,
          stubIssued: insertedH.stub_issued,
          stubCode: insertedH.stub_code,
          updatedAt: new Date().toISOString(),
        });
      } else if (type === 'ISSUE_STUB') {
        const { householdId, stubCode, issuedAt, issuedBy, eventId } = payload;
        await supabase
          .from('households')
          .update({
            stub_code: stubCode,
            stub_issued: true,
            stub_issued_at: issuedAt,
            updated_at: issuedAt,
          })
          .eq('id', householdId);

        await supabase.from('relief_goods_stubs').insert({
          household_id: householdId,
          event_id: eventId || null,
          stub_code: stubCode,
          stub_issued: true,
          stub_issued_at: issuedAt,
          stub_issued_by: issuedBy || 'MSWDO Staff',
        });

        // Update local Dexie
        const localHH = await db.households.get(householdId);
        if (localHH) {
          await db.households.update(householdId, {
            stubIssued: true,
            stubCode,
            updatedAt: issuedAt,
          });
        }
      } else if (type === 'TRANSFER_ROOM') {
        const { householdId, centerId, roomId, roomName, eventId } = payload;
        let resolvedRoomId = roomId;
        if (!resolvedRoomId && roomName) {
          const { data: existingRoom, error: roomLookupErr } = await supabase
            .from('rooms')
            .select('id')
            .eq('center_id', centerId)
            .eq('room_name', roomName)
            .maybeSingle();
          if (roomLookupErr) throw roomLookupErr;
          if (existingRoom) {
            resolvedRoomId = existingRoom.id;
          } else {
            const { data: newRoom, error: createRoomErr } = await supabase
              .from('rooms')
              .insert({ center_id: centerId, room_name: roomName, capacity_individuals: 30 })
              .select('id')
              .single();
            if (createRoomErr) throw createRoomErr;
            resolvedRoomId = newRoom.id;
          }
        }

        const now = new Date().toISOString();
        let placementQuery = supabase
          .from('room_placements')
          .update({
            center_id: centerId,
            room_id: resolvedRoomId,
            status: 'Evacuated',
          })
          .eq('household_id', householdId)
          .eq('status', 'Evacuated');

        if (eventId && eventId !== 'default-active-event') {
          placementQuery = placementQuery.eq('event_id', eventId);
        }

        const { data: updatedPlacements, error: placementErr } = await placementQuery.select('id');
        if (placementErr) throw placementErr;

        if (!updatedPlacements || updatedPlacements.length === 0) {
          const { error: insertPlacementErr } = await supabase
            .from('room_placements')
            .insert({
              household_id: householdId,
              center_id: centerId,
              room_id: resolvedRoomId,
              event_id: eventId && eventId !== 'default-active-event' ? eventId : null,
              status: 'Evacuated',
              check_in_at: now,
            });
          if (insertPlacementErr) throw insertPlacementErr;
        }

        const { error: hhUpdateErr } = await supabase
          .from('households')
          .update({
            center_id: centerId,
            room_id: resolvedRoomId,
            evacuee_status: 'Active',
            updated_at: now,
          })
          .eq('id', householdId);
        if (hhUpdateErr) throw hhUpdateErr;

        const localHH = await db.households.get(householdId);
        if (localHH) {
          await db.households.update(householdId, {
            centerId,
            roomId: resolvedRoomId,
            room: roomName || localHH.room,
            evacueeStatus: 'Active',
            status: 'Evacuated',
            updatedAt: now,
          });
        }
      } else if (type === 'UPDATE_HOUSEHOLD') {
        const { id, formData, preservePlacement } = payload;
        const now = new Date().toISOString();
        const centerId = formData.centerId || null;
        let roomId = null;

        if (!preservePlacement && centerId && formData.room && formData.room !== 'Unassigned') {
          const { data: existingRoom } = await supabase
            .from('rooms')
            .select('id')
            .eq('center_id', centerId)
            .eq('room_name', formData.room)
            .maybeSingle();
          if (existingRoom) {
            roomId = existingRoom.id;
          } else {
            const { data: newRoom } = await supabase
              .from('rooms')
              .insert({ center_id: centerId, room_name: formData.room, capacity_individuals: 30 })
              .select('id')
              .maybeSingle();
            if (newRoom) roomId = newRoom.id;
          }
        }

        const updatePayload = {
          head_name: formData.head,
          head_age: Number(formData.age) || 35,
          head_sex: formData.sex || 'Male',
          head_occupation: formData.headOccupation || null,
          barangay: formData.barangay || 'Unassigned',
          purok: formData.purok || 'Unassigned',
          vulnerabilities: Array.isArray(formData.vulnerabilities) ? formData.vulnerabilities : [],
          updated_at: now,
        };
        if (!preservePlacement) {
          updatePayload.center_id = centerId;
          updatePayload.room_id = roomId;
          updatePayload.evacuee_status = centerId ? 'Active' : 'Decamped';
        }

        const { error: updErr } = await supabase
          .from('households')
          .update(updatePayload)
          .eq('id', id);
        if (updErr) throw updErr;
      } else if (type === 'LOG_MONITORING') {
        const { logData } = payload;
        const { data: insertedLog, error: logErr } = await supabase
          .from('monitoring_logs')
          .insert({
            household_id: logData.householdId,
            center_id: logData.centerId,
            room_id: logData.roomId || null,
            monitoring_interval: logData.monitoringInterval || 'Every 2-3 hours',
            checked_by: logData.checkedBy || 'MSWDO Staff',
            household_status: logData.householdStatus || 'Present',
            members_attendance: logData.membersAttendance || [],
            total_members: Number(logData.totalMembers) || 1,
            present_count: Number(logData.presentCount) || 0,
            absent_count: Number(logData.absentCount) || 0,
            late_count: Number(logData.lateCount) || 0,
            remarks: logData.remarks || null,
          })
          .select()
          .single();

        if (logErr) throw logErr;

        if (payload.tempId) {
          await db.monitoring_logs.delete(payload.tempId);
        }
        if (insertedLog) {
          await db.monitoring_logs.put({
            id: insertedLog.id,
            householdId: insertedLog.household_id,
            centerId: insertedLog.center_id,
            roomId: insertedLog.room_id,
            createdAt: insertedLog.created_at,
            raw: insertedLog,
          });
        }
      }

      await removePendingMutation(item.id);
      flushedCount += 1;
    } catch (err) {
      console.warn('Failed to flush mutation:', item, err);
      await markPendingMutationFailed(item.id, err.message || String(err));
      // Stop sequential execution on severe network failure so order is preserved
      break;
    }
  }

  notifySyncQueueChanged();
  return { flushed: flushedCount, pending: await getPendingMutationsCount() };
}

/**
 * Pull latest data from Supabase cloud into Dexie (centers, rooms, scoped households)
 */
export async function pullCloudData(options = {}) {
  if (!isOnline()) return { success: false, reason: 'offline' };

  const { centerId = null } = options;

  try {
    // 1. Pull Centers & Rooms
    const { data: centersData, error: centersErr } = await supabase
      .from('evacuation_centers')
      .select('id, name, location, capacity, total_rooms, status, rooms:rooms(id, room_name, capacity_individuals)');

    if (!centersErr && Array.isArray(centersData)) {
      const formattedCenters = [];
      const formattedRooms = [];

      centersData.forEach((c) => {
        formattedCenters.push({
          id: c.id,
          name: c.name,
          displayName: c.name,
          location: c.location,
          capacity: c.capacity,
          totalRooms: c.total_rooms,
          status: c.status,
        });

        if (Array.isArray(c.rooms)) {
          c.rooms.forEach((r) => {
            formattedRooms.push({
              id: r.id,
              centerId: c.id,
              name: r.room_name,
              capacity: r.capacity_individuals,
            });
          });
        }
      });

      await db.centers.bulkPut(formattedCenters);
      await db.rooms.bulkPut(formattedRooms);
    }

    // 2. Pull Households for active center (or top 500 if all centers)
    let hhQuery = supabase
      .from('households')
      .select(`
        id, household_code, head_name, head_age, head_sex, head_occupation,
        barangay, purok, evacuee_status, vulnerabilities, center_id, room_id,
        stub_code, stub_issued, stub_issued_at, created_at, updated_at,
        center:evacuation_centers!households_center_id_fkey ( id, name, location ),
        room:rooms ( id, room_name )
      `)
      .order('created_at', { ascending: false });

    if (centerId && centerId !== 'all') {
      hhQuery = hhQuery.eq('center_id', centerId);
    } else {
      hhQuery = hhQuery.limit(500);
    }

    const { data: hhData, error: hhErr } = await hhQuery;

    if (!hhErr && Array.isArray(hhData)) {
      const localRows = hhData.map((h) => ({
        id: h.id,
        householdCode: h.household_code || `HH-${String(h.id).slice(-4)}`,
        headName: h.head_name,
        name: h.head_name,
        age: h.head_age,
        sex: h.head_sex,
        occupation: h.head_occupation,
        barangay: h.barangay,
        purok: h.purok,
        centerId: h.center_id,
        center: h.center?.name || 'Unassigned Center',
        roomId: h.room_id,
        room: h.room?.room_name || 'Unassigned',
        evacueeStatus: h.evacuee_status,
        status: h.evacuee_status === 'Active' ? 'Evacuated' : 'Decamped',
        vulnerabilities: h.vulnerabilities || [],
        stubIssued: Boolean(h.stub_issued),
        stubCode: h.stub_code,
        stubIssuedAt: h.stub_issued_at,
        createdAt: h.created_at,
        updatedAt: h.updated_at || h.created_at,
      }));

      await db.households.bulkPut(localRows);
    }

    // Record last sync timestamp
    const nowIso = new Date().toISOString();
    await setSyncMeta('last_sync_timestamp', nowIso);
    lastSyncError = null;
    return { success: true, timestamp: nowIso };
  } catch (err) {
    console.warn('Pull cloud data failed:', err);
    lastSyncError = err.message || String(err);
    return { success: false, error: lastSyncError };
  }
}

/**
 * Execute full sync (flush outbox + pull fresh cloud state)
 */
export async function syncNow(options = {}) {
  if (isSyncing) return { status: 'already_syncing' };
  if (!isOnline()) {
    return { status: 'offline', message: 'You are currently offline. Changes are saved locally on this device.' };
  }

  isSyncing = true;
  notifySyncState();

  try {
    // Phase A: Push local outbox
    const pushResult = await flushPendingMutations();

    // Phase B: Pull updates
    const pullResult = await pullCloudData(options);

    isSyncing = false;
    notifySyncState();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('vinzons-households-changed'));
    }

    return {
      status: 'success',
      flushed: pushResult.flushed,
      pending: pushResult.pending,
      pulled: pullResult.success,
      timestamp: pullResult.timestamp || new Date().toISOString(),
    };
  } catch (err) {
    isSyncing = false;
    lastSyncError = err.message || String(err);
    notifySyncState();
    return { status: 'error', error: lastSyncError };
  }
}

/**
 * Get current sync status summary
 */
export async function getSyncStatusSummary() {
  const pendingCount = await getPendingMutationsCount();
  const lastSyncTime = await getSyncMeta('last_sync_timestamp');
  return {
    isOnline: isOnline(),
    isSyncing,
    pendingCount,
    lastSyncTime,
    lastError: lastSyncError,
  };
}

// Auto-sync listener when browser reconnects to network
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[SyncService] Device is back online. Auto-flushing pending changes...');
    syncNow();
  });
}
