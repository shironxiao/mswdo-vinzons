import { useState, useMemo, useContext } from 'react';
import { Building, ChevronLeft, ChevronRight, Users, X } from 'lucide-react';
import './AdminFeatures.css';
import {
  useEvacuationCenters,
  isCenterMatch,
} from '../../lib/evacuationCenters.js';
import { useEventRoomPlacements, useHouseholds } from '../../lib/householdService.js';
import { useRooms } from '../../lib/roomService.js';
import { AdminFilterModal, AdminFilterBar } from '../../components/AdminFilterModal.jsx';
import { EventContext } from '../../context/eventContext.js';
import AdminSearchInput from '../../components/AdminSearchInput.jsx';

const STATUSES = ['All Status', 'Active', 'Full'];

export default function RoomPlacement() {
  const { selectedEvent, isReadOnly } = useContext(EventContext);
  const { centers } = useEvacuationCenters();
  const { households } = useHouseholds(centers);
  const { rooms: dbRooms } = useRooms(centers);
  const { placements } = useEventRoomPlacements(selectedEvent?.id);
  const [filterCenter, setFilterCenter] = useState('All Centers');
  const [filterRoom, setFilterRoom] = useState('All Rooms');
  const [filterStatus, setFilterStatus] = useState('All Status');
  const [search, setSearch] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Clean room name by stripping redundant "- Capacity <number>"
  const cleanRoomName = (name) =>
    String(name || '')
      .replace(/\s*-\s*Capacity\s*\d+/i, '')
      .trim();

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