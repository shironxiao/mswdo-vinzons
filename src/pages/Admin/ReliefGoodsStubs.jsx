import { useState, useMemo, useContext, useEffect } from 'react';
import { Building, ChevronLeft, ChevronRight, CircleCheck, Clock3, History, PackageCheck, PackageOpen, X } from 'lucide-react';
import './AdminFeatures.css';
import {
  useEvacuationCenters,
  isCenterMatch,
} from '../../lib/evacuationCenters.js';
import {
  getEventReliefStubRecords,
  getAllReliefStubs,
  getHouseholdReliefHistory,
  issueHouseholdStub,
  useEventRoomPlacements,
  useHouseholds,
} from '../../lib/householdService.js';
import { AdminFilterModal, AdminFilterBar } from '../../components/AdminFilterModal.jsx';
import { EventContext } from '../../context/eventContext.js';
import AdminSearchInput from '../../components/AdminSearchInput.jsx';
import { supabase } from '../../lib/supabase.js';

const STATUSES = ['All Status', 'Issued', 'Pending'];

export default function ReliefGoodsStubs() {
  const { selectedEvent, isReadOnly } = useContext(EventContext);
  const selectedEventId = selectedEvent?.id;
  const { centers } = useEvacuationCenters();
  const { households, refresh: refreshHouseholds } = useHouseholds(centers);
  const { placements } = useEventRoomPlacements(selectedEvent?.id);
  const [filterCenter, setFilterCenter] = useState('All Centers');
  const [filterRoom, setFilterRoom] = useState('All Rooms');
  const [filterStatus, setFilterStatus] = useState('All Status');
  const [search, setSearch] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [stubRecordState, setStubRecordState] = useState({ eventId: null, records: [] });
  const [stubErrorState, setStubErrorState] = useState({ eventId: null, message: '' });
  const [issuingHouseholdId, setIssuingHouseholdId] = useState(null);
  const [allStubsRecords, setAllStubsRecords] = useState([]);
  const [selectedHistoryHousehold, setSelectedHistoryHousehold] = useState(null);
  const [householdReliefHistory, setHouseholdReliefHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const pageSize = 8;

  const stubRecords = useMemo(
    () => stubRecordState.eventId === selectedEventId ? stubRecordState.records : [],
    [stubRecordState, selectedEventId]
  );
  const stubError = stubErrorState.eventId === selectedEventId
    ? stubErrorState.message
    : '';

  useEffect(() => {
    let isMounted = true;
    const fetchAllStubs = () => {
      getAllReliefStubs().then((stubs) => {
        if (isMounted) setAllStubsRecords(stubs);
      });
    };
    fetchAllStubs();

    const channelAll = supabase
      .channel('relief-stubs-global-count')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'relief_goods_stubs' },
        fetchAllStubs
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channelAll);
    };
  }, []);

  useEffect(() => {
    if (!selectedEventId || selectedEventId === 'default-active-event') return undefined;

    let isSubscribed = true;
    const loadStubRecords = () => {
      getEventReliefStubRecords(selectedEventId)
        .then((records) => {
          if (!isSubscribed) return;
          setStubRecordState({ eventId: selectedEventId, records });
          setStubErrorState({ eventId: selectedEventId, message: '' });
        })
        .catch((error) => {
          if (!isSubscribed) return;
          setStubErrorState({
            eventId: selectedEventId,
            message: error.message || 'Could not load relief stub records.',
          });
        });
    };

    loadStubRecords();
    const channel = supabase
      .channel(`relief-stubs-${selectedEventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'relief_goods_stubs',
          filter: `event_id=eq.${selectedEventId}`,
        },
        loadStubRecords
      )
      .subscribe();

    return () => {
      isSubscribed = false;
      supabase.removeChannel(channel);
    };
  }, [selectedEventId]);

  const eventHouseholds = useMemo(() => placements
    .filter((placement) => (
      placement.event_id === selectedEvent?.id &&
      (selectedEvent?.status !== 'Active' || placement.status === 'Evacuated')
    ))
    .map((placement) => {
      const household = households.find((item) => item.id === placement.household_id);
      return household ? { ...household, placement } : null;
    })
    .filter(Boolean), [placements, selectedEvent?.id, selectedEvent?.status, households]);

  const reliefCountsByHousehold = useMemo(() => {
    const map = new Map();
    allStubsRecords.forEach((record) => {
      if (record.stub_issued) {
        map.set(record.household_id, (map.get(record.household_id) || 0) + 1);
      }
    });
    return map;
  }, [allStubsRecords]);

  const householdRows = useMemo(() => {
    const recordsByHousehold = new Map(
      stubRecords.map((record) => [record.household_id, record])
    );

    return eventHouseholds.map((household) => {
      const stubRecord = recordsByHousehold.get(household.id);
      const center = centers.find((item) => item.id === household.placement.center_id);
      return {
        ...household,
        centerName: center?.displayName || household.center || 'Unassigned Center',
        roomName: household.room || 'Unassigned',
        stubCode: stubRecord?.stub_code || household.stubCode || '—',
        stubIssued: stubRecord
          ? Boolean(stubRecord.stub_issued)
          : Boolean(household.stubIssued),
        stubIssuedAt: stubRecord?.stub_issued_at || household.stubIssuedAt,
      };
    });
  }, [eventHouseholds, centers, stubRecords]);

  const filtered = useMemo(() => {
    return householdRows.filter((household) => {
      const matchCenter =
        filterCenter === 'All Centers' ||
        household.centerName === filterCenter ||
        isCenterMatch(household.centerName, filterCenter, centers);

      const matchRoom =
        filterRoom === 'All Rooms' ||
        household.roomName === filterRoom;

      const matchStatus =
        filterStatus === 'All Status' ||
        (filterStatus === 'Issued' && household.stubIssued) ||
        (filterStatus === 'Pending' && !household.stubIssued);

      const query = search.trim().toLowerCase();
      const matchSearch = !query || [
        household.name,
        household.householdCode,
        household.stubCode,
        household.centerName,
        household.roomName,
      ]
        .some((value) => String(value || '').toLowerCase().includes(query));

      return matchSearch && matchCenter && matchRoom && matchStatus;
    });
  }, [householdRows, filterCenter, filterRoom, filterStatus, centers, search]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedHouseholds = filtered.slice(startIndex, startIndex + pageSize);

  const handleOpenHistory = async (household) => {
    setSelectedHistoryHousehold(household);
    setLoadingHistory(true);
    try {
      const history = await getHouseholdReliefHistory(household.id);
      // If history is empty but current household is already marked as issued, synthesize current entry
      if (history.length === 0 && household.stubIssued) {
        history.push({
          stubCode: household.stubCode || '—',
          stubIssued: true,
          stubIssuedAt: household.stubIssuedAt || new Date().toISOString(),
          eventName: selectedEvent?.event_name || 'Operation Assistance',
          eventType: selectedEvent?.event_type || 'Disaster Event',
          centerName: household.centerName,
          roomName: household.roomName,
        });
      }
      setHouseholdReliefHistory(history);
    } catch (err) {
      console.warn('Error loading history:', err);
      setHouseholdReliefHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleIssueStub = async (household) => {
    if (
      isReadOnly ||
      !selectedEventId ||
      selectedEventId === 'default-active-event' ||
      household.stubIssued
    ) return;
    setIssuingHouseholdId(household.id);
    setStubErrorState({ eventId: selectedEventId, message: '' });

    try {
      await issueHouseholdStub(household.id, selectedEventId);
      const [, records, allStubs] = await Promise.all([
        refreshHouseholds(),
        getEventReliefStubRecords(selectedEventId),
        getAllReliefStubs(),
      ]);
      setStubRecordState({ eventId: selectedEventId, records });
      setAllStubsRecords(allStubs);
    } catch (error) {
      setStubErrorState({
        eventId: selectedEventId,
        message: error.message || 'Could not issue the relief stub.',
      });
    } finally {
      setIssuingHouseholdId(null);
    }
  };

  const formatIssuedAt = (date) => (
    date ? new Date(date).toLocaleString() : '—'
  );

  return (
    <div className="vin-feature-page">
      <header className="vin-feature-header">
        <div className="vin-feature-header-left">
          <span className="vin-feature-eyebrow">RELIEF DISTRIBUTION & ASSISTANCE</span>
          <h1 className="vin-feature-title">Relief Goods Stubs</h1>
          <p className="vin-feature-desc">
            Issue and track relief stubs for {selectedEvent?.event_name || 'the selected operation'}.
          </p>
        </div>
      </header>
      {isReadOnly && (
        <div role="status" style={{ padding: '10px 12px', borderRadius: 8, background: '#fffbeb', color: '#92400e', fontSize: '.84rem' }}>
          Historical event selected — relief issuance is read-only.
        </div>
      )}
      {stubError && (
        <div role="alert" style={{ padding: '10px 12px', borderRadius: 8, background: '#fef2f2', color: '#b91c1c', fontSize: '.84rem' }}>
          {stubError}
        </div>
      )}

      <div className="vin-feature-content-card">
        <div className="vin-feature-toolbar">
          <AdminSearchInput
            placeholder="Search by household, stub, center, or room..."
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
              <th>HOUSEHOLD</th>
              <th>CENTER</th>
              <th>ROOM</th>
              <th>HOUSEHOLD SIZE</th>
              <th>STUB CODE</th>
              <th>STATUS</th>
              <th>RELIEF RECEIVED</th>
              <th>ISSUED AT</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {paginatedHouseholds.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  No households match the current operation and filters.
                </td>
              </tr>
            ) : (
              paginatedHouseholds.map((household) => (
                <tr key={household.id}>
                  <td>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{household.name}</div>
                    <small style={{ color: '#64748b' }}>{household.householdCode}</small>
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <Building size={15} color="#2563eb" />
                      {household.centerName}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600, color: '#475569' }}>{household.roomName}</td>
                  <td>{household.familyCount} persons</td>
                  <td style={{ fontWeight: 600 }}>{household.stubCode}</td>
                  <td>
                    <span className={`vin-status-tag ${household.stubIssued ? 'active' : 'pending'}`}>
                      {household.stubIssued ? 'Issued' : 'Pending'}
                    </span>
                  </td>
                  <td>
                    {(() => {
                      const count = Math.max(
                        reliefCountsByHousehold.get(household.id) || 0,
                        household.stubIssued ? 1 : 0
                      );
                      return count > 0 ? (
                        <button
                          type="button"
                          className="vin-relief-history-badge-btn"
                          onClick={() => handleOpenHistory(household)}
                          title="Click to view complete relief history"
                        >
                          <History size={13} />
                          <span>{count} {count === 1 ? 'Pack' : 'Packs'}</span>
                        </button>
                      ) : (
                        <span className="vin-relief-count-zero" title="No relief issued yet">
                          0 Received
                        </span>
                      );
                    })()}
                  </td>
                  <td>
                    {household.stubIssuedAt ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <Clock3 size={14} color="#64748b" />
                        {formatIssuedAt(household.stubIssuedAt)}
                      </span>
                    ) : '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {household.stubIssued ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#15803d', fontWeight: 700 }}>
                          <CircleCheck size={16} />
                          Issued
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="vin-btn-submit"
                          onClick={() => handleIssueStub(household)}
                          disabled={
                            isReadOnly ||
                            issuingHouseholdId === household.id ||
                            !selectedEventId ||
                            selectedEventId === 'default-active-event'
                          }
                        >
                          {issuingHouseholdId === household.id ? 'Issuing…' : 'Issue stub'}
                        </button>
                      )}

                      <button
                        type="button"
                        className="vin-btn-view-relief-history"
                        onClick={() => handleOpenHistory(household)}
                        title="View relief assistance history"
                      >
                        <History size={14} />
                        <span>History</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {filtered.length > 0 && (
        <div className="vin-admin-pagination">
          <span className="vin-pagination-info">
            Showing <strong>{startIndex + 1}</strong>–<strong>{Math.min(startIndex + pageSize, filtered.length)}</strong> of <strong>{filtered.length}</strong> households
          </span>

          <div className="vin-pagination-btns">
            <button
              type="button"
              className="vin-page-nav-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
              <span>Previous</span>
            </button>

            <div className="vin-page-numbers">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  className={`vin-page-num-btn ${pageNum === currentPage ? 'active' : ''}`}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="vin-page-nav-btn"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Next page"
            >
              <span>Next</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── Household Relief Assistance History Modal ── */}
      {selectedHistoryHousehold && (
        <div
          className="vin-history-modal-overlay"
          onClick={() => setSelectedHistoryHousehold(null)}
        >
          <div
            className="vin-history-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="vin-history-modal-header">
              <div className="vin-history-modal-title-group">
                <h2 className="vin-history-modal-title">
                  <PackageCheck size={22} color="#7c3aed" />
                  Relief Assistance History
                </h2>
                <p className="vin-history-modal-subtitle">
                  Historical log of relief goods, stubs, and assistance issued to this household.
                </p>
              </div>
              <button
                type="button"
                className="vin-history-modal-close-btn"
                onClick={() => setSelectedHistoryHousehold(null)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="vin-history-modal-body">
              {/* Profile & Total Stat Card */}
              <div className="vin-history-summary-grid">
                <div className="vin-history-hh-details">
                  <span className="vin-history-hh-name">
                    {selectedHistoryHousehold.name}
                  </span>
                  <div className="vin-history-hh-meta">
                    <span><strong>Code:</strong> {selectedHistoryHousehold.householdCode}</span>
                    <span>•</span>
                    <span><strong>Center:</strong> {selectedHistoryHousehold.centerName}</span>
                    <span>•</span>
                    <span><strong>Room:</strong> {selectedHistoryHousehold.roomName}</span>
                    <span>•</span>
                    <span><strong>Family Size:</strong> {selectedHistoryHousehold.familyCount} members</span>
                  </div>
                </div>

                <div className="vin-history-stat-badge">
                  <span className="vin-history-stat-count">
                    {householdReliefHistory.filter((h) => h.stubIssued).length}
                  </span>
                  <span className="vin-history-stat-label">Relief Received</span>
                </div>
              </div>

              {/* History Table or Empty State */}
              {loadingHistory ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  Loading relief distribution history…
                </div>
              ) : householdReliefHistory.length === 0 ? (
                <div className="vin-history-empty">
                  <PackageOpen size={36} color="#94a3b8" />
                  <p style={{ margin: 0, fontWeight: 700, color: '#334155' }}>
                    No Relief Goods Issued Yet
                  </p>
                  <small style={{ color: '#64748b' }}>
                    This household has not received any relief goods stubs in recorded operations.
                  </small>
                </div>
              ) : (
                <div className="vin-history-table-wrap">
                  <table className="vin-history-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>DISASTER OPERATION</th>
                        <th>EVACUATION CENTER / ROOM</th>
                        <th>STUB CODE</th>
                        <th>DATE & TIME ISSUED</th>
                        <th>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {householdReliefHistory.map((item, idx) => (
                        <tr key={item.stubCode + idx}>
                          <td style={{ fontWeight: 700, color: '#6d28d9' }}>
                            #{householdReliefHistory.length - idx}
                          </td>
                          <td>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>
                              {item.eventName}
                            </div>
                            <small style={{ color: '#64748b' }}>{item.eventType}</small>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: '#334155' }}>
                              {item.centerName}
                            </div>
                            <small style={{ color: '#64748b' }}>{item.roomName}</small>
                          </td>
                          <td style={{ fontWeight: 700, color: '#0f172a' }}>
                            {item.stubCode}
                          </td>
                          <td>
                            {item.stubIssuedAt ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#475569' }}>
                                <Clock3 size={13} color="#64748b" />
                                {formatIssuedAt(item.stubIssuedAt)}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td>
                            <span className={`vin-status-tag ${item.stubIssued ? 'active' : 'pending'}`}>
                              {item.stubIssued ? (
                                <>
                                  <CircleCheck size={13} />
                                  Issued
                                </>
                              ) : (
                                'Pending'
                              )}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="vin-history-modal-footer">
              <button
                type="button"
                className="vin-btn-cancel"
                onClick={() => setSelectedHistoryHousehold(null)}
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
        title="Filter Relief Stubs"
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