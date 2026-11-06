import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase.js';

/**
 * Fallback seeds if device is completely offline on initial first-time load
 */
export const FALLBACK_HOUSEHOLDS = [
  {
    id: 'b6e91243-57e8-4247-8cb0-ef5a676f22f1',
    householdCode: 'HH-001',
    name: 'Antonio Magno',
    age: 45,
    sex: 'Male',
    vulnerabilities: [],
    center: 'LGU EC (Mangcaway)',
    centerId: null,
    room: 'Room 1',
    roomId: null,
    familyCount: 4,
    members: [
      { name: 'Luz Magno', age: 58, sex: 'Female', vulnerabilities: ['SENIOR CITIZEN'] },
      { name: 'Pablo Magno', age: 20, sex: 'Male', vulnerabilities: [] },
      { name: 'Sofia Magno', age: 17, sex: 'Female', vulnerabilities: [] },
    ],
    stubCode: 'STB-001001',
    stubIssued: false,
  },
  {
    id: '6249acf5-7114-4a4e-a40e-5d66c92cc729',
    householdCode: 'HH-002',
    name: 'Rosa Santos',
    age: 40,
    sex: 'Female',
    vulnerabilities: [],
    center: 'LGU EC (Mangcaway)',
    centerId: null,
    room: 'Room 2',
    roomId: null,
    familyCount: 4,
    members: [
      { name: 'Pedro Santos', age: 42, sex: 'Male', vulnerabilities: [] },
      { name: 'Maya Santos', age: 16, sex: 'Female', vulnerabilities: [] },
      { name: 'Leo Santos', age: 12, sex: 'Male', vulnerabilities: [] },
    ],
    stubCode: 'STB-001002',
    stubIssued: true,
  },
  {
    id: '4ac1d904-00bd-4e8f-912a-1b069a8554d2',
    householdCode: 'HH-003',
    name: 'Patricia Cruz',
    age: 35,
    sex: 'Female',
    vulnerabilities: ['PREGNANT', 'LACTATING MOTHERS'],
    center: 'LGU EC (Mangcaway)',
    centerId: null,
    room: 'Room 1',
    roomId: null,
    familyCount: 3,
    members: [
      { name: 'Mark Cruz', age: 38, sex: 'Male', vulnerabilities: [] },
      { name: 'Lina Cruz', age: 10, sex: 'Female', vulnerabilities: [] },
    ],
    stubCode: 'STB-003014',
    stubIssued: false,
  },
];

const LOCAL_STORAGE_KEY = 'vinzons_cached_households';

/**
 * Normalizes raw Supabase joined records into the shape used across Mobile and Admin components
 */
