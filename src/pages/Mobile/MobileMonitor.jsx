import { useState } from 'react';
import { Search, Activity, X, Clock } from 'lucide-react';
import './MobileCommon.css';
import './MobileSubpages.css';

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
  const [activeFamily, setActiveFamily] = useState(null); // for evacuee-monitoring-history sheet
  const [attendance, setAttendance] = useState({});

  const filtered = records.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  const openMonitoringSheet = (family) => {
    setActiveFamily(family);
    // default everyone to Accounted For
    const initialAtt = {};
    family.members.forEach((m) => {
      initialAtt[m] = 'Accounted For';
    });
    setAttendance(initialAtt);
  };

  const handleSaveUpdate = (e) => {
    e.preventDefault();
    alert(`Monitoring update saved for ${activeFamily.name}! (UI only)`);
    setActiveFamily(null);
  };

  return (
    <div className="vin-mob-page">
      {/* Header */}
      <header className="vin-mob-header">
        <div className="vin-mob-header-info">
          <h1 className="vin-mob-title">Evacuee Monitoring</h1>
          <p className="vin-mob-subtitle">Record arrival status per family member</p>
        </div>
      </header>

      {/* Search Bar */}
      <div className="vin-mob-search-wrapper">
        <Search size={18} className="vin-mob-search-icon" />
        <input
          type="text"
          placeholder="Household name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="vin-mob-search-input"
        />
      </div>

      {/* Monitoring List */}
      <div className="vin-mob-list">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="vin-mob-card-item"
            onClick={() => openMonitoringSheet(item)}
            style={{ cursor: 'pointer' }}
          >
            <div className="vin-mob-item-left">
              <div className="vin-mob-pulse-circle">
                <Activity size={22} />
              </div>
              <div className="vin-mob-item-details">
                <span className="vin-mob-item-name">{item.name}</span>
                <span className="vin-mob-item-sub">
                  Recorded {item.ratio} • {item.timestamp}
                </span>
              </div>
            </div>

            <span
              className={
                item.status === 'Recorded'
                  ? 'vin-mob-badge-recorded'
                  : 'vin-mob-badge-absent'
              }
            >
              {item.status}
            </span>
          </div>
        ))}
      </div>

      {/* ========================================================
          EVACUEE MONITORING ATTENDANCE SHEET (Matching Screenshot 4 left)
          ======================================================== */}
      {activeFamily && (
        <div className="vin-mob-sheet-overlay" onClick={() => setActiveFamily(null)}>
          <div className="vin-mob-sheet-content" onClick={(e) => e.stopPropagation()}>
            <div className="vin-mob-sheet-header">
              <div>
                <h2 className="vin-mob-sheet-title">Evacuee Monitoring</h2>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Vinzons Evacuation Center • Group A
                </span>
              </div>
              <button
                type="button"
                className="vin-mob-sheet-close"
                onClick={() => setActiveFamily(null)}
              >
                <X size={18} />
              </button>
            </div>

            <h3 style={{ margin: '4px 0', fontSize: '1.1rem', fontWeight: 800 }}>{activeFamily.name}</h3>

            <div className="vin-mob-input-group">
              <label className="vin-mob-input-label">MONITORING INTERVAL</label>
              <input
                type="text"
                className="vin-mob-select"
                defaultValue="Every 2-3 hours"
              />
            </div>

            <div className="vin-mob-input-group">
              <label className="vin-mob-input-label">CHECKED BY</label>
              <input
                type="text"
                className="vin-mob-select"
                defaultValue="Brgy. Capt. Reyes"
              />
            </div>

            <h4 style={{ margin: '10px 0 0 0', fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
              Members Attendance
            </h4>

            {activeFamily.members.map((member) => (
              <div key={member} className="vin-mob-profile-card" style={{ padding: '14px', gap: '10px' }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{member}</span>

                <div className="vin-mob-attendance-group">
                  <button
                    type="button"
                    className={`vin-mob-att-btn ${attendance[member] === 'Accounted For' ? 'active-accounted' : ''}`}
                    onClick={() => setAttendance({ ...attendance, [member]: 'Accounted For' })}
                  >
                    Accounted For
                  </button>
                  <button
                    type="button"
                    className={`vin-mob-att-btn ${attendance[member] === 'Late' ? 'active-late' : ''}`}
                    onClick={() => setAttendance({ ...attendance, [member]: 'Late' })}
                  >
                    Late
                  </button>
                  <button
                    type="button"
                    className={`vin-mob-att-btn ${attendance[member] === 'Absent' ? 'active-absent' : ''}`}
                    onClick={() => setAttendance({ ...attendance, [member]: 'Absent' })}
                  >
                    Absent
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748b', fontSize: '0.78rem' }}>
                  <span>CHECK-IN TIME</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={14} /> --:-- --
                  </span>
                </div>
              </div>
            ))}

            <button
              type="button"
              className="vin-mob-sheet-submit-btn"
              onClick={handleSaveUpdate}
            >
              Save Monitoring Update
            </button>

            {/* Monitoring History Box */}
            <div style={{ marginTop: '8px' }}>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '0.9rem', fontWeight: 800 }}>Monitoring History</h4>
              <div style={{ padding: '14px', backgroundColor: '#f8faf9', borderRadius: '12px', border: '1px solid #eef2f0', display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.85rem' }}>
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
