import { useState, useEffect } from 'react';
import {
  Search, Plus, User, Edit, X, Trash2,
  AlertTriangle, Ticket, ChevronDown, Building,
  ChevronLeft, ChevronRight, CheckCircle2, SlidersHorizontal, LogOut,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import './MobileCommon.css';
import './MobileSubpages.css';
import './MobileHouseholds.css';
import checkIcon from '../../assets/check.png';
import removeIcon from '../../assets/remove.png';
import { CenterSelectSheet, RoomSelectSheet, CategorySelectSheet } from '../../components/CenterSelectSheet';
import {
  useEvacuationCenters,
  isCenterMatch,
} from '../../lib/evacuationCenters';
import {
  useHouseholds,
  createHousehold,
  updateHousehold,
  searchMasterHouseholds,
} from '../../lib/householdService.js';
import { useActiveEvent } from '../../lib/evacuationEventService.js';

/* ──────────────────────────────────────────────
   Seed data – replace with Dexie in production
   ────────────────────────────────────────────── */
const SEED = [
  {
    id: 1,
    name: 'Antonio Magno',
    age: 45, sex: 'Male', vulnerabilities: [],
    center: 'LGU EC (Mangcaway)',
    room: 'Room 1', familyCount: 4,
    members: [
      { name: 'Luz Magno',   age: 58, sex: 'Female', vulnerabilities: ['SENIOR CITIZEN'] },
      { name: 'Pablo Magno', age: 20, sex: 'Male',   vulnerabilities: []   },
      { name: 'Sofia Magno', age: 17, sex: 'Female', vulnerabilities: []   },
    ],
    stubCode: 'STB-001001',
    stubIssued: false,
  },
  {
    id: 2,
    name: 'Rosa Santos',
    age: 40, sex: 'Female', vulnerabilities: [],
    center: 'LGU EC (Mangcaway)',
    room: 'Room 2', familyCount: 4,
    members: [
      { name: 'Pedro Santos', age: 42, sex: 'Male',   vulnerabilities: [] },
      { name: 'Maya Santos',  age: 16, sex: 'Female', vulnerabilities: [] },
      { name: 'Leo Santos',   age: 12, sex: 'Male',   vulnerabilities: [] },
    ],
    stubCode: 'STB-001002',
    stubIssued: true,
  },
  {
    id: 3,
    name: 'Patricia Cruz',
    age: 35, sex: 'Female', vulnerabilities: ['PREGNANT', 'LACTATING MOTHERS'],
    center: 'LGU EC (Bliss)',
    room: 'Room 1', familyCount: 3,
    members: [
      { name: 'Mark Cruz', age: 38, sex: 'Male',   vulnerabilities: [] },
      { name: 'Lina Cruz', age: 10, sex: 'Female', vulnerabilities: [] },
    ],
    stubCode: 'STB-003014',
    stubIssued: false,
  },
  {
    id: 4,
    name: 'Juan Dela Cruz',
    age: 50, sex: 'Male', vulnerabilities: ['PERSONS W/ DISABILITY'],
    center: 'PLGU EC (Mat-I)',
    room: 'Room 3', familyCount: 3,
    members: [
      { name: 'Maria Dela Cruz', age: 48, sex: 'Female', vulnerabilities: [] },
      { name: 'John Dela Cruz',  age: 22, sex: 'Male',   vulnerabilities: [] },
    ],
    stubCode: 'STB-004021',
    stubIssued: true,
  },
  {
    id: 5,
    name: 'Elena Bautista',
    age: 42, sex: 'Female', vulnerabilities: ['SOLO PARENT'],
    center: 'Pinagtigasan EC',
    room: 'Unassigned', familyCount: 3,
    members: [
      { name: 'Carlos Bautista', age: 14, sex: 'Male',   vulnerabilities: [] },
      { name: 'Jenny Bautista',  age: 9,  sex: 'Female', vulnerabilities: [] },
    ],
    stubCode: 'STB-005018',
    stubIssued: false,
  },
  {
    id: 6,
    name: 'Roberto Diaz',
    age: 55, sex: 'Male', vulnerabilities: ['SENIOR CITIZEN'],
    center: 'St. Peter Parish AVR',
    room: 'Room 1', familyCount: 2,
    members: [
      { name: 'Clara Diaz', age: 52, sex: 'Female', vulnerabilities: [] },
    ],
    stubCode: 'STB-006033',
    stubIssued: true,
  },
  {
    id: 7,
    name: 'Carmen Ramos',
    age: 29, sex: 'Female', vulnerabilities: ['PREGNANT', 'LACTATING MOTHERS'],
    center: 'Biday EC',
    room: 'Room 2', familyCount: 4,
    members: [
      { name: 'Danilo Ramos', age: 31, sex: 'Male',   vulnerabilities: [] },
      { name: 'Mia Ramos',    age: 5,  sex: 'Female', vulnerabilities: [] },
      { name: 'Leo Ramos',    age: 2,  sex: 'Male',   vulnerabilities: [] },
    ],
    stubCode: 'STB-007015',
    stubIssued: false,
  },
  {
    id: 8,
    name: 'Fernando Lopez',
    age: 48, sex: 'Male', vulnerabilities: ['PERSONS W/ DISABILITY'],
    center: 'Sugod EC',
    room: 'Room 4', familyCount: 3,
    members: [
      { name: 'Grace Lopez', age: 44, sex: 'Female', vulnerabilities: [] },
      { name: 'Joy Lopez',   age: 18, sex: 'Female', vulnerabilities: [] },
    ],
    stubCode: 'STB-008012',
    stubIssued: true,
  },
  {
    id: 9,
    name: 'Teresa Morales',
    age: 38, sex: 'Female', vulnerabilities: [],
    center: 'Mormons',
    room: 'Room 1', familyCount: 3,
    members: [
      { name: 'Ramon Morales', age: 40, sex: 'Male', vulnerabilities: [] },
      { name: 'Ella Morales',  age: 8,  sex: 'Female', vulnerabilities: [] },
    ],
    stubCode: 'STB-009045',
    stubIssued: true,
  },
  {
    id: 10,
    name: 'Danilo Soriano',
    age: 51, sex: 'Male', vulnerabilities: [],
    center: 'Marabe Church',
    room: 'Unassigned', familyCount: 2,
    members: [
      { name: 'Beth Soriano', age: 49, sex: 'Female', vulnerabilities: [] },
    ],
    stubCode: 'STB-010028',
    stubIssued: false,
  },
  {
    id: 11,
    name: 'Marites Villanueva',
    age: 34, sex: 'Female', vulnerabilities: ['SOLO PARENT'],
    center: 'Adorno Fathers',
    room: 'Room 5', familyCount: 3,
    members: [
      { name: 'Joshua Villanueva', age: 11, sex: 'Male', vulnerabilities: [] },
      { name: 'Hannah Villanueva', age: 6,  sex: 'Female', vulnerabilities: [] },
    ],
    stubCode: 'STB-011089',
    stubIssued: true,
  },
  {
    id: 12,
    name: 'Gregorio Santos',
    age: 62, sex: 'Male', vulnerabilities: ['SENIOR CITIZEN'],
    center: 'Mangcawayan EC',
    room: 'Room 3', familyCount: 2,
    members: [
      { name: 'Amparo Santos', age: 60, sex: 'Female', vulnerabilities: ['SENIOR CITIZEN'] },
    ],
    stubCode: 'STB-012007',
    stubIssued: false,
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
      h.stubIssued &&
      (h.name === memberName || h.members.some((m) => m.name === memberName))
  );
}

/* ──────────────────────────────────────────────
   Household Details & QR Panel
   ────────────────────────────────────────────── */
function StubIssuancePanel({ household, households, onClose }) {
  const duplicates = household.members
    .map((m) => ({ member: m.name, holder: findDuplicateHolder(households, household.id, m.name) }))
    .filter((d) => d.holder);
  const alreadyIssued = !!household.stubIssued;
  const isDecamped = household.evacueeStatus === 'Decamped';

  return (
    <div className="vin-mob-sheet-overlay" onClick={onClose}>
      <div className="vin-mob-sheet-content" onClick={(e) => e.stopPropagation()}>
        <div className="vin-mob-sheet-header">
          <h2 className="vin-mob-sheet-title">Household Details &amp; QR</h2>
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
            {(() => {
              const isActive = household.evacueeStatus === 'Active' || (!household.evacueeStatus && household.room && household.room !== 'Unassigned');
              return (
                <span className={isActive ? 'vin-hh-badge-issued' : 'vin-hh-badge-notissued'} style={{ marginLeft: 'auto' }}>
                  <img
                    src={isActive ? checkIcon : removeIcon}
                    alt=""
                    className="vin-badge-img-icon"
                  />
                  <span>{isActive ? 'Active' : 'Not Active'}</span>
                </span>
              );
            })()}
          </div>
          <div className="vin-hh-stub-meta">
            <div><span className="vin-mob-field-label">ROOM</span><div>{household.room}</div></div>
            <div><span className="vin-mob-field-label">MEMBERS</span><div>{household.familyCount}</div></div>
            <div><span className="vin-mob-field-label">CENTER</span><div style={{ fontSize: '.8rem' }}>{household.center}</div></div>
            <div><span className="vin-mob-field-label">CATEGORY</span><div>
              {Array.isArray(household.vulnerabilities) && household.vulnerabilities.length > 0
                ? household.vulnerabilities.join(', ')
                : 'None'}
            </div></div>
          </div>
        </div>

        {/* Members */}
        <div className="vin-hh-members-section">
          <span className="vin-mob-input-label">FAMILY MEMBERS</span>
          {household.members.map((m, i) => (
            <div key={i} className="vin-hh-member-row">
              <User size={14} className="vin-hh-member-icon" />
              <span>{m.name}</span>
              <span className="vin-hh-member-meta">{m.age} • {m.sex} •{' '}
                {Array.isArray(m.vulnerabilities) && m.vulnerabilities.length > 0
                  ? m.vulnerabilities.join(', ')
                  : 'None'}
              </span>
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

        {/* Unique Household QR Code (Always present upon registration) */}
        <div className="vin-hh-issued-block" style={{ marginTop: 14 }}>
          <div style={{ textAlign: 'center' }}>
            <div className="vin-mob-input-label" style={{ marginBottom: 6 }}>OFFICIAL QR CODE / STUB CODE</div>
            <div className="vin-hh-stub-code-display">{household.stubCode}</div>
            <div style={{ marginTop: 12, display: 'inline-block', padding: 8, background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <QRCodeSVG
                id={`panel-qr-${household.id}`}
                value={household.stubCode}
                size={140}
                level="M"
                bgColor="#ffffff"
                fgColor="#6b21a8"
              />
            </div>
            <div style={{ marginTop: 8, fontSize: '0.84rem', fontWeight: 700, color: '#6b21a8' }}>
              Room: {household.room && household.room !== 'Unassigned' ? household.room : 'Unassigned'}
            </div>
            <div style={{ marginTop: 4, fontSize: '0.78rem', color: alreadyIssued ? '#6b21a8' : '#64748b' }}>
              {alreadyIssued
                ? '✓ Status: Relief Pack Claimed'
                : 'Present this QR code at the Evacuee Monitoring / Relief desk to claim assistance.'}
            </div>
          </div>
        </div>

        {/* Status notice */}
        <div
          style={{
            padding: 12,
            borderRadius: 12,
            background: alreadyIssued ? '#f3e8ff' : '#f8fafc',
            border: `1px solid ${alreadyIssued ? '#ddd6fe' : '#e2e8f0'}`,
            color: alreadyIssued ? '#6b21a8' : '#64748b',
            fontWeight: 700,
            textAlign: 'center',
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            marginTop: 10,
          }}
        >
          {alreadyIssued ? (
            <>
              <CheckCircle2 size={18} />
              Relief Stub Verified &amp; Issued
            </>
          ) : (
            <>
              <Ticket size={18} />
              Relief Distribution via Monitor Scan
            </>
          )}
        </div>

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
            Household has decamped from the evacuation center
          </div>
        )}
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
   Household Filter Sheet (bottom-sheet panel)
   ────────────────────────────────────────────── */
function HHFilterSheet({ filterStatus, filterCenter, filterRoom, households, search, centersList = [], onApply, onClose }) {
  /* Local draft state — only committed when user taps "Show results" */
  const [draftStatus, setDraftStatus] = useState(filterStatus);
  const [draftCenter, setDraftCenter] = useState(filterCenter);
  const [draftRoom, setDraftRoom] = useState(filterRoom);
  const [showCenterPicker, setShowCenterPicker] = useState(false);
  const [showRoomPicker, setShowRoomPicker] = useState(false);

  /* If selected center changes, reset room if needed */
  const handleCenterChange = (c) => {
    setDraftCenter(c);
  };

  const handleReset = () => {
    setDraftStatus('All');
    setDraftCenter('All Centers');
    setDraftRoom('All Rooms');
  };

  const handleApply = () => {
    onApply(draftStatus, draftCenter, draftRoom);
    onClose();
  };

  /* Live result count based on draft selections */
  const draftCount = households.filter((h) => {
    const matchSearch =
      h.name.toLowerCase().includes(search.toLowerCase()) ||
      h.room.toLowerCase().includes(search.toLowerCase()) ||
      (h.stubCode || '').toLowerCase().includes(search.toLowerCase());
    const isActive = h.evacueeStatus === 'Active' || (!h.evacueeStatus && h.room && h.room !== 'Unassigned');
    const matchStatus =
      draftStatus === 'All' ||
      (draftStatus === 'Active' && isActive) ||
      (draftStatus === 'Not Active' && !isActive);
    const matchCenter = isCenterMatch(h.center, draftCenter, centersList);
    const matchRoom =
      draftRoom === 'All Rooms' ||
      h.room === draftRoom ||
      `Room ${h.room}` === draftRoom;
    return matchSearch && matchStatus && matchCenter && matchRoom;
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
          <div className="vin-hh-filter-section-label">Evacuee Status</div>
          <div className="vin-hh-filter-pills-row">
            {[
              { id: 'All', label: 'All' },
              { id: 'Active', label: 'Active' },
              { id: 'Not Active', label: 'Not Active' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`vin-hh-filter-pill ${draftStatus === opt.id ? 'active' : ''}`}
                onClick={() => setDraftStatus(opt.id)}
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
  const { households, setHouseholds, refresh: refreshHouseholds } = useHouseholds(centers);
  const { activeEvent } = useActiveEvent();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');     // 'All' | 'Active' | 'Not Active'
  const [filterCenter, setFilterCenter] = useState('All Centers');
  const [filterRoom, setFilterRoom] = useState('All Rooms');
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [openFilter, setOpenFilter] = useState(null);
  const [selectedHousehold, setSelectedHousehold] = useState(null);
  const [assigningHousehold, setAssigningHousehold] = useState(null);
  const [centerRooms, setCenterRooms] = useState(DEFAULT_CENTER_ROOMS);
  const [toastMsg, setToastMsg] = useState('');
  const [modalMode, setModalMode] = useState(null);

  /* ── Form pickers for register/edit ── */
  const [showFormCenterPicker, setShowFormCenterPicker] = useState(false);
  const [showFormRoomPicker, setShowFormRoomPicker] = useState(false);
  const [showFormCategoryPicker, setShowFormCategoryPicker] = useState(null); // null | { target: 'head' } | { target: 'member', index: number }

  const [activeForm, setActiveForm] = useState({
    head: '', age: '', sex: 'Male',
    center: 'LGU EC (Mangcaway)',
    room: 'Room 1', vulnerabilities: [], members: [],
  });

  /* ── Filter + search ── */
  const filtered = households.filter((h) => {
    const matchSearch =
      h.name.toLowerCase().includes(search.toLowerCase()) ||
      h.room.toLowerCase().includes(search.toLowerCase()) ||
      (h.stubCode || '').toLowerCase().includes(search.toLowerCase());
    const isActive = h.evacueeStatus === 'Active' || (!h.evacueeStatus && h.room && h.room !== 'Unassigned');
    const matchStatus =
      filterStatus === 'All' ||
      (filterStatus === 'Active' && isActive) ||
      (filterStatus === 'Not Active' && !isActive);
    const matchCenter = isCenterMatch(h.center, filterCenter, centers);
    const matchRoom =
      filterRoom === 'All Rooms' ||
      h.room === filterRoom ||
      `Room ${h.room}` === filterRoom;
    return matchSearch && matchStatus && matchCenter && matchRoom;
  });

  const activeFilters =
    (filterStatus !== 'All' ? 1 : 0) +
    (filterCenter !== 'All Centers' ? 1 : 0) +
    (filterRoom !== 'All Rooms' ? 1 : 0);

  /* ── Pagination ── */
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterStatus, filterCenter, filterRoom]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedHouseholds = filtered.slice(startIndex, startIndex + pageSize);

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
    const defaultCenter = centers[0]?.displayName || centers[0]?.name || OFFICIAL_EVAC_CENTERS[0].name;
    setActiveForm({ head: '', age: '', sex: 'Male', center: defaultCenter, room: 'Room 1', vulnerabilities: [], members: [] });
    setModalMode('register');
  };
  const openEdit = (item, e) => {
    e.stopPropagation();
    setActiveForm({ id: item.id, head: item.name, age: item.age, sex: item.sex, center: item.center, room: item.room, vulnerabilities: Array.isArray(item.vulnerabilities) ? item.vulnerabilities : [], members: item.members || [] });
    setModalMode('edit');
  };
  const handleSaveHousehold = async (e) => {
    e.preventDefault();
    if (!activeForm.head) return;

    if (modalMode === 'register') {
      const generatedCode = genStubCode();
      const tempId = `temp-${Date.now()}`;
      const newHousehold = {
        id: tempId,
        name: activeForm.head,
        age: Number(activeForm.age) || 30,
        sex: activeForm.sex,
        center: activeForm.center,
        room: activeForm.room,
        vulnerabilities: activeForm.vulnerabilities || [],
        familyCount: 1 + activeForm.members.length,
        members: activeForm.members,
        stubCode: generatedCode,
        stubIssued: false,
      };

      // Optimistic UI update
      setHouseholds([newHousehold, ...households]);
      setToastMsg(`✓ Registered ${activeForm.head} with QR code ${generatedCode}!`);
      setTimeout(() => setToastMsg(''), 4000);
      setModalMode(null);

      // Async save to Supabase
      try {
        await createHousehold(
          {
            ...activeForm,
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
                center: activeForm.center,
                room: activeForm.room,
                vulnerabilities: activeForm.vulnerabilities || [],
                familyCount: 1 + activeForm.members.length,
                members: activeForm.members,
              }
            : h
        )
      );
      setToastMsg(`✓ Saved changes for ${activeForm.head}!`);
      setTimeout(() => setToastMsg(''), 3000);
      setModalMode(null);

      // Async update to Supabase
      try {
        await updateHousehold(activeForm.id, activeForm, centers);
        refreshHouseholds();
      } catch (err) {
        console.warn('Could not update household in Supabase:', err);
      }
    }
  };

  const addMember = () =>
    setActiveForm((p) => ({ ...p, members: [...p.members, { name: '', age: '', sex: 'Female', vulnerabilities: [] }] }));
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
          <p className="vin-mob-subtitle">{households.length} registered households</p>
        </div>
        <button type="button" className="vin-mob-register-btn" onClick={openRegister}>
          <Plus size={16} /><span>Register</span>
        </button>
      </header>

      {/* Search row */}
      <div className="vin-hh-toolbar">
        <div className="vin-mob-search-wrapper" style={{ flex: 1, marginBottom: 0 }}>
          <Search size={18} className="vin-mob-search-icon" />
          <input
            type="text"
            placeholder="Name, room, or stub code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="vin-mob-search-input"
          />
        </div>
      </div>

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

        {filterStatus !== 'All' && (
          <button
            type="button"
            className="vin-hh-active-chip"
            onClick={() => setFilterStatus('All')}
            title="Remove status filter"
          >
            <span>{filterStatus}</span>
            <X size={13} className="vin-hh-chip-close" />
          </button>
        )}
      </div>

      {/* Legend */}
      <div className="vin-hh-legend">
        <span className="vin-hh-legend-dot issued" /> Active
        <span className="vin-hh-legend-dot notissued" /> Not Active
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
                            {(() => {
                              const isActive = item.evacueeStatus === 'Active' || (!item.evacueeStatus && item.room && item.room !== 'Unassigned');
                              return (
                                <span className={isActive ? 'vin-hh-badge-issued' : 'vin-hh-badge-notissued'}>
                                  <img
                                    src={isActive ? checkIcon : removeIcon}
                                    alt=""
                                    className="vin-badge-img-icon"
                                  />
                                  <span>{isActive ? 'Active' : 'Not Active'}</span>
                                </span>
                              );
                            })()}
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

      {/* ── HOUSEHOLD DETAILS & QR PANEL ── */}
      {selectedHousehold && (
        <StubIssuancePanel
          household={selectedHousehold}
          households={households}
          onClose={() => setSelectedHousehold(null)}
        />
      )}

      {/* ── FILTER SHEET MODAL (matching user image 2) ── */}
      {showFilterSheet && (
        <HHFilterSheet
          filterStatus={filterStatus}
          filterCenter={filterCenter}
          filterRoom={filterRoom}
          households={households}
          search={search}
          centersList={centers}
          onApply={(newStatus, newCenter, newRoom) => {
            setFilterStatus(newStatus);
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
                  <div
                    className="vin-hh-filter-select-wrap vin-hh-filter-tap-field"
                    onClick={() => setShowFormCenterPicker(true)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setShowFormCenterPicker(true)}
                  >
                    <div className="vin-hh-filter-select-display-txt">{activeForm.center}</div>
                    <ChevronDown size={16} className="vin-hh-filter-select-icon" />
                  </div>
                </div>
                <div className="vin-mob-input-group">
                  <label className="vin-mob-input-label">ROOM</label>
                  <div
                    className="vin-hh-filter-select-wrap vin-hh-filter-tap-field"
                    onClick={() => setShowFormRoomPicker(true)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setShowFormRoomPicker(true)}
                  >
                    <div className="vin-hh-filter-select-display-txt">{activeForm.room}</div>
                    <ChevronDown size={16} className="vin-hh-filter-select-icon" />
                  </div>
                </div>
              </div>
              <div className="vin-mob-input-group">
                <label className="vin-mob-input-label">VULNERABILITY CATEGORIES</label>
                <div
                  className="vin-hh-filter-select-wrap vin-hh-filter-tap-field"
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
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.3fr', gap: 8 }}>
                    <input type="number" placeholder="Age" className="vin-mob-select" value={m.age}
                      onChange={(e) => { const u = [...activeForm.members]; u[idx].age = e.target.value; setActiveForm({ ...activeForm, members: u }); }}
                      style={{ padding: 8 }} />
                    <select className="vin-mob-select" value={m.sex}
                      onChange={(e) => { const u = [...activeForm.members]; u[idx].sex = e.target.value; setActiveForm({ ...activeForm, members: u }); }}
                      style={{ padding: 8 }}>
                      <option>Male</option><option>Female</option>
                    </select>
                    <div
                      className="vin-mob-select"
                      style={{
                        padding: '8px 10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        boxSizing: 'border-box',
                        minHeight: 38
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
              <button type="submit" className="vin-mob-sheet-submit-btn">Save Household</button>
            </form>
          </div>
        </div>
      )}

      {/* ── FORM CENTER PICKER ── */}
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

      {/* ── FORM ROOM PICKER ── */}
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

      {/* ── FORM CATEGORY PICKER ── */}
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
    </div>
  );
}
