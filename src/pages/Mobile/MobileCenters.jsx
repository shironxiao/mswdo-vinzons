import { useState, useEffect } from 'react';
import {
  Search, Building, MapPin, Plus, X, ChevronRight,
  ChevronLeft, ChevronDown,
} from 'lucide-react';
import './MobileCommon.css';
import './MobileSubpages.css';
import './MobileCenters.css';

/* ──────────────────────────────────────────────
   Seed data
   ────────────────────────────────────────────── */
const CENTERS_DATA = [
  {
    id: 1,
    name: 'Vinzons Central Elem.',
    fullName: 'Vinzons Central Elementary School',
    location: 'Poblacion, Vinzons',
    count: 364,
    status: 'Active',
    rooms: [
      { id: 'A-1', capacity: 30, occupied: 30 },
      { id: 'A-2', capacity: 30, occupied: 20 },
      { id: 'B-1', capacity: 25, occupied: 0  },
      { id: 'B-2', capacity: 25, occupied: 12 },
      { id: 'C-1', capacity: 20, occupied: 20 },
      { id: 'C-2', capacity: 20, occupied: 8  },
    ],
  },
  {
    id: 2,
    name: 'Vinzons Gymnasium',
    fullName: 'Vinzons Gymnasium',
    location: 'Brgy. San Jose, Vinzons',
    count: 120,
    status: 'Active',
    rooms: [
      { id: 'Hall A', capacity: 60, occupied: 40 },
      { id: 'Hall B', capacity: 60, occupied: 60 },
    ],
  },
  {
    id: 3,
    name: 'Calaguas Natl. HS',
    fullName: 'Calaguas National High School',
    location: 'Calaguas, Vinzons',
    count: 129,
    status: 'Active',
    rooms: [
      { id: 'Rm-1', capacity: 35, occupied: 35 },
      { id: 'Rm-2', capacity: 35, occupied: 18 },
      { id: 'Rm-3', capacity: 35, occupied: 0  },
    ],
  },
  {
    id: 4,
    name: 'Vinzons Covered Court',
    fullName: 'Vinzons Covered Court',
    location: 'Poblacion, Vinzons',
    count: 100,
    status: 'Active',
    rooms: [
      { id: 'Sector 1', capacity: 50, occupied: 50 },
      { id: 'Sector 2', capacity: 50, occupied: 50 },
    ],
  },
  {
    id: 5,
    name: 'Municipal Evac Center',
    fullName: 'Municipal Evacuation Center',
    location: 'Brgy. Sto. Domingo, Vinzons',
    count: 80,
    status: 'Active',
    rooms: [
      { id: 'Hall 1', capacity: 40, occupied: 40 },
      { id: 'Hall 2', capacity: 40, occupied: 40 },
    ],
  },
  {
    id: 6,
    name: 'Sto. Domingo Brgy. Hall',
    fullName: 'Sto. Domingo Barangay Hall',
    location: 'Brgy. Sto. Domingo, Vinzons',
    count: 0,
    status: 'Active',
    rooms: [
      { id: 'Room 1', capacity: 30, occupied: 0 },
      { id: 'Room 2', capacity: 30, occupied: 0 },
    ],
  },
  {
    id: 7,
    name: 'Matango Elem. School',
    fullName: 'Matango Elementary School',
    location: 'Brgy. Matango, Vinzons',
    count: 0,
    status: 'Active',
    rooms: [
      { id: 'Bldg 1-A', capacity: 25, occupied: 0 },
      { id: 'Bldg 1-B', capacity: 25, occupied: 0 },
    ],
  },
];

/* ──────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────── */
function roomColorClass(room) {
  if (room.occupied === 0) return 'room-gray';
  if (room.occupied >= room.capacity) return 'room-red';
  return 'room-green';
}

function roomLabel(room) {
  if (room.occupied === 0) return 'Empty';
  if (room.occupied >= room.capacity) return 'Full';
  return 'Occupied';
}

