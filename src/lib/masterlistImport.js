import * as XLSX from 'xlsx';
import { supabase } from './supabase.js';

const normalizeKey = (value) => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

function getValue(row, ...aliases) {
  const entries = Object.entries(row);
  const matched = entries.find(([key]) => aliases.includes(normalizeKey(key)));
  return matched ? matched[1] : '';
}

function parseList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
}

function parseMemberValue(value, rowNumber) {
  if (!value) return [];
  if (Array.isArray(value)) return value;

  const text = String(value).trim();
  if (!text) return [];

  if (text.startsWith('[')) {
    try {
      const members = JSON.parse(text);
      if (!Array.isArray(members)) throw new Error('Expected a JSON array.');
      return members.map((member) => ({
        name: String(member.name || member.full_name || '').trim(),
        ageValue: Number(member.ageValue ?? member.age_value ?? member.age) || 0,
        ageUnit: member.ageUnit || member.age_unit || 'Years',
        sex: member.sex || 'Unknown',
        vulnerabilities: parseList(member.vulnerabilities),
      })).filter((member) => member.name);
    } catch (error) {
      throw new Error(
        `Row ${rowNumber}: Members must be valid JSON or use the documented pipe format. ${error.message}`,
        { cause: error }
      );
    }
  }

  return text.split(';').map((entry) => {
    const fields = entry.split('|').map((field) => field.trim());
    const [name, ageValue, third, fourth, fifth] = fields;
    const hasAgeUnit = ['year', 'years', 'month', 'months', 'day', 'days'].includes((third || '').toLowerCase());

    return {
      name: name || '',
      ageValue: Number(ageValue) || 0,
      ageUnit: hasAgeUnit ? third : 'Years',
      sex: hasAgeUnit ? fourth || 'Unknown' : third || 'Unknown',
      vulnerabilities: parseList(hasAgeUnit ? fifth : fourth),
    };
  }).filter((member) => member.name);
}

export async function parseMasterlistFile(file) {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!firstSheet) throw new Error('The workbook does not contain a worksheet.');

  const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
  const householdMap = new Map();

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const headName = String(getValue(row, 'headname', 'familyhead', 'householdhead', 'nameofhead', 'name')).trim();
    const memberName = String(getValue(row, 'membername', 'dependentname', 'nameofmember', 'fullname')).trim();
    if (!headName && !memberName) return;

    const householdCode = String(getValue(row, 'householdcode', 'familycode', 'householdid')).trim();
    const groupKey = householdCode || headName.toLowerCase();
    if (!groupKey) throw new Error(`Row ${rowNumber}: A household head name or household code is required.`);

    let household = householdMap.get(groupKey);
    if (!household) {
      household = {
        household_code: householdCode || null,
        head_name: headName,
        head_age: Number(getValue(row, 'headage', 'ageofhead', ...(!memberName ? ['age'] : []))) || 0,
        head_sex: String(getValue(row, 'headsex', 'sexofhead', ...(!memberName ? ['sex'] : [])) || 'Unknown').trim(),
        barangay: String(getValue(row, 'barangay', 'village') || '').trim(),
        purok: String(getValue(row, 'purok', 'sitio') || '').trim(),
        vulnerabilities: parseList(getValue(
          row,
          'headvulnerabilities',
          'householdvulnerabilities',
          ...(!memberName ? ['vulnerabilities'] : [])
        )),
        members: [],
      };
      householdMap.set(groupKey, household);
    } else if (headName && !household.head_name) {
      household.head_name = headName;
    }

    const listedMembers = parseMemberValue(getValue(row, 'members', 'familymembers', 'dependents'), rowNumber);
    household.members.push(...listedMembers);

    if (memberName) {
      household.members.push({
        name: memberName,
        ageValue: Number(getValue(row, 'memberagevalue', 'memberage', 'agevalue', 'age')) || 0,
        ageUnit: String(getValue(row, 'memberageunit', 'ageunit') || 'Years').trim(),
        sex: String(getValue(row, 'membersex', 'sex') || 'Unknown').trim(),
        vulnerabilities: parseList(getValue(row, 'membervulnerabilities', 'vulnerabilities')),
      });
    }
  });

  const households = [...householdMap.values()];
  if (households.length === 0) throw new Error('No household records were found. Check the first worksheet and its column headers.');
  if (households.some((household) => !household.head_name)) {
    throw new Error('Every imported household must include a family head name.');
  }
  return households;
}

export async function importMasterlist(file) {
  const households = await parseMasterlistFile(file);

  for (const [index, household] of households.entries()) {
    const { members, ...householdData } = household;
    const { data: inserted, error: householdError } = await supabase
      .from('households')
      .insert({
        ...householdData,
        head_age: householdData.head_age || null,
        barangay: householdData.barangay || 'Unassigned',
        purok: householdData.purok || 'Unassigned',
        center_id: null,
        room_id: null,
        evacuee_status: 'Decamped',
      })
      .select('id')
      .single();

    if (householdError) {
      throw new Error(`Could not import household "${household.head_name}" (record ${index + 1}): ${householdError.message}`);
    }

    const memberRows = members.map((member) => ({
      household_id: inserted.id,
      full_name: member.name,
      age: member.ageUnit.toLowerCase().startsWith('month') ? 0 : member.ageValue,
      age_value: member.ageValue,
      age_unit: member.ageUnit || 'Years',
      sex: member.sex || 'Unknown',
      relationship_to_head: 'MEMBER',
      is_household_head: false,
      vulnerabilities: member.vulnerabilities || [],
    }));

    if (memberRows.length > 0) {
      const { error: membersError } = await supabase.from('household_members').insert(memberRows);
      if (membersError) {
        throw new Error(`Household "${household.head_name}" was imported, but its members could not be saved: ${membersError.message}`);
      }
    }
  }

  return households.length;
}
