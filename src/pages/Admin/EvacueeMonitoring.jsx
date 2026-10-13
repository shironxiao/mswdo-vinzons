import { useState } from 'react';
import { Search, CheckCircle2, Clock } from 'lucide-react';
import './AdminFeatures.css';

const MONITORING_CHECKS = [
  { id: 'CHK-01', center: 'Vinzons Central Elementary School', code: 'VCES', checked: 364, round: 'Morning Check', time: '08:30 AM', status: 'Complete' },
  { id: 'CHK-02', center: 'Vinzons Covered Court', code: 'VCC', checked: 171, round: 'Morning Check', time: '08:30 AM', status: 'Complete' },
  { id: 'CHK-03', center: 'Calaguas National High School', code: 'CNHS', checked: 129, round: 'Morning Check', time: '08:30 AM', status: 'Complete' },
  { id: 'CHK-04', center: 'Vinzons Central Elementary School', code: 'VCES', checked: 360, round: 'Afternoon Check', time: '02:00 PM', status: 'Pending' },
];

export default function EvacueeMonitoring() {
  const [search, setSearch] = useState('');

  const filtered = MONITORING_CHECKS.filter(
    (m) => m.center.toLowerCase().includes(search.toLowerCase()) || m.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="vin-feature-page">
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
          <div className="vin-feature-search-box">
            <Search size={16} color="#64748b" />
            <input
              type="text"
              placeholder="Filter by center name or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
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
            {filtered.map((item) => (
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
