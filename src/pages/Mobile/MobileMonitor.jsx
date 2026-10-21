import { useState, useEffect } from 'react';
import {
  Search, Activity, X, Clock, CheckCircle2, XCircle, ChevronDown, Building,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
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
  {
    id: 5,
    name: 'Elena Bautista',
    center: 'Vinzons Central Elementary School',
    room: 'A-1',
    ratio: '3/3',
    timestamp: '9/17/2026, 2:15:00 PM',
    status: 'Recorded',
    members: ['Elena Bautista', 'Carlos Bautista', 'Jenny Bautista'],
  },
  {
    id: 6,
    name: 'Roberto Diaz',
    center: 'Vinzons Gymnasium',
    room: 'Hall A',
    ratio: '2/2',
    timestamp: '9/17/2026, 1:45:00 PM',
    status: 'Recorded',
    members: ['Roberto Diaz', 'Clara Diaz'],
  },
  {
    id: 7,
    name: 'Carmen Ramos',
    center: 'Calaguas National High School',
    room: 'Rm-2',
    ratio: '0/4',
    timestamp: '9/17/2026, 12:30:00 PM',
    status: 'Absent',
    members: ['Carmen Ramos', 'Danilo Ramos', 'Mia Ramos', 'Leo Ramos'],
  },
  {
    id: 8,
    name: 'Fernando Lopez',
    center: 'Vinzons Central Elementary School',
    room: 'B-2',
    ratio: '3/3',
    timestamp: '9/17/2026, 11:20:00 AM',
    status: 'Recorded',
    members: ['Fernando Lopez', 'Grace Lopez', 'Joy Lopez'],
  },
  {
    id: 9,
    name: 'Teresa Morales',
    center: 'Vinzons Gymnasium',
    room: 'Hall B',
    ratio: '3/3',
    timestamp: '9/17/2026, 10:45:00 AM',
    status: 'Recorded',
    members: ['Teresa Morales', 'Ramon Morales', 'Ella Morales'],
  },
  {
    id: 10,
    name: 'Danilo Soriano',
    center: 'Vinzons Gymnasium',
    room: 'Hall A',
    ratio: '0/2',
    timestamp: '9/17/2026, 10:15:00 AM',
    status: 'Absent',
    members: ['Danilo Soriano', 'Beth Soriano'],
  },
  {
    id: 11,
    name: 'Marites Villanueva',
    center: 'Calaguas National High School',
    room: 'Rm-1',
    ratio: '3/3',
    timestamp: '9/17/2026, 9:30:00 AM',
    status: 'Recorded',
    members: ['Marites Villanueva', 'Joshua Villanueva', 'Hannah Villanueva'],
  },
  {
    id: 12,
    name: 'Gregorio Santos',
    center: 'Calaguas National High School',
    room: 'Rm-3',
    ratio: '0/2',
    timestamp: '9/17/2026, 9:00:00 AM',
    status: 'Absent',
    members: ['Gregorio Santos', 'Amparo Santos'],
  },
];

const CENTERS = [
  'All Centers',
  'Vinzons Central Elementary School',
  'Vinzons Gymnasium',
  'Calaguas National High School',
];

const ROOMS = [
  'All Rooms',
  'A-1', 'A-2', 'B-1', 'B-2', 'C-1', 'C-2',
  'Hall A', 'Hall B',
  'Rm-1', 'Rm-2', 'Rm-3',
];

export default function MobileMonitor() {
  const [records] = useState(INITIAL_MONITOR_DATA);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');     // 'All' | 'Recorded' | 'Absent'
  const [filterCenter, setFilterCenter] = useState('All Centers');
  const [filterRoom, setFilterRoom] = useState('All Rooms');
  const [openFilter, setOpenFilter] = useState(null);          // 'status' | 'center' | 'room' | null
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
    const matchRoom =
      filterRoom === 'All Rooms' || r.room === filterRoom;
    return matchSearch && matchStatus && matchCenter && matchRoom;
  });

  /* ── Pagination ── */
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 3;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterStatus, filterCenter, filterRoom]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedRecords = filtered.slice(startIndex, startIndex + pageSize);

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
        {/* Clear Filters Button if any active */}
        {(filterStatus !== 'All' || filterCenter !== 'All Centers' || filterRoom !== 'All Rooms') && (
          <button
            type="button"
            className="vin-mon-clear-pill"
            onClick={() => {
              setFilterStatus('All');
              setFilterCenter('All Centers');
              setFilterRoom('All Rooms');
            }}
          >
            Clear <X size={11} />
          </button>
        )}

        {/* Filters pushed to the right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
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
              <div className="vin-mon-filter-dropdown" style={{ right: 0, left: 'auto' }} onClick={(e) => e.stopPropagation()}>
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
              <div className="vin-mon-filter-dropdown" style={{ right: 0, left: 'auto' }} onClick={(e) => e.stopPropagation()}>
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

          {/* Room Filter Button */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className={`vin-mon-filter-btn ${filterRoom !== 'All Rooms' ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setOpenFilter(openFilter === 'room' ? null : 'room');
              }}
            >
              <span>{filterRoom === 'All Rooms' ? 'All rooms' : filterRoom}</span>
              <ChevronDown size={13} />
            </button>

            {openFilter === 'room' && (
              <div className="vin-mon-filter-dropdown" style={{ right: 0, left: 'auto' }} onClick={(e) => e.stopPropagation()}>
                <div className="vin-mon-filter-title">ROOM</div>
                {ROOMS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    className={`vin-mon-filter-opt ${filterRoom === r ? 'active' : ''}`}
                    onClick={() => {
                      setFilterRoom(r);
                      setOpenFilter(null);
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="vin-mon-legend">
        <CheckCircle2 size={14} color="#2d7a57" /> Present / Recorded
        <XCircle size={14} color="#9c4444" style={{ marginLeft: 12 }} /> Absent
      </div>

      {/* ── MONITOR DATA TABLE ── */}
      <div className="vin-mob-table-card">
        <div className="vin-mob-table-responsive">
          <table className="vin-mob-table">
            <thead>
              <tr>
                <th>FAMILY HEAD</th>
                <th style={{ textAlign: 'right' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={2} className="vin-mob-table-empty">
                    No families match the current filter.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((item) => {
                  const isPresent = item.status === 'Recorded';
                  return (
                    <tr
                      key={item.id}
                      onClick={() => openMonitoringSheet(item)}
                      className="vin-mob-table-row"
                    >
                      <td>
                        <div className="vin-mob-td-name">
                          <div className={`vin-mon-table-icon ${isPresent ? 'present' : 'absent'}`}>
                            {isPresent ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                          </div>
                          <div className="vin-mob-head-details">
                            <div className="vin-mob-head-name">{item.name}</div>
                            <div className="vin-mob-head-sub">
                              <span>Room {item.room}</span>
                              <span className="vin-mob-sub-dot">•</span>
                              <span>{item.center.split(' ').slice(0, 2).join(' ')}</span>
                            </div>
                            <div className="vin-mob-head-badges">
                              <span className={`vin-mon-tile-badge ${isPresent ? 'badge-present' : 'badge-absent'}`}>
                                {item.status} ({item.ratio})
                              </span>
                              <span className="vin-mon-table-time">{item.timestamp}</span>
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
                            openMonitoringSheet(item);
                          }}
                        >
                          Update
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
              Showing {startIndex + 1}–{Math.min(startIndex + pageSize, filtered.length)} of {filtered.length}
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
