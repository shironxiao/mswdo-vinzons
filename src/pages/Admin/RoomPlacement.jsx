import { useState } from 'react';
import { Plus, Building, ChevronDown, X } from 'lucide-react';
import './AdminFeatures.css';

const ROOMS_DATA = [
  { id: 'RM-101', center: 'VCES', name: 'Room 101 - Grade 1 Sampaguita', capacity: 30, occupied: 24, status: 'Active' },
  { id: 'RM-102', center: 'VCES', name: 'Room 102 - Grade 1 Rosal', capacity: 30, occupied: 30, status: 'Full' },
  { id: 'RM-201', center: 'CNHS', name: 'Bldg 2 Room 4', capacity: 25, occupied: 18, status: 'Active' },
  { id: 'CR-B', center: 'VCC', name: 'Vinzons Covered Court - Sector B', capacity: 80, occupied: 65, status: 'Active' },
];

const CENTERS = ['All Centers', 'VCES', 'CNHS', 'VCC'];
const STATUSES = ['All Status', 'Active', 'Full'];

export default function RoomPlacement() {
  const [filterCenter, setFilterCenter] = useState('All Centers');
  const [filterStatus, setFilterStatus] = useState('All Status');
  const [openFilter, setOpenFilter] = useState(null);

  const filtered = ROOMS_DATA.filter((r) => {
    const matchCenter = filterCenter === 'All Centers' || r.center === filterCenter;
    const matchStatus = filterStatus === 'All Status' || r.status === filterStatus;
    return matchCenter && matchStatus;
  });

  return (
    <div className="vin-feature-page" onClick={() => openFilter && setOpenFilter(null)}>
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
                  {CENTERS.map((c) => (
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
              <th>CAPACITY</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
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
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
