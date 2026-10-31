import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search, Activity, X, Clock, CheckCircle2, XCircle, ChevronDown,
  ChevronLeft, ChevronRight, SlidersHorizontal, AlertTriangle, Building,
  QrCode, Ticket, PackageCheck, User,
} from 'lucide-react';
import './MobileCommon.css';
import './MobileSubpages.css';
import './MobileHouseholds.css';
import './MobileMonitor.css';
import checkIcon from '../../assets/check.png';
import removeIcon from '../../assets/remove.png';
import {
  useEvacuationCenters,
  isCenterMatch,
  getRoomsForCenter,
} from '../../lib/evacuationCenters';
import { useHouseholds, issueHouseholdStub } from '../../lib/householdService.js';
import { useMonitoringLogs, recordMonitoringLog } from '../../lib/monitoringService.js';
import { CenterSelectSheet, RoomSelectSheet } from '../../components/CenterSelectSheet';
import QrScannerModal from '../../components/QrScannerModal';

const INITIAL_MONITOR_DATA = [
  {
    id: 1,
    name: 'Antonio Magno',
    center: 'LGU EC (Mangcaway)',
    room: 'Room 1',
    ratio: '4/4',
    timestamp: '9/17/2026, 5:00:00 PM',
    status: 'Recorded',
    members: ['Antonio Magno', 'Luz Magno', 'Pablo Magno', 'Sofia Magno'],
  },
  {
    id: 2,
    name: 'Rosa Santos',
    center: 'LGU EC (Mangcaway)',
    room: 'Room 2',
    ratio: '4/4',
    timestamp: '9/17/2026, 4:30:00 PM',
    status: 'Recorded',
    members: ['Rosa Santos', 'Pedro Santos', 'Maya Santos', 'Leo Santos'],
  },
  {
    id: 3,
    name: 'Patricia Cruz',
    center: 'LGU EC (Bliss)',
    room: 'Room 1',
    ratio: '0/3',
    timestamp: '9/17/2026, 1:00:00 PM',
    status: 'Absent',
    members: ['Patricia Cruz', 'Mark Cruz', 'Lina Cruz'],
  },
  {
    id: 4,
    name: 'Juan Dela Cruz',
    center: 'PLGU EC (Mat-I)',
    room: 'Room 1',
    ratio: '5/5',
    timestamp: '9/17/2026, 3:00:00 PM',
    status: 'Recorded',
    members: ['Juan Dela Cruz', 'Maria Dela Cruz', 'John Dela Cruz'],
  },
  {
    id: 5,
    name: 'Elena Bautista',
    center: 'Pinagtigasan EC',
    room: 'Room 1',
    ratio: '3/3',
    timestamp: '9/17/2026, 2:15:00 PM',
    status: 'Recorded',
    members: ['Elena Bautista', 'Carlos Bautista', 'Jenny Bautista'],
  },
  {
    id: 6,
    name: 'Roberto Diaz',
    center: 'St. Peter Parish AVR',
    room: 'Room 2',
    ratio: '2/2',
    timestamp: '9/17/2026, 1:45:00 PM',
    status: 'Recorded',
    members: ['Roberto Diaz', 'Clara Diaz'],
  },
  {
    id: 7,
    name: 'Carmen Ramos',
    center: 'Biday EC',
    room: 'Room 3',
    ratio: '0/4',
    timestamp: '9/17/2026, 12:30:00 PM',
    status: 'Absent',
    members: ['Carmen Ramos', 'Danilo Ramos', 'Mia Ramos', 'Leo Ramos'],
  },
  {
    id: 8,
    name: 'Fernando Lopez',
    center: 'Sugod EC',
    room: 'Room 2',
    ratio: '3/3',
    timestamp: '9/17/2026, 11:20:00 AM',
    status: 'Recorded',
    members: ['Fernando Lopez', 'Grace Lopez', 'Joy Lopez'],
  },
  {
    id: 9,
    name: 'Teresa Morales',
    center: 'Mormons',
    room: 'Room 1',
    ratio: '3/3',
    timestamp: '9/17/2026, 10:45:00 AM',
    status: 'Recorded',
    members: ['Teresa Morales', 'Ramon Morales', 'Ella Morales'],
  },
  {
    id: 10,
    name: 'Danilo Soriano',
    center: 'Marabe Church',
    room: 'Room 4',
    ratio: '0/2',
    timestamp: '9/17/2026, 10:15:00 AM',
    status: 'Absent',
    members: ['Danilo Soriano', 'Beth Soriano'],
  },
  {
    id: 11,
    name: 'Marites Villanueva',
    center: 'Adorno Fathers',
    room: 'Room 1',
    ratio: '3/3',
    timestamp: '9/17/2026, 9:30:00 AM',
    status: 'Recorded',
    members: ['Marites Villanueva', 'Joshua Villanueva', 'Hannah Villanueva'],
  },
  {
    id: 12,
    name: 'Gregorio Santos',
    center: 'Mangcawayan EC',
    room: 'Room 2',
    ratio: '0/2',
    timestamp: '9/17/2026, 9:00:00 AM',
    status: 'Absent',
    members: ['Gregorio Santos', 'Amparo Santos'],
  },
  {
    id: 13,
    name: 'Lorna Reyes',
    center: 'Our Lady of Fatima Shrine',
    room: 'Room 3',
    ratio: '4/4',
    timestamp: '9/17/2026, 8:30:00 AM',
    status: 'Recorded',
    members: ['Lorna Reyes', 'Ben Reyes', 'Kim Reyes', 'Chris Reyes'],
  },
  {
    id: 14,
    name: 'Mario Aguit',
    center: 'Brgy. Hall (Aguit-it)',
    room: 'Room 1',
    ratio: '2/2',
    timestamp: '9/17/2026, 8:00:00 AM',
    status: 'Recorded',
    members: ['Mario Aguit', 'Sandra Aguit'],
  },
];

