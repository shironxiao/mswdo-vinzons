import { useState, useMemo, useContext } from 'react';
import {
  CheckCircle2, Clock, Building, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight,
  AlertTriangle, Users, XCircle, X, Eye
} from 'lucide-react';
import './AdminFeatures.css';
import './AdminHousehold.css';
import {
  useEvacuationCenters,
  isCenterMatch,
} from '../../lib/evacuationCenters.js';
import { useEventRoomPlacements, useHouseholds } from '../../lib/householdService.js';
import { useMonitoringLogs } from '../../lib/monitoringService.js';
import { AdminFilterModal, AdminFilterBar } from '../../components/AdminFilterModal.jsx';
import { EventContext } from '../../context/eventContext.js';
import AdminSearchInput from '../../components/AdminSearchInput.jsx';

const STATUSES = ['All Status', 'Present', 'For Follow-up', 'Transferred', 'Absent'];

function getPaginationItems(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, '...', totalPages];
  }
  if (currentPage >= totalPages - 3) {
    return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
}

export default function EvacueeMonitoring() {
  const { selectedEvent } = useContext(EventContext);
  const { centers } = useEvacuationCenters();
  const { households } = useHouseholds(centers, { fetchAll: true });
  const { placements } = useEventRoomPlacements(selectedEvent?.id);
  const eventCenterIds = useMemo(() => [...new Set([
    ...placements
      .filter((placement) => placement.event_id === selectedEvent?.id)
      .map((placement) => placement.center_id),
    ...(selectedEvent?.status === 'Active'
      ? households
        .filter((household) => household.evacueeStatus === 'Active' && household.roomId)
        .map((household) => household.centerId)
      : []),
  ].filter(Boolean))].sort(), [placements, households, selectedEvent?.id, selectedEvent?.status]);
  const { logs } = useMonitoringLogs(centers, null, eventCenterIds);

  const [filterCenter, setFilterCenter] = useState('All Centers');
  const [filterRoom, setFilterRoom] = useState('All Rooms');
  const [filterStatus, setFilterStatus] = useState('All Status');
  const [search, setSearch] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const eventHouseholds = useMemo(() => {
    const activePlacements = placements
      .filter((placement) => placement.event_id === selectedEvent?.id)
      .map((placement) => {
        const household = households.find((item) => item.id === placement.household_id);
        if (!household) return null;
        const center = centers.find((item) => item.id === placement.center_id);
        return {
          ...household,
          center: center?.displayName || center?.name || household.center,
          eventPlacement: placement,
        };
      })
      .filter(Boolean);

    if (selectedEvent?.status !== 'Active') return activePlacements;

    const placedIds = new Set(activePlacements.map((household) => household.id));
    const unplacedActiveHouseholds = households
      .filter((household) => (
        household.evacueeStatus === 'Active' &&
        household.centerId &&
        household.roomId &&
        household.room &&
        household.room !== 'Unassigned' &&
        household.room.trim().toLowerCase() !== 'unassigned' &&
        !placedIds.has(household.id)
      ))
      .map((household) => ({
        ...household,
        eventPlacement: {
          event_id: selectedEvent.id,
          center_id: household.centerId,
          room_id: household.roomId,
          status: 'Evacuated',
          check_in_at: household.createdAt,
          check_out_at: null,
        },
      }));

    return [...activePlacements, ...unplacedActiveHouseholds];
  }, [placements, selectedEvent, households, centers]);

  // Derive monitoring verification records combining live Supabase logs & registered households
  const monitoringRecords = useMemo(() => {
    if (!eventHouseholds.length) return [];

    return eventHouseholds.map((h, index) => {
      const placement = h.eventPlacement;
      const latestLog = logs?.find((log) => {
        if (log.householdId !== h.id || !log.createdAt) return false;
        const time = new Date(log.createdAt).getTime();
        const checkedInAt = placement.check_in_at ? new Date(placement.check_in_at).getTime() : 0;
        const checkedOutAt = placement.check_out_at ? new Date(placement.check_out_at).getTime() : Infinity;
        return time >= checkedInAt && time <= checkedOutAt;
      });

      const centerObj = centers.find((c) => c.displayName === h.center || isCenterMatch(h.center, c.displayName, centers));
      const code = centerObj
        ? centerObj.name.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase()
        : 'EVAC';

      const headName = (h.name || '').trim();
      const rawMemberList = (h.members || []).map((m) => (typeof m === 'string' ? m : m.name || '')).filter(Boolean);
      const membersHasHead = rawMemberList.some((m) => m.toLowerCase() === headName.toLowerCase());
      const allMembers = membersHasHead ? rawMemberList : (headName ? [headName, ...rawMemberList] : rawMemberList);
      const totalCount = allMembers.length || 1;

      if (latestLog) {
        return {
          id: latestLog.id || `LOG-${h.id}`,
          code,
          center: latestLog.center || h.center || 'Unassigned Center',
          room: latestLog.room || h.room || 'Unassigned',
          householdHead: latestLog.headName || h.name,
          householdCode: latestLog.householdCode || h.code || `HH-${String(index + 1).padStart(3, '0')}`,
          checked: `${latestLog.presentCount}/${latestLog.totalMembers}`,
          presentCount: latestLog.presentCount,
          totalCount: latestLog.totalMembers,
          absentCount: latestLog.absentCount,
          lateCount: latestLog.lateCount,
          round: latestLog.monitoringInterval || 'Every 2-3 hours',
          checkedBy: latestLog.checkedBy || 'MSWDO Staff',
          time: latestLog.createdAt
            ? new Date(latestLog.createdAt).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              })
            : 'Today',
          status: latestLog.householdStatus || 'Present',
          remarks: latestLog.remarks,
          membersAttendance: latestLog.membersAttendance || [],
          rawLog: latestLog,
        };
      }

      // Default state when not yet inspected in latest round
      return {
        id: `HH-MON-${h.id || index + 1}`,
        code,
        center: h.center || 'Unassigned Center',
        room: h.room || 'Unassigned',
        householdHead: h.name,
        householdCode: h.code || `HH-${String(index + 1).padStart(3, '0')}`,
        checked: `${totalCount}/${totalCount}`,
        presentCount: totalCount,
        totalCount,
        absentCount: 0,
        lateCount: 0,
        round: 'Every 2-3 hours',
        checkedBy: 'Camp Manager',
        time: h.createdAt
          ? new Date(h.createdAt).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            })
          : 'Registered',
        status: 'Present',
        remarks: 'Registered evacuee family',
        membersAttendance: allMembers.map((m) => ({
          name: m,
          status: 'Accounted For',
          check_in_time: null,
        })),
        rawLog: null,
      };
    });
  }, [eventHouseholds, logs, centers]);

  // Aggregate KPI summary metrics
  const stats = useMemo(() => {
    let totalMonitored = 0;
    let presentCount = 0;
    let followupCount = 0;
    let transferredCount = 0;

    monitoringRecords.forEach((r) => {
      totalMonitored += r.totalCount || 0;
      presentCount += r.presentCount || 0;
      if (r.status === 'For Follow-up') followupCount++;
      if (r.status === 'Transferred' || r.status === 'Decamped') transferredCount++;
    });

    return {
      totalMonitored,
      presentCount,
      followupCount,
      transferredCount,
    };
  }, [monitoringRecords]);

  const filtered = useMemo(() => {
    return monitoringRecords.filter((m) => {
      const matchCenter =
        filterCenter === 'All Centers' ||
        m.center === filterCenter ||
        isCenterMatch(m.center, filterCenter, centers);

      const matchRoom =
        filterRoom === 'All Rooms' ||
        m.room === filterRoom ||
        m.room === `Room ${filterRoom}` ||
        `Room ${m.room}` === filterRoom;

      const matchStatus =
        filterStatus === 'All Status' ||
        (filterStatus === 'Present' && (m.status === 'Present' || m.status === 'Recorded' || m.status === 'Complete')) ||
        (filterStatus === 'For Follow-up' && (m.status === 'For Follow-up' || m.status === 'Pending')) ||
        (filterStatus === 'Transferred' && m.status === 'Transferred') ||
        (filterStatus === 'Absent' && m.status === 'Absent');

      const query = search.trim().toLowerCase();
      const matchSearch = !query || [
        m.householdHead,
        m.householdCode,
        m.center,
        m.room,
        m.checkedBy,
      ].some((value) => String(value || '').toLowerCase().includes(query));

      return matchSearch && matchCenter && matchRoom && matchStatus;
    }).sort((a, b) =>
      (a.householdHead || '').localeCompare(b.householdHead || '', undefined, { sensitivity: 'base', numeric: true })
    );
  }, [monitoringRecords, filterCenter, filterRoom, filterStatus, centers, search]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedMonitoring = filtered.slice(startIndex, startIndex + pageSize);

  const getStatusBadge = (status) => {
    if (status === 'Present' || status === 'Complete') {
      return (
        <span className="vin-status-tag active">
          <CheckCircle2 size={13} style={{ marginRight: '4px' }} />
          Present
        </span>
      );
    }
    if (status === 'For Follow-up' || status === 'Pending') {
      return (
        <span className="vin-status-tag followup">
          <AlertTriangle size={13} style={{ marginRight: '4px' }} />
          For Follow-up
        </span>
      );
    }
    if (status === 'Transferred') {
      return (
        <span className="vin-status-tag transferred">
          <Building size={13} style={{ marginRight: '4px' }} />
          Transferred
        </span>
      );
    }
    if (status === 'Absent') {
      return (
        <span className="vin-status-tag absent">
          <XCircle size={13} style={{ marginRight: '4px' }} />
          Absent
        </span>
      );
    }
    return (
      <span className="vin-status-tag pending">
        <Clock size={13} style={{ marginRight: '4px' }} />
        {status}
      </span>
    );
  };

  return (
    <div className="vin-feature-page">
      <header className="vin-feature-header">
        <div className="vin-feature-header-left">
          <span className="vin-feature-eyebrow">DAILY VERIFICATION & HEADCOUNT</span>
          <h1 className="vin-feature-title">Evacuee Monitoring</h1>
          <p className="vin-feature-desc">
            Track presence for {selectedEvent?.event_name || 'the selected operation'} across 2–3 hour inspection rounds.
          </p>
        </div>
      </header>

      {/* ── KPI Metric Summary Cards ── */}
      <div className="vin-admin-hh-stats">
        <div className="vin-admin-hh-stat-card">
          <div className="vin-admin-hh-stat-info">
            <span className="vin-admin-hh-stat-label">Total Individuals</span>
            <span className="vin-admin-hh-stat-value">{stats.totalMonitored}</span>
          </div>
          <div className="vin-admin-hh-stat-icon total">
            <Users size={22} />
          </div>
        </div>

        <div className="vin-admin-hh-stat-card">
          <div className="vin-admin-hh-stat-info">
            <span className="vin-admin-hh-stat-label">Present / Accounted</span>
            <span className="vin-admin-hh-stat-value" style={{ color: '#6b21a8' }}>{stats.presentCount}</span>
          </div>
          <div className="vin-admin-hh-stat-icon present">
            <CheckCircle2 size={22} />
          </div>
        </div>

        <div className="vin-admin-hh-stat-card">
          <div className="vin-admin-hh-stat-info">
            <span className="vin-admin-hh-stat-label">For Follow-up</span>
            <span className="vin-admin-hh-stat-value" style={{ color: '#b45309' }}>{stats.followupCount}</span>
          </div>
          <div className="vin-admin-hh-stat-icon followup">
            <AlertTriangle size={22} />
          </div>
        </div>

        <div className="vin-admin-hh-stat-card">
          <div className="vin-admin-hh-stat-info">
            <span className="vin-admin-hh-stat-label">Transferred</span>
            <span className="vin-admin-hh-stat-value" style={{ color: '#0369a1' }}>{stats.transferredCount}</span>
          </div>
          <div className="vin-admin-hh-stat-icon transferred">
            <Building size={22} />
          </div>
        </div>
      </div>

      <div className="vin-feature-content-card" style={{ marginTop: 16 }}>
        <div className="vin-feature-toolbar">
          <AdminSearchInput
            placeholder="Search by family, center, or room..."
            value={search}
            onChange={(value) => {
              setSearch(value);
              setCurrentPage(1);
            }}
          />
          <AdminFilterBar
            hasActiveFilters={filterCenter !== 'All Centers' || filterRoom !== 'All Rooms' || filterStatus !== 'All Status'}
            onOpenFilters={() => setShowFilterModal(true)}
            activeChips={[
              filterCenter !== 'All Centers' && {
                key: 'center',
                label: 'Center',
                value: filterCenter,
                onRemove: () => {
                  setFilterCenter('All Centers');
                  setCurrentPage(1);
                },
              },
              filterRoom !== 'All Rooms' && {
                key: 'room',
                label: 'Room',
                value: filterRoom,
                onRemove: () => {
                  setFilterRoom('All Rooms');
                  setCurrentPage(1);
                },
              },
              filterStatus !== 'All Status' && {
                key: 'status',
                label: 'Status',
                value: filterStatus,
                onRemove: () => {
                  setFilterStatus('All Status');
                  setCurrentPage(1);
                },
              },
            ]}
          />
        </div>

        <table className="vin-feature-table">
          <thead>
            <tr>
              <th>EVACUATION CENTER</th>
              <th>ROOM / AREA</th>
              <th>FAMILY HEAD</th>
              <th>PEOPLE PRESENT</th>
              <th>CHECKED BY</th>
              <th>TIME STAMP</th>
              <th>STATUS</th>
              <th style={{ textAlign: 'center' }}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {paginatedMonitoring.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  No monitoring records match the current filter criteria.
                </td>
              </tr>
            ) : (
              paginatedMonitoring.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 600 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <Building size={15} color="#2563eb" />
                      {item.center}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600, color: '#475569' }}>{item.room}</td>
                  <td>
                    <div>
                      <strong style={{ color: '#0f172a' }}>{item.householdHead}</strong>
                      <div style={{ fontSize: '.75rem', color: '#64748b' }}>{item.householdCode}</div>
                    </div>
                  </td>
                  <td style={{ fontWeight: 700, color: '#6b21a8' }}>
                    {item.checked} present
                  </td>
                  <td style={{ color: '#334155' }}>
                    {item.checkedBy}
                  </td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={15} color="#64748b" />
                      {item.time}
                    </span>
                  </td>
                  <td>
                    {getStatusBadge(item.status)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      className="vin-btn-details"
                      onClick={() => setSelectedRecord(item)}
                    >
                      <Eye size={13} />
                      <span>Details</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {filtered.length > 0 && (
        <div className="vin-admin-pagination" style={{ flexWrap: 'wrap', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <span className="vin-pagination-info">
              Showing <strong>{(startIndex + 1).toLocaleString()}</strong>–<strong>{Math.min(startIndex + pageSize, filtered.length).toLocaleString()}</strong> of <strong>{filtered.length.toLocaleString()}</strong> monitored households
            </span>

            <div className="vin-page-size-selector">
              <span>Rows:</span>
              <select
                className="vin-page-size-select"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={150}>150</option>
                <option value={200}>200</option>
                <option value={250}>250</option>
              </select>
            </div>
          </div>

          <div className="vin-pagination-btns" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="vin-page-nav-icon-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(1)}
              title="First Page"
              aria-label="First page"
            >
              <ChevronsLeft size={16} />
            </button>

            <button
              type="button"
              className="vin-page-nav-icon-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              title="Previous Page"
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="vin-page-numbers">
              {getPaginationItems(currentPage, totalPages).map((item, idx) => {
                if (item === '...') {
                  return (
                    <span key={`dots-${idx}`} className="vin-page-ellipsis">
                      …
                    </span>
                  );
                }
                const pageNum = Number(item);
                return (
                  <button
                    key={pageNum}
                    type="button"
                    className={`vin-page-num-btn ${pageNum === currentPage ? 'active' : ''}`}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              className="vin-page-nav-icon-btn"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              title="Next Page"
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>

            <button
              type="button"
              className="vin-page-nav-icon-btn"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(totalPages)}
              title="Last Page"
              aria-label="Last page"
            >
              <ChevronsRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── Attendance Detail Modal ── */}
      {selectedRecord && (
        <div className="vin-admin-modal-overlay" onClick={() => setSelectedRecord(null)}>
          <div
            className="vin-admin-modal-card"
            style={{ maxWidth: 700 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="vin-admin-modal-header">
              <div>
                <h3 className="vin-admin-modal-title">Verification Round Details</h3>
                <p style={{ margin: '2px 0 0', fontSize: '.82rem', color: '#64748b' }}>
                  {selectedRecord.center} • {selectedRecord.room}
                </p>
              </div>
              <button
                type="button"
                className="vin-admin-modal-close"
                onClick={() => setSelectedRecord(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 20, padding: '20px 24px 0' }}>
              <div style={{ padding: '14px 16px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                  Family Head
                </span>
                <div style={{ fontWeight: 800, color: '#0f172a' }}>{selectedRecord.householdHead}</div>
                <div style={{ fontSize: '.78rem', color: '#64748b' }}>{selectedRecord.householdCode}</div>
              </div>

              <div style={{ padding: '14px 16px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                  Household Status
                </span>
                <div style={{ marginTop: 2 }}>{getStatusBadge(selectedRecord.status)}</div>
              </div>

              <div style={{ padding: '14px 16px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                  Checked By
                </span>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>{selectedRecord.checkedBy}</div>
                <div style={{ fontSize: '.78rem', color: '#64748b' }}>{selectedRecord.round}</div>
              </div>

              <div style={{ padding: '14px 16px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                  Inspection Time
                </span>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>{selectedRecord.time}</div>
                <div style={{ fontSize: '.78rem', color: '#6b21a8', fontWeight: 700 }}>
                  {selectedRecord.checked} Present
                </div>
              </div>
            </div>

            <h4 style={{ margin: '0 0 10px', fontSize: '1rem', fontWeight: 800, color: '#0f172a', padding: '0 24px' }}>
              Family Members Attendance
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto', padding: '0 24px' }}>
              {selectedRecord.membersAttendance && selectedRecord.membersAttendance.length > 0 ? (
                selectedRecord.membersAttendance.map((m, idx) => {
                  const memName = typeof m === 'string' ? m : m.name;
                  const memStatus = typeof m === 'string' ? 'Accounted For' : (m.status || 'Accounted For');
                  const checkInTime = m.check_in_time;

                  let badgeColor = '#6b21a8';
                  let badgeBg = '#f3e8ff';
                  if (memStatus === 'Late') {
                    badgeColor = '#b45309';
                    badgeBg = '#fef3c7';
                  } else if (memStatus === 'Absent') {
                    badgeColor = '#b91c1c';
                    badgeBg = '#fee2e2';
                  }

                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: '#f8fafc',
                        borderRadius: 8,
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: '.88rem', color: '#0f172a' }}>{memName}</strong>
                        {checkInTime && (
                          <div style={{ fontSize: '.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                            <Clock size={12} /> Checked in: {checkInTime}
                          </div>
                        )}
                      </div>
                      <span
                        style={{
                          fontSize: '.75rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 9999,
                          backgroundColor: badgeBg,
                          color: badgeColor,
                        }}
                      >
                        {memStatus}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div style={{ padding: 12, textAlign: 'center', color: '#64748b', fontSize: '.85rem' }}>
                  No member attendance breakdown recorded.
                </div>
              )}
            </div>

            {selectedRecord.remarks && (
              <div style={{ marginTop: 14, padding: '12px 16px', background: '#fef3c7', borderRadius: 10, fontSize: '.84rem', color: '#92400e', margin: '14px 24px 0' }}>
                <strong>Remarks:</strong> {selectedRecord.remarks}
              </div>
            )}

            <div style={{ marginTop: 0, padding: '16px 24px', borderTop: '1px solid #f1f5f9', textAlign: 'right' }}>
              <button
                type="button"
                className="vin-btn-secondary"
                onClick={() => setSelectedRecord(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile-Style Filter Modal ── */}
      <AdminFilterModal
        isOpen={showFilterModal}
        title="Filter Evacuee Monitoring"
        statusOptions={STATUSES.map((s) => ({ id: s, label: s }))}
        statusValue={filterStatus}
        centerValue={filterCenter}
        roomValue={filterRoom}
        centersList={centers}
        resultCount={filtered.length}
        onApply={({ status, center, room }) => {
          setFilterStatus(status);
          setFilterCenter(center);
          setFilterRoom(room);
          setCurrentPage(1);
        }}
        onClose={() => setShowFilterModal(false)}
      />
    </div>
  );
}
