import { useState, useEffect, useMemo } from 'react';
import {
  Plus, User, Edit, X, Trash2,
  AlertTriangle, Ticket, Printer, Building,
  CheckCircle2, Clock, Users, ChevronLeft, ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import checkIcon from '../../assets/check.png';
import removeIcon from '../../assets/remove.png';
import './AdminFeatures.css';
import './AdminHousehold.css';
import {
  useEvacuationCenters,
  isCenterMatch,
} from '../../lib/evacuationCenters.js';
import { AdminFilterModal, AdminFilterBar } from '../../components/AdminFilterModal.jsx';
import {
  CenterSelectSheet,
  RoomSelectSheet,
  CategorySelectSheet,
} from '../../components/CenterSelectSheet.jsx';

/* ──────────────────────────────────────────────
   Seed Data (synced with mobile structure)
   ────────────────────────────────────────────── */
const INITIAL_HOUSEHOLDS = [
  {
    id: 'HH-001',
    name: 'Antonio Magno',
    age: 45,
    sex: 'Male',
    category: 'None',
    center: 'Vinzons Central Elementary School',
    room: 'C-1',
    familyCount: 4,
    members: [
      { name: 'Luz Magno', age: 58, sex: 'Female', category: 'Senior' },
      { name: 'Pablo Magno', age: 20, sex: 'Male', category: 'None' },
      { name: 'Sofia Magno', age: 17, sex: 'Female', category: 'None' },
    ],
    stubCode: 'STB-001001',
    stubIssued: false,
  },
  {
    id: 'HH-002',
    name: 'Rosa Santos',
    age: 40,
    sex: 'Female',
    category: 'None',
    center: 'Vinzons Central Elementary School',
    room: 'A-2',
    familyCount: 4,
    members: [
      { name: 'Pedro Santos', age: 42, sex: 'Male', category: 'None' },
      { name: 'Maya Santos', age: 16, sex: 'Female', category: 'None' },
      { name: 'Leo Santos', age: 12, sex: 'Male', category: 'None' },
    ],
    stubCode: 'STB-001002',
    stubIssued: true,
  },
  {
    id: 'HH-003',
    name: 'Patricia Cruz',
    age: 35,
    sex: 'Female',
    category: 'Pregnant/Lactating',
    center: 'Vinzons Gymnasium',
    room: 'B-1',
    familyCount: 3,
    members: [
      { name: 'Mark Cruz', age: 38, sex: 'Male', category: 'None' },
      { name: 'Lina Cruz', age: 10, sex: 'Female', category: 'None' },
    ],
    stubCode: 'STB-003014',
    stubIssued: false,
  },
  {
    id: 'HH-004',
    name: 'Juan Dela Cruz',
    age: 50,
    sex: 'Male',
    category: 'PWD',
    center: 'Calaguas National High School',
    room: 'A-1',
    familyCount: 3,
    members: [
      { name: 'Maria Dela Cruz', age: 48, sex: 'Female', category: 'None' },
      { name: 'John Dela Cruz', age: 22, sex: 'Male', category: 'None' },
    ],
    stubCode: 'STB-004021',
    stubIssued: true,
  },
  {
    id: 'HH-005',
    name: 'Elena Bautista',
    age: 42,
    sex: 'Female',
    category: 'Solo Parent',
    center: 'Vinzons Central Elementary School',
    room: 'Room 103',
    familyCount: 3,
    members: [
      { name: 'Carlos Bautista', age: 14, sex: 'Male', category: 'None' },
      { name: 'Jenny Bautista', age: 9, sex: 'Female', category: 'None' },
    ],
    stubCode: 'STB-005018',
    stubIssued: false,
  },
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
      const qrEl = document.getElementById(`admin-print-qr-${h.id}`);
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
  const qrEl = document.getElementById(`admin-print-qr-${household.id}`);
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
   Stub Issuance Modal
   ────────────────────────────────────────────── */
function StubIssuanceModal({ household, households, onIssue, onClose }) {
  const duplicates = household.members
    .map((m) => ({ member: m.name, holder: findDuplicateHolder(households, household.id, m.name) }))
    .filter((d) => d.holder);

  const alreadyIssued = !!household.stubIssued;

  return (
    <div className="vin-admin-modal-overlay" onClick={onClose}>
      <div className="vin-admin-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="vin-admin-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Ticket size={22} color="#15803d" />
            <div>
              <h2 className="vin-admin-modal-title">Relief Stub Issuance & Verification</h2>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Household ID: {household.id}</span>
            </div>
          </div>
          <button type="button" className="vin-admin-modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="vin-admin-modal-body">
          {/* Household profile overview */}
          <div className="vin-admin-stub-profile-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="vin-admin-hh-avatar-wrap" style={{ width: 48, height: 48 }}>
                  <User size={24} color="#0f172a" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>{household.name}</h3>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Household Head • {household.familyCount} Members</span>
                </div>
              </div>
              <span className={alreadyIssued ? 'vin-admin-hh-badge-issued' : 'vin-admin-hh-badge-notissued'}>
                <img
                  src={alreadyIssued ? checkIcon : removeIcon}
                  alt=""
                  className="vin-badge-img-icon"
                />
                <span>{alreadyIssued ? 'Issued' : 'Not Issued'}</span>
              </span>
            </div>

            <div className="vin-admin-stub-meta-grid" style={{ marginTop: 6 }}>
              <div className="vin-admin-stub-meta-item">
                <span className="vin-admin-stub-meta-label">ROOM</span>
                <span className="vin-admin-stub-meta-val">{household.room}</span>
              </div>
              <div className="vin-admin-stub-meta-item">
                <span className="vin-admin-stub-meta-label">EVACUATION CENTER</span>
                <span className="vin-admin-stub-meta-val" style={{ fontSize: '0.82rem' }}>{household.center}</span>
              </div>
              <div className="vin-admin-stub-meta-item">
                <span className="vin-admin-stub-meta-label">SPECIAL CATEGORY</span>
                <span className="vin-admin-stub-meta-val">{household.category || 'None'}</span>
              </div>
              <div className="vin-admin-stub-meta-item">
                <span className="vin-admin-stub-meta-label">AGE / SEX</span>
                <span className="vin-admin-stub-meta-val">{household.age || 40} • {household.sex || 'Male'}</span>
              </div>
            </div>
          </div>

          {/* Family members section */}
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>
              FAMILY MEMBERS REGISTERED
            </div>
            <div className="vin-admin-members-list">
              {household.members && household.members.length > 0 ? (
                household.members.map((m, idx) => (
                  <div key={idx} className="vin-admin-member-pill">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <User size={15} color="#64748b" />
                      {m.name}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      {m.age} yrs • {m.sex} • {m.category}
                    </span>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: '0.84rem', color: '#94a3b8', fontStyle: 'italic', padding: '6px 0' }}>
                  No additional family members registered.
                </div>
              )}
            </div>
          </div>

          {/* Duplicate Claim Warning Banner */}
          {duplicates.length > 0 && (
            <div className="vin-admin-dup-banner">
              <AlertTriangle size={18} />
              <div>
                {duplicates.map((d, i) => (
                  <div key={i}>
                    <strong>⚠️ Duplicate Warning:</strong> Member <strong>{d.member}</strong> is already listed under issued stub{' '}
                    <strong>{d.holder.stubCode}</strong> (Household: {d.holder.name}, Room: {d.holder.room}).
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* QR Code + Stub Code block — shown for ALL households (issued or not) */}
          <div className="vin-admin-issued-block">
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: alreadyIssued ? '#166534' : '#92400e', textTransform: 'uppercase' }}>
                {alreadyIssued ? 'ACTIVE CLAIM STUB CODE' : 'HOUSEHOLD QR CODE (NOT YET ISSUED)'}
              </span>
              <div className="vin-admin-issued-code" style={{ color: alreadyIssued ? '#166534' : '#b45309' }}>
                {household.stubCode}
              </div>
            </div>

            <div style={{
              background: '#ffffff',
              padding: 12,
              borderRadius: 12,
              border: `1px solid ${alreadyIssued ? '#bbf7d0' : '#fde68a'}`,
            }}>
              <QRCodeSVG
                value={household.stubCode}
                size={140}
                level="M"
                bgColor="#ffffff"
                fgColor={alreadyIssued ? '#166534' : '#92400e'}
              />
            </div>

            <button
              type="button"
              className="vin-admin-print-stub-btn"
              onClick={() => printStub(household)}
            >
              <Printer size={16} /> Print This Stub
            </button>
          </div>

          {/* Big action button */}
          <button
            type="button"
            className="vin-admin-big-issue-btn"
            disabled={alreadyIssued}
            onClick={() => !alreadyIssued && onIssue(household.id)}
          >
            <Ticket size={20} />
            {alreadyIssued ? 'Relief Stub Already Issued' : 'Issue Relief Stub Now'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   MAIN ADMIN HOUSEHOLD COMPONENT
   ────────────────────────────────────────────── */
export default function Household() {
  const { centers } = useEvacuationCenters();
  const [households, setHouseholds] = useState(INITIAL_HOUSEHOLDS);
  const [filterStub, setFilterStub] = useState('All');         // 'All' | 'Issued' | 'Not Issued'
  const [filterCenter, setFilterCenter] = useState('All Centers');
  const [filterRoom, setFilterRoom] = useState('All Rooms');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const [selectedHousehold, setSelectedHousehold] = useState(null);
  const [modalMode, setModalMode] = useState(null);            // 'register' | 'edit' | null

  /* ── Form pickers for register/edit ── */
  const [showFormCenterPicker, setShowFormCenterPicker] = useState(false);
  const [showFormRoomPicker, setShowFormRoomPicker] = useState(false);
  const [showFormCategoryPicker, setShowFormCategoryPicker] = useState(null); // null | { target: 'head' } | { target: 'member', index: number }

  const [activeForm, setActiveForm] = useState({
    id: '',
    head: '',
    age: '',
    sex: 'Male',
    center: 'LGU EC (Mangcaway)',
    room: 'Room 1',
    category: 'None',
    members: [],
  });

  /* ── Filter logic ── */
  const filtered = households.filter((h) => {
    const matchStub =
      filterStub === 'All' ||
      (filterStub === 'Issued' && h.stubIssued) ||
      (filterStub === 'Not Issued' && !h.stubIssued);
    const matchCenter =
      filterCenter === 'All Centers' ||
      h.center === filterCenter ||
      isCenterMatch(h.center, filterCenter, centers);
    const matchRoom =
      filterRoom === 'All Rooms' ||
      h.room === filterRoom ||
      (h.room && h.room.toLowerCase().includes(filterRoom.toLowerCase())) ||
      (filterRoom.startsWith('Room') && h.room && h.room.includes(filterRoom.replace('Room', '').trim()));
    return matchStub && matchCenter && matchRoom;
  });

  const totalCount = households.length;
  const issuedCount = households.filter((h) => h.stubIssued).length;
  const pendingCount = totalCount - issuedCount;
  const filteredIssued = filtered.filter((h) => h.stubIssued);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedHouseholds = filtered.slice(startIndex, startIndex + pageSize);

  /* ── Issue stub ── */
  const issueStub = (hhId) => {
    setHouseholds((prev) =>
      prev.map((h) => (h.id === hhId ? { ...h, stubIssued: true } : h))
    );
  };

  /* Sync modal on state changes */
  useEffect(() => {
    if (selectedHousehold) {
      const fresh = households.find((h) => h.id === selectedHousehold.id);
      if (fresh) setSelectedHousehold(fresh);
    }
  }, [households]); // eslint-disable-line

  /* ── Register / Edit Form Handlers ── */
  const openRegister = () => {
    setActiveForm({
      id: `HH-00${households.length + 1}`,
      head: '',
      age: '',
      sex: 'Male',
      center: 'Vinzons Central Elementary School',
      room: 'A-1',
      category: 'None',
      members: [],
    });
    setModalMode('register');
  };

  const openEdit = (item, e) => {
    e.stopPropagation();
    setActiveForm({
      id: item.id,
      head: item.name,
      age: item.age || 40,
      sex: item.sex || 'Male',
      center: item.center || 'Vinzons Central Elementary School',
      room: item.room || 'A-1',
      category: item.category || 'None',
      members: item.members || [],
    });
    setModalMode('edit');
  };

  const handleSaveHousehold = (e) => {
    e.preventDefault();
    if (!activeForm.head.trim()) return;

    if (modalMode === 'register') {
      const newH = {
        id: activeForm.id || `HH-${String(Date.now()).slice(-4)}`,
        name: activeForm.head,
        age: Number(activeForm.age) || 35,
        sex: activeForm.sex,
        center: activeForm.center,
        room: activeForm.room,
        category: activeForm.category,
        familyCount: 1 + activeForm.members.length,
        members: activeForm.members,
        stubCode: genStubCode(),
        stubIssued: false,
      };
      setHouseholds([newH, ...households]);
    } else if (modalMode === 'edit') {
      setHouseholds((prev) =>
        prev.map((h) =>
          h.id === activeForm.id
            ? {
                ...h,
                name: activeForm.head,
                age: Number(activeForm.age) || h.age,
                sex: activeForm.sex,
                center: activeForm.center,
                room: activeForm.room,
                category: activeForm.category,
                familyCount: 1 + activeForm.members.length,
                members: activeForm.members,
              }
            : h
        )
      );
    }
    setModalMode(null);
  };

  const addMember = () => {
    setActiveForm((p) => ({
      ...p,
      members: [...p.members, { name: '', age: '', sex: 'Female', category: 'None' }],
    }));
  };

  const removeMember = (idx) => {
    setActiveForm((p) => ({
      ...p,
      members: p.members.filter((_, i) => i !== idx),
    }));
  };

  return (
    <div className="vin-feature-page">
      {/* ── Page Header ── */}
      <header className="vin-admin-hh-header">
        <div className="vin-admin-hh-title-group">
          <span className="vin-admin-hh-eyebrow">REGISTRY &amp; RELIEF ISSUANCE</span>
          <h1 className="vin-admin-hh-title">Household &amp; Stub Issuance</h1>
          <p className="vin-admin-hh-desc">
            Manage family registry records, verify stub issuance statuses, and issue official relief goods claim passes.
          </p>
        </div>

        <div className="vin-admin-hh-header-actions">
          <button
            type="button"
            className="vin-admin-btn-register"
            onClick={openRegister}
          >
            <Plus size={18} />
            <span>Register Household</span>
          </button>
        </div>
      </header>

      {/* ── Metric Summary Cards ── */}
      <div className="vin-admin-hh-stats">
        <div className="vin-admin-hh-stat-card">
          <div className="vin-admin-hh-stat-info">
            <span className="vin-admin-hh-stat-label">Total Households</span>
            <span className="vin-admin-hh-stat-value">{totalCount}</span>
          </div>
          <div className="vin-admin-hh-stat-icon total">
            <Users size={22} />
          </div>
        </div>

        <div className="vin-admin-hh-stat-card">
          <div className="vin-admin-hh-stat-info">
            <span className="vin-admin-hh-stat-label">Stubs Issued</span>
            <span className="vin-admin-hh-stat-value" style={{ color: '#166534' }}>{issuedCount}</span>
          </div>
          <div className="vin-admin-hh-stat-icon issued">
            <CheckCircle2 size={22} />
          </div>
        </div>

        <div className="vin-admin-hh-stat-card">
          <div className="vin-admin-hh-stat-info">
            <span className="vin-admin-hh-stat-label">Pending Stubs</span>
            <span className="vin-admin-hh-stat-value" style={{ color: '#dc2626' }}>{pendingCount}</span>
          </div>
          <div className="vin-admin-hh-stat-icon pending">
            <Clock size={22} />
          </div>
        </div>
      </div>

      {/* ── Toolbar & Filter Controls (Mobile-style Filter Button & Active Chips) ── */}
      <div className="vin-admin-hh-toolbar-card">
        <div className="vin-admin-hh-toolbar-top">
          <AdminFilterBar
            hasActiveFilters={filterStub !== 'All' || filterCenter !== 'All Centers' || filterRoom !== 'All Rooms'}
            onOpenFilters={() => setShowFilterModal(true)}
            activeChips={[
              filterCenter !== 'All Centers' && {
                key: 'center',
                label: 'Center',
                value: filterCenter,
                onRemove: () => {
                  setFilterCenter('All Centers');
                  setCurrentPage(1);
                },
              },
              filterRoom !== 'All Rooms' && {
                key: 'room',
                label: 'Room',
                value: filterRoom,
                onRemove: () => {
                  setFilterRoom('All Rooms');
                  setCurrentPage(1);
                },
              },
              filterStub !== 'All' && {
                key: 'stub',
                label: 'Status',
                value: filterStub,
                onRemove: () => {
                  setFilterStub('All');
                  setCurrentPage(1);
                },
              },
            ]}
          >
            {/* Print All Button */}
            <button
              type="button"
              className="vin-admin-print-all-btn"
              onClick={() => printAllStubs(filteredIssued)}
              disabled={filteredIssued.length === 0}
            >
              <Printer size={16} />
              <span>Print All ({filteredIssued.length})</span>
            </button>
          </AdminFilterBar>
        </div>

        {/* Legend row */}
        <div className="vin-admin-hh-legend-row">
          <div className="vin-admin-hh-legend-items">
            <span className="vin-admin-hh-legend-item">
              <span className="vin-admin-filter-dot issued" /> Issued (Relief Stub Granted)
            </span>
            <span className="vin-admin-hh-legend-item">
              <span className="vin-admin-filter-dot notissued" /> Not Issued (Pending Claim Pass)
            </span>
          </div>

          <span>
            Showing <strong>{filtered.length}</strong> of <strong>{totalCount}</strong> households
          </span>
        </div>
      </div>

      {/* ── HOUSEHOLD DATA TABLE ── */}
      <div className="vin-feature-content-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="vin-feature-table" style={{ margin: 0 }}>
          <thead>
            <tr>
              <th>HEAD OF FAMILY</th>
              <th>CENTER</th>
              <th>ROOM</th>
              <th>MEMBERS</th>
              <th>STUB CODE</th>
              <th>STUB STATUS</th>
              <th style={{ textAlign: 'right' }}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {paginatedHouseholds.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  No households match the current search &amp; filter criteria.
                </td>
              </tr>
            ) : (
              paginatedHouseholds.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => setSelectedHousehold(item)}
                  style={{ cursor: 'pointer' }}
                >
                  <td style={{ fontWeight: 700 }}>{item.name}</td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                      <Building size={14} color="#15803d" />
                      {item.center}
                    </span>
                  </td>
                  <td>{item.room}</td>
                  <td>{item.familyCount} persons</td>
                  <td>
                    {item.stubCode ? (
                      <strong style={{ color: '#166534', letterSpacing: 0.5 }}>{item.stubCode}</strong>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>--</span>
                    )}
                  </td>
                  <td>
                    <span className={item.stubIssued ? 'vin-admin-hh-badge-issued' : 'vin-admin-hh-badge-notissued'}>
                      <img
                        src={item.stubIssued ? checkIcon : removeIcon}
                        alt=""
                        className="vin-badge-img-icon"
                      />
                      <span>{item.stubIssued ? 'Issued' : 'Not Issued'}</span>
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className={`vin-admin-tile-action-btn ${
                          item.stubIssued ? 'vin-admin-tile-action-btn--view' : 'vin-admin-tile-action-btn--issue'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedHousehold(item);
                        }}
                      >
                        {item.stubIssued ? 'View QR' : 'Issue Stub'} →
                      </button>
                      <button
                        type="button"
                        className="vin-admin-tile-edit-btn"
                        onClick={(e) => openEdit(item, e)}
                        title={`Edit ${item.name}`}
                      >
                        <Edit size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination Controls ── */}
      {filtered.length > 0 && (
        <div className="vin-admin-pagination">
          <span className="vin-pagination-info">
            Showing <strong>{startIndex + 1}</strong>–<strong>{Math.min(startIndex + pageSize, filtered.length)}</strong> of <strong>{filtered.length}</strong> households
          </span>

          <div className="vin-pagination-btns">
            <button
              type="button"
              className="vin-page-nav-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
              <span>Previous</span>
            </button>

            <div className="vin-page-numbers">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  className={`vin-page-num-btn ${pageNum === currentPage ? 'active' : ''}`}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="vin-page-nav-btn"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Next page"
            >
              <span>Next</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── Stub Issuance Modal ── */}
      {selectedHousehold && (
        <StubIssuanceModal
          household={selectedHousehold}
          households={households}
          onIssue={issueStub}
          onClose={() => setSelectedHousehold(null)}
        />
      )}

      {/* ── Register / Edit Household Modal ── */}
      {modalMode && (
        <div className="vin-admin-modal-overlay" onClick={() => setModalMode(null)}>
          <div className="vin-admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="vin-admin-modal-header">
              <h2 className="vin-admin-modal-title">
                {modalMode === 'register' ? 'Register New Household' : 'Edit Household Profile'}
              </h2>
              <button
                type="button"
                className="vin-admin-modal-close-btn"
                onClick={() => setModalMode(null)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveHousehold} className="vin-admin-modal-body">
              <div className="vin-admin-form-group">
                <label className="vin-admin-form-label">HOUSEHOLD HEAD NAME</label>
                <input
                  type="text"
                  placeholder="e.g. Antonio Magno"
                  className="vin-admin-form-input"
                  value={activeForm.head}
                  onChange={(e) => setActiveForm({ ...activeForm, head: e.target.value })}
                  required
                />
              </div>

              <div className="vin-admin-form-row">
                <div className="vin-admin-form-group">
                  <label className="vin-admin-form-label">AGE</label>
                  <input
                    type="number"
                    placeholder="45"
                    className="vin-admin-form-input"
                    value={activeForm.age}
                    onChange={(e) => setActiveForm({ ...activeForm, age: e.target.value })}
                  />
                </div>
                <div className="vin-admin-form-group">
                  <label className="vin-admin-form-label">SEX</label>
                  <select
                    className="vin-admin-form-select"
                    value={activeForm.sex}
                    onChange={(e) => setActiveForm({ ...activeForm, sex: e.target.value })}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              <div className="vin-admin-form-row">
                <div className="vin-admin-form-group">
                  <label className="vin-admin-form-label">EVACUATION CENTER</label>
                  <div
                    className="vin-hh-filter-tap-field"
                    onClick={() => setShowFormCenterPicker(true)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setShowFormCenterPicker(true)}
                  >
                    <div className="vin-hh-filter-select-display-txt">{activeForm.center}</div>
                    <ChevronDown size={16} className="vin-hh-filter-select-icon" />
                  </div>
                </div>
                <div className="vin-admin-form-group">
                  <label className="vin-admin-form-label">ROOM NUMBER / AREA</label>
                  <div
                    className="vin-hh-filter-tap-field"
                    onClick={() => setShowFormRoomPicker(true)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setShowFormRoomPicker(true)}
                  >
                    <div className="vin-hh-filter-select-display-txt">{activeForm.room || 'Room 1'}</div>
                    <ChevronDown size={16} className="vin-hh-filter-select-icon" />
                  </div>
                </div>
              </div>

              <div className="vin-admin-form-group">
                <label className="vin-admin-form-label">SPECIAL CATEGORY</label>
                <div
                  className="vin-hh-filter-tap-field"
                  onClick={() => setShowFormCategoryPicker({ target: 'head' })}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setShowFormCategoryPicker({ target: 'head' })}
                >
                  <div className="vin-hh-filter-select-display-txt">{activeForm.category || 'None'}</div>
                  <ChevronDown size={16} className="vin-hh-filter-select-icon" />
                </div>
              </div>

              {/* Family members section */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span className="vin-admin-form-label">FAMILY MEMBERS</span>
                  <button
                    type="button"
                    onClick={addMember}
                    className="vin-admin-btn-register"
                    style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: 8 }}
                  >
                    <Plus size={14} /> Add Member
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {activeForm.members.map((m, idx) => (
                    <div key={idx} className="vin-admin-member-form-box">
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                          type="text"
                          placeholder="Member Name"
                          className="vin-admin-form-input"
                          style={{ flex: 1, padding: '8px 12px' }}
                          value={m.name}
                          onChange={(e) => {
                            const updated = [...activeForm.members];
                            updated[idx].name = e.target.value;
                            setActiveForm({ ...activeForm, members: updated });
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => removeMember(idx)}
                          style={{
                            background: '#fee2e2',
                            border: '1px solid #fca5a5',
                            borderRadius: 8,
                            padding: '6px 8px',
                            color: '#dc2626',
                            cursor: 'pointer',
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: 8 }}>
                        <input
                          type="number"
                          placeholder="Age"
                          className="vin-admin-form-input"
                          style={{ padding: '6px 10px' }}
                          value={m.age}
                          onChange={(e) => {
                            const updated = [...activeForm.members];
                            updated[idx].age = e.target.value;
                            setActiveForm({ ...activeForm, members: updated });
                          }}
                        />
                        <select
                          className="vin-admin-form-select"
                          style={{ padding: '6px 10px' }}
                          value={m.sex}
                          onChange={(e) => {
                            const updated = [...activeForm.members];
                            updated[idx].sex = e.target.value;
                            setActiveForm({ ...activeForm, members: updated });
                          }}
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                        <div
                          className="vin-admin-form-select"
                          style={{
                            padding: '6px 10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            background: '#ffffff',
                            minHeight: 38,
                            boxSizing: 'border-box',
                          }}
                          onClick={() => setShowFormCategoryPicker({ target: 'member', index: idx })}
                          role="button"
                          tabIndex={0}
                        >
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.82rem' }}>
                            {m.category || 'None'}
                          </span>
                          <ChevronDown size={14} style={{ color: '#64748b', flexShrink: 0 }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button type="submit" className="vin-admin-modal-submit-btn">
                {modalMode === 'register' ? 'Register Household' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Mobile-Style Filter Modal ── */}
      <AdminFilterModal
        isOpen={showFilterModal}
        title="Filter Households"
        statusOptions={[
          { id: 'All', label: 'All Status' },
          { id: 'Issued', label: 'Issued (Green)' },
          { id: 'Not Issued', label: 'Not Issued (Red)' },
        ]}
        statusValue={filterStub}
        centerValue={filterCenter}
        roomValue={filterRoom}
        centersList={centers}
        resultCount={filtered.length}
        onApply={({ status, center, room }) => {
          setFilterStub(status);
          setFilterCenter(center);
          setFilterRoom(room);
          setCurrentPage(1);
        }}
        onClose={() => setShowFilterModal(false)}
      />

      {/* ── ADMIN FORM CENTER PICKER ── */}
      {showFormCenterPicker && (
        <CenterSelectSheet
          selected={activeForm.center}
          centersList={centers}
          showAllOption={false}
          allCentersSub="Select the evacuation center for this household"
          onSelect={(c) => {
            setActiveForm((prev) => ({ ...prev, center: c, room: 'Room 1' }));
            setShowFormCenterPicker(false);
          }}
          onClose={() => setShowFormCenterPicker(false)}
        />
      )}

      {/* ── ADMIN FORM ROOM PICKER ── */}
      {showFormRoomPicker && (
        <RoomSelectSheet
          selected={activeForm.room}
          centerName={activeForm.center}
          centersList={centers}
          showAllOption={false}
          includeUnassigned={true}
          allRoomsSub="Select the room at this evacuation center"
          onSelect={(r) => {
            setActiveForm((prev) => ({ ...prev, room: r }));
            setShowFormRoomPicker(false);
          }}
          onClose={() => setShowFormRoomPicker(false)}
        />
      )}

      {/* ── ADMIN FORM CATEGORY PICKER ── */}
      {showFormCategoryPicker && (
        <CategorySelectSheet
          selected={
            showFormCategoryPicker.target === 'member'
              ? activeForm.members[showFormCategoryPicker.index]?.category || 'None'
              : activeForm.category || 'None'
          }
          title={
            showFormCategoryPicker.target === 'member'
              ? `Category for ${activeForm.members[showFormCategoryPicker.index]?.name || `Member #${showFormCategoryPicker.index + 1}`}`
              : 'Household Head Category'
          }
          onSelect={(cat) => {
            if (showFormCategoryPicker.target === 'member') {
              const u = [...activeForm.members];
              u[showFormCategoryPicker.index].category = cat;
              setActiveForm((prev) => ({ ...prev, members: u }));
            } else {
              setActiveForm((prev) => ({ ...prev, category: cat }));
            }
            setShowFormCategoryPicker(null);
          }}
          onClose={() => setShowFormCategoryPicker(null)}
        />
      )}

      {/* ── HIDDEN QR SVGS FOR PRINTING ── */}
      <div
        style={{ position: 'fixed', left: '-9999px', top: '-9999px', pointerEvents: 'none', opacity: 0 }}
        aria-hidden="true"
      >
        {households
          .filter((h) => h.stubCode)
          .map((h) => (
            <QRCodeSVG
              key={h.id}
              id={`admin-print-qr-${h.id}`}
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