/* Exactly 13 Official Vinzons Evacuation Centers */
const OFFICIAL_EVAC_CENTERS = [
  { name: 'LGU EC (Mangcaway)',          location: 'Mangcaway Brgy. Cal. Sur, Vinzons, CN' },
  { name: 'LGU EC (Bliss)',              location: 'Bliss Brgy. Cal Sur, VCN' },
  { name: 'PLGU EC (Mat-I)',             location: 'Mat – I Brgy. Sto. Domingo, VCN' },
  { name: 'Pinagtigasan EC',             location: 'P – 1 Brgy. Pinagtigasan, VCN' },
  { name: 'St. Peter Parish AVR',        location: 'Brgy Poblacion III' },
  { name: 'Biday EC',                    location: 'Brgy. Banocboc, VCN' },
  { name: 'Sugod EC',                    location: 'Brgy. Banocboc, VCN' },
  { name: 'Mormons',                     location: 'Brgy. Calangcawan Sur, VCN' },
  { name: 'Marabe Church',               location: 'Brgy. Calangcawan Sur, VCN' },
  { name: 'Adorno Fathers',              location: 'Sto. Domingo, VCN' },
  { name: 'Mangcawayan EC',              location: 'Mangcawayan Is., VCN' },
  { name: 'Our Lady of Fatima Shrine',   location: 'Mangcawayan Brgy. Calangawan Sur, VCN' },
  { name: 'Brgy. Hall (Aguit-it)',       location: 'Brgy. Aguit – it, VCN' },
];

const CENTERS = ['All Centers', ...OFFICIAL_EVAC_CENTERS.map((c) => c.name)];

/* Each center has 5 rooms */
const ROOMS = ['All Rooms', 'Room 1', 'Room 2', 'Room 3', 'Room 4', 'Room 5'];

