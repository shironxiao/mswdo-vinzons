import { useState } from 'react';
import { Search, Activity, X, Clock, CheckCircle2, XCircle, ChevronDown, Building } from 'lucide-react';
import './MobileCommon.css';
import './MobileSubpages.css';
import './MobileMonitor.css';

const INITIAL_MONITOR_DATA = [
  {
    id: 1,
    name: 'Antonio Magno',
    center: 'Vinzons Central Elementary School',
    room: 'C-1',
    ratio: '4/4',
    timestamp: '9/17/2026, 5:00:00 PM',
    status: 'Recorded',
    members: ['Antonio Magno', 'Luz Magno', 'Pablo Magno', 'Sofia Magno'],
  },
  {
    id: 2,
    name: 'Rosa Santos',
    center: 'Vinzons Central Elementary School',
    room: 'A-2',
    ratio: '4/4',
    timestamp: '9/17/2026, 4:30:00 PM',
    status: 'Recorded',
    members: ['Rosa Santos', 'Pedro Santos', 'Maya Santos', 'Leo Santos'],
  },
  {
    id: 3,
    name: 'Patricia Cruz',
    center: 'Vinzons Gymnasium',
    room: 'B-1',
    ratio: '0/3',
    timestamp: '9/17/2026, 1:00:00 PM',
    status: 'Absent',
    members: ['Patricia Cruz', 'Mark Cruz', 'Lina Cruz'],
  },
  {
    id: 4,
    name: 'Juan Dela Cruz',
    center: 'Calaguas National High School',
    room: 'A-1',
    ratio: '5/5',
    timestamp: '9/17/2026, 3:00:00 PM',
    status: 'Recorded',
    members: ['Juan Dela Cruz', 'Maria Dela Cruz', 'John Dela Cruz'],
  },
];

const CENTERS = [
  'All Centers',
  'Vinzons Central Elementary School',
  'Vinzons Gymnasium',
  'Calaguas National High School',
];

export default function MobileMonitor() {
  const [records] = useState(INITIAL_MONITOR_DATA);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');     // 'All' | 'Recorded' | 'Absent'
  const [filterCenter, setFilterCenter] = useState('All Centers');
  const [openFilter, setOpenFilter] = useState(null);          // 'status' | 'center' | null
  const [activeFamily, setActiveFamily] = useState(null);
  const [attendance, setAttendance] = useState({});

  const filtered = records.filter((r) => {
    const matchSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.room.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      filterStatus === 'All' ||
      (filterStatus === 'Recorded' && r.status === 'Recorded') ||
      (filterStatus === 'Absent' && r.status === 'Absent');
    const matchCenter =
      filterCenter === 'All Centers' || r.center === filterCenter;
    return matchSearch && matchStatus && matchCenter;
  });

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
    <div className="vin-mob-page" onClick={() => openFilter && setOpenFilter(null)}>
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
          placeholder="Search household or room…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="vin-mob-search-input"
        />
      </div>

      {/* Separate Filter Buttons Bar */}
      <div className="vin-mon-filter-bar">
        {/* Status Filter Button */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className={`vin-mon-filter-btn ${filterStatus !== 'All' ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setOpenFilter(openFilter === 'status' ? null : 'status');
            }}
          >
            <span>{filterStatus === 'All' ? 'All status' : filterStatus === 'Recorded' ? 'Present' : 'Absent'}</span>
            <ChevronDown size={13} />
          </button>

          {openFilter === 'status' && (
            <div className="vin-mon-filter-dropdown" onClick={(e) => e.stopPropagation()}>
              <div className="vin-mon-filter-title">MONITORING STATUS</div>
              {[
                { id: 'All', label: 'All Status', dot: 'all' },
                { id: 'Recorded', label: 'Present / Recorded (Green)', dot: 'present' },
                { id: 'Absent', label: 'Absent (Red)', dot: 'absent' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`vin-mon-filter-opt ${filterStatus === opt.id ? 'active' : ''}`}
                  onClick={() => {
                    setFilterStatus(opt.id);
                    setOpenFilter(null);
                  }}
                >
                  <span className={`vin-mon-filter-dot ${opt.dot}`} />
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Evacuation Center Filter Button */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className={`vin-mon-filter-btn ${filterCenter !== 'All Centers' ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setOpenFilter(openFilter === 'center' ? null : 'center');
            }}
          >
            <span>{filterCenter === 'All Centers' ? 'All centers' : filterCenter.split(' ').slice(0, 2).join(' ')}</span>
            <ChevronDown size={13} />
          </button>

          {openFilter === 'center' && (
            <div className="vin-mon-filter-dropdown" onClick={(e) => e.stopPropagation()}>
              <div className="vin-mon-filter-title">EVACUATION CENTER</div>
              {CENTERS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`vin-mon-filter-opt ${filterCenter === c ? 'active' : ''}`}
                  onClick={() => {
                    setFilterCenter(c);
                    setOpenFilter(null);
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Clear Filters Button if any active */}
        {(filterStatus !== 'All' || filterCenter !== 'All Centers') && (
          <button
            type="button"
            className="vin-mon-clear-pill"
            onClick={() => {
              setFilterStatus('All');
              setFilterCenter('All Centers');
            }}
          >
            Clear <X size={11} />
          </button>
        )}

        <span style={{ marginLeft: 'auto', fontSize: '.78rem', color: '#64748b' }}>
          {filtered.length} family{filtered.length !== 1 ? 'ies' : ''}
        </span>
      </div>

      {/* Legend */}
      <div className="vin-mon-legend">
        <CheckCircle2 size={14} color="#16a34a" /> Present / Recorded
        <XCircle size={14} color="#dc2626" style={{ marginLeft: 12 }} /> Absent
      </div>

      {/* Monitoring Grid */}
      <div className="vin-mon-grid">
        {filtered.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '30px', color: '#94a3b8', fontSize: '.88rem' }}>
            No families match the current filter.
          </div>
        )}
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
              <div className="vin-mon-tile-loc">
                Room {item.room} • {item.center.split(' ').slice(0, 2).join(' ')}
              </div>
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
                  {activeFamily.center} • Room {activeFamily.room}
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
