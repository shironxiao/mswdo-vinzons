import { useState } from 'react';
import { Search, Activity, X, Clock, CheckCircle2, XCircle } from 'lucide-react';
import './MobileCommon.css';
import './MobileSubpages.css';
import './MobileMonitor.css';

const INITIAL_MONITOR_DATA = [
  {
    id: 1,
    name: 'Antonio Magno',
    ratio: '4/4',
    timestamp: '9/17/2026, 5:00:00 PM',
    status: 'Recorded',
    members: ['Antonio Magno', 'Luz Magno', 'Pablo Magno', 'Sofia Magno'],
  },
  {
    id: 2,
    name: 'Rosa Santos',
    ratio: '4/4',
    timestamp: '9/17/2026, 4:30:00 PM',
    status: 'Recorded',
    members: ['Rosa Santos', 'Pedro Santos', 'Maya Santos', 'Leo Santos'],
  },
  {
    id: 3,
    name: 'Patricia Cruz',
    ratio: '0/3',
    timestamp: '9/17/2026, 1:00:00 PM',
    status: 'Absent',
    members: ['Patricia Cruz', 'Mark Cruz', 'Lina Cruz'],
  },
  {
    id: 4,
    name: 'Juan Dela Cruz',
    ratio: '5/5',
    timestamp: '9/17/2026, 3:00:00 PM',
    status: 'Recorded',
    members: ['Juan Dela Cruz', 'Maria Dela Cruz', 'John Dela Cruz'],
  },
];

export default function MobileMonitor() {
  const [records] = useState(INITIAL_MONITOR_DATA);
  const [search, setSearch] = useState('');
  const [activeFamily, setActiveFamily] = useState(null);
  const [attendance, setAttendance] = useState({});

  const filtered = records.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  const openMonitoringSheet = (family) => {
    setActiveFamily(family);
    const init = {};
    family.members.forEach((m) => { init[m] = 'Accounted For'; });
    setAttendance(init);
  };

  const handleSaveUpdate = () => {
    alert(`Monitoring update saved for ${activeFamily.name}! (UI only)`);
    setActiveFamily(null);
  };

  return (
    <div className="vin-mob-page">
      {/* Header */}
      <header className="vin-mob-header">
        <div className="vin-mob-header-info">
          <h1 className="vin-mob-title">Evacuee Monitoring</h1>
          <p className="vin-mob-subtitle">Record arrival status per family</p>
        </div>
      </header>

      {/* Search */}
      <div className="vin-mob-search-wrapper">
        <Search size={18} className="vin-mob-search-icon" />
        <input
          type="text"
          placeholder="Search household…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="vin-mob-search-input"
        />
      </div>

      {/* Legend */}
      <div className="vin-mon-legend">
        <CheckCircle2 size={14} color="#16a34a" /> Present / Recorded
        <XCircle size={14} color="#dc2626" style={{ marginLeft: 12 }} /> Absent
      </div>

      {/* Monitoring Grid */}
      <div className="vin-mon-grid">
        {filtered.map((item) => {
          const isPresent = item.status === 'Recorded';
          return (
            <div
              key={item.id}
              className={`vin-mon-tile ${isPresent ? 'mon-tile-present' : 'mon-tile-absent'}`}
              onClick={() => openMonitoringSheet(item)}
            >
              {/* Status icon */}
              <div className="vin-mon-tile-icon">
                {isPresent
                  ? <CheckCircle2 size={22} />
                  : <XCircle size={22} />}
              </div>
              <div className="vin-mon-tile-name">{item.name}</div>
              <div className="vin-mon-tile-ratio">{item.ratio}</div>
              <div className={`vin-mon-tile-badge ${isPresent ? 'badge-present' : 'badge-absent'}`}>
                {item.status}
              </div>
              <div className="vin-mon-tile-time">{item.timestamp}</div>
            </div>
          );
        })}
      </div>

      {/* ATTENDANCE SHEET */}
      {activeFamily && (
        <div className="vin-mob-sheet-overlay" onClick={() => setActiveFamily(null)}>
          <div className="vin-mob-sheet-content" onClick={(e) => e.stopPropagation()}>
            <div className="vin-mob-sheet-header">
              <div>
                <h2 className="vin-mob-sheet-title">Evacuee Monitoring</h2>
                <span style={{ fontSize: '.78rem', color: '#64748b' }}>
                  Vinzons Evacuation Center • Group A
                </span>
              </div>
              <button type="button" className="vin-mob-sheet-close" onClick={() => setActiveFamily(null)}>
                <X size={18} />
              </button>
            </div>

            <h3 style={{ margin: '4px 0 12px', fontSize: '1.05rem', fontWeight: 800 }}>
              {activeFamily.name}
            </h3>

            <div className="vin-mob-input-group">
              <label className="vin-mob-input-label">MONITORING INTERVAL</label>
              <input type="text" className="vin-mob-select" defaultValue="Every 2-3 hours" />
            </div>
            <div className="vin-mob-input-group" style={{ marginTop: 12 }}>
              <label className="vin-mob-input-label">CHECKED BY</label>
              <input type="text" className="vin-mob-select" defaultValue="Brgy. Capt. Reyes" />
            </div>

            <h4 style={{ margin: '16px 0 8px', fontSize: '.92rem', fontWeight: 800 }}>
              Members Attendance
            </h4>

            {activeFamily.members.map((member) => (
              <div key={member} className="vin-mob-profile-card" style={{ padding: 14, gap: 10 }}>
                <span style={{ fontWeight: 700, fontSize: '.95rem' }}>{member}</span>
                <div className="vin-mob-attendance-group">
                  {[
                    { key: 'Accounted For', cls: 'active-accounted' },
                    { key: 'Late',           cls: 'active-late'      },
                    { key: 'Absent',         cls: 'active-absent'    },
                  ].map(({ key, cls }) => (
                    <button
                      key={key}
                      type="button"
                      className={`vin-mob-att-btn ${attendance[member] === key ? cls : ''}`}
                      onClick={() => setAttendance({ ...attendance, [member]: key })}
                    >
                      {key}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748b', fontSize: '.78rem' }}>
                  <span>CHECK-IN TIME</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={14} /> --:-- --
                  </span>
                </div>
              </div>
            ))}

            <button type="button" className="vin-mob-sheet-submit-btn" onClick={handleSaveUpdate}
              style={{ marginTop: 12 }}>
              Save Monitoring Update
            </button>

            <div style={{ marginTop: 10 }}>
              <h4 style={{ margin: '0 0 6px', fontSize: '.9rem', fontWeight: 800 }}>Monitoring History</h4>
              <div style={{ padding: 14, backgroundColor: '#f8faf9', borderRadius: 12, border: '1px solid #eef2f0', display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: '.85rem' }}>
                <Clock size={16} />
                <span>No monitoring records yet.</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