export function normalizeHousehold(row, centersList = []) {
  if (!row) return null;
  const profile = Array.isArray(row.profile) ? row.profile[0] : row.profile;

  // Resolve center display name
  let centerName = row.center?.name || 'Unassigned Center';
  if (row.center_id && Array.isArray(centersList) && centersList.length > 0) {
    const match = centersList.find((c) => c.id === row.center_id);
    if (match) {
      centerName = match.displayName || match.name || centerName;
    }
  } else if (row.center?.location) {
    const snippet = row.center.location.split(',')[0].replace(/^Purok\s*\d+/i, '').replace(/^Brgy\.?\s*/i, '').trim();
    if (snippet) {
      centerName = `${row.center.name} (${snippet})`;
    }
  }

  const roomName = row.room?.room_name || 'Room 1';
  const members = Array.isArray(row.members)
    ? row.members.map((m) => {
        const memberProfile = Array.isArray(m.profile) ? m.profile[0] : m.profile;
        return {
          id: m.id,
          name: m.full_name,
          age: m.age,
          ageValue: m.age_value !== null && m.age_value !== undefined ? m.age_value : m.age,
          ageUnit: m.age_unit || 'Years',
          sex: m.sex,
          relationship: m.relationship_to_head || 'MEMBER',
          occupation: m.occupation || '',
          isHead: Boolean(m.is_household_head),
          vulnerabilities: Array.isArray(m.vulnerabilities) ? m.vulnerabilities : [],
          monthlyIncome: memberProfile?.monthly_income ?? '',
          hasWorkedDole: memberProfile?.has_worked_dole ?? null,
          doleEmploymentYear: memberProfile?.dole_employment_year ?? '',
          hasReceivedGovernmentAssistance: memberProfile?.has_received_government_assistance ?? null,
          govAssistanceAvailed: Array.isArray(memberProfile?.gov_assistance_availed)
            ? memberProfile.gov_assistance_availed
            : [],
          governmentAssistanceYear: memberProfile?.government_assistance_year ?? '',
          hasReceivedReliefAssistance: memberProfile?.has_received_relief_assistance ?? null,
          otherIncomeSource: memberProfile?.other_income_source || '',
          floodDepthLevel: memberProfile?.flood_depth_level || '',
          characteristicsRemarks: memberProfile?.characteristics_remarks || '',
        };
      })
    : [];

  return {
    id: row.id,
    householdCode: row.household_code || `HH-${String(row.id).slice(-4)}`,
    name: row.head_name,
    age: row.head_age,
    sex: row.head_sex,
    headOccupation: row.head_occupation || '',
    barangay: row.barangay || 'Unassigned',
    purok: row.purok || 'Unassigned',
    evacueeStatus: row.evacuee_status || (row.center_id ? 'Active' : 'Decamped'),
    vulnerabilities: Array.isArray(row.vulnerabilities) ? row.vulnerabilities : [],
    center: centerName,
    centerId: row.center_id || row.center?.id || null,
    room: roomName,
    roomId: row.room_id || row.room?.id || null,
    familyCount: 1 + members.length,
    members,
    monthlyIncome: profile?.monthly_income ?? 0,
    hasWorkedDole: profile?.has_worked_dole ?? null,
    doleEmploymentYear: profile?.dole_employment_year ?? '',
    hasReceivedGovernmentAssistance: profile?.has_received_government_assistance ?? null,
    govAssistanceAvailed: Array.isArray(profile?.gov_assistance_availed)
      ? profile.gov_assistance_availed
      : [],
    governmentAssistanceYear: profile?.government_assistance_year ?? '',
    hasReceivedReliefAssistance: profile?.has_received_relief_assistance ?? null,
    otherIncomeSource: profile?.other_income_source || '',
    floodDepthLevel: profile?.flood_depth_level || '',
    characteristicsRemarks: profile?.characteristics_remarks || '',
    stubCode: row.stub_code,
    stubIssued: Boolean(row.stub_issued),
    stubIssuedAt: row.stub_issued_at || null,
    createdAt: row.created_at || null,
  };
}

/**
 * Hook to consume live households with Supabase realtime updates and offline cache
 */
