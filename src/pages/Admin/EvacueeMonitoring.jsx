import { useState } from 'react';
import { CheckCircle2, Clock, ChevronDown, X } from 'lucide-react';
import './AdminFeatures.css';

const MONITORING_CHECKS = [
  { id: 'CHK-01', center: 'Vinzons Central Elementary School', code: 'VCES', checked: 364, round: 'Morning Check', time: '08:30 AM', status: 'Complete' },
  { id: 'CHK-02', center: 'Vinzons Covered Court', code: 'VCC', checked: 171, round: 'Morning Check', time: '08:30 AM', status: 'Complete' },
  { id: 'CHK-03', center: 'Calaguas National High School', code: 'CNHS', checked: 129, round: 'Morning Check', time: '08:30 AM', status: 'Complete' },
  { id: 'CHK-04', center: 'Vinzons Central Elementary School', code: 'VCES', checked: 360, round: 'Afternoon Check', time: '02:00 PM', status: 'Pending' },
];

const CENTERS = [
  { id: 'All Centers', label: 'All centers' },
  { id: 'VCES', label: 'VCES (Central Elem)' },
  { id: 'VCC', label: 'VCC (Covered Court)' },
  { id: 'CNHS', label: 'CNHS (High School)' },
];

const STATUSES = ['All Status', 'Complete', 'Pending'];

export default function EvacueeMonitoring() {
  const [filterCenter, setFilterCenter] = useState('All Centers');
  const [filterStatus, setFilterStatus] = useState('All Status');
  const [openFilter, setOpenFilter] = useState(null);

  const filtered = MONITORING_CHECKS.filter((m) => {
    const matchCenter = filterCenter === 'All Centers' || m.code === filterCenter;
    const matchStatus = filterStatus === 'All Status' || m.status === filterStatus;
    return matchCenter && matchStatus;
  });

  return (
    <div className="vin-feature-page" onClick={() => openFilter && setOpenFilter(null)}>
      <header className="vin-feature-header">
        <div className="vin-feature-header-left">
          <span className="vin-feature-eyebrow">DAILY VERIFICATION & HEADCOUNT</span>
          <h1 className="vin-feature-title">Evacuee Monitoring</h1>
          <p className="vin-feature-desc">
            Monitor daily attendance, evacuee headcounts, and operational verification rounds.
          </p>
        </div>
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
                      key={c.id}
                      type="button"
                      className={`vin-filter-pill-opt ${filterCenter === c.id ? 'active' : ''}`}
                      onClick={() => {
                        setFilterCenter(c.id);
                        setOpenFilter(null);
                      }}
                    >
                      <span>{c.label}</span>
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
                  <div className="vin-filter-pill-dropdown-title">Verification Status</div>
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
              <th>CENTER CODE</th>
              <th>EVACUATION CENTER</th>
              <th>CHECK ROUND</th>
              <th>PEOPLE CHECKED</th>
              <th>TIME STAMP</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  No monitoring records match the current filter criteria.
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 700, color: '#0f172a' }}>{item.code}</td>
                  <td style={{ fontWeight: 600 }}>{item.center}</td>
                  <td>{item.round}</td>
                  <td style={{ fontWeight: 700, color: '#0d3824' }}>{item.checked} individuals</td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={15} color="#64748b" />
                      {item.time}
                    </span>
                  </td>
                  <td>
                    <span className={`vin-status-tag ${item.status === 'Complete' ? 'active' : 'pending'}`}>
                      <CheckCircle2 size={13} style={{ marginRight: '4px' }} />
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
