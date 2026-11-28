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
import { HOUSEHOLD_DETAIL_SELECT, normalizeHousehold } from './householdService.js';
import { fetchBarangayEvacuationAssignments } from './barangayEvacuationAssignments.js';
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
 * Download an entire evacuation center's data pack (rooms, assignments, households + members, logs)
 * in lean batches with main-thread yields so low-end devices stay smooth.
 */
export async function downloadCenterOfflinePack(centerId, centersList = [], onProgress = null) {
  if (!centerId || centerId === 'all') {
    throw new Error('Select a specific evacuation center to download.');
  }
  if (!isOnline()) {
    throw new Error('You are offline. Connect to WiFi or mobile data to download center data.');
  }

  const yieldToUi = () => new Promise((resolve) => setTimeout(resolve, 0));

  onProgress?.({ percent: 5, label: 'Syncing pending local changes...' });
  await flushPendingMutations();

  // Protect any remaining pending mutations from being overwritten
  const remainingPending = await getPendingMutations();
  const protectedHouseholdIds = new Set(
    remainingPending
      .map((m) => m.payload?.householdId || m.payload?.id || m.payload?.tempId)
      .filter(Boolean)
  );

  // 1. Fetch barangay & purok assignments for this center
  onProgress?.({ percent: 15, label: 'Loading community assignments...' });
  const allAssignments = await fetchBarangayEvacuationAssignments();
  const centerAssignments = allAssignments.filter((a) => a.center_ids?.includes(centerId));
  await yieldToUi();

  // 2. Fetch center + rooms
  onProgress?.({ percent: 25, label: 'Loading center rooms...' });
  const { data: centerData, error: centerErr } = await supabase
    .from('evacuation_centers')
    .select('id, name, location, capacity, total_rooms, status, rooms:rooms(id, room_name, capacity_individuals)')
    .eq('id', centerId)
    .maybeSingle();

  if (centerErr) throw centerErr;

  if (centerData) {
    await db.centers.put({
      id: centerData.id,
      name: centerData.name,
      displayName: centerData.name,
      location: centerData.location,
      capacity: centerData.capacity,
      totalRooms: centerData.total_rooms,
      status: centerData.status,
    });
    if (Array.isArray(centerData.rooms) && centerData.rooms.length > 0) {
      await db.rooms.bulkPut(
        centerData.rooms.map((r) => ({
          id: r.id,
          centerId: centerData.id,
          name: r.room_name,
          capacity: r.capacity_individuals,
        }))
      );
    }
  }
  await yieldToUi();

  // 3. Build OR filter: checked-in at this center OR assigned barangay/purok
  const quoteVal = (v) => `"${String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  const orFilters = [`center_id.eq.${quoteVal(centerId)}`];
  centerAssignments.forEach(({ barangay, purok }) => {
    const cleanB = String(barangay || '').trim();
    const cleanP = String(purok || '').trim();
    if (!cleanB) return;
    if (!cleanP || cleanP.toLowerCase() === 'all') {
      orFilters.push(`barangay.eq.${quoteVal(cleanB)}`);
    } else {
      orFilters.push(`and(barangay.eq.${quoteVal(cleanB)},purok.eq.${quoteVal(cleanP)})`);
    }
  });
  const combinedFilter = orFilters.join(',');

  // Get exact count for accurate progress bar
  const { count: expectedCount } = await supabase
    .from('households')
    .select('id', { count: 'exact', head: true })
    .or(combinedFilter);

  const BATCH_SIZE = 100; // Small batches keep RAM low on budget phones
  let downloadedCount = 0;
  const downloadedHouseholdIds = [];
  const totalExpected = typeof expectedCount === 'number' && expectedCount > 0 ? expectedCount : 100;

  for (let offset = 0; ; offset += BATCH_SIZE) {
    const { data: batch, error: batchErr } = await supabase
      .from('households')
      .select(HOUSEHOLD_DETAIL_SELECT)
      .or(combinedFilter)
      .order('head_name', { ascending: true })
      .order('id', { ascending: true })
      .range(offset, offset + BATCH_SIZE - 1);

    if (batchErr) throw batchErr;
    const rows = batch || [];
    if (rows.length === 0) break;

    rows.forEach((r) => {
      if (r?.id) downloadedHouseholdIds.push(r.id);
    });

    const normalizedBatch = rows
      .map((row) => normalizeHousehold(row, centersList))
      .filter((h) => h && !protectedHouseholdIds.has(h.id));

    if (normalizedBatch.length > 0) {
      await db.households.bulkPut(normalizedBatch);
      await db.household_details.bulkPut(
        normalizedBatch.map((h) => ({
          id: h.id,
          data: h,
          updatedAt: Date.now(),
        }))
      );
    }

    downloadedCount += rows.length;
    const ratio = Math.min(1, downloadedCount / totalExpected);
    const percent = Math.round(30 + ratio * 55);
    onProgress?.({
      percent,
      label: `Downloading households (${downloadedCount}${expectedCount ? ` / ${expectedCount}` : ''})...`,
    });

    await yieldToUi();
    if (rows.length < BATCH_SIZE) break;
  }

  // 4. Fetch recent monitoring logs for this center
  onProgress?.({ percent: 90, label: 'Loading monitoring logs...' });
  const { data: logsData, error: logsErr } = await supabase
    .from('monitoring_logs')
    .select(`
      id, household_id, center_id, room_id, monitoring_interval, checked_by,
      household_status, members_attendance, total_members, present_count,
      absent_count, late_count, remarks, created_at,
      household:households ( id, head_name, household_code ),
      center:evacuation_centers ( id, name, location ),
      room:rooms ( id, room_name )
    `)
    .eq('center_id', centerId)
    .order('created_at', { ascending: false })
    .limit(200);

  if (!logsErr && Array.isArray(logsData) && logsData.length > 0) {
    const normalizedLogs = logsData.map((r) => normalizeMonitoringLog(r, centersList)).filter(Boolean);
    await db.monitoring_logs.bulkPut(
      normalizedLogs.map((log) => ({
        id: log.id,
        householdId: log.householdId,
        centerId: log.centerId,
        roomId: log.roomId,
        createdAt: log.createdAt,
        raw: log,
      }))
    );
  }

  const nowIso = new Date().toISOString();
  const matchedCenter = centersList.find((c) => c.id === centerId);
  const packMeta = {
    centerId,
    centerName: centerData?.name || matchedCenter?.displayName || matchedCenter?.name || 'Evacuation Center',
    householdCount: downloadedCount,
    householdIds: downloadedHouseholdIds,
    downloadedAt: nowIso,
  };
  await setSyncMeta(`center_pack_${centerId}`, packMeta);
  await setSyncMeta('last_sync_timestamp', nowIso);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('vinzons-households-changed'));
  }
  notifySyncState();
  onProgress?.({ percent: 100, label: 'Offline pack ready!' });

  return packMeta;
}

/**
 * List all downloaded center offline packs
 */
export async function getCenterOfflinePacks() {
  try {
    const allMeta = await db.sync_metadata.toArray();
    const packs = {};
    allMeta.forEach((entry) => {
      if (entry.key && entry.key.startsWith('center_pack_') && entry.value) {
        packs[entry.value.centerId] = entry.value;
      }
    });
    return packs;
  } catch {
    return {};
  }
}

/**
 * Remove a center's cached offline pack (all downloaded households, logs & metadata)
 */
export async function removeCenterOfflinePack(centerId) {
  const pending = await getPendingMutations();
  const hasPendingForCenter = pending.some((m) => m.payload?.centerId === centerId);
  if (hasPendingForCenter) {
    throw new Error('Please sync pending offline changes for this center before deleting its offline data.');
  }

  const packMeta = await getSyncMeta(`center_pack_${centerId}`);
  const allPacks = await getCenterOfflinePacks();

  // Keep IDs still referenced by other downloaded packs or pending mutations
  const keepIds = new Set();
  Object.values(allPacks).forEach((pack) => {
    if (pack.centerId !== centerId && Array.isArray(pack.householdIds)) {
      pack.householdIds.forEach((id) => keepIds.add(id));
    }
  });
  pending.forEach((m) => {
    const id = m.payload?.householdId || m.payload?.id || m.payload?.tempId;
    if (id) keepIds.add(id);
  });

  const centerCheckedInIds = await db.households.where('centerId').equals(centerId).primaryKeys();
  const packIds = Array.isArray(packMeta?.householdIds) ? packMeta.householdIds : [];
  const idsToDelete = [...new Set([...packIds, ...centerCheckedInIds])].filter((id) => !keepIds.has(id));

  if (idsToDelete.length > 0) {
    await db.households.bulkDelete(idsToDelete);
    await db.household_details.bulkDelete(idsToDelete);
  }

  const centerLogIds = await db.monitoring_logs.where('centerId').equals(centerId).primaryKeys();
  if (centerLogIds.length > 0) {
    await db.monitoring_logs.bulkDelete(centerLogIds);
  }

  await db.sync_metadata.delete(`center_pack_${centerId}`);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('vinzons-households-changed'));
  }
  notifySyncState();
}

/**
 * Delete all downloaded offline data packs from this device
 */
export async function clearAllOfflineData() {
  const pending = await getPendingMutations();
  if (pending.length > 0) {
    throw new Error(`You have ${pending.length} unsynced offline change(s). Please sync them before deleting all offline data.`);
  }

  await Promise.all([
    db.households.clear(),
    db.household_details.clear(),
    db.monitoring_logs.clear(),
    db.barangay_assignments.clear(),
  ]);

  const allMeta = await db.sync_metadata.toArray();
  const packKeys = allMeta
    .filter((entry) => entry.key && entry.key.startsWith('center_pack_'))
    .map((entry) => entry.key);
  if (packKeys.length > 0) {
    await db.sync_metadata.bulkDelete(packKeys);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('vinzons-households-changed'));
  }
  notifySyncState();
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
