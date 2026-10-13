import { useState } from 'react';
import { Plus, Search, Building } from 'lucide-react';
import './AdminFeatures.css';

const ROOMS_DATA = [
  { id: 'RM-101', center: 'VCES', name: 'Room 101 - Grade 1 Sampaguita', capacity: 30, occupied: 24, status: 'Active' },
  { id: 'RM-102', center: 'VCES', name: 'Room 102 - Grade 1 Rosal', capacity: 30, occupied: 30, status: 'Full' },
  { id: 'RM-201', center: 'CNHS', name: 'Bldg 2 Room 4', capacity: 25, occupied: 18, status: 'Active' },
  { id: 'CR-B', center: 'VCC', name: 'Vinzons Covered Court - Sector B', capacity: 80, occupied: 65, status: 'Active' },
];

export default function RoomPlacement() {
  const [search, setSearch] = useState('');

  const filtered = ROOMS_DATA.filter(
    (r) => r.name.toLowerCase().includes(search.toLowerCase()) || r.center.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="vin-feature-page">
      <header className="vin-feature-header">
        <div className="vin-feature-header-left">
          <span className="vin-feature-eyebrow">FACILITIES & ALLOCATIONS</span>
          <h1 className="vin-feature-title">Room Placement</h1>
          <p className="vin-feature-desc">
            Organize evacuee room allocations, bed capacities, and designated spaces across evacuation centers.
          </p>
        </div>
        <button type="button" className="vin-feature-action-btn">
          <Plus size={18} />
          <span>Add Room/Space</span>
        </button>
      </header>

      <div className="vin-feature-content-card">
        <div className="vin-feature-toolbar">
          <div className="vin-feature-search-box">
            <Search size={16} color="#64748b" />
            <input
              type="text"
              placeholder="Search room or center..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <table className="vin-feature-table">
          <thead>
            <tr>
              <th>ROOM CODE</th>
              <th>CENTER</th>
              <th>ROOM NAME / DESIGNATION</th>
              <th>OCCUPANCY</th>
              <th>CAPACITY</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id}>
                <td style={{ fontWeight: 700, color: '#0f172a' }}>{item.id}</td>
                <td>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                    <Building size={15} color="#2563eb" />
                    {item.center}
                  </span>
                </td>
                <td style={{ fontWeight: 600 }}>{item.name}</td>
                <td style={{ fontWeight: 700, color: item.occupied >= item.capacity ? '#b91c1c' : '#15803d' }}>
                  {item.occupied} persons
                </td>
                <td>{item.capacity} max</td>
                <td>
                  <span className={`vin-status-tag ${item.occupied >= item.capacity ? 'pending' : 'active'}`}>
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
