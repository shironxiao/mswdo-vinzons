import { useState, useMemo } from 'react';
import {
  Search, Building, MapPin, Plus, X, ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import './MobileCommon.css';
import './MobileSubpages.css';
import './MobileCenters.css';
import {
  createEvacuationCenter,
  useEvacuationCenters,
} from '../../lib/evacuationCenters';
import { useHouseholds } from '../../lib/householdService.js';

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
            <div className={center.status === 'Active' ? 'vin-ctr-status-active' : ''}>{center.status}</div>
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
  const { centers: dbCenters, refetch } = useEvacuationCenters();
  const { households } = useHouseholds(dbCenters);
  const centers = useMemo(() => dbCenters.map((center) => ({
    id: center.id,
    name: center.displayName || center.name,
    fullName: center.name,
    location: center.location,
    status: 'Active',
    rooms: (center.rooms || []).map((room) => ({
      ...room,
      occupied: households
        .filter((household) => household.evacueeStatus === 'Active' && household.centerId === center.id)
        .filter((household) =>
          (room.dbId && household.roomId === room.dbId) || household.room === room.name
        )
        .reduce((sum, household) => sum + (household.familyCount || 1), 0),
    })),
  })), [dbCenters, households]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All'); // 'All' | 'Available' | 'Occupied' | 'Empty'
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [centerCreateError, setCenterCreateError] = useState('');
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [newCenter, setNewCenter] = useState({ name: '', location: '', rooms: '5', capacity: '100' });

  /* ── Filter & Search with Dynamic Alphabetical Ordering ── */
  const filtered = centers
    .filter((c) => {
      const matchSearch =
        (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.fullName || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.location || '').toLowerCase().includes(search.toLowerCase());
      const status = centerStatusLabel(c);
      const matchStatus = filterStatus === 'All' || status === filterStatus;
      return matchSearch && matchStatus;
    })
    .sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', undefined, {
        sensitivity: 'base',
        numeric: true,
      })
    );

  /* ── Pagination ── */
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedCenters = filtered.slice(startIndex, startIndex + pageSize);

  const handleAddCenter = async (e) => {
    e.preventDefault();
    if (!newCenter.name.trim()) return;

    setCenterCreateError('');
    try {
      await createEvacuationCenter({
        name: newCenter.name,
        location: newCenter.location,
        total_rooms: newCenter.rooms,
        capacity: newCenter.capacity,
      });
      await refetch();
      setNewCenter({ name: '', location: '', rooms: '5', capacity: '100' });
      setIsAddOpen(false);
    } catch (err) {
      console.error('Could not create evacuation center and rooms:', err);
      setCenterCreateError(err.message || 'Could not save this evacuation center. Please try again.');
    }
  };

  /* Status filter pill options (no numbers inside pills to prevent cutting off) */
  const STATUS_PILLS = [
    { id: 'All',       label: 'All',       dotClass: null },
    { id: 'Available', label: 'Available', dotClass: 'green' },
    { id: 'Occupied',  label: 'Occupied',  dotClass: 'red'   },
    { id: 'Empty',     label: 'Empty',     dotClass: 'gray'  },
  ];

  return (
    <div className="vin-mob-page">
      <header className="vin-mob-header">
        <div className="vin-mob-header-info">
          <h1 className="vin-mob-title">Centers</h1>
          <p className="vin-mob-subtitle">
            {filtered.length} official center{filtered.length !== 1 ? 's' : ''} • Tap to view rooms
          </p>
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
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
          className="vin-mob-search-input"
        />
      </div>

      {/* ── Status Filter Pills (Clean pills without numbers) ── */}
      <div className="vin-ctr-status-pills-row">
        {STATUS_PILLS.map((pill) => (
          <button
            key={pill.id}
            type="button"
            className={`vin-ctr-status-pill ${filterStatus === pill.id ? 'active' : ''}`}
            onClick={() => {
              setFilterStatus(pill.id);
              setCurrentPage(1);
            }}
          >
            {pill.dotClass && (
              <span className={`vin-ctr-pill-dot ${pill.dotClass}`} />
            )}
            <span className="vin-ctr-pill-label">{pill.label}</span>
          </button>
        ))}
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
              <div className="vin-mob-input-group">
                <label className="vin-mob-input-label">ESTIMATED CAPACITY (PERSONS)</label>
                <input type="number" min="1" placeholder="e.g. 100" className="vin-mob-select"
                  value={newCenter.capacity || ''}
                  onChange={(e) => setNewCenter({ ...newCenter, capacity: e.target.value })} />
              </div>
              {centerCreateError && (
                <p role="alert" style={{ color: '#b91c1c', fontSize: '.85rem' }}>
                  {centerCreateError}
                </p>
              )}
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
