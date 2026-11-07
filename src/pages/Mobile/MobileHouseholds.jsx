import { createElement, useState, useEffect, useMemo } from 'react';
import {
  Search, Plus, User, Edit, X, Trash2,
  AlertTriangle, ChevronDown, Building,
  ChevronLeft, ChevronRight, CheckCircle2, SlidersHorizontal, LogOut,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import './MobileCommon.css';
import './MobileSubpages.css';
import './MobileHouseholds.css';
import checkIcon from '../../assets/check.png';
import removeIcon from '../../assets/remove.png';
import {
  CenterSelectSheet,
  RoomSelectSheet,
  CategorySelectSheet,
  ProfileSelectSheet,
  GenderSelectSheet,
  ChoiceSelectSheet,
} from '../../components/CenterSelectSheet';
import HouseholdReviewModal from '../../components/HouseholdReviewModal.jsx';
import {
  HOUSEHOLD_PROFILE_OPTIONS,
  HOUSEHOLD_RELATIONSHIPS,
  OCCUPATION_OPTIONS,
} from '../../lib/householdProfileOptions.js';
import { joinFullName, splitFullName } from '../../lib/householdNames.js';
import {
  useEvacuationCenters,
  isCenterMatch,
} from '../../lib/evacuationCenters';
import {
  useHouseholds,
  createHousehold,
  updateHousehold,
  useEventRoomPlacements,
  transferHouseholdRoom,
} from '../../lib/householdService.js';
import { useActiveEvent } from '../../lib/evacuationEventService.js';

const MOBILE_HOUSEHOLD_DRAFT_KEY = 'mswdo.mobile.household-registration-draft';
const REGISTRATION_YES_NO_FIELDS = [
  ['hasWorkedDole', 'Worked in DOLE before?'],
  ['hasReceivedGovernmentAssistance', 'Government assistance received?'],
  ['hasReceivedReliefAssistance', 'Received any relief assistance?'],
];

function validateHouseholdRegistration(form) {
  const errors = {};
  const currentYear = new Date().getFullYear();
  const setError = (field, message) => {
    errors[field] = message;
  };
  const validateAge = (age, field) => {
    if (age === '' || age == null) {
      setError(field, 'This field is required.');
    } else if (!Number.isFinite(Number(age)) || Number(age) < 0 || Number(age) > 120) {
      setError(field, 'Enter an age between 0 and 120.');
    }
  };
  const validateIncome = (income, field) => {
    if (income !== '' && income != null &&
      (!Number.isFinite(Number(income)) || Number(income) < 0 || Number(income) > 99999999.99)) {
      setError(field, 'Enter an income between 0 and 99,999,999.99.');
    }
  };
  const validateYear = (year, field) => {
    if (!year || !Number.isInteger(Number(year)) || Number(year) < 1900 || Number(year) > currentYear) {
      setError(field, `Enter a year between 1900 and ${currentYear}.`);
    }
  };
  const validateProfile = (profile, prefix) => {
    REGISTRATION_YES_NO_FIELDS.forEach(([field]) => {
      if (profile[field] == null) setError(`${prefix}.${field}`, 'This field is required.');
    });

    if (profile.hasWorkedDole === true) {
      validateYear(profile.doleEmploymentYear, `${prefix}.doleEmploymentYear`);
    }
    if (profile.hasReceivedGovernmentAssistance === true) {
      if (!profile.govAssistanceAvailed?.length) {
        setError(`${prefix}.govAssistanceAvailed`, 'Select at least one assistance type.');
      }
      validateYear(profile.governmentAssistanceYear, `${prefix}.governmentAssistanceYear`);
    }
  };

  if (!form.headFirstName?.trim()) setError('headFirstName', 'This field is required.');
  if (!form.headLastName?.trim()) setError('headLastName', 'This field is required.');
  validateAge(form.age, 'headAge');
  validateIncome(form.monthlyIncome, 'headMonthlyIncome');
  validateProfile(form, 'head');

  form.members.forEach((member, index) => {
    const prefix = `member-${index}`;
    if (!member.firstName?.trim()) setError(`${prefix}.firstName`, 'This field is required.');
    if (!member.lastName?.trim()) setError(`${prefix}.lastName`, 'This field is required.');
    validateAge(member.age, `${prefix}.age`);
    validateIncome(member.monthlyIncome, `${prefix}.monthlyIncome`);
    validateProfile(member, prefix);
  });

  return errors;
}

function ValidatedMobileField({ as: Control = 'input', field, errors, className = '', children, ...props }) {
  const error = errors[field];
  const errorId = `${field}-error`;

  return (
    <div className="vin-mob-validated-field">
      {createElement(Control, {
        ...props,
        className: `${className}${error ? ' vin-mob-field-invalid' : ''}`,
        'data-validation-field': field,
        'aria-invalid': error ? 'true' : undefined,
        'aria-describedby': error ? errorId : undefined,
      }, children)}
      {error && <span id={errorId} className="vin-mob-field-error" role="alert">{error}</span>}
    </div>
  );
}

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
            <div style={{ marginTop: 4, fontSize: '0.78rem', color: alreadyIssued ? '#6b21a8' : '#64748b' }}>
              {alreadyIssued
                ? '✓ Status: Relief Pack Claimed'
                : 'Present this QR code at the Evacuee Monitoring / Relief desk to claim assistance.'}
            </div>
          </div>
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
      : (centersList[0]?.displayName || centersList[0]?.name || '')
  );
  const [feedback, setFeedback] = useState(null);

  const matchedCenterObj = centersList.find(
    (c) => c.displayName === selectedCenter || c.name === selectedCenter
  );

  const rooms = (centerRooms && centerRooms[selectedCenter]) || matchedCenterObj?.rooms || [];
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
  const { refresh: refreshPlacements } = useEventRoomPlacements(activeEvent?.id);

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');     // 'All' | 'Active' | 'Not Active'
  const [filterCenter, setFilterCenter] = useState('All Centers');
  const [filterRoom, setFilterRoom] = useState('All Rooms');
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [openFilter, setOpenFilter] = useState(null);
  const [selectedHousehold, setSelectedHousehold] = useState(null);
  const [assigningHousehold, setAssigningHousehold] = useState(null);
  const displayedSelectedHousehold = selectedHousehold
    ? households.find((item) => item.id === selectedHousehold.id) || selectedHousehold
    : null;
  const displayedAssigningHousehold = assigningHousehold
    ? households.find((item) => item.id === assigningHousehold.id) || assigningHousehold
    : null;
  const centerRooms = useMemo(() => Object.fromEntries(centers.map((center) => {
    const centerName = center.displayName || center.name;
    const rooms = (center.rooms || []).map((room) => ({
      ...room,
      occupied: households
        .filter((household) => household.evacueeStatus === 'Active' && household.centerId === center.id)
        .filter((household) =>
          (room.dbId && household.roomId === room.dbId) || household.room === room.name
        )
        .reduce((sum, household) => sum + (household.familyCount || 1), 0),
    }));
    return [centerName, rooms];
  })), [centers, households]);
  const [toastMsg, setToastMsg] = useState('');
  const [modalMode, setModalMode] = useState(null);
  const [showHouseholdReview, setShowHouseholdReview] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [registrationSaveError, setRegistrationSaveError] = useState('');
  const [draftRestored, setDraftRestored] = useState(false);
  const [draftStorageError, setDraftStorageError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  /* ── Form pickers for register/edit ── */
  const [showFormCenterPicker, setShowFormCenterPicker] = useState(false);
  const [showFormRoomPicker, setShowFormRoomPicker] = useState(false);
  const [showFormCategoryPicker, setShowFormCategoryPicker] = useState(null); // null | { target: 'head' } | { target: 'member', index: number }
  const [showFormProfilePicker, setShowFormProfilePicker] = useState(null);
  const [showMemberAssistancePicker, setShowMemberAssistancePicker] = useState(null);
  const [showGenderPicker, setShowGenderPicker] = useState(null);
  const [showFormChoicePicker, setShowFormChoicePicker] = useState(null);
  const [showYesNoPicker, setShowYesNoPicker] = useState(null);

  const clearValidationError = (field) => {
    setValidationErrors((previous) => {
      if (!previous[field]) return previous;
      const next = { ...previous };
      delete next[field];
      return next;
    });
  };

  const [activeForm, setActiveForm] = useState({
    head: '', headFirstName: '', headMiddleName: '', headLastName: '', age: '', sex: 'Male',
    barangay: '', purok: '', headOccupation: '',
    center: '',
    room: 'Unassigned', vulnerabilities: [], members: [],
    monthlyIncome: '',
    hasWorkedDole: null, doleEmploymentYear: '',
    hasReceivedGovernmentAssistance: null, govAssistanceAvailed: [],
    governmentAssistanceYear: '', hasReceivedReliefAssistance: null,
    otherIncomeSource: '', floodDepthLevel: '', characteristicsRemarks: '',
  });

  useEffect(() => {
    if (modalMode !== 'register') return;

    const hasDraftContent = Boolean(
      activeForm.headFirstName?.trim() ||
      activeForm.headMiddleName?.trim() ||
      activeForm.headLastName?.trim() ||
      activeForm.age ||
      activeForm.barangay?.trim() ||
      activeForm.purok?.trim() ||
      activeForm.headOccupation ||
      activeForm.vulnerabilities?.length ||
      activeForm.members?.length ||
      activeForm.monthlyIncome ||
      activeForm.hasWorkedDole != null ||
      activeForm.hasReceivedGovernmentAssistance != null ||
      activeForm.hasReceivedReliefAssistance != null ||
      activeForm.otherIncomeSource?.trim() ||
      activeForm.floodDepthLevel ||
      activeForm.characteristicsRemarks?.trim()
    );

    try {
      if (hasDraftContent) {
        window.sessionStorage.setItem(MOBILE_HOUSEHOLD_DRAFT_KEY, JSON.stringify(activeForm));
      } else {
        window.sessionStorage.removeItem(MOBILE_HOUSEHOLD_DRAFT_KEY);
      }
    } catch (error) {
      console.error('Could not save the mobile household registration draft:', error);
    }
  }, [activeForm, modalMode]);

  /* ── Filter + search ── */
  const filtered = households.filter((h) => {
    const searchTerm = search.trim().toLowerCase();
    const matchSearch = !searchTerm || [
      h.name,
      h.room,
      h.stubCode,
      ...(h.members || []).map((member) => member.name),
    ].some((value) => String(value || '').toLowerCase().includes(searchTerm));
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

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedHouseholds = filtered.slice(startIndex, startIndex + pageSize);

  /* ── Room assignment ── */
  const handleAssignRoom = async (hhId, roomId, centerName) => {
    const center = centers.find((item) =>
      item.displayName === centerName || item.name === centerName
    );
    const room = centerRooms[centerName]?.find((item) => item.id === roomId);
    if (!center?.id || !room) {
      setToastMsg('Could not find that evacuation center or room in the database.');
      setTimeout(() => setToastMsg(''), 4000);
      return;
    }

    try {
      if (activeEvent?.status === 'Active' && activeEvent.id !== 'default-active-event') {
        await transferHouseholdRoom({
          householdId: hhId,
          eventId: activeEvent.id,
          centerId: center.id,
          roomId: room.dbId || null,
          roomName: room.name || roomId,
        });
      } else {
        const household = households.find((item) => item.id === hhId);
        await updateHousehold(hhId, {
          head: household.name,
          age: household.age,
          sex: household.sex,
          headOccupation: household.headOccupation,
          barangay: household.barangay,
          purok: household.purok,
          vulnerabilities: household.vulnerabilities,
          members: household.members,
          monthlyIncome: household.monthlyIncome,
          hasWorkedDole: household.hasWorkedDole,
          doleEmploymentYear: household.doleEmploymentYear,
          hasReceivedGovernmentAssistance: household.hasReceivedGovernmentAssistance,
          govAssistanceAvailed: household.govAssistanceAvailed,
          governmentAssistanceYear: household.governmentAssistanceYear,
          hasReceivedReliefAssistance: household.hasReceivedReliefAssistance,
          otherIncomeSource: household.otherIncomeSource,
          floodDepthLevel: household.floodDepthLevel,
          characteristicsRemarks: household.characteristicsRemarks,
          center: center.displayName || center.name,
          centerId: center.id,
          room: room.name || roomId,
        }, centers);
      }
      await Promise.all([refreshHouseholds(), refreshPlacements()]);
      setToastMsg(`Assigned to ${room.name || roomId}.`);
    } catch (error) {
      console.error('Could not save household room assignment:', error);
      setToastMsg(`Could not assign room: ${error.message || 'Please try again.'}`);
    }
    setTimeout(() => setToastMsg(''), 4000);
  };

  /* ── Register / Edit ── */
  const openRegister = () => {
    setShowHouseholdReview(false);
    const defaultCenterObj = centers[0];
    const defaultCenter = defaultCenterObj?.displayName || defaultCenterObj?.name || '';
    const emptyForm = {
      head: '', headFirstName: '', headMiddleName: '', headLastName: '',
      age: '', sex: 'Male', barangay: '', purok: '', headOccupation: '',
      center: defaultCenter, room: defaultCenterObj?.rooms?.[0]?.name || 'Unassigned',
      vulnerabilities: [], members: [], monthlyIncome: '',
      hasWorkedDole: null, doleEmploymentYear: '',
      hasReceivedGovernmentAssistance: null, govAssistanceAvailed: [],
      governmentAssistanceYear: '', hasReceivedReliefAssistance: null,
      otherIncomeSource: '', floodDepthLevel: '', characteristicsRemarks: '',
    };
    let restoredForm = null;
    setDraftRestored(false);
    setValidationErrors({});
    setRegistrationSaveError('');
    try {
      const savedDraft = window.sessionStorage.getItem(MOBILE_HOUSEHOLD_DRAFT_KEY);
      if (savedDraft) {
        const parsedDraft = JSON.parse(savedDraft);
        if (parsedDraft && typeof parsedDraft === 'object' && !Array.isArray(parsedDraft)) {
          restoredForm = parsedDraft;
          setDraftRestored(true);
        } else {
          window.sessionStorage.removeItem(MOBILE_HOUSEHOLD_DRAFT_KEY);
        }
      }
      setDraftStorageError(false);
    } catch (error) {
      console.error('Could not restore the mobile household registration draft:', error);
      setDraftStorageError(true);
    }
    setActiveForm({
      ...emptyForm,
      ...restoredForm,
      members: Array.isArray(restoredForm?.members) ? restoredForm.members : [],
    });
    setModalMode('register');
  };
  const openEdit = (item, e) => {
    e.stopPropagation();
    setShowHouseholdReview(false);
    setDraftRestored(false);
    setValidationErrors({});
    setRegistrationSaveError('');
    const headNameParts = splitFullName(item.name || '');
    setActiveForm({
      id: item.id, head: item.name,
      headFirstName: headNameParts.firstName,
      headMiddleName: headNameParts.middleName,
      headLastName: headNameParts.lastName,
      age: item.age, sex: item.sex, center: item.center, room: item.room,
      barangay: item.barangay === 'Unassigned' ? '' : item.barangay,
      purok: item.purok === 'Unassigned' ? '' : item.purok,
      headOccupation: item.headOccupation || '',
      vulnerabilities: Array.isArray(item.vulnerabilities) ? item.vulnerabilities : [],
      members: (item.members || []).map((member) => ({
        ...member, ...splitFullName(member.name || ''),
      })),
      monthlyIncome: item.monthlyIncome ?? '',
      hasWorkedDole: item.hasWorkedDole ?? null,
      doleEmploymentYear: item.doleEmploymentYear ?? '',
      hasReceivedGovernmentAssistance: item.hasReceivedGovernmentAssistance ?? null,
      govAssistanceAvailed: Array.isArray(item.govAssistanceAvailed) ? item.govAssistanceAvailed : [],
      governmentAssistanceYear: item.governmentAssistanceYear ?? '',
      hasReceivedReliefAssistance: item.hasReceivedReliefAssistance ?? null,
      otherIncomeSource: item.otherIncomeSource || '',
      floodDepthLevel: item.floodDepthLevel || '',
      characteristicsRemarks: item.characteristicsRemarks || '',
    });
    setModalMode('edit');
  };
  const setHeadNamePart = (field, value) => {
    clearValidationError(field);
    setActiveForm((prev) => {
      const next = { ...prev, [field]: value };
      next.head = joinFullName({
        firstName: next.headFirstName,
        middleName: next.headMiddleName,
        lastName: next.headLastName,
      });
      return next;
    });
  };
  const setMemberNamePart = (index, field, value) => {
    clearValidationError(`member-${index}.${field}`);
    setActiveForm((prev) => {
      const members = [...prev.members];
      const member = { ...members[index], [field]: value };
      member.name = joinFullName({
        firstName: member.firstName,
        middleName: member.middleName,
        lastName: member.lastName,
      });
      members[index] = member;
      return { ...prev, members };
    });
  };
  const handleSaveHousehold = async (e, confirmReview = false) => {
    e?.preventDefault();
    let errors = {};
    if (modalMode === 'register') {
      errors = validateHouseholdRegistration(activeForm);
    } else {
      if (!activeForm.headFirstName?.trim()) errors.headFirstName = 'This field is required.';
      if (!activeForm.headLastName?.trim()) errors.headLastName = 'This field is required.';
    }
    setValidationErrors(errors);
    const firstInvalidField = Object.keys(errors)[0];
    if (firstInvalidField) {
      requestAnimationFrame(() => {
        const field = document.querySelector(`[data-validation-field="${firstInvalidField}"]`);
        field?.focus({ preventScroll: true });
        field?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      return;
    }

    if (!confirmReview) {
      setShowHouseholdReview(true);
      return;
    }

    setShowHouseholdReview(false);
    if (modalMode === 'register') {
      setIsSaving(true);
      setRegistrationSaveError('');
      const generatedCode = genStubCode();
      const tempId = `temp-${Date.now()}`;
      const newHousehold = {
        id: tempId,
        name: activeForm.head,
        age: Number(activeForm.age) || 30,
        sex: activeForm.sex,
        barangay: activeForm.barangay || 'Unassigned',
        purok: activeForm.purok || 'Unassigned',
        headOccupation: activeForm.headOccupation,
        center: activeForm.center,
        room: activeForm.room,
        vulnerabilities: activeForm.vulnerabilities || [],
        familyCount: 1 + activeForm.members.length,
        members: activeForm.members,
        monthlyIncome: Number(activeForm.monthlyIncome) || 0,
        hasWorkedDole: activeForm.hasWorkedDole,
        doleEmploymentYear: activeForm.doleEmploymentYear,
        hasReceivedGovernmentAssistance: activeForm.hasReceivedGovernmentAssistance,
        govAssistanceAvailed: activeForm.govAssistanceAvailed,
        governmentAssistanceYear: activeForm.governmentAssistanceYear,
        hasReceivedReliefAssistance: activeForm.hasReceivedReliefAssistance,
        otherIncomeSource: activeForm.otherIncomeSource,
        floodDepthLevel: activeForm.floodDepthLevel,
        characteristicsRemarks: activeForm.characteristicsRemarks,
        stubCode: generatedCode,
        stubIssued: false,
      };

      // Optimistic UI update
      setHouseholds((prev) => [newHousehold, ...prev]);
      setModalMode(null);

      // Async save to Supabase
      try {
        await createHousehold(
          {
            ...activeForm,
            stubCode: generatedCode,
            stubIssued: false,
          },
          centers,
          activeEvent?.status === 'Active' && activeEvent.id !== 'default-active-event'
            ? activeEvent.id
            : null
        );
        try {
          window.sessionStorage.removeItem(MOBILE_HOUSEHOLD_DRAFT_KEY);
          setDraftStorageError(false);
        } catch (error) {
          console.error('Household was saved, but its registration draft could not be cleared:', error);
          setDraftStorageError(true);
        }
        setDraftRestored(false);
        setToastMsg(`✓ Registered ${activeForm.head} with QR code ${generatedCode}!`);
        setTimeout(() => setToastMsg(''), 4000);
        await refreshHouseholds();
        setCurrentPage(1);
      } catch (err) {
        console.error('Could not save household to Supabase:', err);
        setHouseholds((prev) => prev.filter((household) => household.id !== tempId));
        setActiveForm(activeForm);
        setModalMode('register');
        setDraftRestored(true);
        setRegistrationSaveError('Could not save the household. Your draft has been kept; check your connection and try again.');
        setToastMsg('Could not save the household. Your registration draft has been kept; please try again.');
      } finally {
        setIsSaving(false);
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
                headOccupation: activeForm.headOccupation,
                center: activeForm.center,
                room: activeForm.room,
                vulnerabilities: activeForm.vulnerabilities || [],
                familyCount: 1 + activeForm.members.length,
                members: activeForm.members,
                monthlyIncome: Number(activeForm.monthlyIncome) || 0,
                hasWorkedDole: activeForm.hasWorkedDole,
                doleEmploymentYear: activeForm.doleEmploymentYear,
                hasReceivedGovernmentAssistance: activeForm.hasReceivedGovernmentAssistance,
                govAssistanceAvailed: activeForm.govAssistanceAvailed,
                governmentAssistanceYear: activeForm.governmentAssistanceYear,
                hasReceivedReliefAssistance: activeForm.hasReceivedReliefAssistance,
                otherIncomeSource: activeForm.otherIncomeSource,
                floodDepthLevel: activeForm.floodDepthLevel,
                characteristicsRemarks: activeForm.characteristicsRemarks,
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
    setActiveForm((p) => ({
      ...p,
      members: [...p.members, {
        name: '', firstName: '', middleName: '', lastName: '',
        age: '', sex: 'Female', relationship: 'Member',
        occupation: '', vulnerabilities: [],
        monthlyIncome: '', hasWorkedDole: null, doleEmploymentYear: '',
        hasReceivedGovernmentAssistance: null, govAssistanceAvailed: [],
        governmentAssistanceYear: '', hasReceivedReliefAssistance: null,
        otherIncomeSource: '', floodDepthLevel: '', characteristicsRemarks: '',
      }],
    }));
  const removeMember = (idx) => {
    setValidationErrors((previous) => Object.fromEntries(
      Object.entries(previous).filter(([field]) => !field.startsWith('member-'))
    ));
    setActiveForm((p) => ({ ...p, members: p.members.filter((_, i) => i !== idx) }));
  };
  const setYesNoValue = (target, index, field, choice) => {
    const value = choice === '' ? null : choice === 'Yes';
    const prefix = target === 'head' ? 'head' : `member-${index}`;
    clearValidationError(`${prefix}.${field}`);
    if (value !== true) {
      if (field === 'hasWorkedDole') clearValidationError(`${prefix}.doleEmploymentYear`);
      if (field === 'hasReceivedGovernmentAssistance') {
        clearValidationError(`${prefix}.govAssistanceAvailed`);
        clearValidationError(`${prefix}.governmentAssistanceYear`);
      }
    }
    const clearedFields = value === true
      ? {}
      : field === 'hasWorkedDole'
        ? { doleEmploymentYear: '' }
        : field === 'hasReceivedGovernmentAssistance'
          ? { govAssistanceAvailed: [], governmentAssistanceYear: '' }
          : {};

    setActiveForm((prev) => {
      if (target === 'head') {
        return { ...prev, [field]: value, ...clearedFields };
      }

      return {
        ...prev,
        members: prev.members.map((member, memberIndex) =>
          memberIndex === index
            ? { ...member, [field]: value, ...clearedFields }
            : member
        ),
      };
    });
  };
  const getYesNoChoice = ({ target, index, field }) => {
    const value = target === 'head'
      ? activeForm[field]
      : activeForm.members[index]?.[field];
    return value == null ? '' : value ? 'Yes' : 'No';
  };

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
            placeholder="Search household head or members"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
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
            onClick={() => {
              setFilterCenter('All Centers');
              setCurrentPage(1);
            }}
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
            onClick={() => {
              setFilterRoom('All Rooms');
              setCurrentPage(1);
            }}
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
            onClick={() => {
              setFilterStatus('All');
              setCurrentPage(1);
            }}
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
          household={displayedSelectedHousehold}
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
            setCurrentPage(1);
          }}
          onClose={() => setShowFilterSheet(false)}
        />
      )}

      {/* ── ROOM ASSIGNMENT SHEET ── */}
      {assigningHousehold && (
        <RoomAssignSheet
          household={displayedAssigningHousehold}
          centersList={centers}
          centerRooms={centerRooms}
          onAssign={handleAssignRoom}
          onClose={() => setAssigningHousehold(null)}
        />
      )}

      {/* ── REGISTER / EDIT MODAL ── */}
      {modalMode && (
        <div className="vin-mob-sheet-overlay" onClick={() => {
          setShowHouseholdReview(false);
          setModalMode(null);
        }}>
          <div className="vin-mob-sheet-content" onClick={(e) => e.stopPropagation()}>
            <div className="vin-mob-sheet-header">
              <h2 className="vin-mob-sheet-title">
                {modalMode === 'register' ? 'Register Household' : 'Edit Household'}
              </h2>
              <button type="button" className="vin-mob-sheet-close" onClick={() => {
                setShowHouseholdReview(false);
                setModalMode(null);
              }}>
                <X size={18} />
              </button>
            </div>
            <form noValidate onSubmit={handleSaveHousehold} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {modalMode === 'register' && draftRestored && (
                <div role="status" style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  color: '#1e40af',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                }}>
                  Your unfinished registration was restored. It will remain saved until the household is registered.
                </div>
              )}
              {modalMode === 'register' && draftStorageError && (
                <div role="alert" style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: '#fff7ed',
                  border: '1px solid #fed7aa',
                  color: '#9a3412',
                  fontSize: '0.85rem',
                }}>
                  This browser could not save the form draft. Keep this page open to avoid losing your entries.
                </div>
              )}
              {modalMode === 'register' && registrationSaveError && (
                <div role="alert" style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#991b1b',
                  fontSize: '0.85rem',
                }}>
                  {registrationSaveError}
                </div>
              )}
              <div className="vin-mob-input-group">
                <label className="vin-mob-input-label">HOUSEHOLD HEAD</label>
                <div className="vin-mob-household-name-row">
                  <ValidatedMobileField type="text" placeholder="First name" aria-label="First name" className="vin-mob-select"
                    field="headFirstName" errors={validationErrors}
                    value={activeForm.headFirstName} onChange={(e) => setHeadNamePart('headFirstName', e.target.value)} />
                  <input type="text" placeholder="Middle" aria-label="Middle name (optional)" className="vin-mob-select"
                    value={activeForm.headMiddleName} onChange={(e) => setHeadNamePart('headMiddleName', e.target.value)} />
                  <ValidatedMobileField type="text" placeholder="Last name" aria-label="Last name" className="vin-mob-select"
                    field="headLastName" errors={validationErrors}
                    value={activeForm.headLastName} onChange={(e) => setHeadNamePart('headLastName', e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="vin-mob-input-group">
                  <label className="vin-mob-input-label">AGE</label>
                  <ValidatedMobileField type="number" placeholder="45" className="vin-mob-select"
                    field="headAge" errors={validationErrors}
                    value={activeForm.age}
                    onChange={(e) => {
                      clearValidationError('headAge');
                      setActiveForm({ ...activeForm, age: e.target.value });
                    }} />
                </div>
                <div className="vin-mob-input-group">
                  <label className="vin-mob-input-label">GENDER</label>
                  <button type="button" className="vin-mob-select"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left' }}
                    onClick={() => setShowGenderPicker({ target: 'head' })}>
                    {activeForm.sex || 'Select gender'}<ChevronDown size={16} />
                  </button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="vin-mob-input-group">
                  <label className="vin-mob-input-label" htmlFor="mobile-barangay">BARANGAY</label>
                  <input id="mobile-barangay" type="text" maxLength={100} placeholder="Barangay"
                    className="vin-mob-select" value={activeForm.barangay}
                    onChange={(e) => setActiveForm({ ...activeForm, barangay: e.target.value })} />
                </div>
                <div className="vin-mob-input-group">
                  <label className="vin-mob-input-label" htmlFor="mobile-purok">PUROK / SITIO</label>
                  <input id="mobile-purok" type="text" maxLength={50} placeholder="Purok or sitio"
                    className="vin-mob-select" value={activeForm.purok}
                    onChange={(e) => setActiveForm({ ...activeForm, purok: e.target.value })} />
                </div>
              </div>
              <div className="vin-mob-input-group">
                <span className="vin-mob-input-label">HOUSEHOLD HEAD OCCUPATION</span>
                <button type="button" className="vin-mob-select"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left' }}
                  onClick={() => setShowFormChoicePicker({ target: 'head', field: 'headOccupation' })}>
                  {activeForm.headOccupation || 'Select occupation'}<ChevronDown size={16} />
                </button>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <span className="vin-mob-input-label">HOUSEHOLD HEAD PROFILE</span>
                <div className="vin-mob-input-group">
                  <label className="vin-mob-input-label" htmlFor="mobile-monthly-income">MONTHLY INCOME</label>
                  <ValidatedMobileField id="mobile-monthly-income" type="number" min="0" max="99999999.99" step="0.01" placeholder="0.00"
                    className="vin-mob-select" field="headMonthlyIncome" errors={validationErrors}
                    value={activeForm.monthlyIncome}
                    onChange={(e) => {
                      clearValidationError('headMonthlyIncome');
                      setActiveForm({ ...activeForm, monthlyIncome: e.target.value });
                    }} />
                </div>
                <div className="vin-mob-input-group">
                  <span className="vin-mob-input-label">WORKED IN DOLE BEFORE?</span>
                  <ValidatedMobileField as="button" id="mobile-worked-dole" type="button" className="vin-mob-select"
                    field="head.hasWorkedDole" errors={validationErrors}
                    aria-haspopup="dialog"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left' }}
                    onClick={() => setShowYesNoPicker({ target: 'head', field: 'hasWorkedDole', title: 'Worked in DOLE before?' })}>
                    {activeForm.hasWorkedDole == null ? 'Select yes or no' : activeForm.hasWorkedDole ? 'Yes' : 'No'}
                    <ChevronDown size={16} />
                  </ValidatedMobileField>
                </div>
                {activeForm.hasWorkedDole === true && (
                  <div className="vin-mob-input-group">
                    <label className="vin-mob-input-label" htmlFor="mobile-dole-year">WHEN? (YEAR)</label>
                    <ValidatedMobileField id="mobile-dole-year" type="number" min="1900" max={new Date().getFullYear()}
                      step="1" placeholder="Year" className="vin-mob-select"
                      field="head.doleEmploymentYear" errors={validationErrors}
                      value={activeForm.doleEmploymentYear}
                      onChange={(e) => {
                        clearValidationError('head.doleEmploymentYear');
                        setActiveForm((prev) => ({ ...prev, doleEmploymentYear: e.target.value }));
                      }} />
                  </div>
                )}
                <div className="vin-mob-input-group">
                  <span className="vin-mob-input-label">GOVERNMENT ASSISTANCE RECEIVED?</span>
                  <ValidatedMobileField as="button" id="mobile-government-assistance" type="button" className="vin-mob-select"
                    field="head.hasReceivedGovernmentAssistance" errors={validationErrors}
                    aria-haspopup="dialog"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left' }}
                    onClick={() => setShowYesNoPicker({ target: 'head', field: 'hasReceivedGovernmentAssistance', title: 'Government assistance received?' })}>
                    {activeForm.hasReceivedGovernmentAssistance == null ? 'Select yes or no' : activeForm.hasReceivedGovernmentAssistance ? 'Yes' : 'No'}
                    <ChevronDown size={16} />
                  </ValidatedMobileField>
                </div>
                {activeForm.hasReceivedGovernmentAssistance === true && (
                  <>
                    <div className="vin-mob-input-group">
                      <span className="vin-mob-input-label">AVAILABLE GOVERNMENT ASSISTANCE</span>
                      <ValidatedMobileField as="div" id="mobile-gov-assistance" className="vin-mob-select"
                        field="head.govAssistanceAvailed" errors={validationErrors}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                        onClick={() => setShowFormProfilePicker('govAssistanceAvailed')} role="button" tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && setShowFormProfilePicker('govAssistanceAvailed')}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {activeForm.govAssistanceAvailed.length
                            ? activeForm.govAssistanceAvailed.join(', ')
                            : 'Select assistance'}
                        </span>
                        <ChevronDown size={16} style={{ flexShrink: 0 }} />
                      </ValidatedMobileField>
                    </div>
                    <div className="vin-mob-input-group">
                      <label className="vin-mob-input-label" htmlFor="mobile-assistance-year">YEAR ACQUIRED</label>
                      <ValidatedMobileField id="mobile-assistance-year" type="number" min="1900" max={new Date().getFullYear()}
                        step="1" placeholder="Year" className="vin-mob-select"
                        field="head.governmentAssistanceYear" errors={validationErrors}
                        value={activeForm.governmentAssistanceYear}
                        onChange={(e) => {
                          clearValidationError('head.governmentAssistanceYear');
                          setActiveForm((prev) => ({ ...prev, governmentAssistanceYear: e.target.value }));
                        }} />
                    </div>
                  </>
                )}
                <div className="vin-mob-input-group">
                  <span className="vin-mob-input-label">RECEIVED ANY RELIEF ASSISTANCE?</span>
                  <ValidatedMobileField as="button" id="mobile-relief-assistance" type="button" className="vin-mob-select"
                    field="head.hasReceivedReliefAssistance" errors={validationErrors}
                    aria-haspopup="dialog"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left' }}
                    onClick={() => setShowYesNoPicker({ target: 'head', field: 'hasReceivedReliefAssistance', title: 'Received any relief assistance?' })}>
                    {activeForm.hasReceivedReliefAssistance == null ? 'Select yes or no' : activeForm.hasReceivedReliefAssistance ? 'Yes' : 'No'}
                    <ChevronDown size={16} />
                  </ValidatedMobileField>
                </div>
                <div className="vin-mob-input-group">
                  <label className="vin-mob-input-label" htmlFor="mobile-other-income-source">OTHER SOURCE OF INCOME</label>
                  <input id="mobile-other-income-source" type="text" maxLength={200}
                    placeholder="Other source of income" className="vin-mob-select"
                    value={activeForm.otherIncomeSource}
                    onChange={(e) => setActiveForm({ ...activeForm, otherIncomeSource: e.target.value })} />
                </div>
                <div className="vin-mob-input-group">
                  <span className="vin-mob-input-label">FLOOD DEPTH</span>
                  <div id="mobile-flood-depth" className="vin-mob-select"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                    onClick={() => setShowFormProfilePicker('floodDepthLevel')} role="button" tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setShowFormProfilePicker('floodDepthLevel')}>
                    <span>{activeForm.floodDepthLevel || 'Select flood depth'}</span>
                    <ChevronDown size={16} />
                  </div>
                </div>
                <div className="vin-mob-input-group">
                  <label className="vin-mob-input-label" htmlFor="mobile-characteristics-remarks">CHARACTERISTICS / REMARKS</label>
                  <textarea id="mobile-characteristics-remarks" placeholder="Additional household characteristics"
                    className="vin-mob-select" rows={3} value={activeForm.characteristicsRemarks}
                    onChange={(e) => setActiveForm({ ...activeForm, characteristicsRemarks: e.target.value })} />
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
                  <div className="vin-mob-member-top" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr)) auto', gap: 6 }}>
                    <ValidatedMobileField type="text" placeholder="First name" aria-label={`Member ${idx + 1} first name`} className="vin-mob-select"
                      field={`member-${idx}.firstName`} errors={validationErrors}
                      value={m.firstName ?? ''} onChange={(e) => setMemberNamePart(idx, 'firstName', e.target.value)}
                      style={{ padding: '8px', minWidth: 0 }} />
                    <input type="text" placeholder="Middle" aria-label={`Member ${idx + 1} middle name`} className="vin-mob-select"
                      value={m.middleName ?? ''} onChange={(e) => setMemberNamePart(idx, 'middleName', e.target.value)}
                      style={{ padding: '8px', minWidth: 0 }} />
                    <ValidatedMobileField type="text" placeholder="Last name" aria-label={`Member ${idx + 1} last name`} className="vin-mob-select"
                      field={`member-${idx}.lastName`} errors={validationErrors}
                      value={m.lastName ?? ''} onChange={(e) => setMemberNamePart(idx, 'lastName', e.target.value)}
                      style={{ padding: '8px', minWidth: 0 }} />
                    <button type="button" onClick={() => removeMember(idx)}
                      style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 6 }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.3fr', gap: 8 }}>
                    <ValidatedMobileField type="number" placeholder="Age" className="vin-mob-select" value={m.age}
                      field={`member-${idx}.age`} errors={validationErrors}
                      onChange={(e) => {
                        clearValidationError(`member-${idx}.age`);
                        const u = [...activeForm.members];
                        u[idx].age = e.target.value;
                        setActiveForm({ ...activeForm, members: u });
                      }}
                      style={{ padding: 8 }} />
                    <button type="button" className="vin-mob-select"
                      style={{ padding: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                      onClick={() => setShowGenderPicker({ target: 'member', index: idx })}>
                      {m.sex || 'Gender'}<ChevronDown size={14} />
                    </button>
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
                  <div className="vin-mob-input-group">
                    <span className="vin-mob-input-label">RELATIONSHIP TO HOUSEHOLD HEAD</span>
                    <button type="button" className="vin-mob-select"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left' }}
                      onClick={() => setShowFormChoicePicker({ target: 'member', index: idx, field: 'relationship' })}>
                      {m.relationship || 'Select relationship'}<ChevronDown size={14} />
                    </button>
                  </div>
                  <div className="vin-mob-input-group">
                    <span className="vin-mob-input-label">OCCUPATION</span>
                    <button type="button" className="vin-mob-select"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left', font: 'inherit', cursor: 'pointer' }}
                      onClick={() => setShowFormChoicePicker({ target: 'member', index: idx, field: 'occupation' })}>
                      {m.occupation || 'Select occupation'}<ChevronDown size={14} />
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
                    <span className="vin-mob-input-label">MEMBER PROFILE</span>
                    <div className="vin-mob-input-group">
                      <label className="vin-mob-input-label" htmlFor={`mobile-member-monthly-income-${idx}`}>MONTHLY INCOME</label>
                      <ValidatedMobileField id={`mobile-member-monthly-income-${idx}`} type="number" min="0" max="99999999.99" step="0.01"
                        placeholder="0.00" className="vin-mob-select" value={m.monthlyIncome ?? ''}
                        field={`member-${idx}.monthlyIncome`} errors={validationErrors}
                        onChange={(e) => {
                          clearValidationError(`member-${idx}.monthlyIncome`);
                          setActiveForm((prev) => ({
                            ...prev,
                            members: prev.members.map((member, index) =>
                              index === idx ? { ...member, monthlyIncome: e.target.value } : member
                            ),
                          }));
                        }} />
                    </div>
                    <div className="vin-mob-input-group">
                      <span className="vin-mob-input-label">WORKED IN DOLE BEFORE?</span>
                      <ValidatedMobileField as="button" id={`mobile-member-worked-dole-${idx}`} type="button" className="vin-mob-select"
                        field={`member-${idx}.hasWorkedDole`} errors={validationErrors}
                        aria-haspopup="dialog"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left' }}
                        onClick={() => setShowYesNoPicker({ target: 'member', index: idx, field: 'hasWorkedDole', title: `Worked in DOLE before? — Member #${idx + 1}` })}>
                        {m.hasWorkedDole == null ? 'Select yes or no' : m.hasWorkedDole ? 'Yes' : 'No'}
                        <ChevronDown size={16} />
                      </ValidatedMobileField>
                    </div>
                    {m.hasWorkedDole === true && (
                      <div className="vin-mob-input-group">
                        <label className="vin-mob-input-label" htmlFor={`mobile-member-dole-year-${idx}`}>WHEN? (YEAR)</label>
                        <ValidatedMobileField id={`mobile-member-dole-year-${idx}`} type="number" min="1900" max={new Date().getFullYear()}
                          step="1" placeholder="Year" className="vin-mob-select" value={m.doleEmploymentYear ?? ''}
                          field={`member-${idx}.doleEmploymentYear`} errors={validationErrors}
                          onChange={(e) => {
                            clearValidationError(`member-${idx}.doleEmploymentYear`);
                            setActiveForm((prev) => ({
                              ...prev,
                              members: prev.members.map((member, index) =>
                                index === idx ? { ...member, doleEmploymentYear: e.target.value } : member
                              ),
                            }));
                          }} />
                      </div>
                    )}
                    <div className="vin-mob-input-group">
                      <span className="vin-mob-input-label">GOVERNMENT ASSISTANCE RECEIVED?</span>
                      <ValidatedMobileField as="button" id={`mobile-member-government-assistance-${idx}`} type="button" className="vin-mob-select"
                        field={`member-${idx}.hasReceivedGovernmentAssistance`} errors={validationErrors}
                        aria-haspopup="dialog"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left' }}
                        onClick={() => setShowYesNoPicker({ target: 'member', index: idx, field: 'hasReceivedGovernmentAssistance', title: `Government assistance received? — Member #${idx + 1}` })}>
                        {m.hasReceivedGovernmentAssistance == null ? 'Select yes or no' : m.hasReceivedGovernmentAssistance ? 'Yes' : 'No'}
                        <ChevronDown size={16} />
                      </ValidatedMobileField>
                    </div>
                    {m.hasReceivedGovernmentAssistance === true && (
                      <>
                        <div className="vin-mob-input-group">
                          <span className="vin-mob-input-label">GOVERNMENT ASSISTANCE</span>
                          <ValidatedMobileField as="button" type="button" className="vin-mob-select"
                            field={`member-${idx}.govAssistanceAvailed`} errors={validationErrors}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left' }}
                            onClick={() => setShowMemberAssistancePicker(idx)}>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {m.govAssistanceAvailed?.length ? m.govAssistanceAvailed.join(', ') : 'Select assistance'}
                            </span>
                            <ChevronDown size={14} />
                          </ValidatedMobileField>
                        </div>
                        <div className="vin-mob-input-group">
                          <label className="vin-mob-input-label" htmlFor={`mobile-member-assistance-year-${idx}`}>YEAR ACQUIRED</label>
                          <ValidatedMobileField id={`mobile-member-assistance-year-${idx}`} type="number" min="1900" max={new Date().getFullYear()}
                            step="1" placeholder="Year" className="vin-mob-select" value={m.governmentAssistanceYear ?? ''}
                            field={`member-${idx}.governmentAssistanceYear`} errors={validationErrors}
                            onChange={(e) => {
                              clearValidationError(`member-${idx}.governmentAssistanceYear`);
                              setActiveForm((prev) => ({
                                ...prev,
                                members: prev.members.map((member, index) =>
                                  index === idx ? { ...member, governmentAssistanceYear: e.target.value } : member
                                ),
                              }));
                            }} />
                        </div>
                      </>
                    )}
                    <div className="vin-mob-input-group">
                      <span className="vin-mob-input-label">RECEIVED ANY RELIEF ASSISTANCE?</span>
                      <ValidatedMobileField as="button" id={`mobile-member-relief-assistance-${idx}`} type="button" className="vin-mob-select"
                        field={`member-${idx}.hasReceivedReliefAssistance`} errors={validationErrors}
                        aria-haspopup="dialog"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left' }}
                        onClick={() => setShowYesNoPicker({ target: 'member', index: idx, field: 'hasReceivedReliefAssistance', title: `Received any relief assistance? — Member #${idx + 1}` })}>
                        {m.hasReceivedReliefAssistance == null ? 'Select yes or no' : m.hasReceivedReliefAssistance ? 'Yes' : 'No'}
                        <ChevronDown size={16} />
                      </ValidatedMobileField>
                    </div>
                    <div className="vin-mob-input-group">
                      <label className="vin-mob-input-label" htmlFor={`mobile-member-other-income-${idx}`}>OTHER SOURCE OF INCOME</label>
                      <input id={`mobile-member-other-income-${idx}`} type="text" maxLength={200}
                        placeholder="Other source of income" className="vin-mob-select" value={m.otherIncomeSource || ''}
                        onChange={(e) => setActiveForm((prev) => ({
                          ...prev,
                          members: prev.members.map((member, index) =>
                            index === idx ? { ...member, otherIncomeSource: e.target.value } : member
                          ),
                        }))} />
                    </div>
                    <div className="vin-mob-input-group">
                      <label className="vin-mob-input-label" htmlFor={`mobile-member-flood-depth-${idx}`}>FLOOD DEPTH</label>
                      <select id={`mobile-member-flood-depth-${idx}`} className="vin-mob-select" value={m.floodDepthLevel || ''}
                        onChange={(e) => setActiveForm((prev) => ({
                          ...prev,
                          members: prev.members.map((member, index) =>
                            index === idx ? { ...member, floodDepthLevel: e.target.value } : member
                          ),
                        }))}>
                        <option value="">Select flood depth</option>
                        {HOUSEHOLD_PROFILE_OPTIONS.floodDepthLevel.map((level) => <option key={level} value={level}>{level}</option>)}
                      </select>
                    </div>
                    <div className="vin-mob-input-group">
                      <label className="vin-mob-input-label" htmlFor={`mobile-member-characteristics-${idx}`}>CHARACTERISTICS / REMARKS</label>
                      <textarea id={`mobile-member-characteristics-${idx}`} placeholder="Additional characteristics"
                        className="vin-mob-select" rows={3} value={m.characteristicsRemarks || ''}
                        onChange={(e) => setActiveForm((prev) => ({
                          ...prev,
                          members: prev.members.map((member, index) =>
                            index === idx ? { ...member, characteristicsRemarks: e.target.value } : member
                          ),
                        }))} />
                    </div>
                  </div>
                </div>
              ))}
              <button type="submit" className="vin-mob-sheet-submit-btn" disabled={isSaving}>
                {isSaving ? 'Saving household...' : 'Review Information'}
              </button>
            </form>
          </div>
        </div>
      )}
      {showHouseholdReview && modalMode && (
        <HouseholdReviewModal
          form={activeForm}
          mode={modalMode}
          isSaving={isSaving}
          onEdit={() => setShowHouseholdReview(false)}
          onConfirm={() => handleSaveHousehold(null, true)}
        />
      )}

      {/* ── FORM CENTER PICKER ── */}
      {showFormCenterPicker && (
        <CenterSelectSheet
          selected={activeForm.center}
          centersList={centers}
          showAllOption={false}
          allCentersSub="Select the evacuation center for this household"
          onSelect={(c) => {
            const selectedCenter = centers.find(
              (item) => item.displayName === c || item.name === c
            );
            setActiveForm((prev) => ({
              ...prev,
              center: c,
              room: selectedCenter?.rooms?.[0]?.name || 'Unassigned',
            }));
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
      {showFormProfilePicker && (
        <ProfileSelectSheet
          selected={activeForm[showFormProfilePicker]}
          options={HOUSEHOLD_PROFILE_OPTIONS[showFormProfilePicker]}
          multiple={showFormProfilePicker === 'govAssistanceAvailed'}
          selectImmediately={showFormProfilePicker === 'floodDepthLevel'}
          title={{
            govAssistanceAvailed: 'Select Government Assistance',
            floodDepthLevel: 'Select Flood Depth',
          }[showFormProfilePicker]}
          otherMaxLength={showFormProfilePicker === 'floodDepthLevel' ? 50 : 100}
          onSelect={(value) => {
            if (showFormProfilePicker === 'govAssistanceAvailed') {
              clearValidationError('head.govAssistanceAvailed');
            }
            setActiveForm((prev) => ({
              ...prev,
              [showFormProfilePicker]: value,
            }));
          }}
          onClose={() => setShowFormProfilePicker(null)}
        />
      )}
      {showMemberAssistancePicker !== null && (
        <ProfileSelectSheet
          selected={activeForm.members[showMemberAssistancePicker]?.govAssistanceAvailed || []}
          options={HOUSEHOLD_PROFILE_OPTIONS.govAssistanceAvailed}
          multiple
          title={`Government Assistance for ${activeForm.members[showMemberAssistancePicker]?.name || `Member #${showMemberAssistancePicker + 1}`}`}
          onSelect={(value) => {
            clearValidationError(`member-${showMemberAssistancePicker}.govAssistanceAvailed`);
            setActiveForm((prev) => ({
              ...prev,
              members: prev.members.map((member, index) =>
                index === showMemberAssistancePicker ? { ...member, govAssistanceAvailed: value } : member
              ),
            }));
          }}
          onClose={() => setShowMemberAssistancePicker(null)}
        />
      )}
      {showGenderPicker && (
        <GenderSelectSheet
          selected={showGenderPicker.target === 'member'
            ? activeForm.members[showGenderPicker.index]?.sex
            : activeForm.sex}
          title={showGenderPicker.target === 'member'
            ? `Gender for ${activeForm.members[showGenderPicker.index]?.name || `Member #${showGenderPicker.index + 1}`}`
            : 'Select Household Head Gender'}
          onSelect={(sex) => {
            if (showGenderPicker.target === 'member') {
              setActiveForm((prev) => ({
                ...prev,
                members: prev.members.map((member, index) =>
                  index === showGenderPicker.index ? { ...member, sex } : member
                ),
              }));
            } else {
              setActiveForm((prev) => ({ ...prev, sex }));
            }
          }}
          onClose={() => setShowGenderPicker(null)}
        />
      )}
      {showYesNoPicker && (
        <ChoiceSelectSheet
          selected={getYesNoChoice(showYesNoPicker)}
          options={['Yes', 'No']}
          title={showYesNoPicker.title}
          onSelect={(choice) => setYesNoValue(
            showYesNoPicker.target,
            showYesNoPicker.index,
            showYesNoPicker.field,
            choice
          )}
          onClose={() => setShowYesNoPicker(null)}
        />
      )}
      {showFormChoicePicker && (
        <ChoiceSelectSheet
          selected={showFormChoicePicker.target === 'head'
            ? activeForm.headOccupation
            : activeForm.members[showFormChoicePicker.index]?.[showFormChoicePicker.field]}
          options={showFormChoicePicker.field === 'relationship' ? HOUSEHOLD_RELATIONSHIPS : OCCUPATION_OPTIONS}
          title={showFormChoicePicker.field === 'relationship'
            ? 'Select Relationship to Head'
            : showFormChoicePicker.target === 'head' ? 'Select Head Occupation' : 'Select Member Occupation'}
          allowOther={showFormChoicePicker.field === 'occupation'}
          onSelect={(value) => {
            if (showFormChoicePicker.target === 'head') {
              setActiveForm((prev) => ({ ...prev, headOccupation: value }));
            } else {
              setActiveForm((prev) => ({
                ...prev,
                members: prev.members.map((member, index) =>
                  index === showFormChoicePicker.index
                    ? { ...member, [showFormChoicePicker.field]: value }
                    : member
                ),
              }));
            }
          }}
          onClose={() => setShowFormChoicePicker(null)}
        />
      )}
    </div>
  );
}
