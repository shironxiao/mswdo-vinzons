import { useState, useMemo, useContext } from 'react';
import { Plus, Building, X, ChevronLeft, ChevronRight } from 'lucide-react';
import './AdminFeatures.css';
import {
  useEvacuationCenters,
  isCenterMatch,
} from '../../lib/evacuationCenters.js';
import { useEventRoomPlacements, useHouseholds } from '../../lib/householdService.js';
import { useRooms, createRoom } from '../../lib/roomService.js';
import { AdminFilterModal, AdminFilterBar } from '../../components/AdminFilterModal.jsx';
import { EventContext } from '../../context/eventContext.js';
import AdminSearchInput from '../../components/AdminSearchInput.jsx';

const STATUSES = ['All Status', 'Active', 'Full'];

export default function RoomPlacement() {
  const { selectedEvent, isReadOnly } = useContext(EventContext);
  const { centers } = useEvacuationCenters();
  const { households } = useHouseholds(centers);
  const { rooms: dbRooms, refresh: refreshRooms } = useRooms(centers);
  const { placements } = useEventRoomPlacements(selectedEvent?.id);
  const [filterCenter, setFilterCenter] = useState('All Centers');
  const [filterRoom, setFilterRoom] = useState('All Rooms');
  const [filterStatus, setFilterStatus] = useState('All Status');
  const [search, setSearch] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Custom added rooms state (fallback / optimistic)
  const [customRooms, setCustomRooms] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    center: '',
    id: '',
    name: '',
    capacity: 30,
    occupied: 0,
    status: 'Active',
  });

  // Calculate live room occupancies from Supabase database
  const allRooms = useMemo(() => {
    const eventPlacements = placements.filter((placement) =>
      placement.event_id === selectedEvent?.id && placement.status === 'Evacuated'
    );
    const occupancyForRoom = (roomId, centerId) => eventPlacements
      .filter((placement) => placement.room_id === roomId && placement.center_id === centerId)
      .reduce((sum, placement) => {
        const household = households.find((item) => item.id === placement.household_id);
        return sum + (household?.familyCount || 1);
      }, 0);

    // 1. If we have rooms from Supabase dbRooms
    if (dbRooms && dbRooms.length > 0) {
      return dbRooms.map((r) => {
        const occupied = occupancyForRoom(r.id, r.centerId);
        const isFull = occupied >= r.capacity;

        return {
          id: r.code || r.id,
          roomKey: r.roomName,
          center: r.center,
          name: `${r.roomName} - Capacity ${r.capacity}`,
          occupied,
          capacity: r.capacity,
          status: isFull ? 'Full' : 'Active',
        };
      });
    }

    // 2. Fallback to centers generated rooms if dbRooms is loading
    const list = [];
    centers.forEach((center) => {
      (center.rooms || []).forEach((r) => {
        const roomOccupants = households.filter((household) => {
        const matchCenter =
          household.center === center.displayName ||
          isCenterMatch(household.center, center.displayName, centers);
        const matchRoom = household.room === r.id || household.room === r.name;
        return matchCenter && matchRoom;
        });
        const occupied = roomOccupants.reduce((sum, household) => {
        const placement = eventPlacements.find((item) =>
          item.household_id === household.id &&
          item.center_id === center.id &&
          item.room_id === household.roomId
        );
        return sum + (placement ? household.familyCount || 1 : 0);
        }, 0);
        const isFull = occupied >= (r.capacity || 25);

        list.push({
          id: `${center.name.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase()}-${r.id.replace(/\s+/g, '')}`,
          roomKey: r.id,
          center: center.displayName,
          name: `${r.name} - Capacity ${r.capacity || 25}`,
          occupied,
          capacity: r.capacity || 25,
          status: isFull ? 'Full' : 'Active',
        });
      });
    });

    return [...customRooms, ...list];
  }, [dbRooms, centers, households, customRooms, placements, selectedEvent?.id]);

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
      const matchSearch = !query || [r.id, r.roomKey, r.name, r.center]
        .some((value) => String(value || '').toLowerCase().includes(query));

      return matchSearch && matchCenter && matchStatus && matchRoom;
    });
  }, [allRooms, filterCenter, filterStatus, filterRoom, centers, search]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedRooms = filtered.slice(startIndex, startIndex + pageSize);

  const handleOpenAddModal = () => {
    const defaultCenter =
      filterCenter !== 'All Centers'
        ? filterCenter
        : centers[0]?.displayName || 'LGU EC (Mangcaway)';

    const nextNum = allRooms.length + 101;
    setForm({
      center: defaultCenter,
      id: `RM-${nextNum}`,
      name: '',
      occupied: 0,
      status: 'Active',
    });
    setIsModalOpen(true);
  };

  const handleAddRoom = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    const occupiedNum = Number(form.occupied) || 0;
    const code = form.id.trim() || `RM-${allRooms.length + 101}`;

    const newRoom = {
      id: code,
      roomKey: form.name.match(/Room\s*\d+/i)?.[0] || form.name.trim(),
      center: form.center,
      name: form.name.trim(),
      occupied: occupiedNum,
      status: form.status,
    };

    setCustomRooms([newRoom, ...customRooms]);
    setIsModalOpen(false);

    try {
      await createRoom(
        {
          center: form.center,
          roomName: form.name.trim(),
          capacity: form.capacity || 30,
        },
        centers
      );
      refreshRooms();
    } catch (err) {
      console.warn('Could not save room to Supabase:', err);
    }
  };

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
        <button
          type="button"
          className="vin-feature-action-btn"
          onClick={handleOpenAddModal}
        >
          <Plus size={18} />
          <span>Add Room/Space</span>
        </button>
      </header>

      <div className="vin-feature-content-card">
        <div className="vin-feature-toolbar">
          <AdminSearchInput
            placeholder="Search by room or center..."
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
              <th>ROOM CODE</th>
              <th>CENTER</th>
              <th>ROOM NAME / DESIGNATION</th>
              <th>OCCUPANCY</th>
              <th>STATUS</th>
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
                  <td style={{ fontWeight: 700, color: '#0f172a' }}>{item.id}</td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                      <Building size={15} color="#2563eb" />
                      {item.center}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{item.name}</td>
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

      {/* ── Add Room Modal Popup ── */}
      {isModalOpen && (
        <div className="vin-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="vin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="vin-modal-head">
              <div>
                <h2>Add Room / Space</h2>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Assign a new room or designated space to an evacuation center.
                </span>
              </div>
              <button
                type="button"
                className="vin-modal-close"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddRoom}>
              {/* Evacuation Center Selection */}
              <div className="vin-form-group">
                <label className="vin-form-label">Evacuation Center</label>
                <select
                  className="vin-form-select"
                  value={form.center}
                  onChange={(e) => setForm({ ...form, center: e.target.value })}
                  required
                >
                  {centers.map((ec) => (
                    <option key={ec.id || ec.displayName} value={ec.displayName}>
                      {ec.displayName} ({ec.location})
                    </option>
                  ))}
                </select>
              </div>

              {/* Room Code */}
              <div className="vin-form-group">
                <label className="vin-form-label">Room Code</label>
                <input
                  type="text"
                  className="vin-form-input"
                  placeholder="e.g. RM-103"
                  value={form.id}
                  onChange={(e) => setForm({ ...form, id: e.target.value })}
                  required
                />
              </div>

              {/* Room Name / Designation */}
              <div className="vin-form-group">
                <label className="vin-form-label">Room Name / Designation</label>
                <input
                  type="text"
                  className="vin-form-input"
                  placeholder="e.g. Room 103 - Grade 2 Gumamela"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              {/* Occupancy & Status Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="vin-form-group">
                  <label className="vin-form-label">Occupancy (Persons)</label>
                  <input
                    type="number"
                    min="0"
                    className="vin-form-input"
                    placeholder="0"
                    value={form.occupied}
                    onChange={(e) => setForm({ ...form, occupied: e.target.value })}
                  />
                </div>
                <div className="vin-form-group">
                  <label className="vin-form-label">Room Status</label>
                  <select
                    className="vin-form-select"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    <option value="Active">Active</option>
                    <option value="Full">Full</option>
                  </select>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="vin-modal-actions">
                <button
                  type="button"
                  className="vin-btn-cancel"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="vin-btn-submit">
                  Save Room
                </button>
              </div>
            </form>
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