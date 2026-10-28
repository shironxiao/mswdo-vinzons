import { useState, useEffect, useCallback } from 'react';
import {
  Search, Plus, User, Edit, X, Trash2, QrCode,
  AlertTriangle, Ticket, Printer, Filter, ChevronDown, Building,
  ChevronLeft, ChevronRight, MapPin, CheckCircle2, SlidersHorizontal,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import './MobileCommon.css';
import './MobileSubpages.css';
import './MobileHouseholds.css';
import checkIcon from '../../assets/check.png';
import removeIcon from '../../assets/remove.png';
import {
  useEvacuationCenters,
  isCenterMatch,
  getRoomsForCenter,
} from '../../lib/evacuationCenters';

/* ──────────────────────────────────────────────
   Seed data – replace with Dexie in production
   ────────────────────────────────────────────── */
const SEED = [
  {
    id: 1,
    name: 'Antonio Magno',
    age: 45, sex: 'Male', category: 'None',
    center: 'LGU EC (Mangcaway)',
    room: 'Room 1', familyCount: 4,
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
    center: 'LGU EC (Mangcaway)',
    room: 'Room 2', familyCount: 4,
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
    center: 'LGU EC (Bliss)',
    room: 'Room 1', familyCount: 3,
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
    center: 'PLGU EC (Mat-I)',
    room: 'Room 3', familyCount: 3,
    members: [
      { name: 'Maria Dela Cruz', age: 48, sex: 'Female', category: 'None' },
      { name: 'John Dela Cruz',  age: 22, sex: 'Male',   category: 'None' },
    ],
    stubCode: 'STB-004021',
  },
  {
    id: 5,
    name: 'Elena Bautista',
    age: 42, sex: 'Female', category: 'Solo Parent',
    center: 'Pinagtigasan EC',
    room: 'Unassigned', familyCount: 3,
    members: [
      { name: 'Carlos Bautista', age: 14, sex: 'Male',   category: 'None' },
      { name: 'Jenny Bautista',  age: 9,  sex: 'Female', category: 'None' },
    ],
    stubCode: null,
  },
  {
    id: 6,
    name: 'Roberto Diaz',
    age: 55, sex: 'Male', category: 'Senior',
    center: 'St. Peter Parish AVR',
    room: 'Room 1', familyCount: 2,
    members: [
      { name: 'Clara Diaz', age: 52, sex: 'Female', category: 'None' },
    ],
    stubCode: 'STB-006033',
  },
  {
    id: 7,
    name: 'Carmen Ramos',
    age: 29, sex: 'Female', category: 'Pregnant/Lactating',
    center: 'Biday EC',
    room: 'Room 2', familyCount: 4,
    members: [
      { name: 'Danilo Ramos', age: 31, sex: 'Male',   category: 'None' },
      { name: 'Mia Ramos',    age: 5,  sex: 'Female', category: 'None' },
      { name: 'Leo Ramos',    age: 2,  sex: 'Male',   category: 'None' },
    ],
    stubCode: null,
  },
  {
    id: 8,
    name: 'Fernando Lopez',
    age: 48, sex: 'Male', category: 'PWD',
    center: 'Sugod EC',
    room: 'Room 4', familyCount: 3,
    members: [
      { name: 'Grace Lopez', age: 44, sex: 'Female', category: 'None' },
      { name: 'Joy Lopez',   age: 18, sex: 'Female', category: 'None' },
    ],
    stubCode: 'STB-008012',
  },
  {
    id: 9,
    name: 'Teresa Morales',
    age: 38, sex: 'Female', category: 'None',
    center: 'Mormons',
    room: 'Room 1', familyCount: 3,
    members: [
      { name: 'Ramon Morales', age: 40, sex: 'Male', category: 'None' },
      { name: 'Ella Morales',  age: 8,  sex: 'Female', category: 'None' },
    ],
    stubCode: 'STB-009045',
  },
  {
    id: 10,
    name: 'Danilo Soriano',
    age: 51, sex: 'Male', category: 'None',
    center: 'Marabe Church',
    room: 'Unassigned', familyCount: 2,
    members: [
      { name: 'Beth Soriano', age: 49, sex: 'Female', category: 'None' },
    ],
    stubCode: null,
  },
  {
    id: 11,
    name: 'Marites Villanueva',
    age: 34, sex: 'Female', category: 'Solo Parent',
    center: 'Adorno Fathers',
    room: 'Room 5', familyCount: 3,
    members: [
      { name: 'Joshua Villanueva', age: 11, sex: 'Male', category: 'None' },
      { name: 'Hannah Villanueva', age: 6,  sex: 'Female', category: 'None' },
    ],
    stubCode: 'STB-011089',
  },
  {
    id: 12,
    name: 'Gregorio Santos',
    age: 62, sex: 'Male', category: 'Senior',
    center: 'Mangcawayan EC',
    room: 'Room 3', familyCount: 2,
    members: [
      { name: 'Amparo Santos', age: 60, sex: 'Female', category: 'Senior' },
    ],
    stubCode: null,
  },
];

/* Exactly 13 Official Vinzons Evacuation Centers */
const OFFICIAL_EVAC_CENTERS = [
  { name: 'LGU EC (Mangcaway)', fullName: 'LGU EC', location: 'Mangcaway Brgy. Cal. Sur, Vinzons, CN' },
  { name: 'LGU EC (Bliss)', fullName: 'LGU EC', location: 'Bliss Brgy. Cal Sur, VCN' },
  { name: 'PLGU EC (Mat-I)', fullName: 'PLGU EC', location: 'Mat – I Brgy. Sto. Domingo, VCN' },
  { name: 'Pinagtigasan EC', fullName: 'Pinagtigasan EC', location: 'P – 1 Brgy. Pinagtigasan, VCN' },
  { name: 'St. Peter Parish AVR', fullName: 'St. Peter Parish AVR', location: 'Brgy Poblacion III' },
  { name: 'Biday EC', fullName: 'Biday EC', location: 'Brgy. Banocboc, VCN' },
  { name: 'Sugod EC', fullName: 'Sugod EC', location: 'Brgy. Banocboc, VCN' },
  { name: 'Mormons', fullName: 'Mormons', location: 'Brgy. Calangcawan Sur, VCN' },
  { name: 'Marabe Church', fullName: 'Marabe Church', location: 'Brgy. Calangcawan Sur, VCN' },
  { name: 'Adorno Fathers', fullName: 'Adorno Fathers', location: 'Sto. Domingo, VCN' },
  { name: 'Mangcawayan EC', fullName: 'Mangcawayan EC', location: 'Mangcawayan Is., VCN' },
  { name: 'Our Lady of Fatima Shrine', fullName: 'Our Lady of Fatima Shrine', location: 'Mangcawayan Brgy. Calangawan Sur, VCN' },
  { name: 'Brgy. Hall (Aguit-it)', fullName: 'Brgy. Hall', location: 'Brgy. Aguit – it, VCN' },
];

const CENTERS = [
  'All Centers',
  ...OFFICIAL_EVAC_CENTERS.map((c) => c.name),
];

/* Each center has 5 rooms: Room 1 through Room 5 */
const OFFICIAL_ROOMS = ['Room 1', 'Room 2', 'Room 3', 'Room 4', 'Room 5'];

const createCenterRooms = () => {
  const map = {};
  OFFICIAL_EVAC_CENTERS.forEach((c) => {
    map[c.name] = [
      { id: 'Room 1', name: 'Room 1', capacity: 30, occupied: 12 },
      { id: 'Room 2', name: 'Room 2', capacity: 25, occupied: 8 },
      { id: 'Room 3', name: 'Room 3', capacity: 25, occupied: 0 },
      { id: 'Room 4', name: 'Room 4', capacity: 20, occupied: 15 },
      { id: 'Room 5', name: 'Room 5', capacity: 20, occupied: 5 },
    ];
  });
  return map;
};
const DEFAULT_CENTER_ROOMS = createCenterRooms();

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
            <span class="stub-room-badge">Room: ${h.room && h.room !== 'Unassigned' ? h.room : 'Unassigned'}</span>
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
        .stub-room-badge {
          display: inline-block;
          font-size: 8px;
          font-weight: 700;
          color: #166534;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 3px;
          padding: 1px 4px;
          margin-top: 2px;
          line-height: 1.1;
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
      .head-room{margin-top:6px;font-size:.82rem;font-weight:700;color:#166534;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:3px 10px;display:inline-block}
    </style></head><body>
    <div class="card">
      <h2>Relief Goods Stub</h2>
      <p class="sub">Vinzons Municipal Social Welfare</p>
      <p class="code">${household.stubCode}</p>
      <div class="qr">${qrSvg}</div>
      <div class="head-box">
        <div class="head-label">Household Head</div>
        <div class="head-name">${household.name}</div>
        <div class="head-room">Room: ${household.room && household.room !== 'Unassigned' ? household.room : 'Unassigned'}</div>
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
              <div style={{ marginTop: 8, fontSize: '0.84rem', fontWeight: 700, color: '#166534' }}>
                Room: {household.room && household.room !== 'Unassigned' ? household.room : 'Unassigned'}
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
   Filter Dropdown (legacy — replaced by HHFilterSheet)
   ────────────────────────────────────────────── */

/* All rooms across all centers for the room dropdown (Rooms 1 through 5) */
const ALL_ROOMS_BY_CENTER = {};
OFFICIAL_EVAC_CENTERS.forEach((c) => {
  ALL_ROOMS_BY_CENTER[c.name] = [...OFFICIAL_ROOMS];
});

/* ──────────────────────────────────────────────
   Center Selection Bottom Sheet (White Theme)
   ────────────────────────────────────────────── */
function CenterSelectSheet({ selected, centersList = [], onSelect, onClose }) {
  const [tempSelected, setTempSelected] = useState(selected || 'All Centers');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCenters = centersList
    .filter((c) => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      return (
        (c.displayName && c.displayName.toLowerCase().includes(q)) ||
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.location && c.location.toLowerCase().includes(q))
      );
    })
    .sort((a, b) =>
      (a.displayName || a.name || '').localeCompare(
        b.displayName || b.name || '',
        undefined,
        { sensitivity: 'base', numeric: true }
      )
    );

  const handleConfirm = () => {
    onSelect(tempSelected);
    onClose();
  };

  return (
    <div className="vin-center-picker-overlay" onClick={onClose}>
      <div className="vin-center-picker-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Drag handle */}
        <div className="vin-center-picker-handle" />

        {/* Search Bar */}
        <div className="vin-center-picker-search-box">
          <Search size={16} className="vin-center-picker-search-icon" />
          <input
            type="text"
            className="vin-center-picker-search-input"
            placeholder={`Search ${centersList.length} centers...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="vin-center-picker-clear-btn"
              onClick={() => setSearchQuery('')}
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Center List */}
        <div className="vin-center-picker-list">
          {/* All Centers Option */}
          {(!searchQuery || 'all centers'.includes(searchQuery.toLowerCase())) && (
            <div
              className={`vin-center-picker-item ${tempSelected === 'All Centers' ? 'selected' : ''}`}
              onClick={() => setTempSelected('All Centers')}
            >
              <div className="vin-center-picker-radio">
                <div className="vin-center-picker-radio-dot" />
              </div>
              <div className="vin-center-picker-info">
                <span className="vin-center-picker-name">All centers</span>
                <span className="vin-center-picker-loc">Show households from all evacuation centers</span>
              </div>
            </div>
          )}

          {filteredCenters.map((c) => {
            const centerVal = c.displayName || c.name;
            const isSelected = tempSelected === centerVal || tempSelected === c.name;
            return (
              <div
                key={c.id || centerVal}
                className={`vin-center-picker-item ${isSelected ? 'selected' : ''}`}
                onClick={() => setTempSelected(centerVal)}
              >
                <div className="vin-center-picker-radio">
                  <div className="vin-center-picker-radio-dot" />
                </div>
                <div className="vin-center-picker-info">
                  <span className="vin-center-picker-name">{centerVal}</span>
                  <span className="vin-center-picker-loc">{c.location}</span>
                </div>
              </div>
            );
          })}

          {filteredCenters.length === 0 && searchQuery && (
            <div className="vin-center-picker-empty">
              No evacuation centers found matching &ldquo;{searchQuery}&rdquo;
            </div>
          )}
        </div>

        {/* Select Button */}
        <button
          type="button"
          className="vin-center-picker-submit"
          onClick={handleConfirm}
        >
          Select center
        </button>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Room Selection Bottom Sheet (White Theme)
   ────────────────────────────────────────────── */
function RoomSelectSheet({ selected, centerName, centersList = [], onSelect, onClose }) {
  const [tempSelected, setTempSelected] = useState(selected || 'All Rooms');
  const [searchQuery, setSearchQuery] = useState('');

  const roomNames = getRoomsForCenter(centerName, centersList);
  const roomsList = roomNames
    .filter((r) => r !== 'All Rooms')
    .map((r) => ({
      id: r,
      name: r,
      description:
        centerName && centerName !== 'All Centers'
          ? `Designated room at ${centerName}`
          : 'Evacuation room',
    }));

  const filteredRooms = roomsList.filter((r) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q);
  });

  const handleConfirm = () => {
    onSelect(tempSelected);
    onClose();
  };

  return (
    <div className="vin-center-picker-overlay" onClick={onClose}>
      <div className="vin-center-picker-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Drag handle */}
        <div className="vin-center-picker-handle" />

        {/* Header subtitle showing center context */}
        <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600, padding: '0 4px' }}>
          {centerName && centerName !== 'All Centers' ? `Rooms at ${centerName}` : 'All evacuation rooms'}
        </div>

        {/* Search Bar */}
        <div className="vin-center-picker-search-box">
          <Search size={16} className="vin-center-picker-search-icon" />
          <input
            type="text"
            className="vin-center-picker-search-input"
            placeholder={`Search ${roomsList.length} rooms...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="vin-center-picker-clear-btn"
              onClick={() => setSearchQuery('')}
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Room List */}
        <div className="vin-center-picker-list">
          {/* All Rooms Option */}
          {(!searchQuery || 'all rooms'.includes(searchQuery.toLowerCase())) && (
            <div
              className={`vin-center-picker-item ${tempSelected === 'All Rooms' ? 'selected' : ''}`}
              onClick={() => setTempSelected('All Rooms')}
            >
              <div className="vin-center-picker-radio">
                <div className="vin-center-picker-radio-dot" />
              </div>
              <div className="vin-center-picker-info">
                <span className="vin-center-picker-name">All rooms</span>
                <span className="vin-center-picker-loc">Show households from all rooms</span>
              </div>
            </div>
          )}

          {filteredRooms.map((r) => {
            const isSelected = tempSelected === r.id;
            return (
              <div
                key={r.id}
                className={`vin-center-picker-item ${isSelected ? 'selected' : ''}`}
                onClick={() => setTempSelected(r.id)}
              >
                <div className="vin-center-picker-radio">
                  <div className="vin-center-picker-radio-dot" />
                </div>
                <div className="vin-center-picker-info">
                  <span className="vin-center-picker-name">{r.name}</span>
                  <span className="vin-center-picker-loc">{r.description}</span>
                </div>
              </div>
            );
          })}

          {filteredRooms.length === 0 && searchQuery && (
            <div className="vin-center-picker-empty">
              No rooms found matching &ldquo;{searchQuery}&rdquo;
            </div>
          )}
        </div>

        {/* Select Button */}
        <button
          type="button"
          className="vin-center-picker-submit"
          onClick={handleConfirm}
        >
          Select room
        </button>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Household Filter Sheet (bottom-sheet panel)
   ────────────────────────────────────────────── */
function HHFilterSheet({ filterStub, filterCenter, filterRoom, households, search, centersList = [], onApply, onClose }) {
  /* Local draft state — only committed when user taps "Show results" */
  const [draftStub, setDraftStub] = useState(filterStub);
  const [draftCenter, setDraftCenter] = useState(filterCenter);
  const [draftRoom, setDraftRoom] = useState(filterRoom);
  const [showCenterPicker, setShowCenterPicker] = useState(false);
  const [showRoomPicker, setShowRoomPicker] = useState(false);

  /* If selected center changes, reset room if needed */
  const handleCenterChange = (c) => {
    setDraftCenter(c);
  };

  const handleReset = () => {
    setDraftStub('All');
    setDraftCenter('All Centers');
    setDraftRoom('All Rooms');
  };

  const handleApply = () => {
    onApply(draftStub, draftCenter, draftRoom);
    onClose();
  };

  /* Live result count based on draft selections */
  const draftCount = households.filter((h) => {
    const matchSearch =
      h.name.toLowerCase().includes(search.toLowerCase()) ||
      h.room.toLowerCase().includes(search.toLowerCase()) ||
      (h.stubCode || '').toLowerCase().includes(search.toLowerCase());
    const matchStub =
      draftStub === 'All' ||
      (draftStub === 'Issued' && !!h.stubCode) ||
      (draftStub === 'Not Issued' && !h.stubCode);
    const matchCenter = isCenterMatch(h.center, draftCenter, centersList);
    const matchRoom =
      draftRoom === 'All Rooms' ||
      h.room === draftRoom ||
      `Room ${h.room}` === draftRoom;
    return matchSearch && matchStub && matchCenter && matchRoom;
  }).length;

  return (
    <div className="vin-mob-sheet-overlay" onClick={onClose}>
      <div className="vin-hh-filter-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Drag handle */}
        <div className="vin-hh-filter-sheet-handle" />

        {/* Header */}
        <div className="vin-hh-filter-sheet-header">
          <span className="vin-hh-filter-sheet-title">Filters</span>
          <button type="button" className="vin-hh-filter-sheet-reset" onClick={handleReset}>
            Reset
          </button>
        </div>

        {/* Status Pills */}
        <div className="vin-hh-filter-section">
          <div className="vin-hh-filter-section-label">Status</div>
          <div className="vin-hh-filter-pills-row">
            {[
              { id: 'All', label: 'All' },
              { id: 'Issued', label: 'Issued' },
              { id: 'Not Issued', label: 'Not issued' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`vin-hh-filter-pill ${draftStub === opt.id ? 'active' : ''}`}
                onClick={() => setDraftStub(opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Center Picker Field (Click to open Center Selection pop-up) */}
        <div className="vin-hh-filter-section">
          <div className="vin-hh-filter-section-label">Center</div>
          <div
            className="vin-hh-filter-select-wrap vin-hh-filter-tap-field"
            onClick={() => setShowCenterPicker(true)}
            role="button"
            tabIndex={0}
          >
            <div className="vin-hh-filter-select-display-txt">
              {draftCenter}
            </div>
            <ChevronDown size={16} className="vin-hh-filter-select-icon" />
          </div>
        </div>

        {/* Room Picker Field (Click to open Room Selection pop-up) */}
        <div className="vin-hh-filter-section">
          <div className="vin-hh-filter-section-label">Room</div>
          <div
            className="vin-hh-filter-select-wrap vin-hh-filter-tap-field"
            onClick={() => setShowRoomPicker(true)}
            role="button"
            tabIndex={0}
          >
            <div className="vin-hh-filter-select-display-txt">
              {draftRoom}
            </div>
            <ChevronDown size={16} className="vin-hh-filter-select-icon" />
          </div>
        </div>

        {/* Show Results Button */}
        <button type="button" className="vin-hh-filter-sheet-apply" onClick={handleApply}>
          Show {draftCount} result{draftCount !== 1 ? 's' : ''}
        </button>
      </div>

      {/* Pop-up Panel for selecting Center */}
      {showCenterPicker && (
        <CenterSelectSheet
          selected={draftCenter}
          centersList={centersList}
          onSelect={(c) => handleCenterChange(c)}
          onClose={() => setShowCenterPicker(false)}
        />
      )}

      {/* Pop-up Panel for selecting Room */}
      {showRoomPicker && (
        <RoomSelectSheet
          selected={draftRoom}
          centerName={draftCenter}
          centersList={centersList}
          onSelect={(r) => setDraftRoom(r)}
          onClose={() => setShowRoomPicker(false)}
        />
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────
   Room Assignment Sheet
   ────────────────────────────────────────────── */
function RoomAssignSheet({ household, centersList = [], centerRooms, onAssign, onClose }) {
  const [selectedCenter, setSelectedCenter] = useState(
    household.center && household.center !== 'All Centers'
      ? household.center
      : (centersList[0]?.displayName || 'LGU EC (Mangcaway)')
  );
  const [feedback, setFeedback] = useState(null);

  const matchedCenterObj = centersList.find(
    (c) => c.displayName === selectedCenter || c.name === selectedCenter
  );

  const rooms = (centerRooms && centerRooms[selectedCenter]) || matchedCenterObj?.rooms || [
    { id: 'Room 1', name: 'Room 1', capacity: 30, occupied: 0 },
    { id: 'Room 2', name: 'Room 2', capacity: 25, occupied: 0 },
    { id: 'Room 3', name: 'Room 3', capacity: 25, occupied: 0 },
    { id: 'Room 4', name: 'Room 4', capacity: 20, occupied: 0 },
    { id: 'Room 5', name: 'Room 5', capacity: 20, occupied: 0 },
  ];
  const neededSlots = household.familyCount || 1;

  // Auto-Assign Logic
  const handleAutoAssign = () => {
    // Look for first room that has enough space and isn't already the current room
    const candidate = rooms.find(
      (r) => r.id !== household.room && (r.capacity - r.occupied) >= neededSlots
    );

    if (!candidate) {
      if (rooms.some((r) => r.id === household.room && (r.capacity - r.occupied + neededSlots) >= neededSlots)) {
        setFeedback({
          type: 'info',
          message: `${household.name} is already assigned to Room ${household.room}, which has adequate capacity!`,
        });
        return;
      }
      setFeedback({
        type: 'error',
        message: `Validation Error: No room in "${selectedCenter}" has ${neededSlots} free slots! Please select another center.`,
      });
      return;
    }

    onAssign(household.id, candidate.id, selectedCenter, neededSlots);
    setFeedback({
      type: 'success',
      message: `Auto-assigned to Room ${candidate.id} (${candidate.name})!`,
    });
  };

  // Manual Assign Logic with validation
  const handleManualAssign = (room) => {
    const isCurrent = household.room === room.id && household.center === selectedCenter;
    if (isCurrent) {
      setFeedback({
        type: 'info',
        message: `${household.name} is already assigned to Room ${room.id}.`,
      });
      return;
    }

    const remaining = room.capacity - room.occupied;
    if (remaining < neededSlots) {
      setFeedback({
        type: 'error',
        message: `Validation Failed: Room ${room.id} only has ${remaining} slots available, but ${household.name} needs ${neededSlots} slots.`,
      });
      return;
    }

    onAssign(household.id, room.id, selectedCenter, neededSlots);
    setFeedback({
      type: 'success',
      message: `Successfully assigned ${household.name} to Room ${room.id}!`,
    });
  };

  return (
    <div className="vin-mob-sheet-overlay" onClick={onClose}>
      <div className="vin-mob-sheet-content vin-room-sheet-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="vin-mob-sheet-header">
          <div>
            <h2 className="vin-mob-sheet-title">Assign Room</h2>
            <p className="vin-room-sheet-desc">
              Allocate household to an available room with capacity validation
            </p>
          </div>
          <button type="button" className="vin-mob-sheet-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Household Info Card */}
        <div className="vin-room-hh-banner">
          <div className="vin-room-hh-left">
            <div className="vin-mob-avatar-circle" style={{ width: 40, height: 40, fontSize: '.9rem' }}>
              <User size={18} />
            </div>
            <div>
              <div className="vin-room-hh-name">{household.name}</div>
              <div className="vin-room-hh-sub">
                <span><strong>{neededSlots}</strong> family members</span>
                <span className="vin-mob-sub-dot">•</span>
                <span>Current: <strong className={household.room === 'Unassigned' || !household.room ? 'vin-txt-amber' : 'vin-txt-green'}>
                  {household.room && household.room !== 'Unassigned' ? `Room ${household.room}` : 'Unassigned'}
                </strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Center Selector */}
        <div className="vin-room-center-select-wrap">
          <label className="vin-mob-input-label">
            <Building size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: '-1px' }} />
            EVACUATION CENTER
          </label>
          <select
            className="vin-mob-select"
            value={selectedCenter}
            onChange={(e) => {
              setSelectedCenter(e.target.value);
              setFeedback(null);
            }}
          >
            {centersList
              .slice()
              .sort((a, b) =>
                (a.displayName || a.name || '').localeCompare(
                  b.displayName || b.name || '',
                  undefined,
                  { sensitivity: 'base', numeric: true }
                )
              )
              .map((c) => {
                const val = c.displayName || c.name;
                return (
                  <option key={c.id || val} value={val}>{val}</option>
                );
              })}
          </select>
        </div>

        {/* Feedback Alert Banner */}
        {feedback && (
          <div className={`vin-room-feedback-banner ${feedback.type}`}>
            {feedback.type === 'success' && <CheckCircle2 size={16} className="vin-room-feed-icon" />}
            {feedback.type === 'error' && <AlertTriangle size={16} className="vin-room-feed-icon" />}
            {feedback.type === 'info' && <CheckCircle2 size={16} className="vin-room-feed-icon" />}
            <span className="vin-room-feed-text">{feedback.message}</span>
          </div>
        )}

        {/* Room List Header with Auto-Assign Button placed at the right side */}
        <div className="vin-room-list-header">
          <span className="vin-room-list-title">ROOM CAPACITY & STATUS</span>
          <button
            type="button"
            className="vin-auto-assign-action-btn"
            onClick={handleAutoAssign}
          >
            Auto-Assign
          </button>
        </div>

        {/* Rooms Grid */}
        <div className="vin-room-cards-container">
          {rooms.map((room) => {
            const remaining = Math.max(0, room.capacity - room.occupied);
            const percentFilled = Math.min(100, Math.round((room.occupied / room.capacity) * 100));
            const isCurrent = household.room === room.id && household.center === selectedCenter;
            const hasCapacity = remaining >= neededSlots;
            const isFull = remaining <= 0;

            let cardCls = 'available';
            if (isCurrent) cardCls = 'current';
            else if (isFull) cardCls = 'full';
            else if (!hasCapacity) cardCls = 'insufficient';

            return (
              <div key={room.id} className={`vin-room-card-box ${cardCls}`}>
                <div className="vin-room-card-top-row">
                  <div>
                    <div className="vin-room-card-id">{room.id}</div>
                    <div className="vin-room-card-subname">{room.name}</div>
                  </div>

                  <span className={`vin-room-status-chip ${isCurrent ? 'current' : isFull ? 'full' : hasCapacity ? 'available' : 'low'}`}>
                    {isCurrent ? 'Current Room' : isFull ? 'Full (0 free)' : `${remaining} slots free`}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="vin-room-progress-track">
                  <div
                    className={`vin-room-progress-bar ${isFull ? 'full' : percentFilled > 75 ? 'warn' : 'ok'}`}
                    style={{ width: `${percentFilled}%` }}
                  />
                </div>

                {/* Capacity stats */}
                <div className="vin-room-card-stats-row">
                  <span>Occupancy: <strong>{room.occupied}/{room.capacity}</strong> ({percentFilled}%)</span>
                  <span>
                    {isCurrent ? (
                      <span className="vin-badge-green-txt">Assigned</span>
                    ) : hasCapacity ? (
                      <span className="vin-badge-green-txt">Fits {neededSlots} pers.</span>
                    ) : isFull ? (
                      <span className="vin-badge-red-txt">No space</span>
                    ) : (
                      <span className="vin-badge-amber-txt">Needs {neededSlots} slots</span>
                    )}
                  </span>
                </div>

                {/* Assign Button */}
                <button
                  type="button"
                  disabled={isCurrent || (!hasCapacity && !isCurrent)}
                  className={`vin-room-select-btn ${isCurrent ? 'btn-current' : hasCapacity ? 'btn-fit' : 'btn-disabled'}`}
                  onClick={() => handleManualAssign(room)}
                >
                  {isCurrent ? 'Current Room ✓' : hasCapacity ? `Assign Room ${room.id}` : 'Room Full / No Space'}
                </button>
              </div>
            );
          })}
        </div>

        {/* Done Button */}
        <button
          type="button"
          className="vin-btn-cancel"
          style={{ width: '100%', padding: '12px', borderRadius: '12px', fontSize: '.88rem', fontWeight: 700 }}
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════ */
export default function MobileHouseholds() {
  const { centers } = useEvacuationCenters();
  const [households, setHouseholds] = useState(SEED);
  const [search, setSearch] = useState('');
  const [filterStub, setFilterStub] = useState('All');         // 'All' | 'Issued' | 'Not Issued'
  const [filterCenter, setFilterCenter] = useState('All Centers');
  const [filterRoom, setFilterRoom] = useState('All Rooms');
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [openFilter, setOpenFilter] = useState(null);
  const [selectedHousehold, setSelectedHousehold] = useState(null);
  const [assigningHousehold, setAssigningHousehold] = useState(null);
  const [centerRooms, setCenterRooms] = useState(DEFAULT_CENTER_ROOMS);
  const [toastMsg, setToastMsg] = useState('');
  const [modalMode, setModalMode] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scanError, setScanError] = useState('');

  const [activeForm, setActiveForm] = useState({
    head: '', age: '', sex: 'Male',
    center: 'LGU EC (Mangcaway)',
    room: 'Room 1', category: 'None', members: [],
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
    const matchCenter = isCenterMatch(h.center, filterCenter, centers);
    const matchRoom =
      filterRoom === 'All Rooms' ||
      h.room === filterRoom ||
      `Room ${h.room}` === filterRoom;
    return matchSearch && matchStub && matchCenter && matchRoom;
  });

  const issuedCount = households.filter((h) => h.stubCode).length;
  const filteredIssued = filtered.filter((h) => h.stubCode);
  const activeFilters =
    (filterStub !== 'All' ? 1 : 0) +
    (filterCenter !== 'All Centers' ? 1 : 0) +
    (filterRoom !== 'All Rooms' ? 1 : 0);

  /* ── Pagination ── */
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterStub, filterCenter, filterRoom]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedHouseholds = filtered.slice(startIndex, startIndex + pageSize);

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

  /* ── Room assignment ── */
  const handleAssignRoom = (hhId, roomId, centerName, neededSlots) => {
    setHouseholds((prev) =>
      prev.map((h) => {
        if (h.id === hhId) {
          return { ...h, room: roomId, center: centerName };
        }
        return h;
      })
    );

    setCenterRooms((prev) => {
      const updated = { ...prev };
      const roomsForCenter = [...(updated[centerName] || [])];
      updated[centerName] = roomsForCenter.map((r) => {
        if (r.id === roomId) {
          return { ...r, occupied: Math.min(r.capacity, r.occupied + neededSlots) };
        }
        return r;
      });
      return updated;
    });

    setToastMsg(`Assigned to Room ${roomId}!`);
    setTimeout(() => setToastMsg(''), 3000);
  };

  /* Sync selected panel after issuing */
  useEffect(() => {
    if (selectedHousehold) {
      const fresh = households.find((h) => h.id === selectedHousehold.id);
      if (fresh) setSelectedHousehold(fresh);
    }
  }, [households]); // eslint-disable-line

  /* Sync assigning modal household after changes */
  useEffect(() => {
    if (assigningHousehold) {
      const fresh = households.find((h) => h.id === assigningHousehold.id);
      if (fresh) setAssigningHousehold(fresh);
    }
  }, [households]); // eslint-disable-line

  /* ── Register / Edit ── */
  const openRegister = () => {
    setActiveForm({ head: '', age: '', sex: 'Male', center: OFFICIAL_EVAC_CENTERS[0].name, room: 'Room 1', category: 'None', members: [] });
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
      {/* Floating Toast notification */}
      {toastMsg && (
        <div className="vin-room-toast">
          <CheckCircle2 size={16} />
          <span>{toastMsg}</span>
        </div>
      )}

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

      {/* Filter bar with left-aligned Filters button and active chips matching user design */}
      <div className="vin-hh-filter-bar">
        {/* Main Filters Button (opens bottom sheet panel) */}
        <button
          type="button"
          className={`vin-hh-filters-trigger ${activeFilters > 0 ? 'active' : ''}`}
          onClick={() => setShowFilterSheet(true)}
        >
          <SlidersHorizontal size={14} className="vin-hh-filters-trigger-icon" />
          <span>Filters</span>
          {activeFilters > 0 && (
            <span className="vin-hh-filters-trigger-badge">{activeFilters}</span>
          )}
        </button>

        {/* Active Filter Chips (like in Image 1) */}
        {filterCenter !== 'All Centers' && (
          <button
            type="button"
            className="vin-hh-active-chip"
            onClick={() => setFilterCenter('All Centers')}
            title="Remove center filter"
          >
            <span>{filterCenter.replace('Elementary School', '').replace('National High School', '').trim()}</span>
            <X size={13} className="vin-hh-chip-close" />
          </button>
        )}

        {filterRoom !== 'All Rooms' && (
          <button
            type="button"
            className="vin-hh-active-chip"
            onClick={() => setFilterRoom('All Rooms')}
            title="Remove room filter"
          >
            <span>{filterRoom.toLowerCase().startsWith('room') ? filterRoom : `Room ${filterRoom}`}</span>
            <X size={13} className="vin-hh-chip-close" />
          </button>
        )}

        {filterStub !== 'All' && (
          <button
            type="button"
            className="vin-hh-active-chip"
            onClick={() => setFilterStub('All')}
            title="Remove status filter"
          >
            <span>{filterStub}</span>
            <X size={13} className="vin-hh-chip-close" />
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

      {/* ── HOUSEHOLD DATA TABLE ── */}
      <div className="vin-mob-table-card">
        <div className="vin-mob-table-responsive">
          <table className="vin-mob-table">
            <thead>
              <tr>
                <th>HEAD OF FAMILY</th>
                <th style={{ textAlign: 'right' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {paginatedHouseholds.length === 0 ? (
                <tr>
                  <td colSpan={2} className="vin-mob-table-empty">
                    No households match the current filter.
                  </td>
                </tr>
              ) : (
                paginatedHouseholds.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedHousehold(item)}
                    className="vin-mob-table-row"
                  >
                    <td>
                      <div className="vin-mob-td-name">
                        <div className="vin-mob-avatar-circle vin-mob-table-avatar">
                          <User size={16} />
                        </div>
                        <div className="vin-mob-head-details">
                          <div className="vin-mob-head-name">{item.name}</div>
                          <div className="vin-mob-head-sub">
                            {item.room && item.room !== 'Unassigned' ? (
                              <span>{item.room.startsWith('Room') ? item.room : `Room ${item.room}`}</span>
                            ) : (
                              <span className="vin-mob-unassigned-tag">No Room</span>
                            )}
                            <span className="vin-mob-sub-dot">•</span>
                            <span>{item.center.split(' ').slice(0, 2).join(' ')}</span>
                            <span className="vin-mob-sub-dot">•</span>
                            <span>{item.familyCount} pers.</span>
                          </div>
                          <div className="vin-mob-head-badges">
                            <span className={item.stubCode ? 'vin-hh-badge-issued' : 'vin-hh-badge-notissued'}>
                              <img
                                src={item.stubCode ? checkIcon : removeIcon}
                                alt=""
                                className="vin-badge-img-icon"
                              />
                              <span>{item.stubCode ? 'Issued' : 'Not Issued'}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>
                      <div className="vin-mob-table-actions">
                        <button
                          type="button"
                          className="vin-mob-row-btn assign"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAssigningHousehold(item);
                          }}
                          title="Assign household to room"
                        >
                          Assign
                        </button>
                        <button
                          type="button"
                          className="vin-mob-row-edit"
                          onClick={(e) => openEdit(item, e)}
                          aria-label={`Edit ${item.name}`}
                        >
                          <Edit size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── STICKY PAGINATION CONTROLS ── */}
        {filtered.length > 0 && (
          <div className="vin-mob-pagination">
            <span className="vin-mob-pagination-info">
              Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
            </span>
            <div className="vin-mob-pagination-btns">
              <button
                type="button"
                className="vin-mob-page-btn vin-mob-page-nav"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                aria-label="Previous page"
              >
                <ChevronLeft size={16} /> Prev
              </button>
              <button
                type="button"
                className="vin-mob-page-btn vin-mob-page-nav"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Next page"
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
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

      {/* ── FILTER SHEET MODAL (matching user image 2) ── */}
      {showFilterSheet && (
        <HHFilterSheet
          filterStub={filterStub}
          filterCenter={filterCenter}
          filterRoom={filterRoom}
          households={households}
          search={search}
          centersList={centers}
          onApply={(newStub, newCenter, newRoom) => {
            setFilterStub(newStub);
            setFilterCenter(newCenter);
            setFilterRoom(newRoom);
          }}
          onClose={() => setShowFilterSheet(false)}
        />
      )}

      {/* ── ROOM ASSIGNMENT SHEET ── */}
      {assigningHousehold && (
        <RoomAssignSheet
          household={assigningHousehold}
          centersList={centers}
          centerRooms={centerRooms}
          onAssign={handleAssignRoom}
          onClose={() => setAssigningHousehold(null)}
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
                    {centers
                      .slice()
                      .sort((a, b) =>
                        (a.displayName || a.name || '').localeCompare(
                          b.displayName || b.name || '',
                          undefined,
                          { sensitivity: 'base', numeric: true }
                        )
                      )
                      .map((c) => {
                        const val = c.displayName || c.name;
                        return (
                          <option key={c.id || val} value={val}>{val}</option>
                        );
                      })}
                  </select>
                </div>
                <div className="vin-mob-input-group">
                  <label className="vin-mob-input-label">ROOM</label>
                  <select className="vin-mob-select" value={activeForm.room}
                    onChange={(e) => setActiveForm({ ...activeForm, room: e.target.value })}>
                    {getRoomsForCenter(activeForm.center, centers).filter((r) => r !== 'All Rooms').map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                    <option value="Unassigned">Unassigned</option>
                  </select>
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
