import { useState, useEffect, useMemo, useContext } from 'react';
import {
  Plus, User, Edit, X, Trash2,
  AlertTriangle, Ticket, Printer, Building,
  CheckCircle2, Clock, Users, ChevronLeft, ChevronRight,
  ChevronDown, LogOut, FileSpreadsheet,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import checkIcon from '../../assets/check.png';
import removeIcon from '../../assets/remove.png';
import './AdminFeatures.css';
import './AdminHousehold.css';
import {
  useEvacuationCenters,
  isCenterMatch,
  getRoomsForCenter,
} from '../../lib/evacuationCenters.js';
import { AdminFilterModal, AdminFilterBar } from '../../components/AdminFilterModal.jsx';
import {
  CategorySelectSheet,
} from '../../components/CenterSelectSheet.jsx';
import {
  useHouseholds,
  useEventRoomPlacements,
  createHousehold,
  updateHousehold,
  issueHouseholdStub,
  decampHousehold,
  checkInHousehold,
} from '../../lib/householdService.js';
import { useRooms } from '../../lib/roomService.js';
import { EventContext } from '../../context/eventContext.js';
import { importMasterlist } from '../../lib/masterlistImport.js';
import AdminSearchInput from '../../components/AdminSearchInput.jsx';

/* ──────────────────────────────────────────────
   Seed Data (synced with mobile structure)
   ────────────────────────────────────────────── */
const INITIAL_HOUSEHOLDS = [
  {
    id: 'HH-001',
    name: 'Antonio Magno',
    age: 45,
    sex: 'Male',
    vulnerabilities: [],
    center: 'Vinzons Central Elementary School',
    room: 'C-1',
    familyCount: 4,
    members: [
      { name: 'Luz Magno', age: 58, sex: 'Female', vulnerabilities: ['SENIOR CITIZEN'] },
      { name: 'Pablo Magno', age: 20, sex: 'Male', vulnerabilities: [] },
      { name: 'Sofia Magno', age: 17, sex: 'Female', vulnerabilities: [] },
    ],
    stubCode: 'STB-001001',
    stubIssued: false,
  },
  {
    id: 'HH-002',
    name: 'Rosa Santos',
    age: 40,
    sex: 'Female',
    vulnerabilities: [],
    center: 'Vinzons Central Elementary School',
    room: 'A-2',
    familyCount: 4,
    members: [
      { name: 'Pedro Santos', age: 42, sex: 'Male', vulnerabilities: [] },
      { name: 'Maya Santos', age: 16, sex: 'Female', vulnerabilities: [] },
      { name: 'Leo Santos', age: 12, sex: 'Male', vulnerabilities: [] },
    ],
    stubCode: 'STB-001002',
    stubIssued: true,
  },
  {
    id: 'HH-003',
    name: 'Patricia Cruz',
    age: 35,
    sex: 'Female',
    vulnerabilities: ['PREGNANT', 'LACTATING MOTHERS'],
    center: 'Vinzons Gymnasium',
    room: 'B-1',
    familyCount: 3,
    members: [
      { name: 'Mark Cruz', age: 38, sex: 'Male', vulnerabilities: [] },
      { name: 'Lina Cruz', age: 10, sex: 'Female', vulnerabilities: [] },
    ],
    stubCode: 'STB-003014',
    stubIssued: false,
  },
  {
    id: 'HH-004',
    name: 'Juan Dela Cruz',
    age: 50,
    sex: 'Male',
    vulnerabilities: ['PERSONS W/ DISABILITY'],
    center: 'Calaguas National High School',
    room: 'A-1',
    familyCount: 3,
    members: [
      { name: 'Maria Dela Cruz', age: 48, sex: 'Female', vulnerabilities: [] },
      { name: 'John Dela Cruz', age: 22, sex: 'Male', vulnerabilities: [] },
    ],
    stubCode: 'STB-004021',
    stubIssued: true,
  },
  {
    id: 'HH-005',
    name: 'Elena Bautista',
    age: 42,
    sex: 'Female',
    vulnerabilities: ['SOLO PARENT'],
    center: 'Vinzons Central Elementary School',
    room: 'Room 103',
    familyCount: 3,
    members: [
      { name: 'Carlos Bautista', age: 14, sex: 'Male', vulnerabilities: [] },
      { name: 'Jenny Bautista', age: 9, sex: 'Female', vulnerabilities: [] },
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
          color: #6b21a8;
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
      .code{font-size:1.5rem;font-weight:900;letter-spacing:2px;color:#6b21a8;margin:6px 0}
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
   Stub Issuance Modal
   ────────────────────────────────────────────── */
function StubIssuanceModal({ household, households, onIssue, onDecamp, readOnly = false, onClose }) {
  const duplicates = household.members
    .map((m) => ({ member: m.name, holder: findDuplicateHolder(households, household.id, m.name) }))
    .filter((d) => d.holder);

  const alreadyIssued = !!household.stubIssued;
  const isDecamped = household.evacueeStatus === 'Decamped';

  return (
    <div className="vin-admin-modal-overlay" onClick={onClose}>
      <div className="vin-admin-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="vin-admin-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Ticket size={22} color="#7c3aed" />
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
                <span className="vin-admin-stub-meta-val">
                  {Array.isArray(household.vulnerabilities) && household.vulnerabilities.length > 0
                    ? household.vulnerabilities.join(', ')
                    : (household.vulnerabilities || 'None')}
                </span>
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
                      {m.age} yrs • {m.sex} •{' '}
                      {Array.isArray(m.vulnerabilities) && m.vulnerabilities.length > 0
                        ? m.vulnerabilities.join(', ')
                        : 'None'}
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
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: alreadyIssued ? '#6b21a8' : '#92400e', textTransform: 'uppercase' }}>
                {alreadyIssued ? 'ACTIVE CLAIM STUB CODE' : 'HOUSEHOLD QR CODE (NOT YET ISSUED)'}
              </span>
              <div className="vin-admin-issued-code" style={{ color: alreadyIssued ? '#6b21a8' : '#b45309' }}>
                {household.stubCode}
              </div>
            </div>

            <div style={{
              background: '#ffffff',
              padding: 12,
              borderRadius: 12,
              border: `1px solid ${alreadyIssued ? '#ddd6fe' : '#fde68a'}`,
            }}>
              <QRCodeSVG
                value={household.stubCode}
                size={140}
                level="M"
                bgColor="#ffffff"
                fgColor={alreadyIssued ? '#6b21a8' : '#92400e'}
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
            disabled={alreadyIssued || readOnly}
            onClick={() => !alreadyIssued && !readOnly && onIssue(household.id)}
          >
            <Ticket size={20} />
            {readOnly
              ? 'Historical Event — Read Only'
              : alreadyIssued
              ? 'Relief Stub Already Issued'
              : 'Issue Relief Stub Now'}
          </button>

          {/* Decamp action */}
          {!readOnly && !isDecamped && onDecamp && (
            <button
              type="button"
              style={{
                marginTop: 10,
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                fontWeight: 700,
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                cursor: 'pointer',
              }}
              onClick={() => onDecamp(household.id)}
            >
              <LogOut size={16} />
              Decamp Household (Evacuees Leaving Center)
            </button>
          )}

          {isDecamped && (
            <div
              style={{
                marginTop: 10,
                padding: '10px 14px',
                borderRadius: '10px',
                background: '#f1f5f9',
                border: '1px solid #e2e8f0',
                color: '#64748b',
                fontWeight: 600,
                fontSize: '0.82rem',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <LogOut size={14} />
              This household is officially Decamped (Checked out)
            </div>
          )}
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
  const { households, setHouseholds, refresh: refreshHouseholds } = useHouseholds(centers);
  const { rooms: databaseRooms } = useRooms(centers);
  const { selectedEvent, isReadOnly } = useContext(EventContext);
  const { placements, refresh: refreshPlacements } = useEventRoomPlacements(selectedEvent?.id);

  const [activeTab, setActiveTab] = useState('active');        // 'active' | 'masterlist'
  const [filterStub, setFilterStub] = useState('All');         // 'All' | 'Issued' | 'Not Issued'
  const [filterCenter, setFilterCenter] = useState('All Centers');
  const [filterRoom, setFilterRoom] = useState('All Rooms');
  const [search, setSearch] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const [selectedHousehold, setSelectedHousehold] = useState(null);
  const [checkInTarget, setCheckInTarget] = useState(null);
  const [checkInCenterId, setCheckInCenterId] = useState('');
  const [checkInRoom, setCheckInRoom] = useState('');
  const [checkInError, setCheckInError] = useState('');
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [importError, setImportError] = useState('');
  const [actionError, setActionError] = useState('');
  const [modalMode, setModalMode] = useState(null);            // 'register' | 'edit' | null

  /* ── Form picker for vulnerabilities ── */
  const [showFormCategoryPicker, setShowFormCategoryPicker] = useState(null); // null | { target: 'head' } | { target: 'member', index: number }

  const [activeForm, setActiveForm] = useState({
    id: '',
    head: '',
    age: '',
    sex: 'Male',
    barangay: '',
    purok: '',
    center: 'Unassigned Center',
    room: 'Unassigned',
    vulnerabilities: [],
    members: [],
  });

  const currentEventPlacements = useMemo(
    () => placements.filter((placement) => placement.event_id === selectedEvent?.id),
    [placements, selectedEvent?.id]
  );
  const eventHouseholds = useMemo(() => currentEventPlacements
    .map((placement) => {
      const household = households.find((item) => item.id === placement.household_id);
      if (!household) return null;
      const center = centers.find((item) => item.id === placement.center_id);
      const room = databaseRooms.find((item) => item.id === placement.room_id);
      return {
        ...household,
        center: center?.displayName || center?.name || household.center,
        room: room?.roomName || household.room,
        evacueeStatus: placement.status === 'Evacuated' ? 'Active' : 'Decamped',
        placementId: placement.id,
        eventId: placement.event_id,
      };
    })
    .filter(Boolean), [currentEventPlacements, households, centers, databaseRooms]);

  const activeEventHouseholds = useMemo(
    () => eventHouseholds.filter((household) => household.evacueeStatus === 'Active'),
    [eventHouseholds]
  );
  const householdAlreadyPlaced = useMemo(
    () => new Set(currentEventPlacements
      .filter((placement) => placement.status === 'Evacuated')
      .map((placement) => placement.household_id)),
    [currentEventPlacements]
  );

  /* ── Filter logic ── */
  const sourceHouseholds = activeTab === 'active'
    ? (isReadOnly ? eventHouseholds : activeEventHouseholds)
    : households;
  const filtered = sourceHouseholds.filter((h) => {
    const query = search.trim().toLowerCase();
    const matchSearch = !query || [
      h.name,
      h.householdCode,
      h.code,
      h.id,
      h.barangay,
      h.purok,
      h.center,
      h.room,
      ...(h.members || []).map((member) => member.name),
    ].some((value) => String(value || '').toLowerCase().includes(query));
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
    return matchSearch && matchStub && matchCenter && matchRoom;
  });

  const totalCount = households.length;
  const activeEvacueesCount = activeEventHouseholds.length;
  const issuedCount = activeEventHouseholds.filter((h) => h.stubIssued).length;
  const pendingCount = Math.max(0, activeEvacueesCount - issuedCount);
  const filteredIssued = filtered.filter((h) => h.stubIssued && h.evacueeStatus !== 'Decamped');

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedHouseholds = filtered.slice(startIndex, startIndex + pageSize);

  /* ── Issue stub ── */
  const issueStub = async (hhId) => {
    if (isReadOnly) return;
    try {
      await issueHouseholdStub(hhId);
      await refreshHouseholds();
    } catch (err) {
      setActionError(`Could not issue relief stub: ${err.message || 'Unknown error'}`);
    }
  };

  /* ── Decamp household ── */
  const handleDecamp = async (hhId) => {
    if (isReadOnly || !selectedEvent?.id) return;
    if (!window.confirm('Decamp this family from the selected evacuation operation?')) return;
    try {
      await decampHousehold(hhId, selectedEvent.id);
      setSelectedHousehold(null);
      await Promise.all([refreshHouseholds(), refreshPlacements()]);
    } catch (err) {
      setActionError(`Could not decamp household: ${err.message || 'Unknown error'}`);
    }
  };

  const openCheckIn = (household, event) => {
    event.stopPropagation();
    const firstCenter = centers[0];
    setCheckInTarget(household);
    setCheckInCenterId(firstCenter?.id || '');
    setCheckInRoom(getRoomsForCenter(firstCenter?.id, centers).find((room) => room !== 'All Rooms') || '');
    setCheckInError('');
  };

  const handleCheckIn = async (event) => {
    event.preventDefault();
    if (isReadOnly || !selectedEvent?.id) {
      setCheckInError('Select the active evacuation operation before checking in a household.');
      return;
    }

    setIsCheckingIn(true);
    setCheckInError('');
    try {
      await checkInHousehold({
        householdId: checkInTarget.id,
        centerId: checkInCenterId,
        roomName: checkInRoom,
        eventId: selectedEvent.id,
      });
      setCheckInTarget(null);
      await Promise.all([refreshHouseholds(), refreshPlacements()]);
    } catch (err) {
      setCheckInError(err.message || 'Could not check in this household.');
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setIsImporting(true);
    setImportMessage('');
    setImportError('');
    try {
      const importedCount = await importMasterlist(file);
      await refreshHouseholds();
      setActiveTab('masterlist');
      setImportMessage(`${importedCount} household${importedCount === 1 ? '' : 's'} imported successfully.`);
    } catch (err) {
      setImportError(err.message || 'Could not import the Excel masterlist.');
    } finally {
      setIsImporting(false);
    }
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
      barangay: '',
      purok: '',
      center: 'Unassigned Center',
      room: 'Unassigned',
      vulnerabilities: [],
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
      barangay: item.barangay === 'Unassigned' ? '' : item.barangay,
      purok: item.purok === 'Unassigned' ? '' : item.purok,
      center: 'Unassigned Center',
      room: 'Unassigned',
      vulnerabilities: Array.isArray(item.vulnerabilities) ? item.vulnerabilities : [],
      members: item.members || [],
    });
    setModalMode('edit');
  };

  const handleSaveHousehold = async (e) => {
    e.preventDefault();
    if (!activeForm.head.trim()) return;

    if (modalMode === 'register') {
      const generatedCode = genStubCode();
      const tempId = `temp-${Date.now()}`;
      const newH = {
        id: tempId,
        householdCode: activeForm.id || `HH-${String(Date.now()).slice(-4)}`,
        name: activeForm.head,
        age: Number(activeForm.age) || 35,
        sex: activeForm.sex,
        barangay: activeForm.barangay || 'Unassigned',
        purok: activeForm.purok || 'Unassigned',
        center: 'Unassigned Center',
        room: 'Unassigned',
        vulnerabilities: activeForm.vulnerabilities || [],
        familyCount: 1 + activeForm.members.length,
        members: activeForm.members,
        stubCode: generatedCode,
        stubIssued: false,
      };

      // Optimistic UI update
      setHouseholds([newH, ...households]);
      setModalMode(null);

      // Async save to Supabase
      try {
        await createHousehold(
          {
            ...activeForm,
            householdCode: activeForm.id,
            stubCode: generatedCode,
            stubIssued: false,
          },
          centers
        );
        refreshHouseholds();
      } catch (err) {
        console.warn('Could not save household to Supabase:', err);
      }
    } else if (modalMode === 'edit') {
      // Optimistic UI update
      setHouseholds((prev) =>
        prev.map((h) =>
          h.id === activeForm.id
            ? {
                ...h,
                name: activeForm.head,
                age: Number(activeForm.age) || h.age,
                sex: activeForm.sex,
                barangay: activeForm.barangay || 'Unassigned',
                purok: activeForm.purok || 'Unassigned',
                vulnerabilities: activeForm.vulnerabilities || [],
                familyCount: 1 + activeForm.members.length,
                members: activeForm.members,
              }
            : h
        )
      );
      setModalMode(null);

      // Async update in Supabase
      try {
        await updateHousehold(activeForm.id, activeForm, centers, { preservePlacement: true });
        refreshHouseholds();
      } catch (err) {
        console.warn('Could not update household in Supabase:', err);
      }
    }
  };

  const addMember = () => {
    setActiveForm((p) => ({
      ...p,
      members: [...p.members, { name: '', age: '', sex: 'Female', vulnerabilities: [] }],
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
          <label className="vin-admin-btn-register" style={{ cursor: isImporting ? 'wait' : 'pointer' }}>
            <FileSpreadsheet size={18} />
            <span>{isImporting ? 'Importing…' : 'Import Excel Masterlist'}</span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleImportFile}
              disabled={isImporting}
              style={{ display: 'none' }}
            />
          </label>
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

      {/* ── Active Operation & View Tabs ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#f5f3ff', border: '1px solid #ddd6fe', padding: '6px 14px', borderRadius: 20 }}>
          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: isReadOnly ? '#94a3b8' : '#16a34a' }} />
          <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#6b21a8' }}>
            {isReadOnly ? 'Historical Operation: ' : 'Active Operation: '}
            {selectedEvent?.event_name || 'No operation selected'}
          </span>
        </div>
        {isReadOnly && (
          <span role="status" style={{ color: '#92400e', fontSize: '.82rem', fontWeight: 700 }}>
            Event data is read-only. Masterlist profiles remain editable.
          </span>
        )}
        {importMessage && <span role="status" style={{ color: '#15803d', fontSize: '.82rem', fontWeight: 700 }}>{importMessage}</span>}
        {importError && <span role="alert" style={{ color: '#b91c1c', fontSize: '.82rem', fontWeight: 700 }}>{importError}</span>}
        {actionError && <span role="alert" style={{ color: '#b91c1c', fontSize: '.82rem', fontWeight: 700 }}>{actionError}</span>}

        <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: 4, borderRadius: 10, gap: 4 }}>
          <button
            type="button"
            onClick={() => { setActiveTab('active'); setCurrentPage(1); }}
            style={{
              border: 'none',
              borderRadius: 8,
              padding: '6px 14px',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: activeTab === 'active' ? '#ffffff' : 'transparent',
              color: activeTab === 'active' ? '#7c3aed' : '#64748b',
              boxShadow: activeTab === 'active' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            {isReadOnly ? 'Event Evacuees' : 'Active Evacuees'} ({isReadOnly ? eventHouseholds.length : activeEvacueesCount})
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('masterlist'); setCurrentPage(1); }}
            style={{
              border: 'none',
              borderRadius: 8,
              padding: '6px 14px',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: activeTab === 'masterlist' ? '#ffffff' : 'transparent',
              color: activeTab === 'masterlist' ? '#7c3aed' : '#64748b',
              boxShadow: activeTab === 'masterlist' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            Masterlist Registry ({totalCount})
          </button>
        </div>
      </div>

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
            <span className="vin-admin-hh-stat-value" style={{ color: '#6b21a8' }}>{issuedCount}</span>
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
          <AdminSearchInput
            placeholder="Search households, family members, or barangay..."
            value={search}
            onChange={(value) => {
              setSearch(value);
              setCurrentPage(1);
            }}
          />
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
              {activeTab === 'active' ? (
                <>
                  <th>CENTER</th>
                  <th>ROOM</th>
                  <th>MEMBERS</th>
                  <th>STUB CODE</th>
                  <th>STUB STATUS</th>
                </>
              ) : (
                <>
                  <th>BARANGAY</th>
                  <th>PUROK / SITIO</th>
                  <th>MEMBERS</th>
                  <th>VULNERABILITIES</th>
                </>
              )}
              <th style={{ textAlign: 'right' }}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {paginatedHouseholds.length === 0 ? (
              <tr>
                <td colSpan={activeTab === 'active' ? 7 : 6} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  {activeTab === 'active' && !isReadOnly && eventHouseholds.length === 0
                    ? 'No households are checked in to this operation yet. Use the Masterlist Registry to check in a family.'
                    : 'No households match the current search &amp; filter criteria.'}
                </td>
              </tr>
            ) : (
              paginatedHouseholds.map((item) => (
                <tr
                  key={item.id}
                  onClick={activeTab === 'active' ? () => setSelectedHousehold(item) : undefined}
                  style={{ cursor: activeTab === 'active' ? 'pointer' : 'default' }}
                >
                  <td style={{ fontWeight: 700 }}>{item.name}</td>
                  {activeTab === 'active' ? (
                    <>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                          <Building size={14} color="#7c3aed" />
                          {item.center}
                        </span>
                      </td>
                      <td>{item.room}</td>
                      <td>{item.familyCount} persons</td>
                      <td>
                        {item.stubCode
                          ? <strong style={{ color: '#6b21a8', letterSpacing: 0.5 }}>{item.stubCode}</strong>
                          : <span style={{ color: '#94a3b8' }}>--</span>}
                      </td>
                      <td>
                        {item.evacueeStatus === 'Decamped' ? (
                          <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: 6, background: '#f1f5f9', color: '#64748b', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <LogOut size={12} /> Decamped
                          </span>
                        ) : (
                          <span className={item.stubIssued ? 'vin-admin-hh-badge-issued' : 'vin-admin-hh-badge-notissued'}>
                            <img src={item.stubIssued ? checkIcon : removeIcon} alt="" className="vin-badge-img-icon" />
                            <span>{item.stubIssued ? 'Issued' : 'Not Issued'}</span>
                          </span>
                        )}
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{item.barangay || 'Unassigned'}</td>
                      <td>{item.purok || 'Unassigned'}</td>
                      <td>{item.familyCount} persons</td>
                      <td>{item.vulnerabilities?.length ? item.vulnerabilities.join(', ') : 'None recorded'}</td>
                    </>
                  )}
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                      {activeTab === 'active' ? (
                        <>
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
                          {!isReadOnly && item.evacueeStatus !== 'Decamped' && (
                            <button
                              type="button"
                              className="vin-btn-cancel"
                              style={{ padding: '7px 10px', fontSize: '.76rem' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDecamp(item.id);
                              }}
                            >
                              Decamp
                            </button>
                          )}
                        </>
                      ) : (
                        !isReadOnly && (
                          <button
                            type="button"
                            className="vin-admin-tile-action-btn vin-admin-tile-action-btn--issue"
                            disabled={householdAlreadyPlaced.has(item.id)}
                            onClick={(e) => openCheckIn(item, e)}
                          >
                            {householdAlreadyPlaced.has(item.id) ? 'Checked In' : 'Check-In / Assign Room'} →
                          </button>
                        )
                      )}
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
          onDecamp={handleDecamp}
          readOnly={isReadOnly}
          onClose={() => setSelectedHousehold(null)}
        />
      )}

      {checkInTarget && (
        <div className="vin-admin-modal-overlay" onClick={() => setCheckInTarget(null)}>
          <div className="vin-admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="vin-admin-modal-header">
              <div>
                <h2 className="vin-admin-modal-title">Check-In / Assign Room</h2>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '.84rem' }}>
                  {checkInTarget.name} • {selectedEvent?.event_name || 'No active operation'}
                </p>
              </div>
              <button type="button" className="vin-admin-modal-close-btn" onClick={() => setCheckInTarget(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCheckIn} className="vin-admin-modal-body">
              <div className="vin-admin-form-group">
                <label className="vin-admin-form-label" htmlFor="check-in-center">EVACUATION CENTER</label>
                <select
                  id="check-in-center"
                  className="vin-admin-form-select"
                  value={checkInCenterId}
                  onChange={(e) => {
                    setCheckInCenterId(e.target.value);
                    setCheckInRoom(getRoomsForCenter(e.target.value, centers).find((room) => room !== 'All Rooms') || '');
                  }}
                  required
                >
                  {centers.map((center) => (
                    <option key={center.id} value={center.id}>{center.displayName || center.name}</option>
                  ))}
                </select>
              </div>
              <div className="vin-admin-form-group">
                <label className="vin-admin-form-label" htmlFor="check-in-room">ROOM / AREA</label>
                <select
                  id="check-in-room"
                  className="vin-admin-form-select"
                  value={checkInRoom}
                  onChange={(e) => setCheckInRoom(e.target.value)}
                  required
                >
                  {getRoomsForCenter(checkInCenterId, centers)
                    .filter((room) => room !== 'All Rooms')
                    .map((room) => <option key={room} value={room}>{room}</option>)}
                </select>
              </div>
              {checkInError && <p role="alert" style={{ color: '#b91c1c', margin: 0 }}>{checkInError}</p>}
              <div className="vin-modal-actions">
                <button type="button" className="vin-btn-cancel" onClick={() => setCheckInTarget(null)}>Cancel</button>
                <button type="submit" className="vin-btn-submit" disabled={isCheckingIn || isReadOnly}>
                  {isCheckingIn ? 'Checking In…' : 'Confirm Check-In'}
                </button>
              </div>
            </form>
          </div>
        </div>
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
                  <label className="vin-admin-form-label">BARANGAY</label>
                  <input
                    type="text"
                    placeholder="Barangay"
                    className="vin-admin-form-input"
                    value={activeForm.barangay}
                    onChange={(e) => setActiveForm({ ...activeForm, barangay: e.target.value })}
                  />
                </div>
                <div className="vin-admin-form-group">
                  <label className="vin-admin-form-label">PUROK / SITIO</label>
                  <input
                    type="text"
                    placeholder="Purok or sitio"
                    className="vin-admin-form-input"
                    value={activeForm.purok}
                    onChange={(e) => setActiveForm({ ...activeForm, purok: e.target.value })}
                  />
                </div>
              </div>

              <div className="vin-admin-form-group">
                <label className="vin-admin-form-label">VULNERABILITY CATEGORIES</label>
                <div
                  className="vin-hh-filter-tap-field"
                  onClick={() => setShowFormCategoryPicker({ target: 'head' })}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setShowFormCategoryPicker({ target: 'head' })}
                >
                  <div className="vin-hh-filter-select-display-txt">
                    {Array.isArray(activeForm.vulnerabilities) && activeForm.vulnerabilities.length > 0
                      ? activeForm.vulnerabilities.join(', ')
                      : 'None — tap to select'}
                  </div>
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

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.9fr 1fr 1.2fr', gap: 8 }}>
                        <input
                          type="number"
                          placeholder="Age"
                          className="vin-admin-form-input"
                          style={{ padding: '6px 10px' }}
                          value={m.ageValue ?? m.age ?? ''}
                          onChange={(e) => {
                            const updated = [...activeForm.members];
                            updated[idx].ageValue = e.target.value;
                            updated[idx].age = String(updated[idx].ageUnit || 'Years').toLowerCase().startsWith('month')
                              ? 0
                              : Number(e.target.value) || 0;
                            setActiveForm({ ...activeForm, members: updated });
                          }}
                        />
                        <select
                          className="vin-admin-form-select"
                          style={{ padding: '6px 8px' }}
                          value={m.ageUnit || 'Years'}
                          onChange={(e) => {
                            const updated = [...activeForm.members];
                            updated[idx].ageUnit = e.target.value;
                            updated[idx].age = e.target.value === 'Months' ? 0 : Number(updated[idx].ageValue || 0);
                            setActiveForm({ ...activeForm, members: updated });
                          }}
                        >
                          <option value="Years">Years</option>
                          <option value="Months">Months</option>
                          <option value="Days">Days</option>
                        </select>
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
                            {Array.isArray(m.vulnerabilities) && m.vulnerabilities.length > 0
                              ? m.vulnerabilities.join(', ')
                              : 'None'}
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

      {/* ── ADMIN FORM CATEGORY PICKER ── */}
      {showFormCategoryPicker && (
        <CategorySelectSheet
          selected={
            showFormCategoryPicker.target === 'member'
              ? activeForm.members[showFormCategoryPicker.index]?.vulnerabilities || []
              : activeForm.vulnerabilities || []
          }
          title={
            showFormCategoryPicker.target === 'member'
              ? `Vulnerabilities for ${activeForm.members[showFormCategoryPicker.index]?.name || `Member #${showFormCategoryPicker.index + 1}`}`
              : 'Household Head Vulnerabilities'
          }
          onSelect={(cats) => {
            if (showFormCategoryPicker.target === 'member') {
              const u = [...activeForm.members];
              u[showFormCategoryPicker.index].vulnerabilities = cats;
              setActiveForm((prev) => ({ ...prev, members: u }));
            } else {
              setActiveForm((prev) => ({ ...prev, vulnerabilities: cats }));
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
