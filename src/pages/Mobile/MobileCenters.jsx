import { useState } from 'react';
import { Search, Building, MapPin, Users, Plus, X } from 'lucide-react';
import './MobileCommon.css';
import './MobileSubpages.css';

const CENTERS_DATA = [
  { id: 1, name: 'Vinzons Central Elementary School', location: 'Poblacion, Vinzons', count: 364, rooms: 12, status: 'Active' },
  { id: 2, name: 'Vinzons Gymnasium', location: 'Brgy. San Jose, Vinzons', count: 120, rooms: 8, status: 'Active' },
  { id: 3, name: 'Calaguas National High School', location: 'Calaguas, Vinzons', count: 129, rooms: 6, status: 'Active' },
];

export default function MobileCenters() {
  const [centers, setCenters] = useState(CENTERS_DATA);
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newCenter, setNewCenter] = useState({ name: '', location: '', rooms: '2' });

  const filtered = centers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.location.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddCenter = (e) => {
    e.preventDefault();
    if (!newCenter.name) return;
    const item = {
      id: Date.now(),
      name: newCenter.name,
      location: newCenter.location || 'Vinzons',
      rooms: Number(newCenter.rooms) || 2,
      count: 0,
      status: 'Active',
    };
    setCenters([item, ...centers]);
    setNewCenter({ name: '', location: '', rooms: '2' });
    setIsAddOpen(false);
  };

  return (
    <div className="vin-mob-page">
      <header className="vin-mob-header">
        <div className="vin-mob-header-info">
          <h1 className="vin-mob-title">Centers</h1>
          <p className="vin-mob-subtitle">Active evacuation facilities in Vinzons</p>
        </div>
        <button
          type="button"
          className="vin-mob-register-btn"
          onClick={() => setIsAddOpen(true)}
        >
          <Plus size={16} />
          <span>Add Center</span>
        </button>
      </header>

      <div className="vin-mob-search-wrapper">
        <Search size={18} className="vin-mob-search-icon" />
        <input
          type="text"
          placeholder="Search evacuation centers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="vin-mob-search-input"
        />
      </div>

      <div className="vin-mob-list">
        {filtered.map((item) => (
          <div key={item.id} className="vin-mob-card-item">
            <div className="vin-mob-item-left">
              <div className="vin-mob-avatar-circle" style={{ backgroundColor: '#e0f2fe', color: '#0369a1' }}>
                <Building size={22} />
              </div>
              <div className="vin-mob-item-details">
                <span className="vin-mob-item-name">{item.name}</span>
                <span className="vin-mob-item-sub">
                  <MapPin size={12} style={{ display: 'inline', marginRight: '4px' }} />
                  {item.location} • <Users size={12} style={{ display: 'inline', margin: '0 2px' }} /> {item.count} evacuees ({item.rooms} Rooms)
                </span>
              </div>
            </div>

            <span className="vin-mob-badge-recorded" style={{ fontSize: '0.72rem', padding: '4px 10px' }}>
              {item.status}
            </span>
          </div>
        ))}
      </div>

      {/* ========================================================
          ADD EVACUATION CENTER SHEET (Matching Screenshot 3 Left)
          ======================================================== */}
      {isAddOpen && (
        <div className="vin-mob-sheet-overlay" onClick={() => setIsAddOpen(false)}>
          <div className="vin-mob-sheet-content" onClick={(e) => e.stopPropagation()}>
            <div className="vin-mob-sheet-header">
              <h2 className="vin-mob-sheet-title">Add Evacuation Center</h2>
              <button
                type="button"
                className="vin-mob-sheet-close"
                onClick={() => setIsAddOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddCenter} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="vin-mob-input-group">
                <label className="vin-mob-input-label">CENTER NAME</label>
                <input
                  type="text"
                  placeholder="e.g. Central Elementary Gym"
                  className="vin-mob-select"
                  value={newCenter.name}
                  onChange={(e) => setNewCenter({ ...newCenter, name: e.target.value })}
                  required
                />
              </div>

              <div className="vin-mob-input-group">
                <label className="vin-mob-input-label">BARANGAY / LOCATION</label>
                <input
                  type="text"
                  placeholder="e.g. Barangay San Jose"
                  className="vin-mob-select"
                  value={newCenter.location}
                  onChange={(e) => setNewCenter({ ...newCenter, location: e.target.value })}
                  required
                />
              </div>

              <div className="vin-mob-input-group">
                <label className="vin-mob-input-label">NUMBER OF ROOMS</label>
                <input
                  type="number"
                  placeholder="2"
                  className="vin-mob-select"
                  value={newCenter.rooms}
                  onChange={(e) => setNewCenter({ ...newCenter, rooms: e.target.value })}
                />
              </div>

              <button
                type="submit"
                className="vin-mob-sheet-blue-btn"
                style={{ marginTop: '8px' }}
              >
                Create Evacuation Center
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
