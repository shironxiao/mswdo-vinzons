import { useMemo, useState } from 'react';
import { Search, Ticket, CheckCircle, ChevronLeft } from 'lucide-react';
import './MobileCommon.css';
import './MobileSubpages.css';
import { useHouseholds } from '../../lib/householdService.js';

export default function MobileRelief() {
  const { households } = useHouseholds();
  const [search, setSearch] = useState('');
  const [selectedStub, setSelectedStub] = useState(null); // for relief-stub-detail modal

  const filtered = useMemo(() => households
    .filter((household) => household.stubCode)
    .map((household) => ({
      id: household.stubCode,
      household: household.name || 'Household',
      area: [household.room, household.center].filter(Boolean).join(' • '),
      familySize: household.familyCount,
      issuedAt: household.stubIssuedAt
        ? new Date(household.stubIssuedAt).toLocaleString()
        : 'Not issued',
      status: household.stubIssued ? 'Marked Issued' : 'Pending',
    }))
    .filter((stub) =>
      stub.household.toLowerCase().includes(search.toLowerCase()) ||
      String(stub.id).toLowerCase().includes(search.toLowerCase())
    ), [households, search]);

  return (
    <div className="vin-mob-page">
      <header className="vin-mob-header">
        <div className="vin-mob-header-info">
          <h1 className="vin-mob-title">Relief Goods Stubs</h1>
          <p className="vin-mob-subtitle">Distribution stubs and issuance tracking</p>
        </div>
      </header>

      <div className="vin-mob-search-wrapper">
        <Search size={18} className="vin-mob-search-icon" />
        <input
          type="text"
          placeholder="Search household or stub ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="vin-mob-search-input"
        />
      </div>

      <div className="vin-mob-list">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="vin-mob-card-item"
            onClick={() => setSelectedStub(item)}
            style={{ cursor: 'pointer' }}
          >
            <div className="vin-mob-item-left">
              <div className="vin-mob-avatar-circle" style={{ backgroundColor: '#fef3c7', color: '#b45309' }}>
                <Ticket size={22} />
              </div>
              <div className="vin-mob-item-details">
                <span className="vin-mob-item-name">{item.household}</span>
                <span className="vin-mob-item-sub">
                  {item.id} • {item.area}
                </span>
              </div>
            </div>

            <span
              className={
                item.status === 'Marked Issued'
                  ? 'vin-mob-badge-recorded'
                  : 'vin-mob-badge-absent'
              }
            >
              <CheckCircle size={12} style={{ display: 'inline', marginRight: '4px' }} />
              {item.status}
            </span>
          </div>
        ))}
        {filtered.length === 0 && (
          <p role="status" style={{ padding: 16, color: '#64748b', textAlign: 'center' }}>
            No relief stubs found in the database.
          </p>
        )}
      </div>

      {/* ========================================================
          RELIEF STUB DETAIL SHEET (Matching Screenshot 3 Middle)
          ======================================================== */}
      {selectedStub && (
        <div className="vin-mob-sheet-overlay" onClick={() => setSelectedStub(null)}>
          <div className="vin-mob-sheet-content" onClick={(e) => e.stopPropagation()}>
            <div className="vin-mob-sheet-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ChevronLeft size={20} cursor="pointer" onClick={() => setSelectedStub(null)} />
                <h2 className="vin-mob-sheet-title">Stub Detail</h2>
              </div>
              <span className="vin-mob-role-pill">
                {selectedStub.status.toUpperCase()}
              </span>
            </div>

            <div style={{ textAlign: 'center', padding: '16px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a' }}>
                {selectedStub.id}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '8px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: '#64748b' }}>Household Head</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{selectedStub.household}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: '#64748b' }}>Assigned Area</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{selectedStub.area}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: '#64748b' }}>Family Size</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{selectedStub.familySize} Members</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: '#64748b' }}>Marked Issued At</span>
                <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.85rem' }}>{selectedStub.issuedAt}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedStub(null)}
              style={{ background: 'none', border: 'none', color: '#64748b', fontWeight: 700, fontSize: '0.92rem', cursor: 'pointer', padding: '8px' }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
