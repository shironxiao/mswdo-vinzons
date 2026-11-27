import { supabase } from './supabase.js';
import { db, isOnline } from './offlineDb.js';

const ASSIGNMENTS_TABLE = 'barangay_evacuation_assignments';

function normalizeLocationValue(value) {
  return String(value || '').trim().toLowerCase();
}

function findMatchingAssignments(rows, barangay, purok) {
  const normalizedBarangay = normalizeLocationValue(barangay);
  const normalizedPurok = normalizeLocationValue(purok);
  return rows.filter((row) =>
    normalizeLocationValue(row.barangay) === normalizedBarangay &&
    normalizeLocationValue(row.purok) === normalizedPurok
  );
}

export async function fetchBarangayEvacuationAssignments() {
  if (!isOnline()) {
    try {
      const cached = await db.barangay_assignments.toArray();
      return cached;
    } catch {
      return [];
    }
  }

  try {
    const { data, error } = await supabase
      .from(ASSIGNMENTS_TABLE)
      .select('id, barangay, purok, center_id, center_ids, notes, created_at, updated_at')
      .order('barangay', { ascending: true })
      .order('purok', { ascending: true });

    if (error) throw error;
    const normalized = (data || []).map((assignment) => ({
      ...assignment,
      center_ids: Array.isArray(assignment.center_ids) && assignment.center_ids.length
        ? assignment.center_ids
        : [assignment.center_id].filter(Boolean),
    }));

    try {
      await db.barangay_assignments.clear();
      if (normalized.length > 0) {
        await db.barangay_assignments.bulkPut(normalized);
      }
    } catch (cacheErr) {
      console.warn('Could not cache barangay assignments in Dexie:', cacheErr);
    }

    return normalized;
  } catch (err) {
    console.warn('Network error fetching barangay assignments, using Dexie cache:', err);
    try {
      const cached = await db.barangay_assignments.toArray();
      if (cached.length > 0) return cached;
    } catch {}
    throw err;
  }
}

async function findAssignmentPair(barangay, purok) {
  const rows = await fetchBarangayEvacuationAssignments();
  return findMatchingAssignments(rows, barangay, purok);
}

async function updateAssignment(id, payload) {
  const { data, error } = await supabase
    .from(ASSIGNMENTS_TABLE)
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, barangay, purok, center_id, center_ids, notes, created_at, updated_at')
    .single();

  if (error) throw error;
  return data;
}

export async function saveBarangayEvacuationAssignment({
  id = null,
  barangay,
  purok,
  centerIds = [],
}) {
  const cleanBarangay = String(barangay || '').trim();
  const cleanPurok = String(purok || '').trim();
  const cleanCenterIds = [...new Set(centerIds.map((centerId) => String(centerId || '').trim()).filter(Boolean))];

  if (!cleanBarangay) throw new Error('Enter a barangay.');
  if (!cleanPurok) throw new Error('Enter a purok or choose All Puroks.');
  if (cleanCenterIds.length === 0) throw new Error('Choose at least one evacuation center.');

  const payload = {
    barangay: cleanBarangay,
    purok: cleanPurok.toLowerCase() === 'all' ? 'ALL' : cleanPurok,
    center_id: cleanCenterIds[0],
    center_ids: cleanCenterIds,
  };

  const matches = await findAssignmentPair(payload.barangay, payload.purok);
  if (matches.length > 1) {
    throw new Error('Multiple assignments already exist for this barangay and purok. Remove the duplicates before saving.');
  }
  if (id && matches.length === 1 && matches[0].id !== id) {
    throw new Error('An assignment already exists for this barangay and purok. Edit that assignment instead.');
  }

  let savedAssignment;
  if (id) {
    savedAssignment = await updateAssignment(id, payload);
  } else if (matches.length === 1) {
    savedAssignment = await updateAssignment(matches[0].id, payload);
  } else {
    const { data, error } = await supabase
      .from(ASSIGNMENTS_TABLE)
      .insert(payload)
      .select('id, barangay, purok, center_id, center_ids, notes, created_at, updated_at')
      .single();

    if (!error) {
      savedAssignment = data;
    } else if (error.code === '23505') {
      const concurrentMatches = await findAssignmentPair(payload.barangay, payload.purok);
      if (concurrentMatches.length !== 1) throw error;
      savedAssignment = await updateAssignment(concurrentMatches[0].id, payload);
    } else {
      throw error;
    }
  }

  return { ...savedAssignment, center_ids: cleanCenterIds };
}

export async function deleteBarangayEvacuationAssignment(id) {
  const { error } = await supabase
    .from(ASSIGNMENTS_TABLE)
    .delete()
    .eq('id', id);

  if (error) throw error;
}
