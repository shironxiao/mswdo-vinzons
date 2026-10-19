import { useState } from 'react';
import { Plus, PackageCheck, ChevronDown, X } from 'lucide-react';
import './AdminFeatures.css';

const STUBS_DATA = [
  { batchId: 'BATCH-2024-001', center: 'VCES', allocated: 264, distributed: 260, date: 'Sept 18, 2024', status: 'Distributed' },
  { batchId: 'BATCH-2024-002', center: 'VCC', allocated: 171, distributed: 168, date: 'Sept 18, 2024', status: 'Distributed' },
  { batchId: 'BATCH-2024-003', center: 'CNHS', allocated: 129, distributed: 129, date: 'Sept 18, 2024', status: 'Completed' },
  { batchId: 'BATCH-2024-004', center: 'VCES', allocated: 50, distributed: 0, date: 'Sept 19, 2024', status: 'Queued' },
];

const CENTERS = [
  { id: 'All Centers', label: 'All centers' },
  { id: 'VCES', label: 'VCES (Central Elem)' },
  { id: 'VCC', label: 'VCC (Covered Court)' },
  { id: 'CNHS', label: 'CNHS (High School)' },
];

const STATUSES = ['All Status', 'Distributed', 'Completed', 'Queued'];

export default function ReliefGoodsStubs() {
  const [filterCenter, setFilterCenter] = useState('All Centers');
  const [filterStatus, setFilterStatus] = useState('All Status');
  const [openFilter, setOpenFilter] = useState(null);

  const filtered = STUBS_DATA.filter((s) => {
    const matchCenter = filterCenter === 'All Centers' || s.center === filterCenter;
    const matchStatus = filterStatus === 'All Status' || s.status === filterStatus;
    return matchCenter && matchStatus;
  });

  return (
    <div className="vin-feature-page" onClick={() => openFilter && setOpenFilter(null)}>
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
                  <div className="vin-filter-pill-dropdown-title">Batch Status</div>
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
              <th>BATCH ID</th>
              <th>CENTER</th>
              <th>ALLOCATED STUBS</th>
              <th>DISTRIBUTED</th>
              <th>DATE ISSUED</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  No relief goods stubs match the current filter criteria.
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
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
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
