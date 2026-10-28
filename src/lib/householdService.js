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
    category: 'None',
    center: 'LGU EC (Mangcaway)',
    centerId: null,
    room: 'Room 1',
    roomId: null,
    familyCount: 4,
    members: [
      { name: 'Luz Magno', age: 58, sex: 'Female', category: 'Senior Citizen' },
      { name: 'Pablo Magno', age: 20, sex: 'Male', category: 'None' },
      { name: 'Sofia Magno', age: 17, sex: 'Female', category: 'None' },
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
    category: 'None',
    center: 'LGU EC (Mangcaway)',
    centerId: null,
    room: 'Room 2',
    roomId: null,
    familyCount: 4,
    members: [
      { name: 'Pedro Santos', age: 42, sex: 'Male', category: 'None' },
      { name: 'Maya Santos', age: 16, sex: 'Female', category: 'None' },
      { name: 'Leo Santos', age: 12, sex: 'Male', category: 'None' },
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
    category: 'Pregnant/Lactating',
    center: 'LGU EC (Mangcaway)',
    centerId: null,
    room: 'Room 1',
    roomId: null,
    familyCount: 3,
    members: [
      { name: 'Mark Cruz', age: 38, sex: 'Male', category: 'None' },
      { name: 'Lina Cruz', age: 10, sex: 'Female', category: 'None' },
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
    ? row.members.map((m) => ({
        id: m.id,
        name: m.full_name,
        age: m.age,
        sex: m.sex,
        category: m.category || 'None',
      }))
    : [];

  return {
    id: row.id,
    householdCode: row.household_code || `HH-${String(row.id).slice(-4)}`,
    name: row.head_name,
    age: row.head_age,
    sex: row.head_sex,
    category: row.head_category || 'None',
    center: centerName,
    centerId: row.center_id || row.center?.id || null,
    room: roomName,
    roomId: row.room_id || row.room?.id || null,
    familyCount: 1 + members.length,
    members,
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
          head_category,
          center_id,
          room_id,
          stub_code,
          stub_issued,
          stub_issued_at,
          created_at,
          center:evacuation_centers ( id, name, location ),
          room:rooms ( id, room_name ),
          members:household_members ( id, full_name, age, sex, category )
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
  if (!centerId && centersList.length > 0) {
    centerId = centersList[0].id;
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
      head_category: formData.category || 'None',
      center_id: centerId,
      room_id: roomId,
      stub_code: stubCode,
      stub_issued: Boolean(formData.stubIssued),
      stub_issued_at: formData.stubIssued ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (hError) throw hError;

  // 4. Insert members if any
  if (Array.isArray(formData.members) && formData.members.length > 0) {
    const memberRows = formData.members
      .filter((m) => m && m.name && m.name.trim())
      .map((m) => ({
        household_id: insertedH.id,
        full_name: m.name.trim(),
        age: Number(m.age) || 0,
        sex: m.sex || 'Female',
        category: m.category || 'None',
      }));

    if (memberRows.length > 0) {
      const { error: mError } = await supabase.from('household_members').insert(memberRows);
      if (mError) console.warn('Error inserting members:', mError.message);
    }
  }

  return insertedH;
}

/**
 * Update an existing household profile in Supabase
 */
export async function updateHousehold(id, formData, centersList = []) {
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
    head_category: formData.category || 'None',
    updated_at: new Date().toISOString(),
  };
  if (centerId) payload.center_id = centerId;
  payload.room_id = roomId;

  const { error: hError } = await supabase.from('households').update(payload).eq('id', id);
  if (hError) throw hError;

  // Replace members
  if (Array.isArray(formData.members)) {
    await supabase.from('household_members').delete().eq('household_id', id);
    const memberRows = formData.members
      .filter((m) => m && m.name && m.name.trim())
      .map((m) => ({
        household_id: id,
        full_name: m.name.trim(),
        age: Number(m.age) || 0,
        sex: m.sex || 'Female',
        category: m.category || 'None',
      }));

    if (memberRows.length > 0) {
      await supabase.from('household_members').insert(memberRows);
    }
  }
}

/**
 * Mark a household stub as issued (called when scanning the printed QR code)
 */
export async function issueHouseholdStub(id) {
  const { data, error } = await supabase
    .from('households')
    .update({
      stub_issued: true,
      stub_issued_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Scan stub lookup: Finds household by its scanned stub code
 */
export async function findHouseholdByStubCode(stubCode) {
  if (!stubCode) return null;
  const cleanCode = stubCode.trim();
  const { data, error } = await supabase
    .from('households')
    .select(`
      id,
      household_code,
      head_name,
      stub_code,
      stub_issued,
      stub_issued_at,
      center:evacuation_centers ( name ),
      room:rooms ( room_name )
    `)
    .eq('stub_code', cleanCode)
    .maybeSingle();

  if (error) throw error;
  return data;
}
