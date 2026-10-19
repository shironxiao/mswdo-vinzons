import { useState } from 'react';
import { Plus, Building, ChevronDown, X } from 'lucide-react';
import './AdminFeatures.css';

const INITIAL_ROOMS = [
  { id: 'RM-101', center: 'VCES', name: 'Room 101 - Grade 1 Sampaguita', occupied: 24, status: 'Active' },
  { id: 'RM-102', center: 'VCES', name: 'Room 102 - Grade 1 Rosal', occupied: 30, status: 'Full' },
  { id: 'RM-201', center: 'CNHS', name: 'Bldg 2 Room 4', occupied: 18, status: 'Active' },
  { id: 'CR-B', center: 'VCC', name: 'Vinzons Covered Court - Sector B', occupied: 65, status: 'Active' },
];

const EVACUATION_CENTERS = [
  { code: 'VCES', name: 'Vinzons Central Elementary School (VCES)' },
  { code: 'CNHS', name: 'Calaguas National High School (CNHS)' },
  { code: 'VCC',  name: 'Vinzons Covered Court (VCC)' },
  { code: 'VG',   name: 'Vinzons Gymnasium (VG)' },
];

const STATUSES = ['All Status', 'Active', 'Full'];

export default function RoomPlacement() {
  const [rooms, setRooms] = useState(INITIAL_ROOMS);
  const [filterCenter, setFilterCenter] = useState('All Centers');
  const [filterStatus, setFilterStatus] = useState('All Status');
  const [openFilter, setOpenFilter] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    center: 'VCES',
    id: '',
    name: '',
    occupied: 0,
    status: 'Active',
  });

  const centerFilterOptions = ['All Centers', ...Array.from(new Set(rooms.map((r) => r.center)))];

  const filtered = rooms.filter((r) => {
    const matchCenter = filterCenter === 'All Centers' || r.center === filterCenter;
    const matchStatus = filterStatus === 'All Status' || r.status === filterStatus;
    return matchCenter && matchStatus;
  });

  const handleOpenAddModal = () => {
    const nextNum = rooms.length + 101;
    setForm({
      center: filterCenter !== 'All Centers' ? filterCenter : 'VCES',
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
    const code = form.id.trim() || `RM-${rooms.length + 101}`;

    const newRoom = {
      id: code,
      center: form.center,
      name: form.name.trim(),
      occupied: occupiedNum,
      status: form.status,
    };

    setRooms([newRoom, ...rooms]);
    setIsModalOpen(false);
  };

  return (
    <div className="vin-feature-page" onClick={() => openFilter && setOpenFilter(null)}>
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
          <div className="vin-filter-pill-group">
            {/* Center Filter */}
            <div className="vin-filter-pill-wrapper">
              <button
                type="button"
                className={`vin-filter-pill-btn ${filterCenter !== 'All Centers' ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenFilter(openFilter === 'center' ? null : 'center');
                }}
              >
                <span>{filterCenter === 'All Centers' ? 'All centers' : filterCenter}</span>
                <ChevronDown size={13} />
              </button>

              {openFilter === 'center' && (
                <div className="vin-filter-pill-dropdown" onClick={(e) => e.stopPropagation()}>
                  <div className="vin-filter-pill-dropdown-title">Evacuation Center</div>
                  {centerFilterOptions.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`vin-filter-pill-opt ${filterCenter === c ? 'active' : ''}`}
                      onClick={() => {
                        setFilterCenter(c);
                        setOpenFilter(null);
                      }}
                    >
                      <span>{c}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Status Filter */}
            <div className="vin-filter-pill-wrapper">
              <button
                type="button"
                className={`vin-filter-pill-btn ${filterStatus !== 'All Status' ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenFilter(openFilter === 'status' ? null : 'status');
                }}
              >
                <span>{filterStatus === 'All Status' ? 'All status' : filterStatus}</span>
                <ChevronDown size={13} />
              </button>

              {openFilter === 'status' && (
                <div className="vin-filter-pill-dropdown" onClick={(e) => e.stopPropagation()}>
                  <div className="vin-filter-pill-dropdown-title">Room Status</div>
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`vin-filter-pill-opt ${filterStatus === s ? 'active' : ''}`}
                      onClick={() => {
                        setFilterStatus(s);
                        setOpenFilter(null);
                      }}
                    >
                      <span>{s}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Clear Filter */}
            {(filterCenter !== 'All Centers' || filterStatus !== 'All Status') && (
              <button
                type="button"
                className="vin-filter-pill-clear"
                onClick={() => {
                  setFilterCenter('All Centers');
                  setFilterStatus('All Status');
                }}
              >
                Clear <X size={12} />
              </button>
            )}
          </div>
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
                  {EVACUATION_CENTERS.map((ec) => (
                    <option key={ec.code} value={ec.code}>
                      {ec.name}
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
    </div>
  );
}
