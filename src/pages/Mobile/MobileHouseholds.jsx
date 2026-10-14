import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, Plus, User, Edit, X, Trash2, QrCode,
  AlertTriangle, CheckCircle2, Ticket, Printer,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import './MobileCommon.css';
import './MobileSubpages.css';
import './MobileHouseholds.css';

/* ──────────────────────────────────────────────
   Seed data – in production replace with Dexie
   ────────────────────────────────────────────── */
const SEED = [
  {
    id: 1,
    name: 'Antonio Magno',
    age: 45,
    sex: 'Male',
    category: 'None',
    center: 'Vinzons Central Elementary School',
    room: 'C-1',
    familyCount: 4,
    members: [
      { name: 'Luz Magno',   age: 58, sex: 'Female', category: 'Senior' },
      { name: 'Pablo Magno', age: 20, sex: 'Male',   category: 'None'   },
      { name: 'Sofia Magno', age: 17, sex: 'Female', category: 'None'   },
    ],
    stubCode: null,  // null = not yet issued
  },
  {
    id: 2,
    name: 'Rosa Santos',
    age: 40,
    sex: 'Female',
    category: 'None',
    center: 'Vinzons Central Elementary School',
    room: 'A-2',
    familyCount: 4,
    members: [
      { name: 'Pedro Santos', age: 42, sex: 'Male',   category: 'None' },
      { name: 'Maya Santos',  age: 16, sex: 'Female', category: 'None' },
      { name: 'Leo Santos',   age: 12, sex: 'Male',   category: 'None' },
    ],
    stubCode: 'STB-001002', // already issued
  },
  {
    id: 3,
    name: 'Patricia Cruz',
    age: 35,
    sex: 'Female',
    category: 'Pregnant/Lactating',
    center: 'Vinzons Gymnasium',
    room: 'B-1',
    familyCount: 3,
    members: [
      { name: 'Mark Cruz', age: 38, sex: 'Male',   category: 'None' },
      { name: 'Lina Cruz', age: 10, sex: 'Female', category: 'None' },
    ],
    stubCode: null,
  },
  {
    id: 4,
    name: 'Juan Dela Cruz',
    age: 50,
    sex: 'Male',
    category: 'PWD',
    center: 'Calaguas National High School',
    room: 'A-1',
    familyCount: 3,
    members: [
      { name: 'Maria Dela Cruz', age: 48, sex: 'Female', category: 'None' },
      { name: 'John Dela Cruz',  age: 22, sex: 'Male',   category: 'None' },
    ],
    stubCode: null,
  },
];

/* ──────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────── */
function genStubCode() {
  return `STB-${String(Date.now()).slice(-6)}`;
}

/** Returns the household (if any) where memberId is already in an issued stub */
function findDuplicateHolder(households, targetHHId, memberName) {
  return households.find(
    (h) =>
      h.id !== targetHHId &&
      h.stubCode &&
      (h.name === memberName || h.members.some((m) => m.name === memberName))
  );
}

/* ──────────────────────────────────────────────
   QR Scanner modal using html5-qrcode
   ────────────────────────────────────────────── */
