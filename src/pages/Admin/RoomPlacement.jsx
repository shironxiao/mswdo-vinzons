import { useState, useMemo, useContext } from 'react';
import { Building, ChevronLeft, ChevronRight, Users, X, ArrowRightLeft, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import './AdminFeatures.css';
import './AdminHousehold.css';
import {
  useEvacuationCenters,
  isCenterMatch,
} from '../../lib/evacuationCenters.js';
import { useEventRoomPlacements, useHouseholds, transferHouseholdRoom } from '../../lib/householdService.js';
import { useRooms } from '../../lib/roomService.js';
import { AdminFilterModal, AdminFilterBar } from '../../components/AdminFilterModal.jsx';
import { EventContext } from '../../context/eventContext.js';
import AdminSearchInput from '../../components/AdminSearchInput.jsx';

const STATUSES = ['All Status', 'Active', 'Full'];

export default function RoomPlacement() {
  const { selectedEvent, isReadOnly } = useContext(EventContext);
  const { centers } = useEvacuationCenters();
  const { households, refresh: refreshHouseholds } = useHouseholds(centers);
  const { rooms: dbRooms } = useRooms(centers);
  const { placements, refresh: refreshPlacements } = useEventRoomPlacements(selectedEvent?.id);
  const [filterCenter, setFilterCenter] = useState('All Centers');
  const [filterRoom, setFilterRoom] = useState('All Rooms');
  const [filterStatus, setFilterStatus] = useState('All Status');
  const [search, setSearch] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  /* Transfer Modal State */
  const [transferTarget, setTransferTarget] = useState(null);
  const [transferSourceRoom, setTransferSourceRoom] = useState(null);
  const [targetCenterId, setTargetCenterId] = useState('');
  const [targetRoomName, setTargetRoomName] = useState('');
  const [targetRoomId, setTargetRoomId] = useState(null);
  const [transferReason, setTransferReason] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferError, setTransferError] = useState('');
  const [transferSuccessDialog, setTransferSuccessDialog] = useState(null);

  // Clean room name by stripping redundant "- Capacity <number>"
  const cleanRoomName = (name) =>
    String(name || '')
      .replace(/\s*-\s*Capacity\s*\d+/i, '')
      .trim();

  /* ── Calculations for Destination Center & Rooms in Transfer Modal ── */
  const targetCenterObj = useMemo(() => {
    return centers.find((c) => c.id === targetCenterId) || centers[0];
  }, [centers, targetCenterId]);

  const transferFamilySize = useMemo(() => {
    if (!transferTarget) return 1;
    return transferTarget.familyCount || (transferTarget.members?.length ? transferTarget.members.length + 1 : 1);
  }, [transferTarget]);

  const availableRoomsForTransfer = useMemo(() => {
    if (!targetCenterObj) return [];

    const matchingDbRooms = (dbRooms || []).filter(
      (r) =>
        r.centerId === targetCenterObj.id ||
        r.center === targetCenterObj.displayName ||
        r.center === targetCenterObj.name
    );

    const baseRooms =
      matchingDbRooms.length > 0
        ? matchingDbRooms.map((r) => ({
            id: r.roomName,
            roomId: r.id,
            name: cleanRoomName(r.roomName),
            capacity: Number(r.capacity) || 30,
          }))
        : (targetCenterObj.rooms || []).map((r) => ({
            id: r.name || r.id,
            roomId: r.id,
            name: cleanRoomName(r.name || r.id),
            capacity: Number(r.capacity) || 30,
          }));

    const effectiveRooms =
      baseRooms.length > 0
        ? baseRooms
        : [
            { id: 'Room 1', roomId: 'Room 1', name: 'Room 1', capacity: 30 },
            { id: 'Room 2', roomId: 'Room 2', name: 'Room 2', capacity: 25 },
          ];

    const activePlacementsInCenter = placements.filter(
      (p) => p.status === 'Evacuated' && p.center_id === targetCenterObj.id && p.event_id === selectedEvent?.id
    );

    const householdsMap = new Map(households.map((h) => [h.id, h]));

    return effectiveRooms.map((room) => {
      const roomOccupants = activePlacementsInCenter
        .filter(
          (p) =>
            p.room_id === room.roomId ||
            p.room_id === room.id ||
            p.room_name === room.name
        )
        .map((p) => householdsMap.get(p.household_id))
        .filter(Boolean);

      const occupied = roomOccupants.reduce(
        (sum, h) => sum + (h.familyCount || 1),
        0
      );

      return {
        ...room,
        occupied,
      };
    });
  }, [targetCenterObj, dbRooms, placements, selectedEvent?.id, households]);

  const handleOpenTransfer = (household, room) => {
    setTransferTarget(household);
    setTransferSourceRoom(room);
    const matchingCenter = centers.find(
      (c) => c.displayName === room?.center || c.name === room?.center || c.id === household.centerId
    ) || centers[0];
    setTargetCenterId(matchingCenter?.id || centers[0]?.id || '');
    setTargetRoomName('');
    setTargetRoomId(null);
    setTransferReason('');
    setTransferError('');
  };

  const handleAutoAssignTransfer = () => {
    if (!availableRoomsForTransfer.length) {
      setTransferError('No rooms found in the selected target evacuation center.');
      return;
    }

    const currentRoomKey = transferSourceRoom ? transferSourceRoom.name : transferTarget?.room;
    const isSameCenter = targetCenterObj?.displayName === transferSourceRoom?.center || targetCenterObj?.name === transferSourceRoom?.center;

    const candidate = availableRoomsForTransfer.find((r) => {
      const isCurrent = isSameCenter && (r.name === currentRoomKey || r.roomId === transferTarget?.roomId);
      const freeSlots = r.capacity - r.occupied;
      return !isCurrent && freeSlots >= transferFamilySize;
    });

    if (!candidate) {
      setTransferError(
        `Validation: No room in "${targetCenterObj?.displayName || targetCenterObj?.name}" has ${transferFamilySize} free spots. Please choose another center.`
      );
      return;
    }

    setTargetRoomName(candidate.name);
    setTargetRoomId(candidate.roomId);
    setTransferError('');
  };

  const handleConfirmTransfer = async () => {
    if (isReadOnly) {
      setTransferError('Historical event selected — transfers are read-only.');
      return;
    }
    if (!targetCenterId) {
      setTransferError('Please select a target evacuation center.');
      return;
    }
    if (!targetRoomName) {
      setTransferError('Please select a target room.');
      return;
    }

    const isSameCenter = targetCenterObj?.displayName === transferSourceRoom?.center || targetCenterObj?.name === transferSourceRoom?.center;
    const currentRoomKey = transferSourceRoom ? transferSourceRoom.name : transferTarget?.room;
    if (isSameCenter && targetRoomName === currentRoomKey) {
      setTransferError('This household is already placed in this room. Please choose a different room or center.');
      return;
    }

    setIsTransferring(true);
    setTransferError('');
    try {
      await transferHouseholdRoom({
        householdId: transferTarget.id,
        eventId: selectedEvent?.id,
        centerId: targetCenterId,
        roomId: targetRoomId || undefined,
        roomName: targetRoomName,
        reason: transferReason,
      });

      const transferredName = transferTarget.name;
      const destCenterName = targetCenterObj?.displayName || targetCenterObj?.name || 'Selected Center';
      const destRoomName = targetRoomName;

      // Close transfer modal
      setTransferTarget(null);

      // Remove from current modal room view
      if (selectedRoom) {
        setSelectedRoom((prev) => prev ? {
          ...prev,
          households: prev.households.filter((h) => h.id !== transferTarget.id),
          occupied: Math.max(0, prev.occupied - transferFamilySize),
        } : null);
      }

      await Promise.all([refreshHouseholds(), refreshPlacements()]);

      setTransferSuccessDialog({
        title: 'Household Transferred Successfully',
        message: `${transferredName} has been transferred to ${destCenterName} (${destRoomName}).`,
      });
    } catch (err) {
      setTransferError(err.message || 'Could not complete household transfer.');
    } finally {
      setIsTransferring(false);
    }
  };

  // Calculate live room occupancies from Supabase database
  const allRooms = useMemo(() => {
    const eventPlacements = placements.filter((placement) =>
      placement.event_id === selectedEvent?.id && placement.status === 'Evacuated'
    );
    const householdsById = new Map(households.map((household) => [household.id, household]));
    const householdsForRoom = (roomId, centerId) => eventPlacements
      .filter((placement) => placement.room_id === roomId && placement.center_id === centerId)
      .map((placement) => householdsById.get(placement.household_id))
      .filter(Boolean);

    // 1. If we have rooms from Supabase dbRooms
    if (dbRooms && dbRooms.length > 0) {
      return dbRooms.map((r) => {
        const roomHouseholds = householdsForRoom(r.id, r.centerId);
        const occupied = roomHouseholds.reduce((sum, household) => sum + (household.familyCount || 1), 0);
        const isFull = occupied >= r.capacity;

        return {
          id: r.code || r.id,
          roomKey: r.roomName,
          center: r.center,
          name: cleanRoomName(r.roomName),
          occupied,
          households: roomHouseholds,
          capacity: r.capacity,
          status: isFull ? 'Full' : 'Active',
        };
      });
    }

    // 2. Fallback to centers generated rooms if dbRooms is loading
    const list = [];
    centers.forEach((center) => {
      (center.rooms || []).forEach((r) => {
        const roomOccupants = eventPlacements
          .filter((placement) => placement.center_id === center.id)
          .map((placement) => ({
            placement,
            household: householdsById.get(placement.household_id),
          }))
          .filter(({ placement, household }) => {
            if (!household || placement.room_id !== household.roomId) return false;
            const matchCenter =
              household.center === center.displayName ||
              isCenterMatch(household.center, center.displayName, centers);
            const matchRoom = household.room === r.id || household.room === r.name;
            return matchCenter && matchRoom;
          })
          .map(({ household }) => household);
        const occupied = roomOccupants.reduce((sum, household) => sum + (household.familyCount || 1), 0);
        const isFull = occupied >= (r.capacity || 25);

        list.push({
          id: `${center.name.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase()}-${r.id.replace(/\s+/g, '')}`,
          roomKey: r.id,
          center: center.displayName,
          name: cleanRoomName(r.name),
          occupied,
          households: roomOccupants,
          capacity: r.capacity || 25,
          status: isFull ? 'Full' : 'Active',
        });
      });
    });

    return list;
  }, [dbRooms, centers, households, placements, selectedEvent?.id]);

  const filtered = useMemo(() => {
    return allRooms.filter((r) => {
      const matchCenter =
        filterCenter === 'All Centers' ||
        r.center === filterCenter ||
        isCenterMatch(r.center, filterCenter, centers);

      const matchStatus =
        filterStatus === 'All Status' || r.status === filterStatus;

      const matchRoom =
        filterRoom === 'All Rooms' ||
        r.roomKey === filterRoom ||
        r.name.toLowerCase().includes(filterRoom.toLowerCase()) ||
        r.id.toLowerCase().includes(filterRoom.toLowerCase());

      const query = search.trim().toLowerCase();
      const matchSearch = !query || [
        r.id,
        r.roomKey,
        r.name,
        r.center,
        ...r.households.flatMap((household) => [household.name, household.householdCode]),
      ]
        .some((value) => String(value || '').toLowerCase().includes(query));

      return matchSearch && matchCenter && matchStatus && matchRoom;
    });
  }, [allRooms, filterCenter, filterStatus, filterRoom, centers, search]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedRooms = filtered.slice(startIndex, startIndex + pageSize);

  return (
    <div className="vin-feature-page">
      <header className="vin-feature-header">
        <div className="vin-feature-header-left">
          <span className="vin-feature-eyebrow">FACILITIES & ALLOCATIONS</span>
          <h1 className="vin-feature-title">Room Placement</h1>
          <p className="vin-feature-desc">
            Organize evacuee room allocations and designated spaces across evacuation centers.
          </p>
          <p style={{ margin: '6px 0 0', color: isReadOnly ? '#92400e' : '#64748b', fontSize: '.82rem' }}>
            {isReadOnly
              ? `Viewing archived occupancy for ${selectedEvent?.event_name || 'the selected operation'}; room setup remains editable.`
              : `Occupancy is based on active placements for ${selectedEvent?.event_name || 'the selected operation'}.`}
          </p>
        </div>
      </header>

      <div className="vin-feature-content-card">
        <div className="vin-feature-toolbar">
          <AdminSearchInput
            placeholder="Search by room, center, or household..."
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

        <div className="vin-room-placement-table-wrap">
          <table className="vin-feature-table vin-room-placement-table">
            <thead>
              <tr>
                <th>CENTER</th>
                <th>ROOM NAME / DESIGNATION</th>
                <th>OCCUPANCY</th>
                <th>STATUS</th>
                <th className="vin-room-placement-action-cell">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRooms.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    No rooms match the current filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedRooms.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                        <Building size={15} color="#2563eb" />
                        {item.center}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: '#0f172a' }}>{item.name}</td>
                    <td>
                      <div style={{ fontWeight: 700, color: item.status === 'Full' ? '#b91c1c' : '#7c3aed' }}>
                        {item.occupied} / {item.capacity} persons
                      </div>
                      <div style={{ height: 6, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden', marginTop: 5, maxWidth: 160 }}>
                        <div style={{
                          height: '100%',
                          width: `${Math.min(100, Math.round((item.occupied / item.capacity) * 100))}%`,
                          background: item.status === 'Full' ? '#dc2626' : '#7c3aed',
                        }} />
                      </div>
                    </td>
                    <td>
                      <span className={`vin-status-tag ${item.status === 'Full' ? 'pending' : 'active'}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="vin-room-placement-action-cell">
                      <button
                        type="button"
                        className="vin-btn-view-households"
                        onClick={() => setSelectedRoom(item)}
                      >
                        <Users size={14} />
                        <span>View Households</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {filtered.length > 0 && (
        <div className="vin-admin-pagination">
          <span className="vin-pagination-info">
            Showing <strong>{startIndex + 1}</strong>–<strong>{Math.min(startIndex + pageSize, filtered.length)}</strong> of <strong>{filtered.length}</strong> rooms
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

      {/* ── View Households In Room Modal Panel ── */}
      {selectedRoom && (
        <div className="vin-modal-overlay" onClick={() => setSelectedRoom(null)}>
          <div
            className="vin-room-households-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="vin-room-modal-header">
              <div className="vin-room-modal-header-info">
                <div className="vin-room-modal-badge-row">
                  <span className="vin-room-center-badge">
                    <Building size={13} color="#2563eb" />
                    {selectedRoom.center}
                  </span>
                  <span className={`vin-status-tag ${selectedRoom.status === 'Full' ? 'pending' : 'active'}`}>
                    {selectedRoom.status}
                  </span>
                </div>
                <h2 className="vin-room-modal-title">
                  {selectedRoom.name}
                </h2>
                <p className="vin-room-modal-subtitle">
                  Occupancy: <strong>{selectedRoom.occupied} / {selectedRoom.capacity} persons</strong>
                  {' • '}
                  <strong>{selectedRoom.households.length}</strong> {selectedRoom.households.length === 1 ? 'household' : 'households'} assigned
                </p>
              </div>
              <button
                type="button"
                className="vin-picker-close-btn"
                onClick={() => setSelectedRoom(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="vin-room-modal-body">
              {selectedRoom.households.length === 0 ? (
                <div className="vin-room-households-empty">
                  <Users size={44} className="vin-room-empty-icon" />
                  <h4 className="vin-room-empty-title">No Households Assigned</h4>
                  <p className="vin-room-empty-desc">
                    There are currently no evacuated households allocated to {selectedRoom.name}.
                  </p>
                </div>
              ) : (
                <div className="vin-room-households-list">
                  {selectedRoom.households.map((hh, idx) => {
                    const memberCount = hh.familyCount || (hh.members?.length ? hh.members.length + 1 : 1);
                    return (
                      <div key={hh.id || idx} className="vin-room-household-card">
                        <div className="vin-room-hh-top">
                          <div className="vin-room-hh-identity">
                            <span className="vin-room-hh-name">{hh.name}</span>
                            <span className="vin-room-hh-code">
                              {hh.householdCode || hh.id}
                              {hh.stubCode ? ` • Stub: ${hh.stubCode}` : ''}
                            </span>
                          </div>
                          <span className="vin-room-hh-count-badge">
                            <Users size={12} />
                            {memberCount} {memberCount === 1 ? 'Person' : 'Persons'}
                          </span>
                        </div>

                        {(hh.purok || hh.barangay) && (
                          <div className="vin-room-hh-location">
                            📍 {[hh.purok, hh.barangay].filter(Boolean).join(', ')}
                          </div>
                        )}

                        {Array.isArray(hh.vulnerabilities) && hh.vulnerabilities.length > 0 && (
                          <div className="vin-room-hh-tags">
                            {hh.vulnerabilities.map((v, vIdx) => (
                              <span key={vIdx} className="vin-room-hh-vuln-pill">
                                {v}
                              </span>
                            ))}
                          </div>
                        )}

                        {Array.isArray(hh.members) && hh.members.length > 0 && (
                          <div className="vin-room-hh-members-wrap">
                            <span className="vin-room-hh-members-label">Family Members ({hh.members.length}):</span>
                            <div className="vin-room-hh-members-list">
                              {hh.members.map((m, mIdx) => (
                                <span key={mIdx} className="vin-room-member-chip">
                                  {m.name || `${m.firstName || ''} ${m.lastName || ''}`.trim() || `Member #${mIdx + 1}`}
                                  {m.relationship ? ` • ${m.relationship}` : ''}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Transfer Action Row */}
                        <div className="vin-room-hh-actions-row">
                          <button
                            type="button"
                            className="vin-btn-transfer-action"
                            onClick={() => handleOpenTransfer(hh, selectedRoom)}
                            disabled={isReadOnly}
                            title="Transfer household to another center or room"
                          >
                            <ArrowRightLeft size={14} />
                            <span>Transfer Room / Center</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="vin-room-modal-footer">
              <button
                type="button"
                className="vin-btn-modal-close"
                onClick={() => setSelectedRoom(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Transfer Household to Another Center / Room Modal ── */}
      {transferTarget && (
        <div
          className="vin-modal-overlay"
          onClick={() => {
            if (!isTransferring) setTransferTarget(null);
          }}
        >
          <div
            className="vin-transfer-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="vin-room-modal-header">
              <div className="vin-room-modal-header-info">
                <div className="vin-room-modal-badge-row">
                  <span className="vin-room-center-badge">
                    <ArrowRightLeft size={13} color="#7c3aed" />
                    Household Transfer
                  </span>
                  <span className="vin-status-tag active">
                    Evacuated
                  </span>
                </div>
                <h2 className="vin-room-modal-title">
                  Transfer Household
                </h2>
                <p className="vin-room-modal-subtitle">
                  Re-assign <strong>{transferTarget.name}</strong> to a different room or evacuation facility.
                </p>
              </div>
              <button
                type="button"
                className="vin-picker-close-btn"
                onClick={() => setTransferTarget(null)}
                disabled={isTransferring}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="vin-room-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Transfer Target Banner */}
              <div className="vin-transfer-summary-box">
                <div className="vin-transfer-target-banner">
                  <div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                      {transferTarget.name}
                    </div>
                    <small style={{ color: '#64748b' }}>
                      {transferTarget.householdCode || transferTarget.id}
                      {transferTarget.stubCode ? ` • Stub: ${transferTarget.stubCode}` : ''}
                    </small>
                  </div>
                  <span className="vin-room-hh-count-badge">
                    <Users size={13} />
                    {transferFamilySize} {transferFamilySize === 1 ? 'Person' : 'Persons'}
                  </span>
                </div>

                <div className="vin-transfer-flow-row">
                  <div className="vin-transfer-flow-box">
                    <span className="vin-transfer-flow-label">Current Placement</span>
                    <span className="vin-transfer-flow-val">
                      {transferSourceRoom?.center || transferTarget.center || 'Unassigned'} — {transferSourceRoom?.name || transferTarget.room || 'Unassigned'}
                    </span>
                  </div>
                  <ArrowRightLeft size={18} color="#7c3aed" style={{ flexShrink: 0 }} />
                  <div className="vin-transfer-flow-box">
                    <span className="vin-transfer-flow-label">Target Placement</span>
                    <span className="vin-transfer-flow-val" style={{ color: targetRoomName ? '#6d28d9' : '#94a3b8' }}>
                      {targetCenterObj?.displayName || targetCenterObj?.name} — {targetRoomName || 'Select room below'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Error Alert */}
              {transferError && (
                <div role="alert" style={{
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#b91c1c',
                  fontSize: '.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{transferError}</span>
                </div>
              )}

              {/* Target Evacuation Center Selector */}
              <div className="vin-transfer-center-select-wrap">
                <label className="vin-transfer-field-label" htmlFor="target-center-select">
                  Target Evacuation Center
                </label>
                <select
                  id="target-center-select"
                  className="vin-transfer-select-input"
                  value={targetCenterId}
                  onChange={(e) => {
                    setTargetCenterId(e.target.value);
                    setTargetRoomName('');
                    setTargetRoomId(null);
                    setTransferError('');
                  }}
                  disabled={isTransferring}
                >
                  {centers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.displayName || c.name} {c.location ? `(${c.location.split(',')[0]})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Room Selection with Auto-Assign */}
              <div>
                <div className="vin-transfer-room-section-header">
                  <label className="vin-transfer-field-label">
                    Select Target Room in {targetCenterObj?.displayName || targetCenterObj?.name}
                  </label>
                  <button
                    type="button"
                    className="vin-auto-assign-action-btn"
                    onClick={handleAutoAssignTransfer}
                    disabled={isTransferring}
                    title="Automatically find and assign the best available room with enough space"
                  >
                    <Sparkles size={13} />
                    <span>Auto-Assign</span>
                  </button>
                </div>

                {/* Available Rooms Grid */}
                <div className="vin-admin-room-cards-grid" style={{ marginTop: '10px' }}>
                  {availableRoomsForTransfer.map((room) => {
                    const currentRoomKey = transferSourceRoom ? transferSourceRoom.name : transferTarget?.room;
                    const isSameCenter = targetCenterObj?.displayName === transferSourceRoom?.center || targetCenterObj?.name === transferSourceRoom?.center;
                    const isCurrent = isSameCenter && (room.name === currentRoomKey || room.roomId === transferTarget?.roomId);
                    const isSelected = targetRoomName === room.name;
                    const freeSlots = Math.max(0, room.capacity - room.occupied);
                    const hasCapacity = freeSlots >= transferFamilySize;
                    const isFull = room.occupied >= room.capacity;

                    let cardClass = 'available';
                    if (isCurrent) cardClass = 'current';
                    else if (isSelected) cardClass = 'selected';
                    else if (isFull) cardClass = 'full';
                    else if (!hasCapacity) cardClass = 'insufficient';

                    return (
                      <div
                        key={room.roomId || room.name}
                        className={`vin-room-card-box ${cardClass}`}
                        onClick={() => {
                          if (!isCurrent && hasCapacity && !isTransferring) {
                            setTargetRoomName(room.name);
                            setTargetRoomId(room.roomId);
                            setTransferError('');
                          }
                        }}
                        style={{ cursor: isCurrent || !hasCapacity ? 'default' : 'pointer' }}
                      >
                        <div className="vin-room-card-top-row">
                          <div>
                            <div className="vin-room-card-id">{room.name}</div>
                            <div className="vin-room-card-subname">
                              Capacity: {room.capacity} individuals
                            </div>
                          </div>
                          <span className={`vin-room-status-chip ${
                            isCurrent ? 'current' : isFull ? 'full' : hasCapacity ? 'available' : 'low'
                          }`}>
                            {isCurrent ? 'Current' : isFull ? 'Full' : hasCapacity ? 'Available' : 'No Space'}
                          </span>
                        </div>

                        {/* Occupancy Progress */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', marginBottom: 4 }}>
                            <span style={{ color: '#64748b' }}>Occupancy</span>
                            <span style={{ fontWeight: 700, color: isFull ? '#dc2626' : '#475569' }}>
                              {room.occupied} / {room.capacity} ({freeSlots} free)
                            </span>
                          </div>
                          <div style={{ height: 6, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden' }}>
                            <div style={{
                              height: '100%',
                              width: `${Math.min(100, Math.round((room.occupied / room.capacity) * 100))}%`,
                              background: isFull ? '#dc2626' : isCurrent ? '#16a34a' : '#7c3aed',
                            }} />
                          </div>
                        </div>

                        {/* Room Select Button */}
                        <button
                          type="button"
                          className={`vin-room-select-btn ${
                            isCurrent ? 'btn-current' : hasCapacity ? 'btn-fit' : 'btn-disabled'
                          }`}
                          disabled={isCurrent || !hasCapacity || isTransferring}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isCurrent && hasCapacity) {
                              setTargetRoomName(room.name);
                              setTargetRoomId(room.roomId);
                              setTransferError('');
                            }
                          }}
                        >
                          {isCurrent
                            ? 'Current Room ✓'
                            : isSelected
                            ? `Selected (${room.name})`
                            : hasCapacity
                            ? `Select ${room.name}`
                            : 'No Space for Family'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Optional Reason Field */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label className="vin-transfer-field-label" htmlFor="transfer-reason">
                  Reason for Transfer (Optional)
                </label>
                <input
                  id="transfer-reason"
                  type="text"
                  className="vin-admin-form-input"
                  placeholder="e.g., Overcapacity re-allocation, special medical care, family request"
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  disabled={isTransferring}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="vin-room-modal-footer" style={{ justifyContent: 'space-between' }}>
              <button
                type="button"
                className="vin-btn-modal-close"
                onClick={() => setTransferTarget(null)}
                disabled={isTransferring}
              >
                Cancel
              </button>
              <button
                type="button"
                className="vin-btn-submit"
                onClick={handleConfirmTransfer}
                disabled={!targetRoomName || isTransferring || isReadOnly}
                style={{ padding: '8px 20px' }}
              >
                {isTransferring
                  ? 'Transferring…'
                  : targetRoomName
                  ? `Confirm Transfer to ${targetRoomName}`
                  : 'Select a Room Above'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Success Dialog ── */}
      {transferSuccessDialog && (
        <div
          className="vin-dialog-overlay"
          onClick={() => setTransferSuccessDialog(null)}
        >
          <div
            className="vin-dialog-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: '#f0fdf4',
              color: '#16a34a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <CheckCircle2 size={32} />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
              {transferSuccessDialog.title}
            </h3>
            <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: '0.9rem', lineHeight: 1.5 }}>
              {transferSuccessDialog.message}
            </p>
            <button
              type="button"
              className="vin-btn-submit"
              onClick={() => setTransferSuccessDialog(null)}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* ── Mobile-Style Filter Modal ── */}
      <AdminFilterModal
        isOpen={showFilterModal}
        title="Filter Rooms"
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