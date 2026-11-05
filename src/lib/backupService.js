import * as XLSX from 'xlsx';
import { supabase } from './supabase.js';

/**
 * Fetches all operational data from Supabase (or localStorage fallback)
 */
export async function fetchFullDatabaseSnapshot() {
  const snapshot = {
    exportedAt: new Date().toISOString(),
    municipality: 'Vinzons, Camarines Norte',
    tables: {
      households: [],
      household_members: [],
      evacuation_centers: [],
      rooms: [],
      room_placements: [],
      relief_goods_stubs: [],
      evacuee_monitoring_logs: [],
      evacuation_events: [],
      user_accounts: [],
    },
  };

  try {
    const [
      hhRes,
      memRes,
      ecRes,
      rmRes,
      rpRes,
      stbRes,
      logRes,
      evRes,
      usrRes,
    ] = await Promise.allSettled([
      supabase.from('households').select('*'),
      supabase.from('household_members').select('*'),
      supabase.from('evacuation_centers').select('*'),
      supabase.from('rooms').select('*'),
      supabase.from('room_placements').select('*'),
      supabase.from('relief_goods_stubs').select('*'),
      supabase.from('evacuee_monitoring_logs').select('*'),
      supabase.from('evacuation_events').select('*'),
      supabase.from('user_accounts').select('id, email, full_name, role, status, created_at'),
    ]);

    if (hhRes.status === 'fulfilled' && hhRes.value.data) {
      snapshot.tables.households = hhRes.value.data;
    }
    if (memRes.status === 'fulfilled' && memRes.value.data) {
      snapshot.tables.household_members = memRes.value.data;
    }
    if (ecRes.status === 'fulfilled' && ecRes.value.data) {
      snapshot.tables.evacuation_centers = ecRes.value.data;
    }
    if (rmRes.status === 'fulfilled' && rmRes.value.data) {
      snapshot.tables.rooms = rmRes.value.data;
    }
    if (rpRes.status === 'fulfilled' && rpRes.value.data) {
      snapshot.tables.room_placements = rpRes.value.data;
    }
    if (stbRes.status === 'fulfilled' && stbRes.value.data) {
      snapshot.tables.relief_goods_stubs = stbRes.value.data;
    }
    if (logRes.status === 'fulfilled' && logRes.value.data) {
      snapshot.tables.evacuee_monitoring_logs = logRes.value.data;
    }
    if (evRes.status === 'fulfilled' && evRes.value.data) {
      snapshot.tables.evacuation_events = evRes.value.data;
    }
    if (usrRes.status === 'fulfilled' && usrRes.value.data) {
      snapshot.tables.user_accounts = usrRes.value.data;
    }
  } catch (err) {
    console.warn('Network issue fetching live database, using cached local data:', err);
  }

  // Fallback to local storage if households is empty
  if (snapshot.tables.households.length === 0) {
    try {
      const cachedHH = localStorage.getItem('vinzons_cached_households');
      if (cachedHH) {
        snapshot.tables.households = JSON.parse(cachedHH);
      }
    } catch {
      // ignore
    }
  }

  return snapshot;
}

/**
 * Generates and downloads a multi-sheet Excel (.xlsx) file containing all tables
 */