export function useHouseholds(centersList = []) {
  const [households, setHouseholds] = useState(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return FALLBACK_HOUSEHOLDS;
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHouseholds = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('households')
        .select(`
          id,
          household_code,
          head_name,
          head_age,
          head_sex,
          head_occupation,
          barangay,
          purok,
          evacuee_status,
          vulnerabilities,
          center_id,
          room_id,
          stub_code,
          stub_issued,
          stub_issued_at,
          created_at,
          center:evacuation_centers ( id, name, location ),
          room:rooms ( id, room_name ),
          profile:household_profiles ( monthly_income, has_worked_dole, dole_employment_year, has_received_government_assistance, gov_assistance_availed, government_assistance_year, has_received_relief_assistance, other_income_source, flood_depth_level, characteristics_remarks ),
          members:household_members ( id, full_name, age, age_value, age_unit, sex, relationship_to_head, occupation, is_household_head, vulnerabilities, profile:household_member_profiles ( monthly_income, has_worked_dole, dole_employment_year, has_received_government_assistance, gov_assistance_availed, government_assistance_year, has_received_relief_assistance, other_income_source, flood_depth_level, characteristics_remarks ) )
        `)
        .order('created_at', { ascending: false });

      if (err) throw err;

      if (data) {
        const normalized = data.map((row) => normalizeHousehold(row, centersList));
        setHouseholds(normalized);
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(normalized));
        } catch {
          // ignore
        }
      }
      setError(null);
    } catch (err) {
      console.warn('Could not fetch households from Supabase, using cache/fallback:', err?.message || err);
      setError(err?.message || 'Failed to fetch households');
    } finally {
      setLoading(false);
    }
  }, [centersList]);

  // Initial fetch and Realtime subscription
  useEffect(() => {
    fetchHouseholds();

    const channel = supabase
      .channel('households-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'households' }, () => {
        fetchHouseholds();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'household_members' }, () => {
        fetchHouseholds();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'household_profiles' }, () => {
        fetchHouseholds();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchHouseholds]);

  return {
    households,
    loading,
    error,
    refresh: fetchHouseholds,
    setHouseholds,
  };
}

