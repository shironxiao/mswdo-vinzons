import { useState } from 'react';
import { Plus, Search, Home } from 'lucide-react';
import './AdminFeatures.css';

const INITIAL_HOUSEHOLDS = [
  { id: 'HH-001', head: 'Juan Dela Cruz', members: 5, center: 'VCES', room: 'Room 101', status: 'Sheltered' },
  { id: 'HH-002', head: 'Maria Santos', members: 4, center: 'VCC', room: 'Court Area B', status: 'Sheltered' },
  { id: 'HH-003', head: 'Antonio Ramos', members: 6, center: 'CNHS', room: 'Bldg 2 Room 4', status: 'Sheltered' },
  { id: 'HH-004', head: 'Elena Bautista', members: 3, center: 'VCES', room: 'Room 103', status: 'Sheltered' },
];

export default function Household() {
  const [search, setSearch] = useState('');

  const filtered = INITIAL_HOUSEHOLDS.filter(
    (h) => h.head.toLowerCase().includes(search.toLowerCase()) || h.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="vin-feature-page">
      <header className="vin-feature-header">
        <div className="vin-feature-header-left">
          <span className="vin-feature-eyebrow">REGISTRY & FAMILY RECORDS</span>
          <h1 className="vin-feature-title">Household</h1>
          <p className="vin-feature-desc">
            Manage registered households, family profiles, and assigned evacuation facilities.
          </p>
        </div>
        <button type="button" className="vin-feature-action-btn">
          <Plus size={18} />
          <span>Register Household</span>
        </button>
      </header>

      <div className="vin-feature-content-card">
        <div className="vin-feature-toolbar">
          <div className="vin-feature-search-box">
            <Search size={16} color="#64748b" />
            <input
              type="text"
              placeholder="Search by ID or head of family..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <table className="vin-feature-table">
          <thead>
            <tr>
              <th>HOUSEHOLD ID</th>
              <th>HEAD OF FAMILY</th>
              <th>MEMBERS</th>
              <th>ASSIGNED CENTER</th>
              <th>ROOM / AREA</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id}>
                <td style={{ fontWeight: 700, color: '#0f172a' }}>{item.id}</td>
                <td style={{ fontWeight: 600 }}>{item.head}</td>
                <td>{item.members} persons</td>
                <td>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Home size={15} color="#15803d" />
                    {item.center}
                  </span>
                </td>
                <td>{item.room}</td>
                <td>
                  <span className="vin-status-tag active">{item.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