function QrScannerModal({ onScan, onClose }) {
  const scannerRef = useRef(null);
  const instanceRef = useRef(null);

  useEffect(() => {
    let scanner;
    import('html5-qrcode').then(({ Html5Qrcode }) => {
      scanner = new Html5Qrcode('qr-reader-el');
      instanceRef.current = scanner;
      scanner
        .start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText) => {
            scanner.stop().catch(() => {});
            onScan(decodedText);
          },
          () => {}
        )
        .catch((err) => {
          console.warn('QR camera error:', err);
        });
    });

    return () => {
      if (instanceRef.current) {
        instanceRef.current.stop().catch(() => {});
      }
    };
  }, [onScan]);

  return (
    <div className="vin-hh-qr-overlay" onClick={onClose}>
      <div className="vin-hh-qr-box" onClick={(e) => e.stopPropagation()}>
        <div className="vin-hh-qr-header">
          <span className="vin-hh-qr-title">
            <QrCode size={18} /> Scan Stub QR Code
          </span>
          <button type="button" className="vin-mob-sheet-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div id="qr-reader-el" ref={scannerRef} style={{ width: '100%' }} />

        <p className="vin-hh-qr-hint">
          Point the camera at the stub's QR code. Camera needs permission on HTTPS.
        </p>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Print Stub (opens print window)
   ────────────────────────────────────────────── */
function printStub(household) {
  const win = window.open('', '_blank');
  const qrSvg = document.querySelector(`#print-qr-${household.id}`)?.outerHTML || '';
  win.document.write(`
    <html><head><title>Stub – ${household.stubCode}</title>
    <style>
      body{font-family:sans-serif;padding:32px;max-width:380px;margin:auto}
      h2{font-size:1.3rem;margin:0 0 4px}
      .sub{color:#64748b;font-size:.85rem;margin-bottom:16px}
      .code{font-size:1.6rem;font-weight:900;letter-spacing:2px;color:#166534;margin:12px 0}
      svg{display:block;margin:auto}
      table{width:100%;border-collapse:collapse;margin-top:12px}
      td{padding:6px 0;font-size:.85rem;border-bottom:1px solid #e2e8f0}
      td:first-child{color:#64748b;width:40%}
    </style></head><body>
    <h2>Relief Goods Stub</h2>
    <p class="sub">Vinzons Municipal Social Welfare</p>
    <p class="code">${household.stubCode}</p>
    ${qrSvg}
    <table>
      <tr><td>Household Head</td><td>${household.name}</td></tr>
      <tr><td>Room</td><td>${household.room}</td></tr>
      <tr><td>Center</td><td>${household.center}</td></tr>
      <tr><td>Members</td><td>${household.familyCount}</td></tr>
    </table>
    <p style="margin-top:20px;font-size:.75rem;color:#94a3b8">
      Scan the QR code to verify this stub. Do not share personal data.
    </p>
    <script>window.onload=()=>window.print();</script>
    </body></html>
  `);
  win.document.close();
}

/* ──────────────────────────────────────────────
   Stub Issuance Detail Panel (bottom sheet)
   ────────────────────────────────────────────── */
function StubIssuancePanel({ household, households, onIssue, onClose }) {
  const duplicates = household.members
    .map((m) => ({ member: m.name, holder: findDuplicateHolder(households, household.id, m.name) }))
    .filter((d) => d.holder);

  const alreadyIssued = !!household.stubCode;

  return (
    <div className="vin-mob-sheet-overlay" onClick={onClose}>
      <div className="vin-mob-sheet-content" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="vin-mob-sheet-header">
          <h2 className="vin-mob-sheet-title">Stub Issuance</h2>
          <button type="button" className="vin-mob-sheet-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Household card */}
        <div className="vin-hh-stub-card">
          <div className="vin-mob-profile-top">
            <div className="vin-mob-avatar-circle" style={{ width: 44, height: 44 }}>
              <User size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1rem' }}>{household.name}</div>
              <div style={{ fontSize: '.78rem', color: '#64748b' }}>Household Head</div>
            </div>
            <span
              className={alreadyIssued ? 'vin-hh-badge-issued' : 'vin-hh-badge-notissued'}
              style={{ marginLeft: 'auto' }}
            >
              {alreadyIssued ? '✅ Issued' : '⬜ Not Issued'}
            </span>
          </div>

          <div className="vin-hh-stub-meta">
            <div><span className="vin-mob-field-label">ROOM</span><div>{household.room}</div></div>
            <div><span className="vin-mob-field-label">MEMBERS</span><div>{household.familyCount}</div></div>
            <div><span className="vin-mob-field-label">CENTER</span><div style={{ fontSize: '.8rem' }}>{household.center}</div></div>
            <div><span className="vin-mob-field-label">CATEGORY</span><div>{household.category}</div></div>
          </div>
        </div>

        {/* Members list */}
        <div className="vin-hh-members-section">
          <span className="vin-mob-input-label">FAMILY MEMBERS</span>
          {household.members.map((m, i) => (
            <div key={i} className="vin-hh-member-row">
              <User size={14} className="vin-hh-member-icon" />
              <span>{m.name}</span>
              <span className="vin-hh-member-meta">{m.age} • {m.sex} • {m.category}</span>
            </div>
          ))}
        </div>

        {/* Duplicate warning banner */}
        {duplicates.length > 0 && (
          <div className="vin-hh-dup-banner">
            <AlertTriangle size={16} />
            <div>
              {duplicates.map((d, i) => (
                <div key={i}>
                  <strong>⚠️ {d.member}</strong> is already listed under issued stub{' '}
                  <strong>{d.holder.stubCode}</strong> (HH: {d.holder.name})
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Already issued — show QR + code */}
        {alreadyIssued && (
          <div className="vin-hh-issued-block">
            <div style={{ textAlign: 'center' }}>
              <div className="vin-mob-input-label" style={{ marginBottom: 8 }}>STUB CODE</div>
              <div className="vin-hh-stub-code-display">{household.stubCode}</div>
              <div style={{ marginTop: 12 }}>
                <QRCodeSVG
                  id={`print-qr-${household.id}`}
                  value={household.stubCode}
                  size={140}
                  level="M"
                  bgColor="#ffffff"
                  fgColor="#166534"
                />
              </div>
            </div>
            <button
              type="button"
              className="vin-hh-print-btn"
              onClick={() => printStub(household)}
            >
              <Printer size={16} /> Print Stub
            </button>
          </div>
        )}

        {/* Issue Stub button */}
        <button
          type="button"
          className={`vin-hh-issue-btn ${alreadyIssued ? 'vin-hh-issue-btn--disabled' : ''}`}
          disabled={alreadyIssued}
          onClick={() => !alreadyIssued && onIssue(household.id)}
        >
          <Ticket size={18} />
          {alreadyIssued ? 'Stub Already Issued' : 'Issue Stub'}
        </button>

      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   MAIN PAGE
   ────────────────────────────────────────────── */
export default function MobileHouseholds() {
  const [households, setHouseholds] = useState(SEED);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [selectedHousehold, setSelectedHousehold] = useState(null);
  const [modalMode, setModalMode] = useState(null); // 'register' | 'edit' | null
  const [showScanner, setShowScanner] = useState(false);
  const [scanError, setScanError] = useState('');

  const [activeForm, setActiveForm] = useState({
    head: '', age: '', sex: 'Male',
    center: 'Vinzons Central Elementary School',
    room: 'A-1', category: 'None',
    members: [],
  });

  /* Filtered list */
  const filtered = households.filter((h) =>
    h.name.toLowerCase().includes(search.toLowerCase()) ||
    h.room.toLowerCase().includes(search.toLowerCase()) ||
    (h.stubCode || '').toLowerCase().includes(search.toLowerCase())
  );

  /* QR scan result: look up stub code */
  const handleScan = useCallback((code) => {
    setShowScanner(false);
    const found = households.find((h) => h.stubCode === code);
    if (found) {
      setSelectedHousehold(found);
    } else {
      setScanError(`No household found for code: ${code}`);
    }
  }, [households]);

  /* Issue stub */
  const issueStub = (hhId) => {
    setHouseholds((prev) =>
      prev.map((h) =>
        h.id === hhId ? { ...h, stubCode: genStubCode() } : h
      )
    );
    // refresh selected panel
    setSelectedHousehold((prev) =>
      prev
        ? households.find((h) => h.id === hhId)
          ? { ...prev, stubCode: genStubCode() }
          : prev
        : null
    );
  };

  /* After issuing, sync selected panel */
  useEffect(() => {
    if (selectedHousehold) {
      const fresh = households.find((h) => h.id === selectedHousehold.id);
      if (fresh) setSelectedHousehold(fresh);
    }
  }, [households]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Register / Edit helpers */
  const openRegister = () => {
    setActiveForm({
      head: '', age: '', sex: 'Male',
      center: 'Vinzons Central Elementary School',
      room: 'A-1', category: 'None', members: [],
    });
    setModalMode('register');
  };

  const openEdit = (item, e) => {
    e.stopPropagation();
    setActiveForm({
      id: item.id, head: item.name, age: item.age, sex: item.sex,
      center: item.center, room: item.room, category: item.category,
      members: item.members,
    });
    setModalMode('edit');
  };

  const handleSaveHousehold = (e) => {
    e.preventDefault();
    if (!activeForm.head) return;
    if (modalMode === 'register') {
      setHouseholds([{
        id: Date.now(),
        name: activeForm.head,
        age: Number(activeForm.age) || 30,
        sex: activeForm.sex,
        center: activeForm.center,
        room: activeForm.room,
        category: activeForm.category,
        familyCount: 1 + activeForm.members.length,
        members: activeForm.members,
        stubCode: null,
      }, ...households]);
    } else if (modalMode === 'edit') {
      setHouseholds((prev) =>
        prev.map((h) =>
          h.id === activeForm.id
            ? { ...h, name: activeForm.head, age: Number(activeForm.age) || h.age, sex: activeForm.sex, center: activeForm.center, room: activeForm.room, category: activeForm.category, familyCount: 1 + activeForm.members.length, members: activeForm.members }
            : h
        )
      );
    }
    setModalMode(null);
  };

  const addMember = () =>
    setActiveForm((p) => ({ ...p, members: [...p.members, { name: '', age: '', sex: 'Female', category: 'None' }] }));

  const removeMember = (idx) =>
    setActiveForm((p) => ({ ...p, members: p.members.filter((_, i) => i !== idx) }));

  /* ── RENDER ── */
  return (
    <div className="vin-mob-page">

      {/* Header */}
      <header className="vin-mob-header">
        <div className="vin-mob-header-info">
          <h1 className="vin-mob-title">Households</h1>
          <p className="vin-mob-subtitle">Search, scan, or tap a card to issue a stub</p>
        </div>
        <button type="button" className="vin-mob-register-btn" onClick={openRegister}>
          <Plus size={16} /><span>Register</span>
        </button>
      </header>

      {/* Search + QR row */}
      <div className="vin-hh-toolbar">
        <div className="vin-mob-search-wrapper" style={{ flex: 1, marginBottom: 0 }}>
          <Search size={18} className="vin-mob-search-icon" />
          <input
            type="text"
            placeholder="Name, room, or stub code…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setScanError(''); }}
            className="vin-mob-search-input"
          />
        </div>
        <button
          type="button"
          className="vin-hh-scan-btn"
          onClick={() => { setScanError(''); setShowScanner(true); }}
        >
          <QrCode size={18} />
          Scan
        </button>
      </div>

      {scanError && (
        <div className="vin-hh-scan-error">
          <AlertTriangle size={14} /> {scanError}
        </div>
      )}

      {/* View toggle */}
      <div className="vin-hh-view-toggle">
        <button
          type="button"
          className={`vin-hh-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
          onClick={() => setViewMode('grid')}
        >Grid</button>
        <button
          type="button"
          className={`vin-hh-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
          onClick={() => setViewMode('list')}
        >List</button>
      </div>

      {/* Legend */}
      <div className="vin-hh-legend">
        <span className="vin-hh-legend-dot issued" /> Issued
        <span className="vin-hh-legend-dot notissued" /> Not Issued
      </div>

      {/* ── GRID VIEW ── */}
      {viewMode === 'grid' && (
        <div className="vin-hh-grid">
          {filtered.map((item) => (
            <div
              key={item.id}
              className={`vin-hh-tile ${item.stubCode ? 'vin-hh-tile--issued' : 'vin-hh-tile--notissued'}`}
              onClick={() => setSelectedHousehold(item)}
            >
              <div className="vin-hh-tile-top">
                <div className="vin-mob-avatar-circle vin-hh-tile-avatar">
                  <User size={18} />
                </div>
                <span className={item.stubCode ? 'vin-hh-badge-issued' : 'vin-hh-badge-notissued'}>
                  {item.stubCode ? '✅' : '⬜'}
                </span>
              </div>
              <div className="vin-hh-tile-name">{item.name}</div>
              <div className="vin-hh-tile-meta">Room {item.room}</div>
              <div className="vin-hh-tile-meta">{item.familyCount} members</div>
              {item.stubCode && (
                <div className="vin-hh-tile-code">{item.stubCode}</div>
              )}
              <button
                type="button"
                className="vin-hh-tile-edit"
                onClick={(e) => openEdit(item, e)}
                aria-label={`Edit ${item.name}`}
              >
                <Edit size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── LIST VIEW ── */}
      {viewMode === 'list' && (
        <div className="vin-mob-list">
          {filtered.map((item) => (
            <div
              key={item.id}
              className={`vin-mob-card-item vin-hh-list-item ${item.stubCode ? 'list-issued' : 'list-notissued'}`}
              onClick={() => setSelectedHousehold(item)}
              style={{ cursor: 'pointer' }}
            >
              <div className="vin-mob-item-left">
                <div className="vin-mob-avatar-circle"><User size={22} /></div>
                <div className="vin-mob-item-details">
                  <span className="vin-mob-item-name">{item.name}</span>
                  <span className="vin-mob-item-sub">
                    {item.familyCount} members • Room {item.room}
                    {item.stubCode && ` • ${item.stubCode}`}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className={item.stubCode ? 'vin-hh-badge-issued' : 'vin-hh-badge-notissued'}>
                  {item.stubCode ? 'Issued' : 'Pending'}
                </span>
                <button
                  type="button"
                  className="vin-mob-edit-btn"
                  onClick={(e) => openEdit(item, e)}
                >
                  <Edit size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── QR SCANNER ── */}
      {showScanner && (
        <QrScannerModal onScan={handleScan} onClose={() => setShowScanner(false)} />
      )}

      {/* ── STUB ISSUANCE PANEL ── */}
      {selectedHousehold && (
        <StubIssuancePanel
          household={selectedHousehold}
          households={households}
          onIssue={(id) => issueStub(id)}
          onClose={() => setSelectedHousehold(null)}
        />
      )}

      {/* ── REGISTER / EDIT MODAL ── */}
      {modalMode && (
        <div className="vin-mob-sheet-overlay" onClick={() => setModalMode(null)}>
          <div className="vin-mob-sheet-content" onClick={(e) => e.stopPropagation()}>
            <div className="vin-mob-sheet-header">
              <h2 className="vin-mob-sheet-title">
                {modalMode === 'register' ? 'Register Household' : 'Edit Household'}
              </h2>
              <button type="button" className="vin-mob-sheet-close" onClick={() => setModalMode(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveHousehold} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="vin-mob-input-group">
                <label className="vin-mob-input-label">HOUSEHOLD HEAD</label>
                <input type="text" placeholder="Full name" className="vin-mob-select"
                  value={activeForm.head}
                  onChange={(e) => setActiveForm({ ...activeForm, head: e.target.value })}
                  required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="vin-mob-input-group">
                  <label className="vin-mob-input-label">AGE</label>
                  <input type="number" placeholder="45" className="vin-mob-select"
                    value={activeForm.age}
                    onChange={(e) => setActiveForm({ ...activeForm, age: e.target.value })} />
                </div>
                <div className="vin-mob-input-group">
                  <label className="vin-mob-input-label">SEX</label>
                  <select className="vin-mob-select" value={activeForm.sex}
                    onChange={(e) => setActiveForm({ ...activeForm, sex: e.target.value })}>
                    <option>Male</option><option>Female</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 12 }}>
                <div className="vin-mob-input-group">
                  <label className="vin-mob-input-label">EVACUATION CENTER</label>
                  <select className="vin-mob-select" value={activeForm.center}
                    onChange={(e) => setActiveForm({ ...activeForm, center: e.target.value })}>
                    <option>Vinzons Central Elementary School</option>
                    <option>Vinzons Gymnasium</option>
                    <option>Calaguas National High School</option>
                  </select>
                </div>
                <div className="vin-mob-input-group">
                  <label className="vin-mob-input-label">ROOM</label>
                  <input type="text" placeholder="C-1" className="vin-mob-select"
                    value={activeForm.room}
                    onChange={(e) => setActiveForm({ ...activeForm, room: e.target.value })} />
                </div>
              </div>

              <div className="vin-mob-input-group">
                <label className="vin-mob-input-label">CATEGORY</label>
                <select className="vin-mob-select" value={activeForm.category}
                  onChange={(e) => setActiveForm({ ...activeForm, category: e.target.value })}>
                  <option>None</option>
                  <option>Senior</option>
                  <option>PWD</option>
                  <option>Pregnant/Lactating</option>
                </select>
              </div>

              {/* Family Members */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="vin-mob-input-label">FAMILY MEMBERS</span>
                <button type="button" className="vin-mob-add-member-btn" onClick={addMember}>
                  <Plus size={14} /><span>Add</span>
                </button>
              </div>

              {activeForm.members.map((m, idx) => (
                <div key={idx} className="vin-mob-member-box">
                  <div className="vin-mob-member-top">
                    <input type="text" placeholder="Member Name" className="vin-mob-select"
                      value={m.name}
                      onChange={(e) => {
                        const updated = [...activeForm.members];
                        updated[idx].name = e.target.value;
                        setActiveForm({ ...activeForm, members: updated });
                      }} style={{ padding: '8px 12px' }} />
                    <button type="button" onClick={() => removeMember(idx)}
                      style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 6 }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    <input type="number" placeholder="Age" className="vin-mob-select"
                      value={m.age}
                      onChange={(e) => {
                        const updated = [...activeForm.members];
                        updated[idx].age = e.target.value;
                        setActiveForm({ ...activeForm, members: updated });
                      }} style={{ padding: 8 }} />
                    <select className="vin-mob-select" value={m.sex}
                      onChange={(e) => {
                        const updated = [...activeForm.members];
                        updated[idx].sex = e.target.value;
                        setActiveForm({ ...activeForm, members: updated });
                      }} style={{ padding: 8 }}>
                      <option>Male</option><option>Female</option>
                    </select>
                    <select className="vin-mob-select" value={m.category}
                      onChange={(e) => {
                        const updated = [...activeForm.members];
                        updated[idx].category = e.target.value;
                        setActiveForm({ ...activeForm, members: updated });
                      }} style={{ padding: 8 }}>
                      <option>None</option><option>Senior</option><option>PWD</option>
                    </select>
                  </div>
                </div>
              ))}

              <button type="submit" className="vin-mob-sheet-submit-btn">Save Household</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
