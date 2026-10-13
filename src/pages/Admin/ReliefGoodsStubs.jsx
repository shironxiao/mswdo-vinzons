import { useState } from 'react';
import { Plus, Search, PackageCheck } from 'lucide-react';
import './AdminFeatures.css';

const STUBS_DATA = [
  { batchId: 'BATCH-2024-001', center: 'VCES', allocated: 264, distributed: 260, date: 'Sept 18, 2024', status: 'Distributed' },
  { batchId: 'BATCH-2024-002', center: 'VCC', allocated: 171, distributed: 168, date: 'Sept 18, 2024', status: 'Distributed' },
  { batchId: 'BATCH-2024-003', center: 'CNHS', allocated: 129, distributed: 129, date: 'Sept 18, 2024', status: 'Completed' },
  { batchId: 'BATCH-2024-004', center: 'VCES', allocated: 50, distributed: 0, date: 'Sept 19, 2024', status: 'Queued' },
];

export default function ReliefGoodsStubs() {
  const [search, setSearch] = useState('');

  const filtered = STUBS_DATA.filter(
    (s) => s.batchId.toLowerCase().includes(search.toLowerCase()) || s.center.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="vin-feature-page">
      <header className="vin-feature-header">
        <div className="vin-feature-header-left">
          <span className="vin-feature-eyebrow">RELIEF DISTRIBUTION & ASSISTANCE</span>
          <h1 className="vin-feature-title">Relief Goods Stubs</h1>
          <p className="vin-feature-desc">
            Issue, validate, and track relief good claim stubs and distribution batches.
          </p>
        </div>
        <button type="button" className="vin-feature-action-btn">
          <Plus size={18} />
          <span>Issue Stubs Batch</span>
        </button>
      </header>

      <div className="vin-feature-content-card">
        <div className="vin-feature-toolbar">
          <div className="vin-feature-search-box">
            <Search size={16} color="#64748b" />
            <input
              type="text"
              placeholder="Search batch ID or center..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <table className="vin-feature-table">
          <thead>
            <tr>
              <th>BATCH ID</th>
              <th>CENTER</th>
              <th>ALLOCATED STUBS</th>
              <th>DISTRIBUTED</th>
              <th>DATE ISSUED</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.batchId}>
                <td style={{ fontWeight: 700, color: '#0f172a' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <PackageCheck size={16} color="#d97706" />
                    {item.batchId}
                  </span>
                </td>
                <td style={{ fontWeight: 600 }}>{item.center}</td>
                <td>{item.allocated} stubs</td>
                <td style={{ fontWeight: 700, color: '#0d3824' }}>{item.distributed} claimed</td>
                <td>{item.date}</td>
                <td>
                  <span className={`vin-status-tag ${item.status === 'Queued' ? 'pending' : 'active'}`}>
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
