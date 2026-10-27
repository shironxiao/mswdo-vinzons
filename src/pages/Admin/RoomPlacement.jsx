import { useState, useMemo } from 'react';
import { Plus, Building, X } from 'lucide-react';
import './AdminFeatures.css';
import {
  useEvacuationCenters,
  isCenterMatch,
} from '../../lib/evacuationCenters.js';
import { AdminFilterModal, AdminFilterBar } from '../../components/AdminFilterModal.jsx';

const STATUSES = ['All Status', 'Active', 'Full'];

export default function RoomPlacement() {
  const { centers } = useEvacuationCenters();
  const [filterCenter, setFilterCenter] = useState('All Centers');
  const [filterRoom, setFilterRoom] = useState('All Rooms');
  const [filterStatus, setFilterStatus] = useState('All Status');
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Custom added rooms state
  const [customRooms, setCustomRooms] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    center: '',
    id: '',
    name: '',
    occupied: 0,
    status: 'Active',
  });

  // Centers are already sorted alphabetically by useEvacuationCenters()
  const centerFilterOptions = useMemo(() => {
    return ['All Centers', ...centers.map((c) => c.displayName)];
  }, [centers]);

  // Dynamic rooms options based on current center filter
  const roomFilterOptions = useMemo(() => {
    return getRoomsForCenter(filterCenter, centers);
  }, [filterCenter, centers]);

  // Combine generated center rooms with custom rooms
  const allRooms = useMemo(() => {
    const list = [];

    // Add generated rooms from Supabase centers
    centers.forEach((center) => {
      (center.rooms || []).forEach((r) => {
        const isFull = (r.occupied || 0) >= (r.capacity || 25);
        list.push({
          id: `${center.name.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase()}-${r.id.replace(/\s+/g, '')}`,
          roomKey: r.id, // e.g. "Room 1"
          center: center.displayName,
          name: `${r.name} - Capacity ${r.capacity || 25}`,
          occupied: r.occupied || 0,
          status: isFull ? 'Full' : 'Active',
        });
      });
    });

    // Add custom rooms created by user
    return [...customRooms, ...list];
  }, [centers, customRooms]);

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

      return matchCenter && matchStatus && matchRoom;
    });
  }, [allRooms, filterCenter, filterStatus, filterRoom, centers]);

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

  const handleAddRoom = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    const occupiedNum = Number(form.occupied) || 0;
    const code = form.id.trim() || `RM-${allRooms.length + 101}`;

    const newRoom = {
      id: code,
      roomKey: form.name.match(/Room\s*\d+/i)?.[0] || 'Room 1',
      center: form.center,
      name: form.name.trim(),
      occupied: occupiedNum,
      status: form.status,
    };

    setCustomRooms([newRoom, ...customRooms]);
    setIsModalOpen(false);
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
          <AdminFilterBar
            hasActiveFilters={filterCenter !== 'All Centers' || filterRoom !== 'All Rooms' || filterStatus !== 'All Status'}
            onOpenFilters={() => setShowFilterModal(true)}
            activeChips={[
              filterCenter !== 'All Centers' && {
                key: 'center',
                label: 'Center',
                value: filterCenter,
                onRemove: () => setFilterCenter('All Centers'),
              },
              filterRoom !== 'All Rooms' && {
                key: 'room',
                label: 'Room',
                value: filterRoom,
                onRemove: () => setFilterRoom('All Rooms'),
              },
              filterStatus !== 'All Status' && {
                key: 'status',
                label: 'Status',
                value: filterStatus,
                onRemove: () => setFilterStatus('All Status'),
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
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  No rooms match the current filter criteria.
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 700, color: '#0f172a' }}>{item.id}</td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                      <Building size={15} color="#2563eb" />
                      {item.center}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{item.name}</td>
                  <td style={{ fontWeight: 700, color: item.status === 'Full' ? '#b91c1c' : '#15803d' }}>
                    {item.occupied} persons
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
        statusOptions={[
          { id: 'All Status', label: 'All Status' },
          { id: 'Active', label: 'Active' },
          { id: 'Full', label: 'Full' },
        ]}
        statusValue={filterStatus}
        centerValue={filterCenter}
        roomValue={filterRoom}
        centersList={centers}
        resultCount={filtered.length}
        onApply={({ status, center, room }) => {
          setFilterStatus(status);
          setFilterCenter(center);
          setFilterRoom(room);
        }}
        onClose={() => setShowFilterModal(false)}
      />
    </div>
  );
}