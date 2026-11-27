import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import {
  Search, X, Clock, CheckCircle2, XCircle, ChevronDown,
  ChevronLeft, ChevronRight, SlidersHorizontal, AlertTriangle, Building,
  QrCode, Ticket, PackageCheck, User, Package, Calendar, History,
} from 'lucide-react';
import './MobileCommon.css';
import './MobileSubpages.css';
import './MobileHouseholds.css';
import './MobileMonitor.css';
import checkIcon from '../../assets/check.png';
import removeIcon from '../../assets/remove.png';
import {
  isCenterMatch,
} from '../../lib/evacuationCenters';
import {
  useHouseholds,
  useEventRoomPlacements,
  issueHouseholdStub,
  searchHouseholdsFromDatabase,
  getHouseholdReliefHistory,
} from '../../lib/householdService.js';
import { useActiveEvent } from '../../lib/evacuationEventService.js';
import { useMobileCenter } from '../../context/MobileCenterContext.jsx';
import { useMonitoringLogs, recordMonitoringLog } from '../../lib/monitoringService.js';
import { RoomSelectSheet } from '../../components/CenterSelectSheet';

const QrScannerModal = lazy(() => import('../../components/QrScannerModal'));

export default function MobileMonitor() {
  const { centers, assignedCenter, assignedCenterId, assignedCenterObj } = useMobileCenter();
  const activeCenterId = assignedCenterObj?.id || assignedCenterId ||
    centers.find((center) =>
      center.displayName === assignedCenter || center.name === assignedCenter
    )?.id || null;
  const { households, refresh: refreshHouseholds } = useHouseholds(centers, { centerId: activeCenterId });
  const { activeEvent } = useActiveEvent();
  const { placements } = useEventRoomPlacements(activeEvent?.id, { centerId: activeCenterId });
  const { logs, refresh: refreshLogs } = useMonitoringLogs(centers, activeCenterId);
  const centerLogs = useMemo(
    () => activeCenterId ? logs.filter((log) => log.centerId === activeCenterId) : logs,
    [logs, activeCenterId]
  );
  const centerHouseholds = useMemo(
    () => activeCenterId ? households.filter((household) => household.centerId === activeCenterId) : households,
    [households, activeCenterId]
  );
  const centerPlacements = useMemo(
    () => activeCenterId ? placements.filter((placement) => placement.center_id === activeCenterId) : placements,
    [placements, activeCenterId]
  );

  const [attendanceOverrides, setAttendanceOverrides] = useState({});
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');     // 'All' | 'Present' | 'For Follow-up' | 'Absent' | 'Transferred'
  const [filterRelief, setFilterRelief] = useState('All');     // 'All' | 'Issued' | 'Not Issued'
  const [filterRoom, setFilterRoom] = useState('All Rooms');

  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [activeFamily, setActiveFamily] = useState(null);
  const [historyFamily, setHistoryFamily] = useState(null);
  const [historyTab, setHistoryTab] = useState('attendance'); // 'attendance' | 'relief'
  const [familyReliefHistory, setFamilyReliefHistory] = useState([]);
  const [loadingReliefHistory, setLoadingReliefHistory] = useState(false);
  const [attendance, setAttendance] = useState({});
  const [checkInTimes, setCheckInTimes] = useState({});
  const [showScanner, setShowScanner] = useState(false);
  const [reliefScanModal, setReliefScanModal] = useState(null);
  const [selectedLogDetails, setSelectedLogDetails] = useState(null);
  const [toastMsg, setToastMsg] = useState('');
  const [monitorForm, setMonitorForm] = useState({
    householdStatus: 'Present',
    remarks: '',
  });

  // Load relief assistance history whenever the family log modal is opened
  useEffect(() => {
    if (historyFamily) {
      const famId = historyFamily.householdId || historyFamily.id;
      setLoadingReliefHistory(true);
      getHouseholdReliefHistory(famId)
        .then((res) => setFamilyReliefHistory(res || []))
        .catch((err) => {
          console.warn('Error loading relief history for family:', err);
          setFamilyReliefHistory([]);
        })
        .finally(() => setLoadingReliefHistory(false));
    } else {
      setFamilyReliefHistory([]);
      setHistoryTab('attendance');
    }
  }, [historyFamily]);

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch (_) {
      return String(dateStr);
    }
  };

  const formatTimeOnly = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch (_) {
      return '';
    }
  };

  // Dynamic monitor records derived from live Supabase households & monitoring logs
  // Only households assigned to an evacuation center room are included in the room monitor
  const records = useMemo(() => {
    // 1. Filter: exclude unassigned households and decamped evacuees
    const assignedHouseholds = centerHouseholds.filter((h) => {
      if (h.evacueeStatus === 'Decamped') return false;

      // Check if room is directly assigned on the household
      const hasDirectRoom = Boolean(
        h.roomId &&
        h.room &&
        h.room !== 'Unassigned' &&
        h.room.trim().toLowerCase() !== 'unassigned' &&
        h.centerId &&
        h.center &&
        h.center !== 'Unassigned Center' &&
        h.center.trim().toLowerCase() !== 'unassigned center'
      );

      // Check active room placement from room_placements table
      const activePlacement = centerPlacements.find(
        (p) =>
          p.household_id === h.id &&
          p.status === 'Evacuated' &&
          p.room_id &&
          p.room_id !== 'Unassigned'
      );

      return hasDirectRoom || Boolean(activePlacement);
    });

    return assignedHouseholds.map((h, idx) => {
      const headName = (h.name || '').trim();
      const rawMemberList = (h.members || []).map((m) => (typeof m === 'string' ? m : m.name || '')).filter(Boolean);
      const membersHasHead = rawMemberList.some((m) => m.toLowerCase() === headName.toLowerCase());
      const allNames = membersHasHead ? rawMemberList : (headName ? [headName, ...rawMemberList] : rawMemberList);
      const total = allNames.length || 1;

      // Check if room/center can be resolved or augmented from active placement
      const activePlacement = centerPlacements.find(
        (p) =>
          p.household_id === h.id &&
          p.status === 'Evacuated' &&
          p.room_id &&
          p.room_id !== 'Unassigned'
      );

      let effectiveRoom = h.room;
      let effectiveRoomId = h.roomId;
      let effectiveCenter = h.center;
      let effectiveCenterId = h.centerId;

      if ((!effectiveRoom || effectiveRoom === 'Unassigned' || !effectiveRoomId) && activePlacement) {
        effectiveRoomId = activePlacement.room_id;
        effectiveCenterId = activePlacement.center_id || effectiveCenterId;
        const centerObj = centers.find((c) => c.id === effectiveCenterId);
        const roomObj = centerObj?.rooms?.find(
          (r) => r.id === effectiveRoomId || r.roomId === effectiveRoomId
        );
        effectiveRoom =
          roomObj?.name ||
          roomObj?.roomName ||
          activePlacement.room?.room_name ||
          (typeof effectiveRoomId === 'string' && !effectiveRoomId.includes('-')
            ? `Room ${effectiveRoomId}`
            : 'Room 1');
        if (centerObj) {
          effectiveCenter = centerObj.displayName || centerObj.name || effectiveCenter;
        }
      }

      // Find most recent monitoring log for this household
      const latestLog = centerLogs.find((l) => l.householdId === h.id);

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
        centerId: effectiveCenterId,
        roomId: effectiveRoomId,
        name: h.name,
        center: effectiveCenter || 'Unassigned Center',
        room: effectiveRoom,
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
  }, [centerHouseholds, centerPlacements, centers, centerLogs, attendanceOverrides]);

  const activeFilters =
    (filterStatus !== 'All' ? 1 : 0) +
    (filterRelief !== 'All' ? 1 : 0) +
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
    const matchCenter = isCenterMatch(r.center, assignedCenter || 'All Centers', centers);
    const matchRoom =
      filterRoom === 'All Rooms' ||
      r.room === filterRoom ||
      `Room ${r.room}` === filterRoom;
    return matchSearch && matchStatus && matchRelief && matchCenter && matchRoom;
  });

  /* ── Pagination ── */
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedRecords = filtered.slice(startIndex, startIndex + pageSize);

  /* Selected family's historical monitoring logs */
  const historyFamilyLogs = useMemo(() => {
    if (!historyFamily) return [];
    const famId = historyFamily.householdId || historyFamily.id;
    return centerLogs.filter((l) => l.householdId === famId);
  }, [historyFamily, centerLogs]);

  const openMonitoringSheet = (family) => {
    setActiveFamily(family);
    const now = new Date();
    const currentTimeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    // Look up previous log for this family if any
    const prevLog = centerLogs.find((l) => l.householdId === (family.householdId || family.id));
    const initAttendance = {};
    const initTimes = {};

    family.members.forEach((m) => {
      const prevMem = prevLog?.membersAttendance?.find((item) => item.name === m);
      const memStatus = prevMem ? prevMem.status : 'Accounted For';
      initAttendance[m] = memStatus;
      initTimes[m] = prevMem?.check_in_time || currentTimeStr;
    });

    setAttendance(initAttendance);
    setCheckInTimes(initTimes);
    setMonitorForm({
      householdStatus: prevLog ? prevLog.householdStatus : 'Present',
      remarks: '',
    });
  };

  const handleToggleMember = (member, key) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const updated = { ...attendance, [member]: key };
    setAttendance(updated);

    // Record timestamp for ANY status selected (Accounted For, Late, Absent, Decamped)
    setCheckInTimes((prev) => ({
      ...prev,
      [member]: timeStr,
    }));

    // Auto-suggest household status based on member attendance
    const values = Object.values(updated);
    const allDecamped = values.every((s) => s === 'Decamped');
    const hasDecamped = values.some((s) => s === 'Decamped');
    const hasAbsent = values.some((s) => s === 'Absent');
    const hasLate = values.some((s) => s === 'Late');

    if (allDecamped) {
      setMonitorForm((prev) => ({ ...prev, householdStatus: 'Decamped' }));
    } else if (hasDecamped || hasAbsent || hasLate) {
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
        monitoringInterval: 'Every 2-3 hours',
        checkedBy: 'MSWDO Personnel',
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
  const handleReliefScan = useCallback(async (code) => {
    setShowScanner(false);
    const trimmed = (code || '').trim();
    if (!trimmed) return;

    // 1. Check loaded households in memory
    let found = centerHouseholds.find((h) =>
      (h.stubCode && h.stubCode.toLowerCase() === trimmed.toLowerCase()) ||
      String(h.id) === trimmed ||
      (h.householdCode && h.householdCode.toLowerCase() === trimmed.toLowerCase())
    );

    // 2. If not found in current memory chunk, search database directly across all 10k+ records
    if (!found) {
      try {
        const dbMatches = await searchHouseholdsFromDatabase(trimmed, centers, 10, activeCenterId);
        if (dbMatches && dbMatches.length > 0) {
          found = dbMatches.find((h) =>
            (h.stubCode && h.stubCode.toLowerCase() === trimmed.toLowerCase()) ||
            String(h.id) === trimmed ||
            (h.householdCode && h.householdCode.toLowerCase() === trimmed.toLowerCase())
          ) || dbMatches[0];
        }
      } catch (err) {
        console.warn('Error querying database for scanned QR:', err);
      }
    }

    if (!found) {
      setReliefScanModal({
        status: 'not-found',
        code: trimmed,
        errorMsg: `No registered household matches QR code or ID: "${trimmed}"`,
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
          : `Cannot issue relief pack: ${found.name}'s family (${found.householdCode || 'Code Pending'}) is currently registered in the municipal masterlist but not checked in to an active evacuation room.`,
      });
      return;
    }

    // 3. Fetch comprehensive relief distribution history for this household
    let history = [];
    try {
      history = await getHouseholdReliefHistory(found.id);
    } catch (err) {
      console.warn('Could not fetch relief history for scanned household:', err);
    }

    const hasPriorRelief = history.length > 0 || Boolean(found.stubIssued);

    if (hasPriorRelief) {
      // Oldest record represents the first pack; newest record is history[0]
      const oldestClaim = history.length > 0 ? history[history.length - 1] : {
        stubIssuedAt: found.stubIssuedAt || new Date().toISOString(),
        wave: 1,
        waveLabel: 'Relief Pack Wave 1',
        stubCode: found.stubCode || 'N/A',
      };
      const latestClaim = history.length > 0 ? history[0] : oldestClaim;

      const isToday = (dateStr) => {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        const now = new Date();
        return d.getFullYear() === now.getFullYear() &&
               d.getMonth() === now.getMonth() &&
               d.getDate() === now.getDate();
      };

      const claimedToday = isToday(latestClaim.stubIssuedAt);

      setReliefScanModal({
        household: found,
        status: 'history-warning',
        history,
        firstClaim: oldestClaim,
        latestClaim,
        claimedToday,
        totalPacks: Math.max(1, history.length),
        nextWave: Math.max(1, history.length) + 1,
      });
      return;
    }

    setReliefScanModal({
      household: found,
      status: 'eligible',
      history: [],
      nextWave: 1,
    });
  }, [activeCenterId, centerHouseholds, centers]);

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

  /* ── Confirm Relief Pack Distribution (Supports Multi-Wave Rounds) ── */
  const handleConfirmIssueRelief = async (hhId, waveNumber = 1) => {
    try {
      const activeEventId = activeEvent?.status === 'Active' && activeEvent.id !== 'default-active-event'
        ? activeEvent.id
        : null;

      await issueHouseholdStub(hhId, activeEventId, {
        issuedBy: 'MSWDO Staff',
        waveNumber,
      });

      if (refreshHouseholds) refreshHouseholds();
      
      // Also update activeFamily if currently open
      if (activeFamily && (activeFamily.householdId === hhId || activeFamily.id === hhId)) {
        setActiveFamily((prev) => prev ? { ...prev, stubIssued: true } : null);
      }

      // If view-log history is open for this family, refresh it as well
      if (historyFamily && (historyFamily.householdId === hhId || historyFamily.id === hhId)) {
        getHouseholdReliefHistory(hhId).then((res) => setFamilyReliefHistory(res || []));
      }

      setReliefScanModal((prev) => prev ? {
        ...prev,
        status: 'issued-success',
        issuedWave: waveNumber,
      } : null);

      setToastMsg(`✓ Relief pack marked as ISSUED successfully! (Wave ${waveNumber})`);
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
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
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
            onClick={() => {
              setFilterStatus('All');
              setCurrentPage(1);
            }}
          >
            <span>{filterStatus}</span>
            <X size={13} className="vin-hh-chip-close" />
          </button>
        )}
        {filterRelief !== 'All' && (
          <button
            type="button"
            className="vin-hh-active-chip"
            onClick={() => {
              setFilterRelief('All');
              setCurrentPage(1);
            }}
          >
            <span>Relief: {filterRelief}</span>
            <X size={13} className="vin-hh-chip-close" />
          </button>
        )}
        {filterRoom !== 'All Rooms' && (
          <button
            type="button"
            className="vin-hh-active-chip"
            onClick={() => {
              setFilterRoom('All Rooms');
              setCurrentPage(1);
            }}
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
          <CheckCircle2 size={14} color="#15803d" /> Present
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <AlertTriangle size={14} color="#b45309" /> For Follow-up
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <XCircle size={14} color="#b91c1c" /> Absent
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
                    {records.length === 0
                      ? 'No evacuees have been assigned to an evacuation room yet.'
                      : 'No families match the current filter.'}
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
                              <span>
                                {item.room?.toLowerCase().startsWith('room')
                                  ? item.room
                                  : `Room ${item.room}`}
                              </span>
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
                        <div className="vin-mob-table-actions">
                          <button
                            type="button"
                            className="vin-mob-row-btn view"
                            onClick={(e) => {
                              e.stopPropagation();
                              setHistoryFamily(item);
                            }}
                          >
                            View Log
                          </button>
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
                        </div>
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

            <div style={{ margin: '4px 0 10px' }}>
              <div className="vin-mob-input-label">FAMILY HEAD</div>
              <h3 style={{ margin: '2px 0 0', fontSize: '1.05rem', fontWeight: 800 }}>
                {activeFamily.name}
              </h3>
            </div>

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

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '14px 0 8px' }}>
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
                    { key: 'Accounted For', label: 'Present',  cls: 'active-accounted' },
                    { key: 'Late',          label: 'Late',     cls: 'active-late'      },
                    { key: 'Absent',        label: 'Absent',   cls: 'active-absent'    },
                    { key: 'Decamped',      label: 'Decamped', cls: 'active-decamped'  },
                  ].map(({ key, label, cls }) => (
                    <button
                      key={key}
                      type="button"
                      className={`vin-mob-att-btn ${attendance[member] === key ? cls : ''}`}
                      onClick={() => handleToggleMember(member, key)}
                    >
                      {label || key}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748b', fontSize: '.78rem' }}>
                  <span style={{ fontWeight: 600, textTransform: 'uppercase' }}>
                    {attendance[member] === 'Accounted For' ? 'PRESENT' : attendance[member] || 'STATUS'} TIME
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 700, color: '#1e293b' }}>
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

          </div>
        </div>
      )}

      {/* FAMILY ACTIVITY HISTORY & RELIEF LOG */}
      {historyFamily && (
        <div className="vin-mob-sheet-overlay" onClick={() => setHistoryFamily(null)}>
          <div className="vin-mob-sheet-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="vin-mob-sheet-header">
              <div>
                <h2 className="vin-mob-sheet-title">Family Activity History</h2>
                <span style={{ fontSize: '.78rem', color: '#64748b' }}>
                  {historyFamily.center} • {historyFamily.room}
                </span>
              </div>
              <button type="button" className="vin-mob-sheet-close" onClick={() => setHistoryFamily(null)}>
                <X size={18} />
              </button>
            </div>

            <div>
              <div className="vin-mob-input-label">FAMILY HEAD</div>
              <h3 style={{ margin: '2px 0 0', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                {historyFamily.name}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: '.78rem', color: '#64748b' }}>
                <span>Code: <strong>{historyFamily.householdCode || historyFamily.id}</strong></span>
                <span>•</span>
                <span>Stub: <strong>{historyFamily.stubCode || 'N/A'}</strong></span>
              </div>
            </div>

            {/* Segmented Tab Controls: Attendance Logs vs Relief Goods History */}
            <div style={{ display: 'flex', gap: 6, margin: '14px 0 10px', background: '#f1f5f9', padding: 4, borderRadius: 10 }}>
              <button
                type="button"
                onClick={() => setHistoryTab('attendance')}
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  borderRadius: 8,
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: historyTab === 'attendance' ? '#ffffff' : 'transparent',
                  color: historyTab === 'attendance' ? '#7c3aed' : '#64748b',
                  boxShadow: historyTab === 'attendance' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  transition: 'all 0.15s ease',
                }}
              >
                <Clock size={14} /> Attendance ({historyFamilyLogs.length})
              </button>
              <button
                type="button"
                onClick={() => setHistoryTab('relief')}
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  borderRadius: 8,
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: historyTab === 'relief' ? '#ffffff' : 'transparent',
                  color: historyTab === 'relief' ? '#7c3aed' : '#64748b',
                  boxShadow: historyTab === 'relief' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  transition: 'all 0.15s ease',
                }}
              >
                <PackageCheck size={14} /> Relief History ({familyReliefHistory.length})
              </button>
            </div>

            {/* TAB 1: Attendance History */}
            {historyTab === 'attendance' && (
              <div>
                {historyFamilyLogs.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {historyFamilyLogs.map((logItem) => (
                      <button
                        key={logItem.id}
                        type="button"
                        onClick={() => setSelectedLogDetails(logItem)}
                        style={{
                          padding: '10px 12px',
                          backgroundColor: '#ffffff',
                          borderRadius: 10,
                          border: '1.5px solid #e2e8f0',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4,
                          textAlign: 'left',
                        }}
                      >
                        <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, fontSize: '.84rem', color: '#0f172a' }}>
                            {logItem.createdAt
                              ? new Date(logItem.createdAt).toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true,
                                })
                              : 'Recorded'}
                          </span>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 6,
                              background:
                                logItem.householdStatus === 'Present'
                                  ? '#f3e8ff'
                                  : logItem.householdStatus === 'Decamped'
                                  ? '#f1f5f9'
                                  : '#fef3c7',
                              color:
                                logItem.householdStatus === 'Present'
                                  ? '#6b21a8'
                                  : logItem.householdStatus === 'Decamped'
                                  ? '#475569'
                                  : '#92400e',
                            }}
                          >
                            {logItem.householdStatus}
                          </span>
                        </span>
                        <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '.78rem', color: '#64748b' }}>
                          <span>{logItem.presentCount}/{logItem.totalMembers} present • Tap to view details</span>
                          <ChevronRight size={14} />
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: 14, backgroundColor: '#f8faf9', borderRadius: 12, border: '1px solid #eef2f0', display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: '.85rem' }}>
                    <Clock size={16} />
                    <span>No monitoring records yet for this household.</span>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Relief Goods Distribution History */}
            {historyTab === 'relief' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {loadingReliefHistory ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748b', fontSize: '0.85rem' }}>
                    Loading relief distribution history…
                  </div>
                ) : familyReliefHistory.length === 0 ? (
                  <div style={{ padding: 16, backgroundColor: '#f8fafc', borderRadius: 12, border: '1px dashed #cbd5e1', textAlign: 'center' }}>
                    <Package size={28} color="#94a3b8" style={{ margin: '0 auto 6px' }} />
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#334155' }}>
                      No Relief Packs Issued Yet
                    </div>
                    <p style={{ margin: '4px 0 12px', fontSize: '0.78rem', color: '#64748b' }}>
                      This family has not received relief assistance for this event yet.
                    </p>
                    <button
                      type="button"
                      className="vin-mob-sheet-submit-btn"
                      onClick={() => handleConfirmIssueRelief(historyFamily.householdId || historyFamily.id, 1)}
                      style={{ padding: '10px 14px', fontSize: '0.84rem' }}
                    >
                      <PackageCheck size={16} /> Issue Wave 1 Relief Pack
                    </button>
                  </div>
                ) : (
                  <div>
                    {/* Summary Counter */}
                    <div style={{
                      padding: '10px 12px',
                      background: '#f5f3ff',
                      borderRadius: 10,
                      border: '1px solid #ddd6fe',
                      marginBottom: 10,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ fontSize: '0.72rem', color: '#6d28d9', fontWeight: 700, textTransform: 'uppercase' }}>
                          TOTAL AID RECEIVED
                        </div>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#5b21b6' }}>
                          {familyReliefHistory.length} Relief Pack{familyReliefHistory.length !== 1 ? 's' : ''} Claimed
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#6b21a8' }}>
                        First: {formatDateTime(familyReliefHistory[familyReliefHistory.length - 1]?.stubIssuedAt).split(',')[0]}
                      </div>
                    </div>

                    {/* Timeline List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 240, overflowY: 'auto' }}>
                      {familyReliefHistory.map((item, idx) => (
                        <div
                          key={item.id || idx}
                          style={{
                            padding: '10px 12px',
                            backgroundColor: '#ffffff',
                            borderRadius: 10,
                            border: '1px solid #e2e8f0',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 4,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <PackageCheck size={15} color="#16a34a" />
                              {item.waveLabel || `Wave ${familyReliefHistory.length - idx}`}
                            </span>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#16a34a', background: '#f0fdf4', padding: '2px 8px', borderRadius: 6, border: '1px solid #bbf7d0' }}>
                              Claimed
                            </span>
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Clock size={13} color="#64748b" />
                            <span>{formatDateTime(item.stubIssuedAt)}</span>
                          </div>
                          <div style={{ fontSize: '0.74rem', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Stub: <strong>{item.stubCode}</strong></span>
                            <span>{item.centerName} • {item.roomName}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Quick Button to Issue Next Wave Pack */}
                    <button
                      type="button"
                      className="vin-mob-sheet-submit-btn"
                      onClick={() => handleConfirmIssueRelief(historyFamily.householdId || historyFamily.id, familyReliefHistory.length + 1)}
                      style={{ marginTop: 12, padding: '11px 14px', fontSize: '0.86rem' }}
                    >
                      <PackageCheck size={16} /> Issue Wave {familyReliefHistory.length + 1} Relief Pack
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* FILTER SHEET */}
      {showFilterSheet && (
        <MonFilterSheet
          filterStatus={filterStatus}
          filterRelief={filterRelief}
          filterRoom={filterRoom}
          centerName={assignedCenter}
          records={records}
          search={search}
          centersList={centers}
          onApply={(status, relief, room) => {
            setFilterStatus(status);
            setFilterRelief(relief);
            setFilterRoom(room);
            setCurrentPage(1);
          }}
          onClose={() => setShowFilterSheet(false)}
        />
      )}

      {/* ── QR SCANNER MODAL ── */}
      {showScanner && (
        <Suspense fallback={null}>
          <QrScannerModal
            title="Scan Relief Goods Stub"
            hint="Point camera at evacuee stub QR code to verify relief pack eligibility"
            onScan={handleReliefScan}
            onClose={() => setShowScanner(false)}
          />
        </Suspense>
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
                      <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>{reliefScanModal.household?.name || 'Household'}</div>
                      <div style={{ fontSize: '.8rem', color: '#64748b' }}>
                        Code: <strong>{reliefScanModal.household?.stubCode || reliefScanModal.household?.householdCode || 'Pending'}</strong>
                      </div>
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
                  {reliefScanModal.issuedWave ? `Relief Pack Wave ${reliefScanModal.issuedWave}` : 'Relief pack'} for <strong>{reliefScanModal.household?.name || 'Household'}</strong> has been verified and permanently recorded in the disaster relief history log.
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

            {reliefScanModal.status === 'history-warning' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Alert Box */}
                <div style={{
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: reliefScanModal.claimedToday ? '#fef2f2' : '#f5f3ff',
                  border: `1.5px solid ${reliefScanModal.claimedToday ? '#fecaca' : '#ddd6fe'}`,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                }}>
                  {reliefScanModal.claimedToday ? (
                    <AlertTriangle size={22} color="#dc2626" style={{ flexShrink: 0, marginTop: 2 }} />
                  ) : (
                    <PackageCheck size={22} color="#7c3aed" style={{ flexShrink: 0, marginTop: 2 }} />
                  )}
                  <div>
                    <div style={{
                      fontWeight: 800,
                      fontSize: '0.92rem',
                      color: reliefScanModal.claimedToday ? '#991b1b' : '#5b21b6',
                    }}>
                      {reliefScanModal.claimedToday
                        ? '⚠️ Already Claimed Today!'
                        : `Previous Relief Received (${reliefScanModal.totalPacks} Pack${reliefScanModal.totalPacks !== 1 ? 's' : ''})`}
                    </div>
                    <p style={{
                      margin: '4px 0 0',
                      fontSize: '0.82rem',
                      color: reliefScanModal.claimedToday ? '#b91c1c' : '#6b21a8',
                      lineHeight: 1.4,
                    }}>
                      {reliefScanModal.claimedToday
                        ? `This household already claimed a relief pack today at ${formatTimeOnly(reliefScanModal.latestClaim?.stubIssuedAt)}. Please verify before distributing another pack.`
                        : `This household received previous disaster relief packs. You can verify history and issue subsequent waves below.`}
                    </p>
                  </div>
                </div>

                {/* Household Overview */}
                <div className="vin-hh-stub-card" style={{ margin: 0 }}>
                  <div className="vin-mob-profile-top">
                    <div className="vin-mob-avatar-circle" style={{ width: 44, height: 44 }}><User size={20} /></div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>{reliefScanModal.household?.name || 'Household'}</div>
                      <div style={{ fontSize: '.8rem', color: '#64748b' }}>
                        Code: <strong>{reliefScanModal.household?.stubCode || reliefScanModal.household?.householdCode || 'Pending'}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="vin-hh-stub-meta">
                    <div><span className="vin-mob-field-label">ROOM</span><div>{reliefScanModal.household?.room}</div></div>
                    <div><span className="vin-mob-field-label">MEMBERS</span><div>{reliefScanModal.household?.familyCount} persons</div></div>
                    <div><span className="vin-mob-field-label">CENTER</span><div style={{ fontSize: '.8rem' }}>{reliefScanModal.household?.center}</div></div>
                    <div><span className="vin-mob-field-label">TOTAL PACKS</span><div><strong>{reliefScanModal.totalPacks} claimed</strong></div></div>
                  </div>
                </div>

                {/* First Pack Date & Time Highlight (Informs user exactly when first pack was received) */}
                <div style={{
                  padding: '10px 14px',
                  background: '#f8fafc',
                  borderRadius: 10,
                  border: '1.5px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      FIRST RELIEF PACK RECEIVED
                    </div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
                      {formatDateTime(reliefScanModal.firstClaim?.stubIssuedAt)}
                    </div>
                  </div>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: 6,
                    background: '#ede9fe',
                    color: '#6d28d9',
                  }}>
                    {reliefScanModal.firstClaim?.waveLabel || 'Wave 1'}
                  </span>
                </div>

                {/* Complete History Log Timeline */}
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
                    <span>DISTRIBUTION HISTORY LOG</span>
                    <span style={{ color: '#7c3aed', fontWeight: 700 }}>{reliefScanModal.history.length} Record{reliefScanModal.history.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 150, overflowY: 'auto' }}>
                    {reliefScanModal.history.map((hItem, idx) => (
                      <div key={hItem.id || idx} style={{
                        padding: '8px 10px',
                        background: '#ffffff',
                        borderRadius: 8,
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0f172a' }}>
                            {hItem.waveLabel || `Wave ${reliefScanModal.history.length - idx}`}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                            {formatDateTime(hItem.stubIssuedAt)} • Stub: {hItem.stubCode}
                          </div>
                        </div>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#16a34a', background: '#f0fdf4', padding: '2px 6px', borderRadius: 4, border: '1px solid #bbf7d0' }}>
                          Claimed
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Multi-Wave Issue or Close Action Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                  <button
                    type="button"
                    className="vin-mob-sheet-submit-btn"
                    onClick={() => handleConfirmIssueRelief(reliefScanModal.household.id, reliefScanModal.totalPacks + 1)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      background: reliefScanModal.claimedToday ? '#b45309' : '#7c3aed',
                      padding: '13px',
                      fontSize: '0.92rem',
                      fontWeight: 800,
                    }}
                  >
                    <PackageCheck size={18} />
                    {reliefScanModal.claimedToday
                      ? `Authorize & Issue Additional Pack (Wave ${reliefScanModal.totalPacks + 1})`
                      : `Confirm & Issue Wave ${reliefScanModal.totalPacks + 1} Relief Pack`}
                  </button>

                  <button
                    type="button"
                    className="vin-btn-cancel"
                    style={{ width: '100%', padding: '12px', borderRadius: 12, fontWeight: 700 }}
                    onClick={() => setReliefScanModal(null)}
                  >
                    Close {reliefScanModal.claimedToday ? '(Prevent Duplicate)' : ''}
                  </button>
                </div>
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

      {/* ── LOG DETAILS MODAL (Click to view full log record) ── */}
      {selectedLogDetails && (
        <div className="vin-mob-sheet-overlay" onClick={() => setSelectedLogDetails(null)} style={{ zIndex: 10000 }}>
          <div className="vin-mob-sheet-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="vin-mob-sheet-header">
              <div>
                <h2 className="vin-mob-sheet-title">Monitoring Round Details</h2>
                <span style={{ fontSize: '.78rem', color: '#64748b' }}>
                  {selectedLogDetails.createdAt
                    ? new Date(selectedLogDetails.createdAt).toLocaleString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      })
                    : 'Log Record'}
                </span>
              </div>
              <button type="button" className="vin-mob-sheet-close" onClick={() => setSelectedLogDetails(null)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 6 }}>
              {/* Summary banner */}
              <div style={{
                padding: '12px 14px',
                borderRadius: 12,
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>OVERALL STATUS</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>{selectedLogDetails.householdStatus}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>HEADCOUNT RATIO</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#6b21a8' }}>
                    {selectedLogDetails.presentCount} / {selectedLogDetails.totalMembers} Present
                  </div>
                </div>
              </div>

              {/* Members attendance list with status and timestamps */}
              <div>
                <span className="vin-mob-input-label">MEMBER ATTENDANCE BREAKDOWN</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                  {Array.isArray(selectedLogDetails.membersAttendance) && selectedLogDetails.membersAttendance.length > 0 ? (
                    selectedLogDetails.membersAttendance.map((m, idx) => {
                      const mStatus = m.status || 'Accounted For';
                      let statusBg = '#f3e8ff';
                      let statusColor = '#6b21a8';
                      if (mStatus === 'Absent') {
                        statusBg = '#fef2f2';
                        statusColor = '#dc2626';
                      } else if (mStatus === 'Late') {
                        statusBg = '#fef3c7';
                        statusColor = '#d97706';
                      } else if (mStatus === 'Decamped') {
                        statusBg = '#f1f5f9';
                        statusColor = '#475569';
                      }

                      return (
                        <div
                          key={idx}
                          style={{
                            padding: '10px 12px',
                            borderRadius: 10,
                            backgroundColor: '#ffffff',
                            border: '1px solid #e2e8f0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>{m.name}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                              <Clock size={12} />
                              <span>{m.check_in_time || 'Time not recorded'}</span>
                            </div>
                          </div>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: 6,
                              backgroundColor: statusBg,
                              color: statusColor,
                            }}
                          >
                            {mStatus === 'Accounted For' ? 'Present' : mStatus}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ padding: 10, color: '#64748b', fontSize: '.84rem' }}>No individual member breakdown recorded.</div>
                  )}
                </div>
              </div>

              {selectedLogDetails.remarks && (
                <div style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  backgroundColor: '#fefce8',
                  border: '1px solid #fef08a',
                  fontSize: '0.82rem',
                  color: '#713f12',
                }}>
                  <strong>Remarks:</strong> {selectedLogDetails.remarks}
                </div>
              )}

              <button
                type="button"
                className="vin-btn-cancel"
                style={{ width: '100%', padding: '12px', borderRadius: 12, fontWeight: 700, marginTop: 6 }}
                onClick={() => setSelectedLogDetails(null)}
              >
                Close Log Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────
   Monitor Filter Sheet (bottom sheet panel)
   ────────────────────────────────────────────── */
function MonFilterSheet({ filterStatus, filterRelief, filterRoom, centerName, records, search, centersList = [], onApply, onClose }) {
  const [draftStatus, setDraftStatus] = useState(filterStatus);
  const [draftRelief, setDraftRelief] = useState(filterRelief);
  const [draftRoom, setDraftRoom] = useState(filterRoom);
  const [showRoomPicker, setShowRoomPicker] = useState(false);

  const handleReset = () => {
    setDraftStatus('All');
    setDraftRelief('All');
    setDraftRoom('All Rooms');
  };

  const handleApply = () => {
    onApply(draftStatus, draftRelief, draftRoom);
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
    const matchCenter = isCenterMatch(r.center, centerName || 'All Centers', centersList);
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

      {/* Room Picker Bottom Sheet */}
      {showRoomPicker && (
        <RoomSelectSheet
          selected={draftRoom}
          centerName={centerName}
          centersList={centersList}
          allRoomsSub="Show records from all rooms"
          onSelect={(r) => setDraftRoom(r)}
          onClose={() => setShowRoomPicker(false)}
        />
      )}
    </div>
  );
}