export function useEventRoomPlacements(eventId) {
  const [placements, setPlacements] = useState([]);

  const fetchPlacements = useCallback(async () => {
    if (!eventId || eventId === 'default-active-event') return;

    try {
      const { data, error: placementError } = await supabase
        .from('room_placements')
        .select('id, household_id, center_id, room_id, event_id, status, check_in_at, check_out_at')
        .eq('event_id', eventId)
        .order('check_in_at', { ascending: false });

      if (placementError) throw placementError;
      setPlacements(data || []);
    } catch (placementError) {
      console.error('Could not load evacuation placements:', placementError);
    }
  }, [eventId]);

  useEffect(() => {
    if (!eventId || eventId === 'default-active-event') return undefined;
    fetchPlacements();

    const channel = supabase
      .channel(`room-placements-${eventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_placements' }, fetchPlacements)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, fetchPlacements]);

  return { placements, refresh: fetchPlacements };
}

/**
 * Register a new household and its members into Supabase
 */
export async function createHousehold(formData, centersList = []) {
  // 1. Resolve center_id
  let centerId = formData.centerId;
  if (!centerId && formData.center) {
    const found = centersList.find(
      (c) =>
        c.id === formData.center ||
        c.displayName === formData.center ||
        c.name === formData.center
    );
    centerId = found ? found.id : null;
  }
  // 2. Resolve room_id
  let roomId = null;
  if (centerId && formData.room && formData.room !== 'Unassigned') {
    const { data: roomData } = await supabase
      .from('rooms')
      .select('id')
      .eq('center_id', centerId)
      .eq('room_name', formData.room)
      .maybeSingle();

    if (roomData) {
      roomId = roomData.id;
    } else {
      // Auto-create room if it doesn't exist
      const { data: newRoom } = await supabase
        .from('rooms')
        .insert({ center_id: centerId, room_name: formData.room, capacity_individuals: 30 })
        .select('id')
        .single();
      if (newRoom) roomId = newRoom.id;
    }
  }

  const stubCode = formData.stubCode || `STB-${String(Date.now()).slice(-6)}`;
  const householdCode = formData.householdCode || `HH-${String(Date.now()).slice(-4)}`;

  // 3. Insert household
  const { data: insertedH, error: hError } = await supabase
    .from('households')
    .insert({
      household_code: householdCode,
      head_name: formData.head,
      head_age: Number(formData.age) || 35,
      head_sex: formData.sex || 'Male',
      head_occupation: formData.headOccupation || null,
      barangay: formData.barangay || 'Unassigned',
      purok: formData.purok || 'Unassigned',
      evacuee_status: centerId ? 'Active' : 'Decamped',
      vulnerabilities: Array.isArray(formData.vulnerabilities) ? formData.vulnerabilities : [],
      center_id: centerId,
      room_id: roomId,
      stub_code: stubCode,
      stub_issued: Boolean(formData.stubIssued),
      stub_issued_at: formData.stubIssued ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (hError) throw hError;

  const { error: profileError } = await supabase.from('household_profiles').upsert(
    householdProfilePayload(insertedH.id, formData),
    { onConflict: 'household_id' }
  );
  if (profileError) throw profileError;

  // 4. Insert members if any
  if (Array.isArray(formData.members) && formData.members.length > 0) {
    const membersWithNames = formData.members
      .filter((m) => m && m.name && m.name.trim())
    const memberRows = membersWithNames.map((m) => ({
        household_id: insertedH.id,
        full_name: m.name.trim(),
        age: ['month', 'day'].some((unit) => String(m.ageUnit || 'Years').toLowerCase().startsWith(unit))
          ? 0
          : Number(m.ageValue ?? m.age) || 0,
        age_value: Number(m.ageValue ?? m.age) || 0,
        age_unit: m.ageUnit || 'Years',
        sex: m.sex || 'Female',
        relationship_to_head: m.relationship || 'MEMBER',
        occupation: m.occupation || null,
        is_household_head: false,
        vulnerabilities: Array.isArray(m.vulnerabilities) ? m.vulnerabilities : [],
      }));

    if (memberRows.length > 0) {
      const { data: insertedMembers, error: mError } = await supabase
        .from('household_members')
        .insert(memberRows)
        .select('id');
      if (mError) throw mError;
      const memberProfiles = (insertedMembers || []).map((member, index) =>
        householdMemberProfilePayload(member.id, membersWithNames[index])
      );
      if (memberProfiles.length > 0) {
        const { error: memberProfileError } = await supabase
          .from('household_member_profiles')
          .upsert(memberProfiles, { onConflict: 'household_member_id' });
        if (memberProfileError) throw memberProfileError;
      }
    }
  }

  // 5. Optionally record initial room_placement & relief stub if assigned to a center
  if (centerId) {
    try {
      await supabase.from('room_placements').insert({
        household_id: insertedH.id,
        center_id: centerId,
        room_id: roomId,
        status: 'Evacuated',
        check_in_at: new Date().toISOString(),
      });
      await supabase.from('relief_goods_stubs').insert({
        household_id: insertedH.id,
        stub_code: stubCode,
        stub_issued: Boolean(formData.stubIssued),
        stub_issued_at: formData.stubIssued ? new Date().toISOString() : null,
      });
    } catch {
      // Ignore if operational tables are not yet queried
    }
  }

  return insertedH;
}

function householdProfilePayload(householdId, formData) {
  return {
    household_id: householdId,
    monthly_income: Number(formData.monthlyIncome) || 0,
    has_worked_dole: formData.hasWorkedDole ?? null,
    dole_employment_year: Number(formData.doleEmploymentYear) || null,
    has_received_government_assistance: formData.hasReceivedGovernmentAssistance ?? null,
    gov_assistance_availed: Array.isArray(formData.govAssistanceAvailed)
      ? formData.govAssistanceAvailed
      : [],
    government_assistance_year: Number(formData.governmentAssistanceYear) || null,
    has_received_relief_assistance: formData.hasReceivedReliefAssistance ?? null,
    other_income_source: formData.otherIncomeSource || null,
    flood_depth_level: formData.floodDepthLevel || null,
    characteristics_remarks: formData.characteristicsRemarks || null,
    updated_at: new Date().toISOString(),
  };
}

function householdMemberProfilePayload(memberId, formData) {
  return {
    household_member_id: memberId,
    monthly_income: Number(formData.monthlyIncome) || 0,
    has_worked_dole: formData.hasWorkedDole ?? null,
    dole_employment_year: Number(formData.doleEmploymentYear) || null,
    has_received_government_assistance: formData.hasReceivedGovernmentAssistance ?? null,
    gov_assistance_availed: Array.isArray(formData.govAssistanceAvailed)
      ? formData.govAssistanceAvailed
      : [],
    government_assistance_year: Number(formData.governmentAssistanceYear) || null,
    has_received_relief_assistance: formData.hasReceivedReliefAssistance ?? null,
    other_income_source: formData.otherIncomeSource || null,
    flood_depth_level: formData.floodDepthLevel || null,
    characteristics_remarks: formData.characteristicsRemarks || null,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Update an existing household profile in Supabase
 */
export async function updateHousehold(id, formData, centersList = [], { preservePlacement = false } = {}) {
  let centerId = formData.centerId;
  if (!preservePlacement && !centerId && formData.center) {
    const found = centersList.find((c) =>
      c.id === formData.center ||
      c.displayName === formData.center ||
      c.name === formData.center
    );
    centerId = found ? found.id : null;
  }

  let roomId = null;
  if (!preservePlacement && centerId && formData.room && formData.room !== 'Unassigned') {
    const { data: roomData } = await supabase
      .from('rooms')
      .select('id')
      .eq('center_id', centerId)
      .eq('room_name', formData.room)
      .maybeSingle();

    if (roomData) {
      roomId = roomData.id;
    } else {
      const { data: newRoom } = await supabase
        .from('rooms')
        .insert({ center_id: centerId, room_name: formData.room, capacity_individuals: 30 })
        .select('id')
        .single();
      if (newRoom) roomId = newRoom.id;
    }
  }

  const payload = {
    head_name: formData.head,
    head_age: Number(formData.age) || 35,
    head_sex: formData.sex || 'Male',
    head_occupation: formData.headOccupation || null,
    barangay: formData.barangay || 'Unassigned',
    purok: formData.purok || 'Unassigned',
    vulnerabilities: Array.isArray(formData.vulnerabilities) ? formData.vulnerabilities : [],
    updated_at: new Date().toISOString(),
  };
  if (!preservePlacement) {
    payload.center_id = centerId || null;
    payload.room_id = roomId;
  }

  const { error: hError } = await supabase.from('households').update(payload).eq('id', id);
  if (hError) throw hError;

  const hasProfileFields = [
    'monthlyIncome',
    'hasWorkedDole',
    'doleEmploymentYear',
    'hasReceivedGovernmentAssistance',
    'govAssistanceAvailed',
    'governmentAssistanceYear',
    'hasReceivedReliefAssistance',
    'otherIncomeSource',
    'floodDepthLevel',
    'characteristicsRemarks',
  ].some((field) => Object.prototype.hasOwnProperty.call(formData, field));
  if (hasProfileFields) {
    const { error: profileError } = await supabase.from('household_profiles').upsert(
      householdProfilePayload(id, formData),
      { onConflict: 'household_id' }
    );
    if (profileError) throw profileError;
  }

  // Replace members
  if (Array.isArray(formData.members)) {
    const { error: deleteMembersError } = await supabase
      .from('household_members')
      .delete()
      .eq('household_id', id);
    if (deleteMembersError) throw deleteMembersError;
    const membersWithNames = formData.members
      .filter((m) => m && m.name && m.name.trim())
    const memberRows = membersWithNames.map((m) => ({
        household_id: id,
        full_name: m.name.trim(),
        age: ['month', 'day'].some((unit) => String(m.ageUnit || 'Years').toLowerCase().startsWith(unit))
          ? 0
          : Number(m.ageValue ?? m.age) || 0,
        age_value: Number(m.ageValue ?? m.age) || 0,
        age_unit: m.ageUnit || 'Years',
        sex: m.sex || 'Female',
        relationship_to_head: m.relationship || 'MEMBER',
        occupation: m.occupation || null,
        is_household_head: Boolean(m.isHead),
        vulnerabilities: Array.isArray(m.vulnerabilities) ? m.vulnerabilities : [],
      }));

    if (memberRows.length > 0) {
      const { data: insertedMembers, error: membersError } = await supabase
        .from('household_members')
        .insert(memberRows)
        .select('id');
      if (membersError) throw membersError;
      const memberProfiles = (insertedMembers || []).map((member, index) =>
        householdMemberProfilePayload(member.id, membersWithNames[index])
      );
      if (memberProfiles.length > 0) {
        const { error: memberProfileError } = await supabase
          .from('household_member_profiles')
          .upsert(memberProfiles, { onConflict: 'household_member_id' });
        if (memberProfileError) throw memberProfileError;
      }
    }
  }
}

export async function getEventReliefStubRecords(eventId) {
  if (!eventId) return [];

  const { data, error } = await supabase
    .from('relief_goods_stubs')
    .select('household_id, event_id, stub_code, stub_issued, stub_issued_at')
    .eq('event_id', eventId);

  if (error) throw error;
  return data || [];
}

/**
 * Fetch all relief stubs across all events to compute total relief counts per household
 */
export async function getAllReliefStubs() {
  try {
    const { data, error } = await supabase
      .from('relief_goods_stubs')
      .select('household_id, event_id, stub_code, stub_issued, stub_issued_at');
    if (error) {
      console.warn('Could not fetch all relief stubs:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.warn('getAllReliefStubs error:', err);
    return [];
  }
}

/**
 * Fetch detailed relief assistance history for a specific household across events
 */
export async function getHouseholdReliefHistory(householdId) {
  if (!householdId) return [];
  try {
    const [stubsRes, eventsRes, placementsRes] = await Promise.allSettled([
      supabase
        .from('relief_goods_stubs')
        .select('household_id, event_id, stub_code, stub_issued, stub_issued_at')
        .eq('household_id', householdId),
      supabase
        .from('evacuation_events')
        .select('id, event_name, event_type, status, declared_at, created_at'),
      supabase
        .from('room_placements')
        .select('event_id, center_id, room_id, center:evacuation_centers(id, name, location), room:rooms(id, room_name)')
        .eq('household_id', householdId),
    ]);

    const stubs = (stubsRes.status === 'fulfilled' && stubsRes.value.data) ? stubsRes.value.data : [];
    const events = (eventsRes.status === 'fulfilled' && eventsRes.value.data) ? eventsRes.value.data : [];
    const placements = (placementsRes.status === 'fulfilled' && placementsRes.value.data) ? placementsRes.value.data : [];

    const eventsMap = new Map(events.map((ev) => [ev.id, ev]));
    const placementsMap = new Map(placements.map((p) => [p.event_id, p]));

    return stubs.map((s) => {
      const ev = eventsMap.get(s.event_id);
      const pl = placementsMap.get(s.event_id);
      return {
        stubCode: s.stub_code || '—',
        stubIssued: Boolean(s.stub_issued),
        stubIssuedAt: s.stub_issued_at,
        eventId: s.event_id,
        eventName: ev?.event_name || (s.event_id === 'default-active-event' ? 'Active Operation' : 'Disaster Relief Operation'),
        eventType: ev?.event_type || 'Relief Operation',
        centerName: pl?.center?.name || 'Assigned Center',
        roomName: pl?.room?.room_name || 'Assigned Room',
      };
    }).sort((a, b) => new Date(b.stubIssuedAt || 0) - new Date(a.stubIssuedAt || 0));
  } catch (err) {
    console.warn('Error fetching household relief history:', err);
    return [];
  }
}

/**
 * Mark a household stub as issued and persist the event-specific issue record.
 */
export async function issueHouseholdStub(id, eventId = null) {
  const issuedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from('households')
    .update({
      stub_issued: true,
      stub_issued_at: issuedAt,
      updated_at: issuedAt,
    })
    .eq('id', id)
    .select('id, stub_code')
    .single();

  if (error) throw error;

  if (eventId) {
    const { data: existingStub, error: lookupError } = await supabase
      .from('relief_goods_stubs')
      .select('household_id')
      .eq('household_id', id)
      .eq('event_id', eventId)
      .maybeSingle();

    if (lookupError) throw lookupError;

    const stubRecord = {
      stub_code: data.stub_code,
      stub_issued: true,
      stub_issued_at: issuedAt,
    };

    if (existingStub) {
      const { error: updateError } = await supabase
        .from('relief_goods_stubs')
        .update(stubRecord)
        .eq('household_id', id)
        .eq('event_id', eventId);

      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from('relief_goods_stubs')
        .insert({
          household_id: id,
          event_id: eventId,
          ...stubRecord,
        });

      if (insertError) throw insertError;
    }
  }

  return data;
}

/**
 * Check-in an existing household into an evacuation center & room for a disaster event
 */
export async function checkInHousehold({ householdId, centerId, roomId, roomName = null, eventId = null, stubCode = null }) {
  const { data: existingPlacement, error: existingPlacementError } = await supabase
    .from('room_placements')
    .select('id')
    .eq('household_id', householdId)
    .eq('event_id', eventId)
    .eq('status', 'Evacuated')
    .maybeSingle();

  if (existingPlacementError) throw existingPlacementError;
  if (existingPlacement) throw new Error('This household is already checked into the selected operation.');

  let resolvedRoomId = roomId;
  if (!resolvedRoomId && roomName) {
    const { data: existingRoom, error: roomLookupError } = await supabase
      .from('rooms')
      .select('id')
      .eq('center_id', centerId)
      .eq('room_name', roomName)
      .maybeSingle();

    if (roomLookupError) throw roomLookupError;
    if (existingRoom) {
      resolvedRoomId = existingRoom.id;
    } else {
      const { data: newRoom, error: createRoomError } = await supabase
        .from('rooms')
        .insert({ center_id: centerId, room_name: roomName, capacity_individuals: 30 })
        .select('id')
        .single();

      if (createRoomError) throw createRoomError;
      resolvedRoomId = newRoom.id;
    }
  }

  if (!centerId || !resolvedRoomId) throw new Error('Select an evacuation center and room before checking in.');

  const code = stubCode || `STB-${String(Date.now()).slice(-6)}`;
  const { data: placement, error: placementError } = await supabase
    .from('room_placements')
    .insert({
      household_id: householdId,
      center_id: centerId,
      room_id: resolvedRoomId,
      event_id: eventId,
      status: 'Evacuated',
      check_in_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (placementError) throw placementError;

  const { error: hErr } = await supabase
    .from('households')
    .update({
      center_id: centerId,
      room_id: resolvedRoomId,
      stub_code: code,
      stub_issued: false,
      evacuee_status: 'Active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', householdId);

  if (hErr) {
    const { error: rollbackError } = await supabase
      .from('room_placements')
      .delete()
      .eq('id', placement.id);
    if (rollbackError) console.error('Could not roll back failed check-in placement:', rollbackError);
    throw hErr;
  }

  // 3. Insert or update relief_goods_stubs
  try {
    await supabase.from('relief_goods_stubs').insert({
      household_id: householdId,
      event_id: eventId,
      stub_code: code,
      stub_issued: false,
    });
  } catch (err) {
    console.warn('relief_goods_stubs insert failed:', err);
  }

  return { success: true, stubCode: code };
}

/**
 * Decamp / Check-out a household from an evacuation center
 */
/**
 * Transfer an active/evacuated household to a new evacuation center and/or room
 */
export async function transferHouseholdRoom({
  householdId,
  eventId = null,
  centerId,
  roomId = null,
  roomName = null,
  reason = '',
}) {
  if (!householdId) throw new Error('Household ID is required for transfer.');
  if (!centerId) throw new Error('Target evacuation center is required.');

  // 1. Resolve room ID
  let resolvedRoomId = roomId;
  if (!resolvedRoomId && roomName) {
    const { data: existingRoom, error: roomLookupError } = await supabase
      .from('rooms')
      .select('id')
      .eq('center_id', centerId)
      .eq('room_name', roomName)
      .maybeSingle();

    if (roomLookupError) throw roomLookupError;
    if (existingRoom) {
      resolvedRoomId = existingRoom.id;
    } else {
      const { data: newRoom, error: createRoomError } = await supabase
        .from('rooms')
        .insert({ center_id: centerId, room_name: roomName, capacity_individuals: 30 })
        .select('id')
        .single();
      if (createRoomError) throw createRoomError;
      resolvedRoomId = newRoom.id;
    }
  }

  if (!resolvedRoomId) throw new Error('Target room is required.');

  const now = new Date().toISOString();

  // 2. Update existing active placement in room_placements
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

  const { data: updatedPlacements, error: placementError } = await placementQuery.select('id');
  if (placementError) throw placementError;

  // If no active placement was updated, insert a new placement
  if (!updatedPlacements || updatedPlacements.length === 0) {
    const { error: insertPlacementError } = await supabase
      .from('room_placements')
      .insert({
        household_id: householdId,
        center_id: centerId,
        room_id: resolvedRoomId,
        event_id: eventId && eventId !== 'default-active-event' ? eventId : null,
        status: 'Evacuated',
        check_in_at: now,
      });
    if (insertPlacementError) throw insertPlacementError;
  }

  // 3. Update the household table
  const { error: householdError } = await supabase
    .from('households')
    .update({
      center_id: centerId,
      room_id: resolvedRoomId,
      evacuee_status: 'Active',
      updated_at: now,
    })
    .eq('id', householdId);

  if (householdError) throw householdError;

  return { success: true, centerId, roomId: resolvedRoomId };
}

export async function decampHousehold(householdId, eventId = null) {
  let placementUpdate = supabase
    .from('room_placements')
    .update({
      status: 'Decamped',
      check_out_at: new Date().toISOString(),
    })
    .eq('household_id', householdId)
    .eq('status', 'Evacuated');

  if (eventId) placementUpdate = placementUpdate.eq('event_id', eventId);
  const { error: placementError } = await placementUpdate;
  if (placementError) throw placementError;

  const { error: hErr } = await supabase
    .from('households')
    .update({
      evacuee_status: 'Decamped',
      updated_at: new Date().toISOString(),
    })
    .eq('id', householdId);

  if (hErr) throw hErr;

  return { success: true };
}

/**
 * Fast search of the household masterlist (for intake and search-before-register)
 */
export async function searchMasterHouseholds(query = '', centersList = []) {
  if (!query || !query.trim()) return [];
  const clean = query.trim();

  try {
    const { data, error } = await supabase
      .from('households')
      .select(`
        id,
        household_code,
        head_name,
        head_age,
        head_sex,
        head_occupation,
        barangay,
        purok,
        evacuee_status,
        vulnerabilities,
        center_id,
        room_id,
        stub_code,
        stub_issued,
        stub_issued_at,
        created_at,
        center:evacuation_centers ( id, name, location ),
        room:rooms ( id, room_name ),
        profile:household_profiles ( monthly_income, has_worked_dole, dole_employment_year, has_received_government_assistance, gov_assistance_availed, government_assistance_year, has_received_relief_assistance, other_income_source, flood_depth_level, characteristics_remarks ),
        members:household_members ( id, full_name, age, age_value, age_unit, sex, relationship_to_head, occupation, vulnerabilities, profile:household_member_profiles ( monthly_income, has_worked_dole, dole_employment_year, has_received_government_assistance, gov_assistance_availed, government_assistance_year, has_received_relief_assistance, other_income_source, flood_depth_level, characteristics_remarks ) )
      `)
      .or(`head_name.ilike.%${clean}%,household_code.ilike.%${clean}%,barangay.ilike.%${clean}%`)
      .limit(20);

    if (error) throw error;
    return (data || []).map((row) => normalizeHousehold(row, centersList));
  } catch (err) {
    console.warn('Masterlist search error:', err);
    return [];
  }
}
