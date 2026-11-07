import { supabase } from './supabase.js';

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
  const { data, error } = await supabase
    .from(ASSIGNMENTS_TABLE)
    .select('id, barangay, purok, center_id, backup_center_id, notes, created_at, updated_at')
    .order('barangay', { ascending: true })
    .order('purok', { ascending: true });

  if (error) throw error;
  return data || [];
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
    .select('id, barangay, purok, center_id, backup_center_id, notes, created_at, updated_at')
    .single();

  if (error) throw error;
  return data;
}

export async function saveBarangayEvacuationAssignment({
  id = null,
  barangay,
  purok,
  centerId,
  backupCenterId = null,
}) {
  const cleanBarangay = String(barangay || '').trim();
  const cleanPurok = String(purok || '').trim();

  if (!cleanBarangay) throw new Error('Enter a barangay.');
  if (!cleanPurok) throw new Error('Enter a purok or choose All Puroks.');
  if (!centerId) throw new Error('Choose a primary evacuation center.');
  if (backupCenterId && backupCenterId === centerId) {
    throw new Error('The backup center must be different from the primary center.');
  }

  const payload = {
    barangay: cleanBarangay,
    purok: cleanPurok.toLowerCase() === 'all' ? 'ALL' : cleanPurok,
    center_id: centerId,
    backup_center_id: backupCenterId || null,
  };

  const matches = await findAssignmentPair(payload.barangay, payload.purok);
  const otherAssignments = id
    ? matches.filter((assignment) => assignment.id !== id)
    : matches;

  if (otherAssignments.length > 1) {
    throw new Error('Multiple assignments already exist for this barangay and purok. Remove the duplicates before saving.');
  }
  if (otherAssignments.length === 1) {
    if (id) throw new Error('An assignment already exists for this barangay and purok. Edit that assignment instead.');
    return updateAssignment(otherAssignments[0].id, payload);
  }
  if (id) return updateAssignment(id, payload);

  const { data, error } = await supabase
    .from(ASSIGNMENTS_TABLE)
    .insert(payload)
    .select('id, barangay, purok, center_id, backup_center_id, notes, created_at, updated_at')
    .single();

  if (!error) return data;
  if (error.code !== '23505') throw error;

  const concurrentMatches = await findAssignmentPair(payload.barangay, payload.purok);
  if (concurrentMatches.length === 1) {
    return updateAssignment(concurrentMatches[0].id, payload);
  }
  if (concurrentMatches.length > 1) {
    throw new Error('Multiple assignments already exist for this barangay and purok. Remove the duplicates before saving.');
  }
  throw error;
}

export async function deleteBarangayEvacuationAssignment(id) {
  const { error } = await supabase
    .from(ASSIGNMENTS_TABLE)
    .delete()
    .eq('id', id);

  if (error) throw error;
}