export default function MobileMonitor() {
  const { centers } = useEvacuationCenters();
  const { households, refresh: refreshHouseholds } = useHouseholds(centers);
  const { logs, refresh: refreshLogs } = useMonitoringLogs(centers);
  const [attendanceOverrides, setAttendanceOverrides] = useState({});
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');     // 'All' | 'Present' | 'For Follow-up' | 'Absent' | 'Transferred'
  const [filterRelief, setFilterRelief] = useState('All');     // 'All' | 'Issued' | 'Not Issued'
  const [filterCenter, setFilterCenter] = useState('All Centers');
  const [filterRoom, setFilterRoom] = useState('All Rooms');
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [activeFamily, setActiveFamily] = useState(null);
  const [attendance, setAttendance] = useState({});
  const [checkInTimes, setCheckInTimes] = useState({});
  const [showScanner, setShowScanner] = useState(false);
  const [reliefScanModal, setReliefScanModal] = useState(null);
  const [toastMsg, setToastMsg] = useState('');
  const [monitorForm, setMonitorForm] = useState({
    interval: 'Every 2-3 hours',
    checkedBy: 'Brgy. Capt. Reyes',
    householdStatus: 'Present',
    remarks: '',
  });

  // Dynamic monitor records derived from live Supabase households & monitoring logs
  const records = useMemo(() => {
    if (!households || households.length === 0) return INITIAL_MONITOR_DATA;
    return households.map((h, idx) => {
      const allNames = [h.name, ...(h.members || []).map((m) => m.name || m)];
      const total = allNames.length;

      // Find most recent monitoring log for this household
      const latestLog = logs.find((l) => l.householdId === h.id);

      let status = 'Present';
      let ratio = `${total}/${total}`;
      let dateFormatted = h.createdAt
        ? new Date(h.createdAt).toLocaleString('en-US', {
            month: 'numeric',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          })
        : 'Registered';

      if (latestLog) {
        status = latestLog.householdStatus || 'Present';
        ratio = `${latestLog.presentCount}/${latestLog.totalMembers}`;
        dateFormatted = new Date(latestLog.createdAt).toLocaleString('en-US', {
          month: 'numeric',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
      }

      if (h.evacueeStatus === 'Decamped') {
        status = 'Decamped';
      }

      // Check for local optimistic override
      const override = attendanceOverrides[h.id];
      if (override) {
        status = override.status;
        ratio = override.ratio;
        if (override.timestamp) dateFormatted = override.timestamp;
      }

      return {
        id: h.id || idx + 1,
        householdId: h.id,
        centerId: h.centerId,
        roomId: h.roomId,
        name: h.name,
        center: h.center || 'LGU EC (Mangcaway)',
        room: h.room || 'Room 1',
        ratio,
        timestamp: dateFormatted,
        status,
        members: allNames,
        latestLog,
        stubCode: h.stubCode,
        stubIssued: !!h.stubIssued,
        stubIssuedAt: h.stubIssuedAt,
        vulnerabilities: h.vulnerabilities || [],
        evacueeStatus: h.evacueeStatus || 'Active',
      };
    });
  }, [households, logs, attendanceOverrides]);

  const activeFilters =
    (filterStatus !== 'All' ? 1 : 0) +
    (filterRelief !== 'All' ? 1 : 0) +
    (filterCenter !== 'All Centers' ? 1 : 0) +
    (filterRoom !== 'All Rooms' ? 1 : 0);

  const filtered = records.filter((r) => {
    const matchSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.center.toLowerCase().includes(search.toLowerCase()) ||
      r.room.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      filterStatus === 'All' ||
      (filterStatus === 'Present' && (r.status === 'Present' || r.status === 'Recorded')) ||
      (filterStatus === 'For Follow-up' && r.status === 'For Follow-up') ||
      (filterStatus === 'Absent' && r.status === 'Absent') ||
      (filterStatus === 'Transferred' && r.status === 'Transferred');
    const matchRelief =
      filterRelief === 'All' ||
      (filterRelief === 'Issued' && r.stubIssued) ||
      (filterRelief === 'Not Issued' && !r.stubIssued);
    const matchCenter = isCenterMatch(r.center, filterCenter, centers);
    const matchRoom =
      filterRoom === 'All Rooms' ||
      r.room === filterRoom ||
      `Room ${r.room}` === filterRoom;
    return matchSearch && matchStatus && matchRelief && matchCenter && matchRoom;
  });

  /* ── Pagination ── */
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterStatus, filterRelief, filterCenter, filterRoom]);
  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedRecords = filtered.slice(startIndex, startIndex + pageSize);

  const openMonitoringSheet = (family) => {
    setActiveFamily(family);
    const now = new Date();
    const currentTimeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    // Look up previous log for this family if any
    const prevLog = logs.find((l) => l.householdId === (family.householdId || family.id));
    const initAttendance = {};
    const initTimes = {};

    family.members.forEach((m) => {
      const prevMem = prevLog?.membersAttendance?.find((item) => item.name === m);
      const memStatus = prevMem ? prevMem.status : 'Accounted For';
      initAttendance[m] = memStatus;
      initTimes[m] = memStatus !== 'Absent' ? (prevMem?.check_in_time || currentTimeStr) : null;
    });

    setAttendance(initAttendance);
    setCheckInTimes(initTimes);
    setMonitorForm({
      interval: 'Every 2-3 hours',
      checkedBy: prevLog?.checkedBy || 'Brgy. Capt. Reyes',
      householdStatus: prevLog ? prevLog.householdStatus : 'Present',
      remarks: '',
    });
  };

  const handleToggleMember = (member, key) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const updated = { ...attendance, [member]: key };
    setAttendance(updated);

    setCheckInTimes((prev) => ({
      ...prev,
      [member]: key === 'Absent' ? null : (prev[member] || timeStr),
    }));

    // Auto-suggest household status based on member attendance
    const hasAbsent = Object.values(updated).some((s) => s === 'Absent');
    const hasLate = Object.values(updated).some((s) => s === 'Late');
    if (hasAbsent || hasLate) {
      setMonitorForm((prev) => ({ ...prev, householdStatus: 'For Follow-up' }));
    } else {
      setMonitorForm((prev) => ({ ...prev, householdStatus: 'Present' }));
    }
  };

  const handleSaveUpdate = async () => {
    if (!activeFamily) return;
    const presentCount = Object.values(attendance).filter((s) => s === 'Accounted For').length;
    const lateCount = Object.values(attendance).filter((s) => s === 'Late').length;
    const absentCount = Object.values(attendance).filter((s) => s === 'Absent').length;
    const totalCount = activeFamily.members.length;

    // Optimistic local override
    setAttendanceOverrides((prev) => ({
      ...prev,
      [activeFamily.id]: {
        status: monitorForm.householdStatus,
        ratio: `${presentCount + lateCount}/${totalCount}`,
        timestamp: 'Just now',
      },
    }));

    const familyToSave = activeFamily;
    setActiveFamily(null);

    try {
      await recordMonitoringLog({
        householdId: familyToSave.householdId || familyToSave.id,
        centerId: familyToSave.centerId,
        roomId: familyToSave.roomId,
        monitoringInterval: monitorForm.interval,
        checkedBy: monitorForm.checkedBy,
        householdStatus: monitorForm.householdStatus,
        membersAttendance: familyToSave.members.map((m) => ({
          name: m,
          status: attendance[m] || 'Accounted For',
          check_in_time: checkInTimes[m] || null,
        })),
        totalMembers: totalCount,
        presentCount: presentCount + lateCount,
        absentCount,
        lateCount,
        remarks: monitorForm.remarks,
      });
      refreshLogs();
    } catch (err) {
      console.warn('Could not save monitoring log to Supabase:', err);
    }
  };

  /* ── Relief Distribution QR Scan Handler ── */
  const handleReliefScan = useCallback((code) => {
    setShowScanner(false);
    const trimmed = (code || '').trim();
    if (!trimmed) return;

    const found = households.find((h) =>
      (h.stubCode && h.stubCode.toLowerCase() === trimmed.toLowerCase()) ||
      String(h.id) === trimmed ||
      (h.householdCode && h.householdCode.toLowerCase() === trimmed.toLowerCase())
    );

    if (!found) {
      setReliefScanModal({
        status: 'not-found',
        code: trimmed,
        errorMsg: `No registered household matches QR code: "${trimmed}"`,
      });
      return;
    }

    const isDecamped = found.evacueeStatus === 'Decamped';
    const isUnassigned = !found.center || found.center === 'Unassigned' || found.room === 'Unassigned';

    if (isDecamped || isUnassigned) {
      setReliefScanModal({
        household: found,
        status: 'not-active',
        errorMsg: isDecamped
          ? `Cannot issue relief pack: ${found.name}'s family has officially Decamped (Checked out) from the evacuation center.`
          : `Cannot issue relief pack: ${found.name}'s family is not currently checked in to any evacuation room.`,
      });
      return;
    }

    if (found.stubIssued) {
      setReliefScanModal({
        household: found,
        status: 'already-issued',
      });
      return;
    }

    setReliefScanModal({
      household: found,
      status: 'eligible',
    });
  }, [households]);

  /* ── Mark All Members Accounted For (Quick floor round helper) ── */
  const handleMarkAllAccounted = () => {
    if (!activeFamily) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const updatedAtt = {};
    const updatedTimes = {};
    activeFamily.members.forEach((m) => {
      updatedAtt[m] = 'Accounted For';
      updatedTimes[m] = timeStr;
    });
    setAttendance(updatedAtt);
    setCheckInTimes(updatedTimes);
    setMonitorForm((prev) => ({ ...prev, householdStatus: 'Present' }));
  };

  /* ── Confirm Relief Pack Distribution ── */
  const handleConfirmIssueRelief = async (hhId) => {
    try {
      await issueHouseholdStub(hhId);
      if (refreshHouseholds) refreshHouseholds();
      
      // Also update activeFamily if currently open
      if (activeFamily && (activeFamily.householdId === hhId || activeFamily.id === hhId)) {
        setActiveFamily((prev) => prev ? { ...prev, stubIssued: true } : null);
      }

      setReliefScanModal((prev) => prev ? { ...prev, status: 'issued-success' } : null);
      setToastMsg(`✓ Relief pack marked as ISSUED successfully!`);
      setTimeout(() => setToastMsg(''), 4000);
    } catch (err) {
      console.warn('Error issuing relief stub:', err);
      setToastMsg(`Failed to mark stub: ${err.message || 'Error updating status'}`);
      setTimeout(() => setToastMsg(''), 4000);
    }
  };

  return (
    <div className="vin-mob-page">
      {/* Floating Toast notification */}
      {toastMsg && (
        <div className="vin-room-toast">
          <CheckCircle2 size={16} />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <header className="vin-mob-header">
        <div className="vin-mob-header-info">
          <h1 className="vin-mob-title">Evacuee Monitoring</h1>
          <p className="vin-mob-subtitle">
            {records.filter((r) => r.status === 'Present' || r.status === 'Recorded').length} Present •{' '}
            {records.filter((r) => r.stubIssued).length}/{records.length} Relief Distributed
          </p>
        </div>
      </header>

      {/* Search + Scan Toolbar */}
      <div className="vin-hh-toolbar">
        <div className="vin-mob-search-wrapper" style={{ flex: 1, marginBottom: 0 }}>
          <Search size={18} className="vin-mob-search-icon" />
          <input
            type="text"
            placeholder="Search family or room…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="vin-mob-search-input"
          />
        </div>
        <button
          type="button"
          className="vin-hh-scan-btn"
          onClick={() => { setReliefScanModal(null); setShowScanner(true); }}
          title="Scan Relief Goods Stub"
        >
          <QrCode size={18} /> Scan Relief
        </button>
      </div>

      {/* Filter Bar — single Filters button + active chips */}
      <div className="vin-mon-filter-bar">
        {/* Filters trigger button */}
        <button
          type="button"
          className={`vin-hh-filters-trigger ${activeFilters > 0 ? 'active' : ''}`}
          onClick={() => setShowFilterSheet(true)}
        >
          <SlidersHorizontal size={14} className="vin-hh-filters-trigger-icon" />
          <span>Filters</span>
          {activeFilters > 0 && (
            <span className="vin-hh-filters-trigger-badge">{activeFilters}</span>
          )}
        </button>

        {/* Active filter chips */}
        {filterStatus !== 'All' && (
          <button
            type="button"
            className="vin-hh-active-chip"
            onClick={() => setFilterStatus('All')}
          >
            <span>{filterStatus}</span>
            <X size={13} className="vin-hh-chip-close" />
          </button>
        )}
        {filterRelief !== 'All' && (
          <button
            type="button"
            className="vin-hh-active-chip"
            onClick={() => setFilterRelief('All')}
          >
            <span>Relief: {filterRelief}</span>
            <X size={13} className="vin-hh-chip-close" />
          </button>
        )}
        {filterCenter !== 'All Centers' && (
          <button
            type="button"
            className="vin-hh-active-chip"
            onClick={() => setFilterCenter('All Centers')}
          >
            <span>{filterCenter.split(' ').slice(0, 2).join(' ')}</span>
            <X size={13} className="vin-hh-chip-close" />
          </button>
        )}
        {filterRoom !== 'All Rooms' && (
          <button
            type="button"
            className="vin-hh-active-chip"
            onClick={() => setFilterRoom('All Rooms')}
          >
            <span>{filterRoom}</span>
            <X size={13} className="vin-hh-chip-close" />
          </button>
        )}

        {/* Result count pushed right */}
        <span style={{ marginLeft: 'auto', fontSize: '.78rem', color: '#64748b' }}>
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Legend */}
      <div className="vin-mon-legend" style={{ flexWrap: 'wrap', gap: 10 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <CheckCircle2 size={14} color="#7c3aed" /> Present
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <AlertTriangle size={14} color="#b45309" /> For Follow-up
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <XCircle size={14} color="#9c4444" /> Absent
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 8 }}>
          <img src={checkIcon} alt="" style={{ width: 14, height: 14 }} /> Relief Issued
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <img src={removeIcon} alt="" style={{ width: 14, height: 14 }} /> Not Issued
        </span>
      </div>

      {/* ── MONITOR DATA TABLE ── */}
      <div className="vin-mob-table-card">
        <div className="vin-mob-table-responsive">
          <table className="vin-mob-table">
            <thead>
              <tr>
                <th>FAMILY HEAD</th>
                <th style={{ textAlign: 'right' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={2} className="vin-mob-table-empty">
                    No families match the current filter.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((item) => {
                  const statusKey = item.status === 'Recorded' ? 'Present' : item.status;
                  let iconCls = 'present';
                  let badgeCls = 'badge-present';
                  let IconComp = CheckCircle2;

                  if (statusKey === 'For Follow-up') {
                    iconCls = 'followup';
                    badgeCls = 'badge-followup';
                    IconComp = AlertTriangle;
                  } else if (statusKey === 'Transferred') {
                    iconCls = 'transferred';
                    badgeCls = 'badge-transferred';
                    IconComp = Building;
                  } else if (statusKey === 'Decamped') {
                    iconCls = 'decamped';
                    badgeCls = 'badge-decamped';
                    IconComp = Clock;
                  } else if (statusKey === 'Absent') {
                    iconCls = 'absent';
                    badgeCls = 'badge-absent';
                    IconComp = XCircle;
                  }

                  return (
                    <tr
                      key={item.id}
                      onClick={() => openMonitoringSheet(item)}
                      className="vin-mob-table-row"
                    >
                      <td>
                        <div className="vin-mob-td-name">
                          <div className={`vin-mon-table-icon ${iconCls}`}>
                            <IconComp size={16} />
                          </div>
                          <div className="vin-mob-head-details">
                            <div className="vin-mob-head-name">{item.name}</div>
                            <div className="vin-mob-head-sub">
                              <span>Room {item.room}</span>
                              <span className="vin-mob-sub-dot">•</span>
                              <span>{item.center.split(' ').slice(0, 2).join(' ')}</span>
                            </div>
                            <div className="vin-mob-head-badges" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                              <span className={`vin-mon-tile-badge ${badgeCls}`}>
                                {statusKey} ({item.ratio})
                              </span>
                              <span className={item.stubIssued ? 'vin-hh-badge-issued' : 'vin-hh-badge-notissued'}>
                                <img
                                  src={item.stubIssued ? checkIcon : removeIcon}
                                  alt=""
                                  className="vin-badge-img-icon"
                                />
                                <span>{item.stubIssued ? 'Relief Issued' : 'No Relief'}</span>
                              </span>
                              <span className="vin-mon-table-time">{item.timestamp}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>
                        <button
                          type="button"
                          className="vin-mob-row-btn update"
                          onClick={(e) => {
                            e.stopPropagation();
                            openMonitoringSheet(item);
                          }}
                        >
                          Update
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── STICKY PAGINATION CONTROLS ── */}
        {filtered.length > 0 && (
          <div className="vin-mob-pagination">
            <span className="vin-mob-pagination-info">
              Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
            </span>
            <div className="vin-mob-pagination-btns">
              <button
                type="button"
                className="vin-mob-page-btn vin-mob-page-nav"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                aria-label="Previous page"
              >
                <ChevronLeft size={16} /> Prev
              </button>
              <button
                type="button"
                className="vin-mob-page-btn vin-mob-page-nav"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Next page"
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ATTENDANCE SHEET */}
      {activeFamily && (
        <div className="vin-mob-sheet-overlay" onClick={() => setActiveFamily(null)}>
          <div className="vin-mob-sheet-content" onClick={(e) => e.stopPropagation()}>
            <div className="vin-mob-sheet-header">
              <div>
                <h2 className="vin-mob-sheet-title">Evacuee Monitoring</h2>
                <span style={{ fontSize: '.78rem', color: '#64748b' }}>
                  {activeFamily.center} • {activeFamily.room}
                </span>
              </div>
              <button type="button" className="vin-mob-sheet-close" onClick={() => setActiveFamily(null)}>
                <X size={18} />
              </button>
            </div>

            <h3 style={{ margin: '4px 0 10px', fontSize: '1.05rem', fontWeight: 800 }}>
              {activeFamily.name}
            </h3>

            {/* Quick Relief pack issuance banner */}
            <div style={{
              margin: '0 0 14px',
              padding: '10px 14px',
              borderRadius: 12,
              background: activeFamily.stubIssued ? '#f0fdf4' : '#fefce8',
              border: `1px solid ${activeFamily.stubIssued ? '#bbf7d0' : '#fef08a'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10
            }}>
              <div>
                <div style={{
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: activeFamily.stubIssued ? '#15803d' : '#854d0e',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}>
                  {activeFamily.stubIssued ? <CheckCircle2 size={15} /> : <Ticket size={15} />}
                  <span>Relief Pack: {activeFamily.stubIssued ? 'Issued' : 'Not Issued'}</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>
                  Stub: <strong>{activeFamily.stubCode || 'N/A'}</strong>
                </div>
              </div>
              {!activeFamily.stubIssued && (
                <button
                  type="button"
                  onClick={() => handleConfirmIssueRelief(activeFamily.householdId || activeFamily.id)}
                  style={{
                    background: '#7c3aed',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '6px 12px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Mark Issued
                </button>
              )}
            </div>

            <div className="vin-mob-input-group">
              <label className="vin-mob-input-label">MONITORING INTERVAL</label>
              <input
                type="text"
                className="vin-mob-select"
                value={monitorForm.interval}
                onChange={(e) => setMonitorForm((f) => ({ ...f, interval: e.target.value }))}
              />
            </div>
            <div className="vin-mob-input-group" style={{ marginTop: 12 }}>
              <label className="vin-mob-input-label">CHECKED BY</label>
              <input
                type="text"
                className="vin-mob-select"
                value={monitorForm.checkedBy}
                onChange={(e) => setMonitorForm((f) => ({ ...f, checkedBy: e.target.value }))}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '16px 0 8px' }}>
              <h4 style={{ margin: 0, fontSize: '.92rem', fontWeight: 800 }}>
                Members Attendance
              </h4>
              <button
                type="button"
                onClick={handleMarkAllAccounted}
                style={{
                  background: '#f3e8ff',
                  border: '1px solid #ddd6fe',
                  color: '#6b21a8',
                  borderRadius: '8px',
                  padding: '4px 10px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <CheckCircle2 size={13} />
                All Present
              </button>
            </div>

            {activeFamily.members.map((member) => (
              <div key={member} className="vin-mob-profile-card" style={{ padding: 14, gap: 10 }}>
                <span style={{ fontWeight: 700, fontSize: '.95rem' }}>{member}</span>
                <div className="vin-mob-attendance-group">
                  {[
                    { key: 'Accounted For', cls: 'active-accounted' },
                    { key: 'Late',           cls: 'active-late'      },
                    { key: 'Absent',         cls: 'active-absent'    },
                  ].map(({ key, cls }) => (
                    <button
                      key={key}
                      type="button"
                      className={`vin-mob-att-btn ${attendance[member] === key ? cls : ''}`}
                      onClick={() => handleToggleMember(member, key)}
                    >
                      {key}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748b', fontSize: '.78rem' }}>
                  <span>CHECK-IN TIME</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={14} />
                    {checkInTimes[member] || '--:-- --'}
                  </span>
                </div>
              </div>
            ))}

            {/* Household Status selector */}
            <div className="vin-mob-input-group" style={{ marginTop: 12 }}>
              <label className="vin-mob-input-label">HOUSEHOLD STATUS</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['Present', 'For Follow-up', 'Transferred', 'Decamped'].map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`vin-hh-filter-pill ${monitorForm.householdStatus === s ? 'active' : ''}`}
                    onClick={() => setMonitorForm((f) => ({ ...f, householdStatus: s }))}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Remarks */}
            <div className="vin-mob-input-group" style={{ marginTop: 12 }}>
              <label className="vin-mob-input-label">REMARKS (optional)</label>
              <textarea
                className="vin-mob-select"
                rows={2}
                style={{ resize: 'none' }}
                placeholder="e.g. Member went to check house, returned later"
                value={monitorForm.remarks}
                onChange={(e) => setMonitorForm((f) => ({ ...f, remarks: e.target.value }))}
              />
            </div>

            <button
              type="button"
              className="vin-mob-sheet-submit-btn"
              onClick={handleSaveUpdate}
              style={{ marginTop: 12 }}
            >
              Save Monitoring Update
            </button>

            {/* Monitoring History from DB */}
            <div style={{ marginTop: 10 }}>
              <h4 style={{ margin: '0 0 6px', fontSize: '.9rem', fontWeight: 800 }}>Monitoring History</h4>
              {activeFamily.latestLog ? (
                <div style={{ padding: 14, backgroundColor: '#f8faf9', borderRadius: 12, border: '1px solid #eef2f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '.8rem', color: '#475569' }}>
                    <span><strong>{activeFamily.latestLog.checkedBy}</strong></span>
                    <span>
                      {activeFamily.latestLog.createdAt
                        ? new Date(activeFamily.latestLog.createdAt).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true,
                          })
                        : ''}
                    </span>
                  </div>
                  <div style={{ marginTop: 4, fontSize: '.8rem', color: '#64748b' }}>
                    {activeFamily.latestLog.presentCount}/{activeFamily.latestLog.totalMembers} present •{' '}
                    <span
                      style={{
                        fontWeight: 700,
                        color: activeFamily.latestLog.householdStatus === 'Present' ? '#6b21a8' : '#92400e',
                      }}
                    >
                      {activeFamily.latestLog.householdStatus}
                    </span>
                  </div>
                  {activeFamily.latestLog.remarks && (
                    <div style={{ marginTop: 4, fontSize: '.78rem', color: '#94a3b8', fontStyle: 'italic' }}>
                      {activeFamily.latestLog.remarks}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ padding: 14, backgroundColor: '#f8faf9', borderRadius: 12, border: '1px solid #eef2f0', display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: '.85rem' }}>
                  <Clock size={16} />
                  <span>No monitoring records yet for this household.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FILTER SHEET */}
      {showFilterSheet && (
        <MonFilterSheet
          filterStatus={filterStatus}
          filterRelief={filterRelief}
          filterCenter={filterCenter}
          filterRoom={filterRoom}
          records={records}
          search={search}
          centersList={centers}
          onApply={(status, relief, center, room) => {
            setFilterStatus(status);
            setFilterRelief(relief);
            setFilterCenter(center);
            setFilterRoom(room);
          }}
          onClose={() => setShowFilterSheet(false)}
        />
      )}

      {/* ── QR SCANNER MODAL ── */}
      {showScanner && (
        <QrScannerModal
          title="Scan Relief Goods Stub"
          hint="Point camera at evacuee stub QR code to verify relief pack eligibility"
          onScan={handleReliefScan}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* ── RELIEF DISTRIBUTION VERIFICATION MODAL ── */}
      {reliefScanModal && (
        <div className="vin-mob-sheet-overlay" onClick={() => setReliefScanModal(null)}>
          <div className="vin-mob-sheet-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="vin-mob-sheet-header">
              <h2 className="vin-mob-sheet-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <PackageCheck size={20} color="#7c3aed" /> Relief Goods Distribution
              </h2>
              <button type="button" className="vin-mob-sheet-close" onClick={() => setReliefScanModal(null)}>
                <X size={18} />
              </button>
            </div>

            {reliefScanModal.status === 'eligible' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  color: '#15803d',
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontWeight: 600,
                }}>
                  <CheckCircle2 size={18} color="#16a34a" />
                  <span>Eligible for Relief Pack Distribution</span>
                </div>

                <div className="vin-hh-stub-card" style={{ margin: 0 }}>
                  <div className="vin-mob-profile-top">
                    <div className="vin-mob-avatar-circle" style={{ width: 44, height: 44 }}><User size={20} /></div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>{reliefScanModal.household.name}</div>
                      <div style={{ fontSize: '.8rem', color: '#64748b' }}>Stub: {reliefScanModal.household.stubCode}</div>
                    </div>
                  </div>
                  <div className="vin-hh-stub-meta">
                    <div><span className="vin-mob-field-label">ROOM</span><div>{reliefScanModal.household.room}</div></div>
                    <div><span className="vin-mob-field-label">MEMBERS</span><div>{reliefScanModal.household.familyCount} persons</div></div>
                    <div><span className="vin-mob-field-label">CENTER</span><div style={{ fontSize: '.8rem' }}>{reliefScanModal.household.center}</div></div>
                    <div><span className="vin-mob-field-label">VULNERABILITY</span><div>
                      {Array.isArray(reliefScanModal.household.vulnerabilities) && reliefScanModal.household.vulnerabilities.length > 0
                        ? reliefScanModal.household.vulnerabilities.join(', ')
                        : 'None'}
                    </div></div>
                  </div>
                </div>

                <button
                  type="button"
                  className="vin-mob-sheet-submit-btn"
                  onClick={() => handleConfirmIssueRelief(reliefScanModal.household.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    background: '#7c3aed',
                    padding: '14px',
                    fontSize: '0.95rem',
                    fontWeight: 800,
                  }}
                >
                  <PackageCheck size={18} />
                  Confirm &amp; Issue Relief Pack
                </button>
              </div>
            )}

            {reliefScanModal.status === 'issued-success' && (
              <div style={{ textAlign: 'center', padding: '16px 8px' }}>
                <div style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: '#f0fdf4',
                  border: '2px solid #bbf7d0',
                  color: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px'
                }}>
                  <CheckCircle2 size={32} />
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
                  Relief Pack Issued!
                </h3>
                <p style={{ fontSize: '0.86rem', color: '#64748b', marginBottom: 16 }}>
                  Stub {reliefScanModal.household.stubCode} for <strong>{reliefScanModal.household.name}</strong> has been verified and recorded.
                </p>
                <button
                  type="button"
                  className="vin-btn-cancel"
                  style={{ width: '100%', padding: '12px', borderRadius: 12, fontWeight: 700 }}
                  onClick={() => setReliefScanModal(null)}
                >
                  Done
                </button>
              </div>
            )}

            {reliefScanModal.status === 'already-issued' && (
              <div style={{ textAlign: 'center', padding: '12px 6px' }}>
                <div style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: '#fef3c7',
                  border: '2px solid #fde68a',
                  color: '#b45309',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 10px'
                }}>
                  <AlertTriangle size={28} />
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#92400e', marginBottom: 4 }}>
                  Already Claimed
                </h3>
                <p style={{ fontSize: '0.86rem', color: '#475569', marginBottom: 12 }}>
                  This family (<strong>{reliefScanModal.household.name}</strong> • {reliefScanModal.household.room}) has already claimed their relief pack for this distribution cycle.
                </p>
                <div style={{ padding: 10, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.8rem', color: '#64748b', marginBottom: 16 }}>
                  Stub: <strong>{reliefScanModal.household.stubCode}</strong>
                </div>
                <button
                  type="button"
                  className="vin-btn-cancel"
                  style={{ width: '100%', padding: '12px', borderRadius: 12, fontWeight: 700 }}
                  onClick={() => setReliefScanModal(null)}
                >
                  Close
                </button>
              </div>
            )}

            {reliefScanModal.status === 'not-active' && (
              <div style={{ textAlign: 'center', padding: '12px 6px' }}>
                <div style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: '#fef2f2',
                  border: '2px solid #fecaca',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 10px'
                }}>
                  <XCircle size={28} />
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#991b1b', marginBottom: 4 }}>
                  Cannot Issue Relief Pack
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: 12, lineHeight: 1.4 }}>
                  {reliefScanModal.errorMsg}
                </p>
                <div style={{ padding: 10, background: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca', fontSize: '0.8rem', color: '#b91c1c', marginBottom: 16 }}>
                  Only active evacuees currently staying in an evacuation center are eligible to claim relief packs.
                </div>
                <button
                  type="button"
                  className="vin-btn-cancel"
                  style={{ width: '100%', padding: '12px', borderRadius: 12, fontWeight: 700 }}
                  onClick={() => setReliefScanModal(null)}
                >
                  Close
                </button>
              </div>
            )}

            {reliefScanModal.status === 'not-found' && (
              <div style={{ textAlign: 'center', padding: '12px 6px' }}>
                <div style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: '#fef2f2',
                  border: '2px solid #fecaca',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 10px'
                }}>
                  <XCircle size={28} />
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#991b1b', marginBottom: 4 }}>
                  Stub Not Found
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: 16 }}>
                  {reliefScanModal.errorMsg}
                </p>
                <button
                  type="button"
                  className="vin-btn-cancel"
                  style={{ width: '100%', padding: '12px', borderRadius: 12, fontWeight: 700 }}
                  onClick={() => setReliefScanModal(null)}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────
   Monitor Filter Sheet (bottom sheet panel)
   ────────────────────────────────────────────── */
function MonFilterSheet({ filterStatus, filterRelief, filterCenter, filterRoom, records, search, centersList = [], onApply, onClose }) {
  const [draftStatus, setDraftStatus] = useState(filterStatus);
  const [draftRelief, setDraftRelief] = useState(filterRelief);
  const [draftCenter, setDraftCenter] = useState(filterCenter);
  const [draftRoom, setDraftRoom] = useState(filterRoom);
  const [showCenterPicker, setShowCenterPicker] = useState(false);
  const [showRoomPicker, setShowRoomPicker] = useState(false);

  const handleReset = () => {
    setDraftStatus('All');
    setDraftRelief('All');
    setDraftCenter('All Centers');
    setDraftRoom('All Rooms');
  };

  const handleApply = () => {
    onApply(draftStatus, draftRelief, draftCenter, draftRoom);
    onClose();
  };

  /* Live result count based on draft */
  const draftCount = records.filter((r) => {
    const matchSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.room.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      draftStatus === 'All' ||
      (draftStatus === 'Present' && (r.status === 'Present' || r.status === 'Recorded')) ||
      (draftStatus === 'For Follow-up' && r.status === 'For Follow-up') ||
      (draftStatus === 'Absent' && r.status === 'Absent') ||
      (draftStatus === 'Transferred' && r.status === 'Transferred');
    const matchRelief =
      draftRelief === 'All' ||
      (draftRelief === 'Issued' && r.stubIssued) ||
      (draftRelief === 'Not Issued' && !r.stubIssued);
    const matchCenter = isCenterMatch(r.center, draftCenter, centersList);
    const matchRoom = draftRoom === 'All Rooms' || r.room === draftRoom;
    return matchSearch && matchStatus && matchRelief && matchCenter && matchRoom;
  }).length;

  return (
    <div className="vin-mob-sheet-overlay" onClick={onClose}>
      <div className="vin-hh-filter-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Drag handle */}
        <div className="vin-hh-filter-sheet-handle" />

        {/* Header */}
        <div className="vin-hh-filter-sheet-header">
          <span className="vin-hh-filter-sheet-title">Filters</span>
          <button type="button" className="vin-hh-filter-sheet-reset" onClick={handleReset}>
            Reset
          </button>
        </div>

        {/* Status Pills */}
        <div className="vin-hh-filter-section">
          <div className="vin-hh-filter-section-label">Attendance Status</div>
          <div className="vin-hh-filter-pills-row">
            {[
              { id: 'All', label: 'All' },
              { id: 'Present', label: 'Present' },
              { id: 'For Follow-up', label: 'For Follow-up' },
              { id: 'Absent', label: 'Absent' },
              { id: 'Transferred', label: 'Transferred' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`vin-hh-filter-pill ${draftStatus === opt.id ? 'active' : ''}`}
                onClick={() => setDraftStatus(opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Relief Status Pills */}
        <div className="vin-hh-filter-section">
          <div className="vin-hh-filter-section-label">Relief Goods Status</div>
          <div className="vin-hh-filter-pills-row">
            {[
              { id: 'All', label: 'All' },
              { id: 'Issued', label: 'Relief Issued' },
              { id: 'Not Issued', label: 'Not Issued' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`vin-hh-filter-pill ${draftRelief === opt.id ? 'active' : ''}`}
                onClick={() => setDraftRelief(opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Center Picker */}
        <div className="vin-hh-filter-section">
          <div className="vin-hh-filter-section-label">Center</div>
          <div
            className="vin-hh-filter-select-wrap vin-hh-filter-tap-field"
            onClick={() => setShowCenterPicker(true)}
            role="button"
            tabIndex={0}
          >
            <div className="vin-hh-filter-select-display-txt">{draftCenter}</div>
            <ChevronDown size={16} className="vin-hh-filter-select-icon" />
          </div>
        </div>

        {/* Room Picker */}
        <div className="vin-hh-filter-section">
          <div className="vin-hh-filter-section-label">Room</div>
          <div
            className="vin-hh-filter-select-wrap vin-hh-filter-tap-field"
            onClick={() => setShowRoomPicker(true)}
            role="button"
            tabIndex={0}
          >
            <div className="vin-hh-filter-select-display-txt">{draftRoom}</div>
            <ChevronDown size={16} className="vin-hh-filter-select-icon" />
          </div>
        </div>

        {/* Show Results Button */}
        <button type="button" className="vin-hh-filter-sheet-apply" onClick={handleApply}>
          Show {draftCount} result{draftCount !== 1 ? 's' : ''}
        </button>
      </div>

      {/* Center Picker Bottom Sheet */}
      {showCenterPicker && (
        <CenterSelectSheet
          selected={draftCenter}
          centersList={centersList}
          allCentersSub="Show records from all evacuation centers"
          onSelect={(c) => {
            setDraftCenter(c);
            setDraftRoom('All Rooms');
          }}
          onClose={() => setShowCenterPicker(false)}
        />
      )}

      {/* Room Picker Bottom Sheet */}
      {showRoomPicker && (
        <RoomSelectSheet
          selected={draftRoom}
          centerName={draftCenter}
          centersList={centersList}
          allRoomsSub="Show records from all rooms"
          onSelect={(r) => setDraftRoom(r)}
          onClose={() => setShowRoomPicker(false)}
        />
      )}
    </div>
  );
}
