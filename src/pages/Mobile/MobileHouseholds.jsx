import { useState, useEffect, useCallback } from 'react';
import {
  Search, Plus, User, Edit, X, Trash2, QrCode,
  AlertTriangle, Ticket, Printer, Filter, ChevronDown, Building,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import './MobileCommon.css';
import './MobileSubpages.css';
import './MobileHouseholds.css';
import checkIcon from '../../assets/check.png';
import removeIcon from '../../assets/remove.png';

/* ──────────────────────────────────────────────
   Seed data – replace with Dexie in production
   ────────────────────────────────────────────── */
const SEED = [
  {
    id: 1,
    name: 'Antonio Magno',
    age: 45, sex: 'Male', category: 'None',
    center: 'Vinzons Central Elementary School',
    room: 'C-1', familyCount: 4,
    members: [
      { name: 'Luz Magno',   age: 58, sex: 'Female', category: 'Senior' },
      { name: 'Pablo Magno', age: 20, sex: 'Male',   category: 'None'   },
      { name: 'Sofia Magno', age: 17, sex: 'Female', category: 'None'   },
    ],
    stubCode: null,
  },
  {
    id: 2,
    name: 'Rosa Santos',
    age: 40, sex: 'Female', category: 'None',
    center: 'Vinzons Central Elementary School',
    room: 'A-2', familyCount: 4,
    members: [
      { name: 'Pedro Santos', age: 42, sex: 'Male',   category: 'None' },
      { name: 'Maya Santos',  age: 16, sex: 'Female', category: 'None' },
      { name: 'Leo Santos',   age: 12, sex: 'Male',   category: 'None' },
    ],
    stubCode: 'STB-001002',
  },
  {
    id: 3,
    name: 'Patricia Cruz',
    age: 35, sex: 'Female', category: 'Pregnant/Lactating',
    center: 'Vinzons Gymnasium',
    room: 'B-1', familyCount: 3,
    members: [
      { name: 'Mark Cruz', age: 38, sex: 'Male',   category: 'None' },
      { name: 'Lina Cruz', age: 10, sex: 'Female', category: 'None' },
    ],
    stubCode: null,
  },
  {
    id: 4,
    name: 'Juan Dela Cruz',
    age: 50, sex: 'Male', category: 'PWD',
    center: 'Calaguas National High School',
    room: 'A-1', familyCount: 3,
    members: [
      { name: 'Maria Dela Cruz', age: 48, sex: 'Female', category: 'None' },
      { name: 'John Dela Cruz',  age: 22, sex: 'Male',   category: 'None' },
    ],
    stubCode: 'STB-004021',
  },
];

const CENTERS = [
  'All Centers',
  'Vinzons Central Elementary School',
  'Vinzons Gymnasium',
  'Calaguas National High School',
];

/* ──────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────── */
function genStubCode() {
  return `STB-${String(Date.now()).slice(-6)}`;
}

function findDuplicateHolder(households, targetHHId, memberName) {
  return households.find(
    (h) =>
      h.id !== targetHHId &&
      h.stubCode &&
      (h.name === memberName || h.members.some((m) => m.name === memberName))
  );
}

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/* ──────────────────────────────────────────────
   Print ALL issued stubs (3x3 grid per page, 9 stubs)
   ────────────────────────────────────────────── */
function printAllStubs(issuedList) {
  if (!issuedList || issuedList.length === 0) return;
  const win = window.open('', '_blank');
  if (!win) {
    alert('Please allow popups to print stubs.');
    return;
  }

  const chunks = chunkArray(issuedList, 9);

  const pagesHtml = chunks.map((chunk) => {
    const cardsHtml = chunk.map((h) => {
      const qrEl = document.getElementById(`print-qr-${h.id}`);
      const qrSvg = qrEl ? qrEl.outerHTML : '';
      return `
        <div class="stub-card">
          <div class="stub-header">
            <div class="stub-title">Relief Goods Stub</div>
            <div class="stub-sub">Vinzons Municipal Social Welfare</div>
          </div>
          <div class="stub-code">${h.stubCode}</div>
          <div class="stub-qr">${qrSvg}</div>
          <div class="stub-footer">
            <span class="stub-head-label">Household Head</span>
            <span class="stub-head-name">${h.name}</span>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="print-page">
        <div class="grid-3x3">
          ${cardsHtml}
        </div>
      </div>
    `;
  }).join('');

  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Relief Goods Stubs (3x3)</title>
      <meta charset="utf-8" />
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @page {
          size: A4 portrait;
          margin: 6mm;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
          background: #f8fafc;
          color: #0f172a;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .print-page {
          width: 198mm;
          height: 284mm;
          margin: 0 auto 10mm;
          background: #fff;
          padding: 3mm;
          box-sizing: border-box;
          page-break-after: always;
          break-after: page;
        }
        .print-page:last-child {
          margin-bottom: 0;
          page-break-after: auto;
          break-after: auto;
        }
        .grid-3x3 {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          grid-template-rows: repeat(3, 1fr);
          gap: 3.5mm;
          width: 100%;
          height: 100%;
        }
        .stub-card {
          border: 1.5px dashed #94a3b8;
          border-radius: 8px;
          padding: 8px 6px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          text-align: center;
          background: #fff;
          overflow: hidden;
        }
        .stub-title {
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          color: #0f172a;
          letter-spacing: 0.3px;
          line-height: 1.1;
        }
        .stub-sub {
          font-size: 7.5px;
          color: #64748b;
          margin-top: 1px;
          line-height: 1.1;
        }
        .stub-code {
          font-size: 13px;
          font-weight: 900;
          letter-spacing: 1.5px;
          color: #166534;
          margin: 2px 0;
        }
        .stub-qr {
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 2px 0;
        }
        .stub-qr svg {
          width: 78px !important;
          height: 78px !important;
          display: block;
        }
        .stub-footer {
          width: 100%;
          border-top: 1px solid #e2e8f0;
          padding-top: 3px;
        }
        .stub-head-label {
          display: block;
          font-size: 7.5px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.2px;
        }
        .stub-head-name {
          display: block;
          font-size: 10.5px;
          font-weight: 800;
          color: #0f172a;
          margin-top: 1px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        @media print {
          body {
            background: #fff;
            padding: 0;
          }
          .print-page {
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
            page-break-after: always;
            break-after: page;
          }
          .print-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }
        }
      </style>
    </head>
    <body>
      ${pagesHtml}
      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 250);
        };
      <\/script>
    </body>
    </html>
  `);
  win.document.close();
}

/* Print single stub */
function printStub(household) {
  const win = window.open('', '_blank');
  if (!win) {
    alert('Please allow popups to print stubs.');
    return;
  }
  const qrEl = document.getElementById(`print-qr-${household.id}`);
  const qrSvg = qrEl ? qrEl.outerHTML : '';
  win.document.write(`
    <!DOCTYPE html>
    <html><head><title>Stub – ${household.stubCode}</title>
    <meta charset="utf-8" />
    <style>
      body{font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;padding:32px;max-width:320px;margin:auto;text-align:center}
      .card{border:1.5px dashed #94a3b8;border-radius:12px;padding:18px 14px;display:flex;flex-direction:column;align-items:center}
      h2{font-size:1.15rem;font-weight:800;margin:0 0 2px;text-transform:uppercase}
      .sub{color:#64748b;font-size:.8rem;margin-bottom:10px}
      .code{font-size:1.5rem;font-weight:900;letter-spacing:2px;color:#166534;margin:6px 0}
      .qr{margin:8px auto}
      .qr svg{width:120px!important;height:120px!important;display:block;margin:auto}
      .head-box{width:100%;border-top:1px solid #e2e8f0;padding-top:8px;margin-top:8px}
      .head-label{font-size:.72rem;color:#64748b;text-transform:uppercase}
      .head-name{font-size:1.05rem;font-weight:800;color:#0f172a;margin-top:2px}
    </style></head><body>
    <div class="card">
      <h2>Relief Goods Stub</h2>
      <p class="sub">Vinzons Municipal Social Welfare</p>
      <p class="code">${household.stubCode}</p>
      <div class="qr">${qrSvg}</div>
      <div class="head-box">
        <div class="head-label">Household Head</div>
        <div class="head-name">${household.name}</div>
      </div>
    </div>
    <script>window.onload=()=>setTimeout(()=>window.print(), 200);<\/script>
    </body></html>
  `);
  win.document.close();
}

/* ──────────────────────────────────────────────
   QR Scanner Modal
   ────────────────────────────────────────────── */
function QrScannerModal({ onScan, onClose }) {
  const instanceRef = { current: null };

  useEffect(() => {
    let scanner;
    import('html5-qrcode').then(({ Html5Qrcode }) => {
      scanner = new Html5Qrcode('qr-reader-el');
      instanceRef.current = scanner;
      scanner
        .start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (text) => { scanner.stop().catch(() => {}); onScan(text); },
          () => {}
        )
        .catch((err) => console.warn('QR camera error:', err));
    });
    return () => { if (instanceRef.current) instanceRef.current.stop().catch(() => {}); };
  }, [onScan]);

  return (
    <div className="vin-hh-qr-overlay" onClick={onClose}>
      <div className="vin-hh-qr-box" onClick={(e) => e.stopPropagation()}>
        <div className="vin-hh-qr-header">
          <span className="vin-hh-qr-title"><QrCode size={18} /> Scan Stub QR Code</span>
          <button type="button" className="vin-mob-sheet-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div id="qr-reader-el" style={{ width: '100%' }} />
        <p className="vin-hh-qr-hint">Point camera at stub QR. Requires HTTPS &amp; camera permission.</p>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Stub Issuance Panel
   ────────────────────────────────────────────── */
function StubIssuancePanel({ household, households, onIssue, onClose }) {
  const duplicates = household.members
    .map((m) => ({ member: m.name, holder: findDuplicateHolder(households, household.id, m.name) }))
    .filter((d) => d.holder);
  const alreadyIssued = !!household.stubCode;

  return (
    <div className="vin-mob-sheet-overlay" onClick={onClose}>
      <div className="vin-mob-sheet-content" onClick={(e) => e.stopPropagation()}>
        <div className="vin-mob-sheet-header">
          <h2 className="vin-mob-sheet-title">Stub Issuance</h2>
          <button type="button" className="vin-mob-sheet-close" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Household card */}
        <div className="vin-hh-stub-card">
          <div className="vin-mob-profile-top">
            <div className="vin-mob-avatar-circle" style={{ width: 44, height: 44 }}><User size={20} /></div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1rem' }}>{household.name}</div>
              <div style={{ fontSize: '.78rem', color: '#64748b' }}>Household Head</div>
            </div>
            <span className={alreadyIssued ? 'vin-hh-badge-issued' : 'vin-hh-badge-notissued'} style={{ marginLeft: 'auto' }}>
              <img
                src={alreadyIssued ? checkIcon : removeIcon}
                alt=""
                className="vin-badge-img-icon"
              />
              <span>{alreadyIssued ? 'Issued' : 'Not Issued'}</span>
            </span>
          </div>
          <div className="vin-hh-stub-meta">
            <div><span className="vin-mob-field-label">ROOM</span><div>{household.room}</div></div>
            <div><span className="vin-mob-field-label">MEMBERS</span><div>{household.familyCount}</div></div>
            <div><span className="vin-mob-field-label">CENTER</span><div style={{ fontSize: '.8rem' }}>{household.center}</div></div>
            <div><span className="vin-mob-field-label">CATEGORY</span><div>{household.category}</div></div>
          </div>
        </div>

        {/* Members */}
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

        {/* Duplicate warning */}
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

        {/* QR + code (if issued) */}
        {alreadyIssued && (
          <div className="vin-hh-issued-block">
            <div style={{ textAlign: 'center' }}>
              <div className="vin-mob-input-label" style={{ marginBottom: 8 }}>STUB CODE</div>
              <div className="vin-hh-stub-code-display">{household.stubCode}</div>
              <div style={{ marginTop: 12 }}>
                <QRCodeSVG id={`panel-qr-${household.id}`} value={household.stubCode}
                  size={140} level="M" bgColor="#ffffff" fgColor="#166534" />
              </div>
            </div>
            <button type="button" className="vin-hh-print-btn" onClick={() => printStub(household)}>
              <Printer size={16} /> Print This Stub
            </button>
          </div>
        )}

        {/* Issue button */}
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
   Filter Dropdown
   ────────────────────────────────────────────── */
function StatusFilterDropdown({ value, onChange, onClose }) {
  return (
    <div className="vin-hh-filter-dropdown" onClick={(e) => e.stopPropagation()}>
      <div className="vin-hh-filter-section-title">STUB STATUS</div>
      {[
        { id: 'All', label: 'All Status', dot: 'all' },
        { id: 'Issued', label: 'Issued (Green)', dot: 'issued' },
        { id: 'Not Issued', label: 'Not Issued (Red)', dot: 'notissued' },
      ].map((opt) => (
        <button
          key={opt.id}
          type="button"
          className={`vin-hh-filter-opt ${value === opt.id ? 'active' : ''}`}
          onClick={() => { onChange(opt.id); onClose(); }}
        >
          <span className={`vin-hh-filter-dot ${opt.dot}`} />
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function CenterFilterDropdown({ value, onChange, onClose }) {
  return (
    <div className="vin-hh-filter-dropdown" onClick={(e) => e.stopPropagation()}>
      <div className="vin-hh-filter-section-title">EVACUATION CENTER</div>
      {CENTERS.map((c) => (
        <button
          key={c}
          type="button"
          className={`vin-hh-filter-opt ${value === c ? 'active' : ''}`}
          onClick={() => { onChange(c); onClose(); }}
        >
          {c}
        </button>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════ */
export default function MobileHouseholds() {
  const [households, setHouseholds] = useState(SEED);
  const [search, setSearch] = useState('');
  const [filterStub, setFilterStub] = useState('All');         // 'All' | 'Issued' | 'Not Issued'
  const [filterCenter, setFilterCenter] = useState('All Centers');
  const [openFilter, setOpenFilter] = useState(null);          // 'status' | 'center' | null
  const [selectedHousehold, setSelectedHousehold] = useState(null);
  const [modalMode, setModalMode] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scanError, setScanError] = useState('');

  const [activeForm, setActiveForm] = useState({
    head: '', age: '', sex: 'Male',
    center: 'Vinzons Central Elementary School',
    room: 'A-1', category: 'None', members: [],
  });

  /* ── Filter + search ── */
  const filtered = households.filter((h) => {
    const matchSearch =
      h.name.toLowerCase().includes(search.toLowerCase()) ||
      h.room.toLowerCase().includes(search.toLowerCase()) ||
      (h.stubCode || '').toLowerCase().includes(search.toLowerCase());
    const matchStub =
      filterStub === 'All' ||
      (filterStub === 'Issued' && !!h.stubCode) ||
      (filterStub === 'Not Issued' && !h.stubCode);
    const matchCenter =
      filterCenter === 'All Centers' || h.center === filterCenter;
    return matchSearch && matchStub && matchCenter;
  });

  const issuedCount = households.filter((h) => h.stubCode).length;
  const filteredIssued = filtered.filter((h) => h.stubCode);
  const activeFilters = (filterStub !== 'All' ? 1 : 0) + (filterCenter !== 'All Centers' ? 1 : 0);

  /* ── QR scan ── */
  const handleScan = useCallback((code) => {
    setShowScanner(false);
    const found = households.find((h) => h.stubCode === code);
    if (found) setSelectedHousehold(found);
    else setScanError(`No household found for code: ${code}`);
  }, [households]);

  /* ── Issue stub ── */
  const issueStub = (hhId) => {
    const newCode = genStubCode();
    setHouseholds((prev) =>
      prev.map((h) => h.id === hhId ? { ...h, stubCode: newCode } : h)
    );
  };

  /* Sync selected panel after issuing */
  useEffect(() => {
    if (selectedHousehold) {
      const fresh = households.find((h) => h.id === selectedHousehold.id);
      if (fresh) setSelectedHousehold(fresh);
    }
  }, [households]); // eslint-disable-line

  /* ── Register / Edit ── */
  const openRegister = () => {
    setActiveForm({ head: '', age: '', sex: 'Male', center: 'Vinzons Central Elementary School', room: 'A-1', category: 'None', members: [] });
    setModalMode('register');
  };
  const openEdit = (item, e) => {
    e.stopPropagation();
    setActiveForm({ id: item.id, head: item.name, age: item.age, sex: item.sex, center: item.center, room: item.room, category: item.category, members: item.members });
    setModalMode('edit');
  };
  const handleSaveHousehold = (e) => {
    e.preventDefault();
    if (!activeForm.head) return;
    if (modalMode === 'register') {
      setHouseholds([{
        id: Date.now(), name: activeForm.head, age: Number(activeForm.age) || 30,
        sex: activeForm.sex, center: activeForm.center, room: activeForm.room,
        category: activeForm.category, familyCount: 1 + activeForm.members.length,
        members: activeForm.members, stubCode: null,
      }, ...households]);
    } else if (modalMode === 'edit') {
      setHouseholds((prev) => prev.map((h) =>
        h.id === activeForm.id
          ? { ...h, name: activeForm.head, age: Number(activeForm.age) || h.age, sex: activeForm.sex, center: activeForm.center, room: activeForm.room, category: activeForm.category, familyCount: 1 + activeForm.members.length, members: activeForm.members }
          : h
      ));
    }
    setModalMode(null);
  };

  const addMember = () =>
    setActiveForm((p) => ({ ...p, members: [...p.members, { name: '', age: '', sex: 'Female', category: 'None' }] }));
  const removeMember = (idx) =>
    setActiveForm((p) => ({ ...p, members: p.members.filter((_, i) => i !== idx) }));

  /* ── RENDER ── */
  return (
    <div className="vin-mob-page" onClick={() => openFilter && setOpenFilter(null)}>

      {/* Header */}
      <header className="vin-mob-header">
        <div className="vin-mob-header-info">
          <h1 className="vin-mob-title">Households</h1>
          <p className="vin-mob-subtitle">{issuedCount} of {households.length} stubs issued</p>
        </div>
        <button type="button" className="vin-mob-register-btn" onClick={openRegister}>
          <Plus size={16} /><span>Register</span>
        </button>
      </header>

      {/* Search + Scan row */}
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
        <button type="button" className="vin-hh-scan-btn" onClick={() => { setScanError(''); setShowScanner(true); }}>
          <QrCode size={18} /> Scan
        </button>
      </div>

      {/* Scan error */}
      {scanError && (
        <div className="vin-hh-scan-error"><AlertTriangle size={14} /> {scanError}</div>
      )}

      {/* Filter bar with separate Status and Center buttons */}
      <div className="vin-hh-filter-bar">
        {/* Status Filter Button */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className={`vin-hh-filter-btn ${filterStub !== 'All' ? 'vin-hh-filter-btn--active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setOpenFilter(openFilter === 'status' ? null : 'status');
            }}
          >
            <span>{filterStub === 'All' ? 'All status' : filterStub}</span>
            <ChevronDown size={13} />
          </button>

          {openFilter === 'status' && (
            <StatusFilterDropdown
              value={filterStub}
              onChange={setFilterStub}
              onClose={() => setOpenFilter(null)}
            />
          )}
        </div>

        {/* Evacuation Center Filter Button */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className={`vin-hh-filter-btn ${filterCenter !== 'All Centers' ? 'vin-hh-filter-btn--active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setOpenFilter(openFilter === 'center' ? null : 'center');
            }}
          >
            <span>{filterCenter === 'All Centers' ? 'All centers' : filterCenter.split(' ').slice(0, 2).join(' ')}</span>
            <ChevronDown size={13} />
          </button>

          {openFilter === 'center' && (
            <CenterFilterDropdown
              value={filterCenter}
              onChange={setFilterCenter}
              onClose={() => setOpenFilter(null)}
            />
          )}
        </div>

        {/* Clear Filters Button if any filter is active */}
        {(filterStub !== 'All' || filterCenter !== 'All Centers') && (
          <button
            type="button"
            className="vin-hh-clear-pill"
            onClick={() => { setFilterStub('All'); setFilterCenter('All Centers'); }}
          >
            Clear <X size={11} />
          </button>
        )}

        {/* Spacer + Print All */}
        <div style={{ marginLeft: 'auto' }}>
          <button
            type="button"
            className="vin-hh-print-all-btn"
            onClick={() => printAllStubs(filteredIssued)}
            disabled={filteredIssued.length === 0}
          >
            <Printer size={14} />
            Print All ({filteredIssued.length})
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="vin-hh-legend">
        <span className="vin-hh-legend-dot issued" /> Issued
        <span className="vin-hh-legend-dot notissued" /> Not Issued
        <span style={{ marginLeft: 'auto', fontSize: '.78rem', color: '#64748b' }}>
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── GRID ── */}
      <div className="vin-hh-grid">
        {filtered.length === 0 && (
          <div className="vin-hh-empty" style={{ gridColumn: '1/-1' }}>
            No households match the current filter.
          </div>
        )}
        {filtered.map((item) => (
          <div
            key={item.id}
            className={`vin-hh-tile ${item.stubCode ? 'vin-hh-tile--issued' : 'vin-hh-tile--notissued'}`}
            onClick={() => setSelectedHousehold(item)}
          >
            <div className="vin-hh-tile-top">
              <div className="vin-mob-avatar-circle vin-hh-tile-avatar"><User size={18} /></div>
              <span className={item.stubCode ? 'vin-hh-badge-issued' : 'vin-hh-badge-notissued'}>
                <img
                  src={item.stubCode ? checkIcon : removeIcon}
                  alt=""
                  className="vin-badge-img-icon"
                />
              </span>
            </div>
            <div className="vin-hh-tile-name">{item.name}</div>
            <div className="vin-hh-tile-meta">Room {item.room}</div>
            <div className="vin-hh-tile-meta">{item.familyCount} members</div>
            {item.stubCode && <div className="vin-hh-tile-code">{item.stubCode}</div>}
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

      {/* ── QR SCANNER ── */}
      {showScanner && <QrScannerModal onScan={handleScan} onClose={() => setShowScanner(false)} />}

      {/* ── STUB ISSUANCE PANEL ── */}
      {selectedHousehold && (
        <StubIssuancePanel
          household={selectedHousehold}
          households={households}
          onIssue={issueStub}
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
                  onChange={(e) => setActiveForm({ ...activeForm, head: e.target.value })} required />
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
                  <option>None</option><option>Senior</option>
                  <option>PWD</option><option>Pregnant/Lactating</option>
                </select>
              </div>
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
                      onChange={(e) => { const u = [...activeForm.members]; u[idx].name = e.target.value; setActiveForm({ ...activeForm, members: u }); }}
                      style={{ padding: '8px 12px' }} />
                    <button type="button" onClick={() => removeMember(idx)}
                      style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 6 }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    <input type="number" placeholder="Age" className="vin-mob-select" value={m.age}
                      onChange={(e) => { const u = [...activeForm.members]; u[idx].age = e.target.value; setActiveForm({ ...activeForm, members: u }); }}
                      style={{ padding: 8 }} />
                    <select className="vin-mob-select" value={m.sex}
                      onChange={(e) => { const u = [...activeForm.members]; u[idx].sex = e.target.value; setActiveForm({ ...activeForm, members: u }); }}
                      style={{ padding: 8 }}>
                      <option>Male</option><option>Female</option>
                    </select>
                    <select className="vin-mob-select" value={m.category}
                      onChange={(e) => { const u = [...activeForm.members]; u[idx].category = e.target.value; setActiveForm({ ...activeForm, members: u }); }}
                      style={{ padding: 8 }}>
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

      {/* ── HIDDEN QR SVGS FOR PRINTING ── */}
      <div style={{ position: 'fixed', left: '-9999px', top: '-9999px', pointerEvents: 'none', opacity: 0 }} aria-hidden="true">
        {households.filter((h) => h.stubCode).map((h) => (
          <QRCodeSVG
            key={h.id}
            id={`print-qr-${h.id}`}
            value={h.stubCode}
            size={120}
            level="M"
            bgColor="#ffffff"
            fgColor="#000000"
          />
        ))}
      </div>
    </div>
  );
}
