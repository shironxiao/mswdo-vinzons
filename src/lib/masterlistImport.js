import * as XLSX from 'xlsx';
import { supabase } from './supabase.js';

/**
 * Parses an Excel/CSV file and returns an array of household objects.
 * Expected columns (case‑insensitive):
 *   HeadName, HeadAge, HeadSex, Barangay, Purok, Center, Room,
 *   Vulnerabilities (comma‑separated),
 *   Members (JSON string or semi‑colon delimited "Name|Age|Sex|Vuln1,Vuln2"),
 *   // Additional optional columns can be ignored.
 */
export async function parseMasterlistFile(file) {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  return rows.map((row, idx) => {
    const membersRaw = row.Members || '';
    const members = membersRaw
      .split(';')
      .filter(Boolean)
      .map((m) => {
        const [name, age, sex, vulns] = m.split('|').map((s) => s.trim());
        return {
          name: name || `Member ${idx}`,
          age: Number(age) || null,
          sex: sex || 'Unknown',
          vulnerabilities: vulns ? vulns.split(',').map((v) => v.trim()) : [],
        };
      });

    const vulns = row.Vulnerabilities
      ? row.Vulnerabilities.split(',').map((v) => v.trim())
      : [];

    return {
      head_name: row.HeadName || `Head ${idx}`,
      head_age: Number(row.HeadAge) || null,
      head_sex: row.HeadSex || 'Unknown',
      barangay: row.Barangay || '',
      purok: row.Purok || '',
      center: row.Center || '',
      room: row.Room || '',
      vulnerabilities: vulns,
      members,
    };
  });
}

/**
 * Bulk inserts parsed households into Supabase.
 * The function does **not** require center_id / room_id – they are left null.
 */
export async function importMasterlist(file) {
  const households = await parseMasterlistFile(file);
  const { error } = await supabase.from('households').insert(
    households.map((h) => ({
      head_name: h.head_name,
      head_age: h.head_age,
      head_sex: h.head_sex,
      barangay: h.barangay,
      purok: h.purok,
      center: h.center,
      room: h.room,
      vulnerabilities: h.vulnerabilities,
    }))
  );

  if (error) {
    console.error('Masterlist import error:', error);
    throw error;
  }
  // Insert members separately (many‑to‑one relationship)
  for (const [hhIdx, hh] of households.entries()) {
    const { data: inserted } = await supabase
      .from('households')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    const householdId = inserted?.id;
    if (!householdId) continue;
    const memberRows = hh.members.map((m) => ({
      household_id: householdId,
      full_name: m.name,
      age: m.age,
      sex: m.sex,
      vulnerabilities: m.vulnerabilities,
    }));
    await supabase.from('household_members').insert(memberRows);
  }
  return households.length;
}
