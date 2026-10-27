import { useState, useEffect } from 'react';
import {
  Search, Building, MapPin, Plus, X, ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import './MobileCommon.css';
import './MobileSubpages.css';
import './MobileCenters.css';
import { useEvacuationCenters } from '../../lib/evacuationCenters';
import { supabase } from '../../lib/supabase';

/* ──────────────────────────────────────────────
   13 Official Vinzons Evacuation Centers
   ────────────────────────────────────────────── */
const CENTERS_DATA = [
  {
    id: 1,
    name: 'LGU EC (Mangcaway)',
    fullName: 'LGU EC',
    location: 'Mangcaway Brgy. Cal. Sur, Vinzons, CN',
    status: 'Active',
    rooms: [
      { id: 'Room 1', capacity: 30, occupied: 12 },
      { id: 'Room 2', capacity: 25, occupied: 8 },
      { id: 'Room 3', capacity: 25, occupied: 0 },
      { id: 'Room 4', capacity: 20, occupied: 15 },
      { id: 'Room 5', capacity: 20, occupied: 5 },
    ],
  },
  {
    id: 2,
    name: 'LGU EC (Bliss)',
    fullName: 'LGU EC',
    location: 'Bliss Brgy. Cal Sur, VCN',
    status: 'Active',
    rooms: [
      { id: 'Room 1', capacity: 30, occupied: 30 },
      { id: 'Room 2', capacity: 25, occupied: 25 },
      { id: 'Room 3', capacity: 25, occupied: 25 },
      { id: 'Room 4', capacity: 20, occupied: 20 },
      { id: 'Room 5', capacity: 20, occupied: 20 },
    ],
  },
  {
    id: 3,
    name: 'PLGU EC (Mat-I)',
    fullName: 'PLGU EC',
    location: 'Mat – I Brgy. Sto. Domingo, VCN',
    status: 'Active',
    rooms: [
      { id: 'Room 1', capacity: 30, occupied: 0 },
      { id: 'Room 2', capacity: 25, occupied: 0 },
      { id: 'Room 3', capacity: 25, occupied: 0 },
      { id: 'Room 4', capacity: 20, occupied: 0 },
      { id: 'Room 5', capacity: 20, occupied: 0 },
    ],
  },
  {
    id: 4,
    name: 'Pinagtigasan EC',
    fullName: 'Pinagtigasan EC',
    location: 'P – 1 Brgy. Pinagtigasan, VCN',
    status: 'Active',
    rooms: [
      { id: 'Room 1', capacity: 30, occupied: 18 },
      { id: 'Room 2', capacity: 25, occupied: 5 },
      { id: 'Room 3', capacity: 25, occupied: 0 },
      { id: 'Room 4', capacity: 20, occupied: 10 },
      { id: 'Room 5', capacity: 20, occupied: 0 },
    ],
  },
  {
    id: 5,
    name: 'St. Peter Parish AVR',
    fullName: 'St. Peter Parish AVR',
    location: 'Brgy Poblacion III',
    status: 'Active',
    rooms: [
      { id: 'Room 1', capacity: 40, occupied: 40 },
      { id: 'Room 2', capacity: 40, occupied: 40 },
      { id: 'Room 3', capacity: 40, occupied: 40 },
      { id: 'Room 4', capacity: 30, occupied: 30 },
      { id: 'Room 5', capacity: 30, occupied: 30 },
    ],
  },
  {
    id: 6,
    name: 'Biday EC',
    fullName: 'Biday EC',
    location: 'Brgy. Banocboc, VCN',
    status: 'Active',
    rooms: [
      { id: 'Room 1', capacity: 30, occupied: 7 },
      { id: 'Room 2', capacity: 25, occupied: 0 },
      { id: 'Room 3', capacity: 25, occupied: 0 },
      { id: 'Room 4', capacity: 20, occupied: 0 },
      { id: 'Room 5', capacity: 20, occupied: 0 },
    ],
  },
  {
    id: 7,
    name: 'Sugod EC',
    fullName: 'Sugod EC',
    location: 'Brgy. Banocboc, VCN',
    status: 'Active',
    rooms: [
      { id: 'Room 1', capacity: 30, occupied: 14 },
      { id: 'Room 2', capacity: 25, occupied: 9 },
      { id: 'Room 3', capacity: 25, occupied: 0 },
      { id: 'Room 4', capacity: 20, occupied: 0 },
      { id: 'Room 5', capacity: 20, occupied: 0 },
    ],
  },
  {
    id: 8,
    name: 'Mormons',
    fullName: 'Mormons',
    location: 'Brgy. Calangcawan Sur, VCN',
    status: 'Active',
    rooms: [
      { id: 'Room 1', capacity: 50, occupied: 0 },
      { id: 'Room 2', capacity: 50, occupied: 0 },
      { id: 'Room 3', capacity: 50, occupied: 0 },
      { id: 'Room 4', capacity: 40, occupied: 0 },
      { id: 'Room 5', capacity: 40, occupied: 0 },
    ],
  },
  {
    id: 9,
    name: 'Marabe Church',
    fullName: 'Marabe Church',
    location: 'Brgy. Calangcawan Sur, VCN',
    status: 'Active',
    rooms: [
      { id: 'Room 1', capacity: 30, occupied: 22 },
      { id: 'Room 2', capacity: 25, occupied: 11 },
      { id: 'Room 3', capacity: 25, occupied: 0 },
      { id: 'Room 4', capacity: 20, occupied: 0 },
      { id: 'Room 5', capacity: 20, occupied: 0 },
    ],
  },
  {
    id: 10,
    name: 'Adorno Fathers',
    fullName: 'Adorno Fathers',
    location: 'Sto. Domingo, VCN',
    status: 'Active',
    rooms: [
      { id: 'Room 1', capacity: 35, occupied: 35 },
      { id: 'Room 2', capacity: 35, occupied: 35 },
      { id: 'Room 3', capacity: 35, occupied: 35 },
      { id: 'Room 4', capacity: 30, occupied: 30 },
      { id: 'Room 5', capacity: 30, occupied: 30 },
    ],
  },
  {
    id: 11,
    name: 'Mangcawayan EC',
    fullName: 'Mangcawayan EC',
    location: 'Mangcawayan Is., VCN',
    status: 'Active',
    rooms: [
      { id: 'Room 1', capacity: 25, occupied: 0 },
      { id: 'Room 2', capacity: 25, occupied: 0 },
      { id: 'Room 3', capacity: 25, occupied: 0 },
      { id: 'Room 4', capacity: 20, occupied: 0 },
      { id: 'Room 5', capacity: 20, occupied: 0 },
    ],
  },
  {
    id: 12,
    name: 'Our Lady of Fatima Shrine',
    fullName: 'Our Lady of Fatima Shrine',
    location: 'Mangcawayan Brgy. Calangawan Sur, VCN',
    status: 'Active',
    rooms: [
      { id: 'Room 1', capacity: 40, occupied: 16 },
      { id: 'Room 2', capacity: 35, occupied: 8 },
      { id: 'Room 3', capacity: 35, occupied: 0 },
      { id: 'Room 4', capacity: 25, occupied: 0 },
      { id: 'Room 5', capacity: 25, occupied: 0 },
    ],
  },
  {
    id: 13,
    name: 'Brgy. Hall (Aguit-it)',
    fullName: 'Brgy. Hall',
    location: 'Brgy. Aguit – it, VCN',
    status: 'Active',
    rooms: [
      { id: 'Room 1', capacity: 25, occupied: 0 },
      { id: 'Room 2', capacity: 25, occupied: 0 },
      { id: 'Room 3', capacity: 25, occupied: 0 },
      { id: 'Room 4', capacity: 20, occupied: 0 },
      { id: 'Room 5', capacity: 20, occupied: 0 },
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
  const { centers: dbCenters, refetch } = useEvacuationCenters();
  const [centers, setCenters] = useState(CENTERS_DATA);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All'); // 'All' | 'Available' | 'Occupied' | 'Empty'
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [newCenter, setNewCenter] = useState({ name: '', location: '', rooms: '5' });

  useEffect(() => {
    if (dbCenters && dbCenters.length > 0) {
      setCenters(
        dbCenters.map((c) => ({
          id: c.id,
          name: c.displayName || c.name,
          fullName: c.name,
          location: c.location,
          status: 'Active',
          rooms:
            c.rooms && c.rooms.length > 0
              ? c.rooms
              : [{ id: 'Room 1', capacity: 30, occupied: 0 }],
        }))
      );
    }
  }, [dbCenters]);

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

  const handleAddCenter = async (e) => {
    e.preventDefault();
    if (!newCenter.name) return;
    const roomCount = Number(newCenter.rooms) || 5;

    try {
      await supabase.from('evacuation_centers').insert({
        name: newCenter.name,
        location: newCenter.location || 'Vinzons, Camarines Norte',
        total_rooms: roomCount,
        capacity: roomCount * 25,
      });
      if (refetch) refetch();
    } catch (err) {
      console.warn('Could not insert to Supabase:', err);
    }

    setNewCenter({ name: '', location: '', rooms: '5' });
    setIsAddOpen(false);
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

      {/* ── Status Filter Pills (Clean pills without numbers) ── */}
      <div className="vin-ctr-status-pills-row">
        {STATUS_PILLS.map((pill) => (
          <button
            key={pill.id}
            type="button"
            className={`vin-ctr-status-pill ${filterStatus === pill.id ? 'active' : ''}`}
            onClick={() => setFilterStatus(pill.id)}
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
