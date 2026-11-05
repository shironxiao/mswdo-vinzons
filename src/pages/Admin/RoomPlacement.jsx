import { useState, useMemo, useContext } from 'react';
import { Building, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

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
          name: `${r.roomName} - Capacity ${r.capacity}`,
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
          name: `${r.name} - Capacity ${r.capacity || 25}`,
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
                <th>ROOM CODE</th>
                <th>CENTER</th>
                <th>ROOM NAME / DESIGNATION</th>
                <th>HOUSEHOLDS IN ROOM</th>
                <th>OCCUPANCY</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRooms.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    No rooms match the current filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedRooms.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 700, color: '#0f172a' }}>{item.id}</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                        <Building size={15} color="#2563eb" />
                        {item.center}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{item.name}</td>
                    <td>
                      {item.households.length > 0 ? (
                        <ul className="vin-room-placement-household-list">
                          {item.households.map((household) => (
                            <li key={household.id}>
                              <span>{household.name}</span>
                              <small>{household.householdCode || household.id}</small>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="vin-room-placement-empty">No households assigned</span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: item.status === 'Full' ? '#b91c1c' : '#7c3aed' }}>
                        {item.occupied} / {item.capacity} persons
                      </div>
                      <div style={{ height: 6, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden', marginTop: 5 }}>
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