export async function downloadExcelBackup() {
  const snapshot = await fetchFullDatabaseSnapshot();
  const wb = XLSX.utils.book_new();

  // 1. Households Sheet
  const householdsData = (snapshot.tables.households || []).map((h) => ({
    'Household ID': h.id,
    'Household Code': h.household_code || '',
    'Head Full Name': h.head_name || h.name || '',
    'Age': h.head_age || h.age || '',
    'Sex': h.head_sex || h.sex || '',
    'Barangay': h.barangay || '',
    'Purok': h.purok || '',
    'Evacuee Status': h.evacuee_status || h.evacueeStatus || 'Not Active',
    'Vulnerabilities': Array.isArray(h.vulnerabilities) ? h.vulnerabilities.join(', ') : '',
    'Center': h.center?.name || h.center || '',
    'Room': h.room?.room_name || h.room || '',
    'Stub Code': h.stub_code || h.stubCode || '',
    'Stub Issued': h.stub_issued ? 'Yes' : 'No',
    'Created At': h.created_at || '',
  }));
  const wsHouseholds = XLSX.utils.json_to_sheet(householdsData);
  XLSX.utils.book_append_sheet(wb, wsHouseholds, 'Households');

  // 2. Household Members Sheet
  const membersData = (snapshot.tables.household_members || []).map((m) => ({
    'Member ID': m.id,
    'Household ID': m.household_id,
    'Full Name': m.full_name || m.name,
    'Age': m.age,
    'Age Unit': m.age_unit || 'Years',
    'Sex': m.sex,
    'Relationship to Head': m.relationship_to_head || m.relationship || '',
    'Is Head': m.is_household_head ? 'Yes' : 'No',
    'Vulnerabilities': Array.isArray(m.vulnerabilities) ? m.vulnerabilities.join(', ') : '',
  }));
  const wsMembers = XLSX.utils.json_to_sheet(membersData);
  XLSX.utils.book_append_sheet(wb, wsMembers, 'Family Members');

  // 3. Evacuation Centers Sheet
  const centersData = (snapshot.tables.evacuation_centers || []).map((c) => ({
    'Center ID': c.id,
    'Center Name': c.name,
    'Location': c.location,
    'Total Rooms': c.total_rooms,
    'Capacity': c.capacity,
    'Status': c.status || 'Active',
  }));
  const wsCenters = XLSX.utils.json_to_sheet(centersData);
  XLSX.utils.book_append_sheet(wb, wsCenters, 'Evacuation Centers');

  // 4. Room Placements Sheet
  const placementsData = (snapshot.tables.room_placements || []).map((p) => ({
    'Placement ID': p.id,
    'Household ID': p.household_id,
    'Event ID': p.event_id,
    'Center ID': p.center_id,
    'Room ID': p.room_id,
    'Status': p.status,
    'Checked In At': p.checked_in_at,
    'Decamped At': p.decamped_at || '',
  }));
  const wsPlacements = XLSX.utils.json_to_sheet(placementsData);
  XLSX.utils.book_append_sheet(wb, wsPlacements, 'Room Placements');

  // 5. Relief Stubs Sheet
  const stubsData = (snapshot.tables.relief_goods_stubs || []).map((s) => ({
    'Stub ID': s.id,
    'Stub Code': s.stub_code,
    'Household ID': s.household_id,
    'Event ID': s.event_id,
    'Issued': s.issued ? 'Yes' : 'No',
    'Issued At': s.issued_at || '',
    'Issued By': s.issued_by || '',
  }));
  const wsStubs = XLSX.utils.json_to_sheet(stubsData);
  XLSX.utils.book_append_sheet(wb, wsStubs, 'Relief Stubs');

  // 6. Monitoring Logs Sheet
  const logsData = (snapshot.tables.evacuee_monitoring_logs || []).map((l) => ({
    'Log ID': l.id,
    'Household ID': l.household_id,
    'Event ID': l.event_id,
    'Room Placement ID': l.room_placement_id,
    'Family Head': l.family_head_name,
    'Attendance Status': l.attendance_status,
    'Relief Pack Issued': l.relief_pack_issued ? 'Yes' : 'No',
    'Logged At': l.logged_at || l.created_at,
    'Logged By': l.logged_by || '',
  }));
  const wsLogs = XLSX.utils.json_to_sheet(logsData);
  XLSX.utils.book_append_sheet(wb, wsLogs, 'Monitoring Logs');

  // Generate filename with date
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `MSWDO_Vinzons_Master_Backup_${dateStr}.xlsx`;

  XLSX.writeFile(wb, filename);

  return {
    filename,
    householdsCount: householdsData.length,
    membersCount: membersData.length,
    centersCount: centersData.length,
    timestamp: new Date().toLocaleString(),
  };
}

/**
 * Generates and downloads a raw JSON (.json) snapshot file
 */
export async function downloadJsonBackup() {
  const snapshot = await fetchFullDatabaseSnapshot();
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `MSWDO_Vinzons_Raw_Backup_${dateStr}.json`;

  const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
    type: 'application/json;charset=utf-8',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return {
    filename,
    recordsCount:
      (snapshot.tables.households?.length || 0) +
      (snapshot.tables.household_members?.length || 0) +
      (snapshot.tables.evacuation_centers?.length || 0),
    timestamp: new Date().toLocaleString(),
  };
}
