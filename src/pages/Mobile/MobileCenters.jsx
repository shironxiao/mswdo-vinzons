import { useState } from 'react';
import { Search, Building, MapPin, Users, Plus, X, ChevronDown, ChevronUp } from 'lucide-react';
import './MobileCommon.css';
import './MobileSubpages.css';
import './MobileCenters.css';

/* ────────────────────────────────────────────
   Seed data — replace with Dexie in production
   ──────────────────────────────────────────── */
const CENTERS_DATA = [
  {
    id: 1,
    name: 'Vinzons Central Elementary School',
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
    name: 'Calaguas National High School',
    location: 'Calaguas, Vinzons',
    count: 129,
    status: 'Active',
    rooms: [
      { id: 'Rm-1', capacity: 35, occupied: 35 },
      { id: 'Rm-2', capacity: 35, occupied: 18 },
      { id: 'Rm-3', capacity: 35, occupied: 0  },
    ],
  },
];

/**
 * Returns room color class:
 *  green  = space available (occupied > 0 but < capacity)
 *  red    = full (occupied >= capacity)
 *  gray   = empty (occupied === 0)
 */
function roomColorClass(room) {
  if (room.occupied === 0) return 'room-gray';
  if (room.occupied >= room.capacity) return 'room-red';
  return 'room-green';
}

function roomLabel(room) {
  if (room.occupied === 0) return 'Empty';
  if (room.occupied >= room.capacity) return 'Full';
  return `${room.capacity - room.occupied} slots`;
}

export default function MobileCenters() {
  const [centers, setCenters] = useState(CENTERS_DATA);
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [newCenter, setNewCenter] = useState({ name: '', location: '', rooms: '2', capacity: '30' });

  const filtered = centers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.location.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddCenter = (e) => {
    e.preventDefault();
    if (!newCenter.name) return;
    const roomCount = Number(newCenter.rooms) || 2;
    const cap = Number(newCenter.capacity) || 30;
    const rooms = Array.from({ length: roomCount }, (_, i) => ({
      id: `R-${i + 1}`,
      capacity: cap,
      occupied: 0,
    }));
    const item = {
      id: Date.now(),
      name: newCenter.name,
      location: newCenter.location || 'Vinzons',
      rooms,
      count: 0,
      status: 'Active',
    };
    setCenters([item, ...centers]);
    setNewCenter({ name: '', location: '', rooms: '2', capacity: '30' });
    setIsAddOpen(false);
  };

  return (
    <div className="vin-mob-page">
      <header className="vin-mob-header">
        <div className="vin-mob-header-info">
          <h1 className="vin-mob-title">Centers</h1>
          <p className="vin-mob-subtitle">Active evacuation facilities in Vinzons</p>
        </div>
        <button type="button" className="vin-mob-register-btn" onClick={() => setIsAddOpen(true)}>
          <Plus size={16} /><span>Add Center</span>
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

      {/* Room grid legend */}
      <div className="vin-ctr-legend">
        <span className="vin-ctr-dot green" /> Available
        <span className="vin-ctr-dot red" />  Full
        <span className="vin-ctr-dot gray" /> Empty
      </div>

      <div className="vin-mob-list">
        {filtered.map((item) => {
          const isExpanded = expandedId === item.id;
          const totalCap = item.rooms.reduce((a, r) => a + r.capacity, 0);
          const totalOcc = item.rooms.reduce((a, r) => a + r.occupied, 0);

          return (
            <div key={item.id} className="vin-ctr-center-card">
              {/* Center header row */}
              <div
                className="vin-ctr-center-header"
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
              >
                <div className="vin-mob-item-left">
                  <div className="vin-mob-avatar-circle" style={{ background: '#e0f2fe', color: '#0369a1' }}>
                    <Building size={20} />
                  </div>
                  <div className="vin-mob-item-details">
                    <span className="vin-mob-item-name">{item.name}</span>
                    <span className="vin-mob-item-sub">
                      <MapPin size={12} style={{ display: 'inline', marginRight: 3 }} />
                      {item.location} &nbsp;•&nbsp;
                      <Users size={12} style={{ display: 'inline', margin: '0 2px' }} />
                      {totalOcc}/{totalCap} evacuees
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="vin-mob-badge-recorded" style={{ fontSize: '.72rem', padding: '4px 10px' }}>
                    {item.status}
                  </span>
                  {isExpanded ? <ChevronUp size={16} color="#64748b" /> : <ChevronDown size={16} color="#64748b" />}
                </div>
              </div>

              {/* Expandable room grid */}
              {isExpanded && (
                <div className="vin-ctr-rooms-section">
                  <span className="vin-mob-input-label">ROOMS — tap card to view</span>
                  <div className="vin-ctr-room-grid">
                    {item.rooms.map((room) => (
                      <div key={room.id} className={`vin-ctr-room-tile ${roomColorClass(room)}`}>
                        <div className="vin-ctr-room-id">{room.id}</div>
                        <div className="vin-ctr-room-occ">
                          {room.occupied}/{room.capacity}
                        </div>
                        <div className="vin-ctr-room-label">{roomLabel(room)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ADD CENTER SHEET */}
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="vin-mob-input-group">
                  <label className="vin-mob-input-label">NUMBER OF ROOMS</label>
                  <input type="number" min="1" placeholder="2" className="vin-mob-select"
                    value={newCenter.rooms}
                    onChange={(e) => setNewCenter({ ...newCenter, rooms: e.target.value })} />
                </div>
                <div className="vin-mob-input-group">
                  <label className="vin-mob-input-label">CAPACITY/ROOM</label>
                  <input type="number" min="1" placeholder="30" className="vin-mob-select"
                    value={newCenter.capacity}
                    onChange={(e) => setNewCenter({ ...newCenter, capacity: e.target.value })} />
                </div>
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