/** Returns overall center fill level for tile color */
function centerColorClass(center) {
  const totalCap = center.rooms.reduce((a, r) => a + r.capacity, 0);
  const totalOcc = center.rooms.reduce((a, r) => a + r.occupied, 0);
  if (totalOcc === 0) return 'ctr-tile--empty';
  if (totalOcc >= totalCap) return 'ctr-tile--occupied';
  return 'ctr-tile--available';
}

function centerStatusLabel(center) {
  const totalCap = center.rooms.reduce((a, r) => a + r.capacity, 0);
  const totalOcc = center.rooms.reduce((a, r) => a + r.occupied, 0);
  if (totalOcc === 0) return 'Empty';
  if (totalOcc >= totalCap) return 'Occupied';
  return 'Available';
}

/* ──────────────────────────────────────────────
   Room Detail Sheet
   ────────────────────────────────────────────── */
function RoomsSheet({ center, onClose }) {
  const totalOcc = center.rooms.reduce((a, r) => a + r.occupied, 0);

  return (
    <div className="vin-mob-sheet-overlay" onClick={onClose}>
      <div className="vin-mob-sheet-content" onClick={(e) => e.stopPropagation()}>
        <div className="vin-mob-sheet-header">
          <div>
            <h2 className="vin-mob-sheet-title">{center.fullName}</h2>
            <span style={{ fontSize: '.78rem', color: '#64748b' }}>
              <MapPin size={12} style={{ display: 'inline', marginRight: 3 }} />
              {center.location}
            </span>
          </div>
          <button type="button" className="vin-mob-sheet-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Summary row */}
        <div className="vin-ctr-summary-row">
          <div className="vin-ctr-summary-item">
            <span className="vin-mob-field-label">EVACUEES</span>
            <div>{totalOcc}</div>
          </div>
          <div className="vin-ctr-summary-item">
            <span className="vin-mob-field-label">ROOMS</span>
            <div>{center.rooms.length}</div>
          </div>
          <div className="vin-ctr-summary-item">
            <span className="vin-mob-field-label">STATUS</span>
            <div>{center.status}</div>
          </div>
        </div>

        {/* Legend */}
        <div className="vin-ctr-legend" style={{ padding: '0 0 10px' }}>
          <span className="vin-ctr-dot green" /> Occupied
          <span className="vin-ctr-dot red" /> Full
          <span className="vin-ctr-dot gray" /> Empty
        </div>

        {/* Room grid */}
        <span className="vin-mob-input-label">ROOMS</span>
        <div className="vin-ctr-room-grid" style={{ marginTop: 8 }}>
          {center.rooms.map((room) => (
            <div key={room.id} className={`vin-ctr-room-tile ${roomColorClass(room)}`}>
              <div className="vin-ctr-room-id">{room.id}</div>
              <div className="vin-ctr-room-occ">{room.occupied}</div>
              <div className="vin-ctr-room-label">{roomLabel(room)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   MAIN PAGE
   ────────────────────────────────────────────── */
export default function MobileCenters() {
  const [centers, setCenters] = useState(CENTERS_DATA);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All'); // 'All' | 'Available' | 'Occupied' | 'Empty'
  const [openFilter, setOpenFilter] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [newCenter, setNewCenter] = useState({ name: '', location: '', rooms: '2' });

  /* ── Filter & Search ── */
  const filtered = centers.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.fullName.toLowerCase().includes(search.toLowerCase()) ||
      c.location.toLowerCase().includes(search.toLowerCase());
    const status = centerStatusLabel(c);
    const matchStatus = filterStatus === 'All' || status === filterStatus;
    return matchSearch && matchStatus;
  });

  /* ── Pagination ── */
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 3;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterStatus]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedCenters = filtered.slice(startIndex, startIndex + pageSize);

  const handleAddCenter = (e) => {
    e.preventDefault();
    if (!newCenter.name) return;
    const roomCount = Number(newCenter.rooms) || 2;
    const rooms = Array.from({ length: roomCount }, (_, i) => ({
      id: `R-${i + 1}`,
      capacity: 30,
      occupied: 0,
    }));
    const item = {
      id: Date.now(),
      name: newCenter.name,
      fullName: newCenter.name,
      location: newCenter.location || 'Vinzons',
      rooms,
      count: 0,
      status: 'Active',
    };
    setCenters([item, ...centers]);
    setNewCenter({ name: '', location: '', rooms: '2' });
    setIsAddOpen(false);
  };

  return (
    <div className="vin-mob-page" onClick={() => openFilter && setOpenFilter(false)}>
      <header className="vin-mob-header">
        <div className="vin-mob-header-info">
          <h1 className="vin-mob-title">Centers</h1>
          <p className="vin-mob-subtitle">Tap a center to view its rooms</p>
        </div>
        <button type="button" className="vin-mob-register-btn" onClick={() => setIsAddOpen(true)}>
          <Plus size={16} /><span>Add</span>
        </button>
      </header>

      <div className="vin-mob-search-wrapper">
        <Search size={18} className="vin-mob-search-icon" />
        <input
          type="text"
          placeholder="Search evacuation centers…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="vin-mob-search-input"
        />
      </div>

      {/* Filter and Legend Bar */}
      <div className="vin-mon-filter-bar" style={{ padding: '0 16px 4px' }}>
        {/* Legend on the left */}
        <div className="vin-ctr-legend" style={{ padding: 0 }}>
          <span className="vin-ctr-dot green" /> Available
          <span className="vin-ctr-dot red" /> Occupied
          <span className="vin-ctr-dot gray" /> Empty
        </div>

        {/* Clear pill + filter on the right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
          {filterStatus !== 'All' && (
            <button
              type="button"
              className="vin-mon-clear-pill"
              onClick={() => setFilterStatus('All')}
            >
              Clear <X size={11} />
            </button>
          )}

          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className={`vin-mon-filter-btn ${filterStatus !== 'All' ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setOpenFilter(!openFilter);
              }}
            >
              <span>{filterStatus === 'All' ? 'All status' : filterStatus}</span>
              <ChevronDown size={13} />
            </button>

            {openFilter && (
              <div className="vin-mon-filter-dropdown" style={{ right: 0, left: 'auto' }} onClick={(e) => e.stopPropagation()}>
                <div className="vin-mon-filter-title">CENTER STATUS</div>
                {[
                  { id: 'All', label: 'All Status', dot: 'all' },
                  { id: 'Available', label: 'Available (Green)', dot: 'present' },
                  { id: 'Occupied', label: 'Occupied (Red)', dot: 'absent' },
                  { id: 'Empty', label: 'Empty (Gray)', dot: 'gray' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`vin-mon-filter-opt ${filterStatus === opt.id ? 'active' : ''}`}
                    onClick={() => {
                      setFilterStatus(opt.id);
                      setOpenFilter(false);
                    }}
                  >
                    <span
                      className={`vin-ctr-dot ${opt.dot === 'present' ? 'green' : opt.dot === 'absent' ? 'red' : opt.dot === 'gray' ? 'gray' : ''}`}
                      style={opt.dot === 'all' ? { background: 'linear-gradient(90deg, #2d7a57 33%, #9c4444 33% 66%, #94a3b8 66%)' } : {}}
                    />
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── CENTER TABLE ── */}
      <div className="vin-mob-table-card">
        <div className="vin-mob-table-responsive">
          <table className="vin-mob-table">
            <thead>
              <tr>
                <th>CENTER</th>
                <th style={{ textAlign: 'right' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {paginatedCenters.length === 0 ? (
                <tr>
                  <td colSpan={2} className="vin-mob-table-empty">
                    No evacuation centers match the current filter.
                  </td>
                </tr>
              ) : (
                paginatedCenters.map((item) => {
                  const totalOcc = item.rooms.reduce((a, r) => a + r.occupied, 0);
                  const colorCls = centerColorClass(item);
                  const statusLabel = centerStatusLabel(item);

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedCenter(item)}
                      className="vin-mob-table-row"
                    >
                      <td>
                        <div className="vin-mob-td-name">
                          <div className={`vin-mob-avatar-circle vin-mob-table-avatar vin-ctr-table-icon ${colorCls}`}>
                            <Building size={16} />
                          </div>
                          <div className="vin-mob-head-details">
                            <div className="vin-mob-head-name">{item.name}</div>
                            <div className="vin-mob-head-sub">
                              <MapPin size={11} style={{ display: 'inline', marginRight: 2 }} />
                              <span>{item.location}</span>
                              <span className="vin-mob-sub-dot">•</span>
                              <span>{item.rooms.length} rooms</span>
                              <span className="vin-mob-sub-dot">•</span>
                              <span>{totalOcc} evacuees</span>
                            </div>
                            <div className="vin-mob-head-badges">
                              <span className={`vin-ctr-status-badge badge-${colorCls.replace('ctr-tile--', '')}`}>
                                {statusLabel}
                              </span>
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
                            setSelectedCenter(item);
                          }}
                        >
                          Rooms
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── PAGINATION CONTROLS ── */}
        {filtered.length > 0 && (
          <div className="vin-mob-pagination">
            <span className="vin-mob-pagination-info">
              Showing {startIndex + 1}–{Math.min(startIndex + pageSize, filtered.length)} of {filtered.length} centers
            </span>
            <div className="vin-mob-pagination-btns">
              <button
                type="button"
                className="vin-mob-page-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                aria-label="Previous page"
              >
                <ChevronLeft size={15} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  className={`vin-mob-page-btn ${pageNum === currentPage ? 'active' : ''}`}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </button>
              ))}
              <button
                type="button"
                className="vin-mob-page-btn"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Next page"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── ROOM DETAIL SHEET ── */}
      {selectedCenter && (
        <RoomsSheet center={selectedCenter} onClose={() => setSelectedCenter(null)} />
      )}

      {/* ── ADD CENTER SHEET ── */}
      {isAddOpen && (
        <div className="vin-mob-sheet-overlay" onClick={() => setIsAddOpen(false)}>
          <div className="vin-mob-sheet-content" onClick={(e) => e.stopPropagation()}>
            <div className="vin-mob-sheet-header">
              <h2 className="vin-mob-sheet-title">Add Evacuation Center</h2>
              <button type="button" className="vin-mob-sheet-close" onClick={() => setIsAddOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddCenter} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="vin-mob-input-group">
                <label className="vin-mob-input-label">CENTER NAME</label>
                <input type="text" placeholder="e.g. Central Elementary Gym" className="vin-mob-select"
                  value={newCenter.name}
                  onChange={(e) => setNewCenter({ ...newCenter, name: e.target.value })} required />
              </div>
              <div className="vin-mob-input-group">
                <label className="vin-mob-input-label">BARANGAY / LOCATION</label>
                <input type="text" placeholder="e.g. Barangay San Jose" className="vin-mob-select"
                  value={newCenter.location}
                  onChange={(e) => setNewCenter({ ...newCenter, location: e.target.value })} required />
              </div>
              <div className="vin-mob-input-group">
                <label className="vin-mob-input-label">NUMBER OF ROOMS</label>
                <input type="number" min="1" placeholder="2" className="vin-mob-select"
                  value={newCenter.rooms}
                  onChange={(e) => setNewCenter({ ...newCenter, rooms: e.target.value })} />
              </div>
              <button type="submit" className="vin-mob-sheet-blue-btn" style={{ marginTop: 8 }}>
                Create Evacuation Center
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
