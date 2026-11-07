import { createElement, useState, useEffect, useMemo, useContext } from 'react';
import {
  Plus, User, Edit, X, Trash2,
  AlertTriangle, Ticket, Printer, Building,
  CheckCircle2, Clock, Users, ChevronLeft, ChevronRight,
  ChevronDown, LogOut, FileSpreadsheet, Download,
} from 'lucide-react';
import * as XLSX from 'xlsx';
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
  CategorySelectSheet,
  ProfileSelectSheet,
  GenderSelectSheet,
  ChoiceSelectSheet,
} from '../../components/CenterSelectSheet.jsx';
import {
  HOUSEHOLD_PROFILE_OPTIONS,
  HOUSEHOLD_RELATIONSHIPS,
  OCCUPATION_OPTIONS,
} from '../../lib/householdProfileOptions.js';
import { joinFullName, splitFullName } from '../../lib/householdNames.js';
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
import HouseholdReviewModal from '../../components/HouseholdReviewModal.jsx';

const ADMIN_HOUSEHOLD_DRAFT_KEY = 'mswdo.admin.household-registration-draft';
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
    validateAge(member.ageValue ?? member.age, `${prefix}.age`);
    validateIncome(member.monthlyIncome, `${prefix}.monthlyIncome`);
    validateProfile(member, prefix);
  });

  return errors;
}

function ValidatedField({ as: Control = 'input', field, errors, className = '', children, ...props }) {
  const error = errors[field];
  const errorId = `${field}-error`;

  return (
    <div className="vin-admin-validated-field">
      {createElement(Control, {
        ...props,
        className: `${className}${error ? ' vin-admin-field-invalid' : ''}`,
        'data-validation-field': field,
        'aria-invalid': error ? 'true' : undefined,
        'aria-describedby': error ? errorId : undefined,
      }, children)}
      {error && <span id={errorId} className="vin-admin-field-error" role="alert">{error}</span>}
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
      </script>
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
    <script>window.onload=()=>setTimeout(()=>window.print(), 200);</script>
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
  const {
    households,
    setHouseholds,
    refresh: refreshHouseholds,
    error: householdFetchError,
  } = useHouseholds(centers);
  const { rooms: databaseRooms } = useRooms(centers);
  const { selectedEvent, isReadOnly } = useContext(EventContext);
  const { placements, refresh: refreshPlacements } = useEventRoomPlacements(selectedEvent?.id);

  const [activeTab, setActiveTab] = useState('active');        // 'active' | 'masterlist'
  const [showExportPicker, setShowExportPicker] = useState(false);
  const [filterStub, setFilterStub] = useState('All');         // 'All' | 'Issued' | 'Not Issued'
  const [filterCenter, setFilterCenter] = useState('All Centers');
  const [filterRoom, setFilterRoom] = useState('All Rooms');
  const [search, setSearch] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const [selectedHousehold, setSelectedHousehold] = useState(null);
  const displayedSelectedHousehold = selectedHousehold
    ? households.find((item) => item.id === selectedHousehold.id) || selectedHousehold
    : null;
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
  const [showHouseholdReview, setShowHouseholdReview] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [registrationSaveError, setRegistrationSaveError] = useState('');
  const [draftRestored, setDraftRestored] = useState(false);
  const [draftStorageError, setDraftStorageError] = useState(false);
  const [isSavingHousehold, setIsSavingHousehold] = useState(false);

  /* ── Form picker for vulnerabilities ── */
  const [showFormCategoryPicker, setShowFormCategoryPicker] = useState(null); // null | { target: 'head' } | { target: 'member', index: number }
  const [showFormProfilePicker, setShowFormProfilePicker] = useState(null);
  const [showMemberAssistancePicker, setShowMemberAssistancePicker] = useState(null);
  const [showGenderPicker, setShowGenderPicker] = useState(null);
  const [showFormChoicePicker, setShowFormChoicePicker] = useState(null);

  const clearValidationError = (field) => {
    setValidationErrors((previous) => {
      if (!previous[field]) return previous;
      const next = { ...previous };
      delete next[field];
      return next;
    });
  };

  const [activeForm, setActiveForm] = useState({
    id: '',
    head: '',
    headFirstName: '',
    headMiddleName: '',
    headLastName: '',
    age: '',
    sex: 'Male',
    barangay: '',
    purok: '',
    headOccupation: '',
    center: 'Unassigned Center',
    room: 'Unassigned',
    vulnerabilities: [],
    members: [],
    monthlyIncome: '',
    hasWorkedDole: null,
    doleEmploymentYear: '',
    hasReceivedGovernmentAssistance: null,
    govAssistanceAvailed: [],
    governmentAssistanceYear: '',
    hasReceivedReliefAssistance: null,
    otherIncomeSource: '',
    floodDepthLevel: '',
    characteristicsRemarks: '',
  });

  useEffect(() => {
    if (modalMode !== 'register') return undefined;

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
        window.sessionStorage.setItem(ADMIN_HOUSEHOLD_DRAFT_KEY, JSON.stringify(activeForm));
      } else {
        window.sessionStorage.removeItem(ADMIN_HOUSEHOLD_DRAFT_KEY);
      }
      return undefined;
    } catch (error) {
      console.error('Could not save the admin household registration draft:', error);
      const errorTimer = window.setTimeout(() => setDraftStorageError(true), 0);
      return () => window.clearTimeout(errorTimer);
    }
  }, [activeForm, modalMode]);

  const currentEventPlacements = useMemo(
    () => placements.filter((placement) => placement.event_id === selectedEvent?.id),
    [placements, selectedEvent?.id]
  );
  const eventHouseholds = useMemo(() => {
    const placedHouseholds = currentEventPlacements
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
      .filter(Boolean);

    if (selectedEvent?.status !== 'Active') return placedHouseholds;

    const placedIds = new Set(placedHouseholds.map((household) => household.id));
    const unplacedActiveHouseholds = households
      .filter((household) => (
        household.evacueeStatus === 'Active' &&
        household.centerId &&
        !placedIds.has(household.id)
      ))
      .map((household) => ({
        ...household,
        placementId: null,
        eventId: selectedEvent.id,
      }));

    return [...placedHouseholds, ...unplacedActiveHouseholds];
  }, [currentEventPlacements, households, centers, databaseRooms, selectedEvent]);

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

  /* ── Room allocation calculations for Check-In / Assign Room ── */
  const selectedCenterObj = useMemo(() => {
    return (
      centers.find(
        (c) =>
          c.id === checkInCenterId ||
          c.displayName === checkInCenterId ||
          c.name === checkInCenterId
      ) || centers[0]
    );
  }, [centers, checkInCenterId]);

  const neededSlots = useMemo(() => {
    if (!checkInTarget) return 1;
    return (
      checkInTarget.familyCount ||
      (checkInTarget.members?.length ? checkInTarget.members.length + 1 : 1)
    );
  }, [checkInTarget]);

  const availableRoomsForCheckIn = useMemo(() => {
    if (!selectedCenterObj) return [];

    const matchingDbRooms = databaseRooms.filter(
      (r) =>
        r.centerId === selectedCenterObj.id ||
        r.center === selectedCenterObj.displayName ||
        r.center === selectedCenterObj.name
    );

    const baseRooms =
      matchingDbRooms.length > 0
        ? matchingDbRooms.map((r) => ({
            id: r.roomName,
            roomId: r.id,
            name: r.roomName,
            capacity: Number(r.capacity) || 30,
          }))
        : (selectedCenterObj.rooms || []).map((r) => ({
            id: r.name || r.id,
            roomId: r.id,
            name: r.name || r.id,
            capacity: Number(r.capacity) || 30,
          }));

    const effectiveRooms = baseRooms;

    const activePlacementsInCenter = currentEventPlacements.filter(
      (p) => p.status === 'Evacuated' && p.center_id === selectedCenterObj.id
    );

    const householdsMap = new Map(households.map((h) => [h.id, h]));

    return effectiveRooms.map((room) => {
      const roomOccupants = activePlacementsInCenter
        .filter(
          (p) =>
            p.room_id === room.roomId ||
            p.room_id === room.id ||
            p.room_name === room.name
        )
        .map((p) => householdsMap.get(p.household_id))
        .filter(Boolean);

      const occupied = roomOccupants.reduce(
        (sum, h) => sum + (h.familyCount || 1),
        0
      );

      return {
        ...room,
        occupied,
      };
    });
  }, [selectedCenterObj, databaseRooms, currentEventPlacements, households]);

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
      await issueHouseholdStub(
        hhId,
        selectedEvent?.id === 'default-active-event' ? null : selectedEvent?.id
      );
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
    if (event?.stopPropagation) event.stopPropagation();
    const defaultCenter = centers.find(
      (c) =>
        c.displayName === household.center ||
        c.name === household.center ||
        c.id === household.centerId
    ) || centers[0];

    setCheckInTarget(household);
    setCheckInCenterId(defaultCenter?.id || '');
    setCheckInRoom(household.room && household.room !== 'Unassigned' ? household.room : '');
    setCheckInError('');
  };

  const executeCheckIn = async (roomName, roomId = null) => {
    if (isReadOnly || !selectedEvent?.id) {
      setCheckInError('Select the active evacuation operation before checking in a household.');
      return;
    }
    if (!roomName) {
      setCheckInError('Please select a room to assign.');
      return;
    }

    setIsCheckingIn(true);
    setCheckInError('');
    try {
      await checkInHousehold({
        householdId: checkInTarget.id,
        centerId: checkInCenterId,
        roomId: roomId || undefined,
        roomName: roomName,
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

  const handleAutoAssign = () => {
    if (!availableRoomsForCheckIn.length) {
      setCheckInError('No rooms found in the selected evacuation center.');
      return;
    }

    const candidate = availableRoomsForCheckIn.find(
      (r) => r.name !== checkInTarget?.room && (r.capacity - r.occupied) >= neededSlots
    );

    if (!candidate) {
      setCheckInError(
        `Validation Error: No room in "${selectedCenterObj?.displayName || selectedCenterObj?.name}" has ${neededSlots} free slots! Please select another center.`
      );
      return;
    }

    setCheckInRoom(candidate.name || candidate.id);
    setCheckInError('');
    executeCheckIn(candidate.name || candidate.id, candidate.roomId);
  };

  const handleManualAssign = (room) => {
    const isCurrent =
      checkInTarget?.room === room.name &&
      checkInTarget?.center === selectedCenterObj?.displayName;
    if (isCurrent) {
      setCheckInError(`${checkInTarget?.name} is already assigned to ${room.name}.`);
      return;
    }

    const remaining = room.capacity - room.occupied;
    if (remaining < neededSlots) {
      setCheckInError(
        `Validation Failed: Room ${room.name} only has ${remaining} slots available, but ${checkInTarget?.name} needs ${neededSlots} slots.`
      );
      return;
    }

    setCheckInRoom(room.name || room.id);
    setCheckInError('');
    executeCheckIn(room.name || room.id, room.roomId);
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

  const exportHouseholdList = (exportType) => {
    const isActiveExport = exportType === 'Active evacuees';
    const exportHouseholds = isActiveExport ? activeEventHouseholds : households;
    if (exportHouseholds.length === 0) {
      setActionError(`There are no ${isActiveExport ? 'active evacuees' : 'households'} to export.`);
      return;
    }

    setActionError('');
    try {
      const householdRows = exportHouseholds.map((household) => ({
        'Household Code': household.householdCode || household.code || household.id,
        'Head of Family': household.name || '',
        'Head Age': household.age ?? '',
        'Head Sex': household.sex || '',
        'Head Occupation': household.headOccupation || '',
        'Family Size': household.familyCount || 1,
        Barangay: household.barangay || '',
        'Purok / Sitio': household.purok || '',
        'Evacuation Center': household.center || '',
        Room: household.room || '',
        'Evacuee Status': household.evacueeStatus || '',
        Vulnerabilities: (household.vulnerabilities || []).join('; '),
        'Stub Code': household.stubCode || '',
        'Stub Issued': household.stubIssued ? 'Yes' : 'No',
      }));
      const peopleRows = exportHouseholds.flatMap((household) => {
        const householdCode = household.householdCode || household.code || household.id;
        const sharedFields = {
          'Household Code': householdCode,
          'Head of Family': household.name || '',
          Barangay: household.barangay || '',
          'Purok / Sitio': household.purok || '',
        };
        return [
          {
            ...sharedFields,
            Name: household.name || '',
            Relationship: 'Head',
            Age: household.age ?? '',
            'Age Unit': 'Years',
            Sex: household.sex || '',
            Occupation: household.headOccupation || '',
            Vulnerabilities: (household.vulnerabilities || []).join('; '),
          },
          ...(household.members || []).map((member) => ({
            ...sharedFields,
            Name: member.name || '',
            Relationship: member.relationship || 'Member',
            Age: member.ageValue ?? member.age ?? '',
            'Age Unit': member.ageUnit || 'Years',
            Sex: member.sex || '',
            Occupation: member.occupation || '',
            Vulnerabilities: (member.vulnerabilities || []).join('; '),
          })),
        ];
      });

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(householdRows), 'Households');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(peopleRows), 'People');
      const eventLabel = selectedEvent?.event_name || 'current_operation';
      const safeLabel = (isActiveExport ? eventLabel : 'masterlist').replace(/[^a-z0-9]+/gi, '_');
      const listLabel = isActiveExport ? 'Active_Evacuees' : 'Masterlist';
      XLSX.writeFile(workbook, `${listLabel}_${safeLabel}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (error) {
      console.error('Could not export household list:', error);
      setActionError(`Could not export the ${isActiveExport ? 'active evacuees' : 'masterlist'}: ${error.message || 'Unknown error'}`);
    }
  };

  /* ── Register / Edit Form Handlers ── */
  const openRegister = () => {
    setShowHouseholdReview(false);
    const emptyForm = {
      id: `HH-00${households.length + 1}`,
      head: '',
      headFirstName: '',
      headMiddleName: '',
      headLastName: '',
      age: '',
      sex: 'Male',
      barangay: '',
      purok: '',
      headOccupation: '',
      center: 'Unassigned Center',
      room: 'Unassigned',
      vulnerabilities: [],
      members: [],
      monthlyIncome: '',
      hasWorkedDole: null,
      doleEmploymentYear: '',
      hasReceivedGovernmentAssistance: null,
      govAssistanceAvailed: [],
      governmentAssistanceYear: '',
      hasReceivedReliefAssistance: null,
      otherIncomeSource: '',
      floodDepthLevel: '',
      characteristicsRemarks: '',
    };
    let restoredForm = null;
    setDraftRestored(false);
    setValidationErrors({});
    setRegistrationSaveError('');
    try {
      const savedDraft = window.sessionStorage.getItem(ADMIN_HOUSEHOLD_DRAFT_KEY);
      if (savedDraft) {
        const parsedDraft = JSON.parse(savedDraft);
        if (parsedDraft && typeof parsedDraft === 'object' && !Array.isArray(parsedDraft)) {
          restoredForm = parsedDraft;
          setDraftRestored(true);
        } else {
          window.sessionStorage.removeItem(ADMIN_HOUSEHOLD_DRAFT_KEY);
        }
      }
      setDraftStorageError(false);
    } catch (error) {
      console.error('Could not restore the admin household registration draft:', error);
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
      id: item.id,
      head: item.name,
      headFirstName: headNameParts.firstName,
      headMiddleName: headNameParts.middleName,
      headLastName: headNameParts.lastName,
      age: item.age || 40,
      sex: item.sex || 'Male',
      barangay: item.barangay === 'Unassigned' ? '' : item.barangay,
      purok: item.purok === 'Unassigned' ? '' : item.purok,
      headOccupation: item.headOccupation || '',
      center: 'Unassigned Center',
      room: 'Unassigned',
      vulnerabilities: Array.isArray(item.vulnerabilities) ? item.vulnerabilities : [],
      members: (item.members || []).map((member) => ({
        ...member,
        ...splitFullName(member.name || ''),
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
      setRegistrationSaveError('');
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
      setIsSavingHousehold(true);
      setRegistrationSaveError('');
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
        headOccupation: activeForm.headOccupation,
        center: 'Unassigned Center',
        room: 'Unassigned',
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
      setHouseholds((prev) => [newH, ...prev]);
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
          centers,
          selectedEvent?.status === 'Active' && selectedEvent.id !== 'default-active-event'
            ? selectedEvent.id
            : null
        );
        try {
          window.sessionStorage.removeItem(ADMIN_HOUSEHOLD_DRAFT_KEY);
          setDraftStorageError(false);
        } catch (error) {
          console.error('Household was saved, but its admin registration draft could not be cleared:', error);
          setDraftStorageError(true);
        }
        setDraftRestored(false);
        await refreshHouseholds();
        setActiveTab('masterlist');
        setCurrentPage(1);
      } catch (err) {
        console.error('Could not save household to Supabase:', err);
        setHouseholds((prev) => prev.filter((household) => household.id !== tempId));
        setModalMode('register');
        setDraftRestored(true);
        setRegistrationSaveError('Could not save the household. Your draft has been kept; check your connection and try again.');
      } finally {
        setIsSavingHousehold(false);
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
            className="vin-admin-btn-export"
            onClick={() => {
              setActionError('');
              setShowExportPicker(true);
            }}
            disabled={households.length === 0 && activeEventHouseholds.length === 0}
          >
            <Download size={18} />
            <span>Export List</span>
          </button>
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

      {householdFetchError && (
        <div role="alert" style={{ color: '#b91c1c', marginBottom: 12 }}>
          Could not load households from the database: {householdFetchError}
          <button type="button" onClick={refreshHouseholds} style={{ marginLeft: 8 }}>
            Retry
          </button>
        </div>
      )}

      {showExportPicker && (
        <ChoiceSelectSheet
          selected=""
          options={[
            `Active evacuees (${activeEventHouseholds.length})`,
            `Masterlist (${households.length})`,
          ]}
          title="Choose a list to export"
          onSelect={(choice) => exportHouseholdList(
            choice.startsWith('Active evacuees') ? 'Active evacuees' : 'Masterlist'
          )}
          onClose={() => setShowExportPicker(false)}
          allowEmpty={false}
        />
      )}

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
          household={displayedSelectedHousehold}
          households={households}
          onIssue={issueStub}
          onDecamp={handleDecamp}
          readOnly={isReadOnly}
          onClose={() => setSelectedHousehold(null)}
        />
      )}

      {checkInTarget && (
        <div className="vin-admin-modal-overlay" onClick={() => setCheckInTarget(null)}>
          <div className="vin-admin-modal-card" style={{ maxWidth: '720px' }} onClick={(e) => e.stopPropagation()}>
            <div className="vin-admin-modal-header">
              <div>
                <h2 className="vin-admin-modal-title">Assign Room & Check-In</h2>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '.84rem' }}>
                  Allocate household to an available room with capacity validation • {selectedEvent?.event_name || 'Active Operation'}
                </p>
              </div>
              <button
                type="button"
                className="vin-admin-modal-close-btn"
                onClick={() => setCheckInTarget(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="vin-admin-modal-body" style={{ maxHeight: '78vh', overflowY: 'auto' }}>
              {/* Household Info Banner */}
              <div className="vin-room-hh-banner">
                <div className="vin-room-hh-left">
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: '50%',
                      background: '#ede9fe',
                      color: '#7c3aed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <User size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                      {checkInTarget.name}
                    </div>
                    <div
                      style={{
                        fontSize: '0.82rem',
                        color: '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginTop: 2,
                        flexWrap: 'wrap',
                      }}
                    >
                      <span>
                        <strong>{neededSlots}</strong> family {neededSlots === 1 ? 'member' : 'members'}
                      </span>
                      <span>•</span>
                      <span>
                        Current Room:{' '}
                        <strong
                          style={{
                            color:
                              checkInTarget.room && checkInTarget.room !== 'Unassigned'
                                ? '#16a34a'
                                : '#d97706',
                          }}
                        >
                          {checkInTarget.room && checkInTarget.room !== 'Unassigned'
                            ? checkInTarget.room
                            : 'Unassigned'}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Evacuation Center Selector */}
              <div className="vin-admin-form-group">
                <label
                  className="vin-admin-form-label"
                  htmlFor="check-in-center"
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Building size={14} color="#7c3aed" />
                  EVACUATION CENTER
                </label>
                <select
                  id="check-in-center"
                  className="vin-admin-form-select"
                  value={checkInCenterId}
                  onChange={(e) => {
                    setCheckInCenterId(e.target.value);
                    setCheckInRoom('');
                    setCheckInError('');
                  }}
                  required
                >
                  {centers.map((center) => (
                    <option key={center.id} value={center.id}>
                      {center.displayName || center.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Feedback Error Banner */}
              {checkInError && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#991b1b',
                    fontSize: '0.82rem',
                    marginTop: 10,
                  }}
                  role="alert"
                >
                  <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontWeight: 600 }}>{checkInError}</span>
                </div>
              )}

              {/* Room Capacity & Status Section Header with Auto-Assign */}
              <div className="vin-room-list-header">
                <span className="vin-room-list-title">ROOM CAPACITY & STATUS</span>
                <button
                  type="button"
                  className="vin-auto-assign-action-btn"
                  onClick={handleAutoAssign}
                  disabled={isCheckingIn || isReadOnly}
                >
                  Auto-Assign
                </button>
              </div>

              {/* Room Cards Grid */}
              <div className="vin-admin-room-cards-grid">
                {availableRoomsForCheckIn.map((room) => {
                  const remaining = Math.max(0, room.capacity - room.occupied);
                  const percentFilled = Math.min(
                    100,
                    Math.round((room.occupied / room.capacity) * 100)
                  );
                  const isCurrent =
                    checkInTarget.room === room.name &&
                    checkInTarget.center === selectedCenterObj?.displayName;
                  const isSelected = checkInRoom === room.name;
                  const hasCapacity = remaining >= neededSlots;
                  const isFull = remaining <= 0;

                  let cardCls = 'available';
                  if (isCurrent) cardCls = 'current';
                  else if (isSelected) cardCls = 'selected';
                  else if (isFull) cardCls = 'full';
                  else if (!hasCapacity) cardCls = 'insufficient';

                  return (
                    <div
                      key={room.id}
                      className={`vin-room-card-box ${cardCls}`}
                      onClick={() => {
                        if (hasCapacity && !isCurrent) {
                          setCheckInRoom(room.name || room.id);
                          setCheckInError('');
                        }
                      }}
                      style={{ cursor: hasCapacity && !isCurrent ? 'pointer' : 'default' }}
                    >
                      <div className="vin-room-card-top-row">
                        <div>
                          <div className="vin-room-card-id">{room.name || room.id}</div>
                          <div className="vin-room-card-subname">
                            Capacity: {room.capacity} persons
                          </div>
                        </div>

                        <span
                          className={`vin-room-status-chip ${
                            isCurrent
                              ? 'current'
                              : isFull
                              ? 'full'
                              : hasCapacity
                              ? 'available'
                              : 'low'
                          }`}
                        >
                          {isCurrent
                            ? 'Current Room'
                            : isFull
                            ? 'Full (0 free)'
                            : `${remaining} slots free`}
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="vin-room-progress-track">
                        <div
                          className={`vin-room-progress-bar ${
                            isFull ? 'full' : percentFilled > 75 ? 'warn' : 'ok'
                          }`}
                          style={{ width: `${percentFilled}%` }}
                        />
                      </div>

                      {/* Capacity stats */}
                      <div className="vin-room-card-stats-row">
                        <span>
                          Occupancy: <strong>{room.occupied}/{room.capacity}</strong> ({percentFilled}%)
                        </span>
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
                        disabled={isCurrent || !hasCapacity || isCheckingIn || isReadOnly}
                        className={`vin-room-select-btn ${
                          isCurrent ? 'btn-current' : hasCapacity ? 'btn-fit' : 'btn-disabled'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleManualAssign(room);
                        }}
                      >
                        {isCurrent
                          ? 'Current Room ✓'
                          : isSelected
                          ? `Assign Selected (${room.name})`
                          : hasCapacity
                          ? `Assign ${room.name}`
                          : 'Room Full / No Space'}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Actions */}
              <div className="vin-modal-actions" style={{ marginTop: 10 }}>
                <button
                  type="button"
                  className="vin-btn-cancel"
                  onClick={() => setCheckInTarget(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="vin-btn-submit"
                  disabled={isCheckingIn || isReadOnly || !checkInRoom}
                  onClick={() => executeCheckIn(checkInRoom)}
                >
                  {isCheckingIn
                    ? 'Assigning Room…'
                    : checkInRoom
                    ? `Confirm Room ${checkInRoom}`
                    : 'Select a Room Above'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Register / Edit Household Modal ── */}
      {modalMode && (
        <div className="vin-admin-modal-overlay" onClick={() => {
          setShowHouseholdReview(false);
          setModalMode(null);
        }}>
          <div className="vin-admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="vin-admin-modal-header">
              <h2 className="vin-admin-modal-title">
                {modalMode === 'register' ? 'Register New Household' : 'Edit Household Profile'}
              </h2>
              <button
                type="button"
                className="vin-admin-modal-close-btn"
                onClick={() => {
                  setShowHouseholdReview(false);
                  setModalMode(null);
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form noValidate onSubmit={handleSaveHousehold} className="vin-admin-modal-body">
              {modalMode === 'register' && draftRestored && (
                <div className="vin-admin-registration-notice" role="status">
                  Your unfinished registration was restored. It will remain saved until the household is registered.
                </div>
              )}
              {modalMode === 'register' && draftStorageError && (
                <div className="vin-admin-registration-error" role="alert">
                  This browser could not save the form draft. Keep this page open to avoid losing your entries.
                </div>
              )}
              {modalMode === 'register' && registrationSaveError && (
                <div className="vin-admin-registration-error" role="alert">
                  {registrationSaveError}
                </div>
              )}
              <div className="vin-admin-form-group">
                <label className="vin-admin-form-label">HOUSEHOLD HEAD NAME</label>
                <div className="vin-admin-form-row vin-admin-household-name-row">
                  <ValidatedField aria-label="First name" type="text" placeholder="First name" className="vin-admin-form-input"
                    field="headFirstName" errors={validationErrors}
                    value={activeForm.headFirstName} onChange={(e) => setHeadNamePart('headFirstName', e.target.value)} />
                  <input aria-label="Middle name" type="text" placeholder="Middle name (optional)" className="vin-admin-form-input"
                    value={activeForm.headMiddleName} onChange={(e) => setHeadNamePart('headMiddleName', e.target.value)} />
                  <ValidatedField aria-label="Last name" type="text" placeholder="Last name" className="vin-admin-form-input"
                    field="headLastName" errors={validationErrors}
                    value={activeForm.headLastName} onChange={(e) => setHeadNamePart('headLastName', e.target.value)} />
                </div>
              </div>

              <div className="vin-admin-form-row">
                <div className="vin-admin-form-group">
                  <label className="vin-admin-form-label">AGE</label>
                  <ValidatedField
                    type="number"
                    placeholder="45"
                    className="vin-admin-form-input"
                    field="headAge"
                    errors={validationErrors}
                    value={activeForm.age}
                    onChange={(e) => {
                      clearValidationError('headAge');
                      setActiveForm({ ...activeForm, age: e.target.value });
                    }}
                  />
                </div>
                <div className="vin-admin-form-group">
                  <label className="vin-admin-form-label">GENDER</label>
                  <button
                    type="button"
                    className="vin-admin-form-select"
                    onClick={() => setShowGenderPicker({ target: 'head' })}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left' }}
                  >
                    {activeForm.sex || 'Select gender'}<ChevronDown size={16} />
                  </button>
                </div>
              </div>

              <div className="vin-admin-form-row">
                <div className="vin-admin-form-group">
                  <label className="vin-admin-form-label">BARANGAY</label>
                  <input
                    type="text"
                    maxLength={100}
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
                    maxLength={50}
                    placeholder="Purok or sitio"
                    className="vin-admin-form-input"
                    value={activeForm.purok}
                    onChange={(e) => setActiveForm({ ...activeForm, purok: e.target.value })}
                  />
                </div>
              </div>

              <div className="vin-admin-form-group">
                <span className="vin-admin-form-label">HOUSEHOLD HEAD OCCUPATION</span>
                <button type="button" className="vin-admin-form-select"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left' }}
                  onClick={() => setShowFormChoicePicker({ target: 'head', field: 'headOccupation' })}>
                  {activeForm.headOccupation || 'Select occupation'}<ChevronDown size={16} />
                </button>
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <span className="vin-admin-form-label">HOUSEHOLD HEAD PROFILE</span>
                <div className="vin-admin-form-group">
                  <label className="vin-admin-form-label" htmlFor="admin-monthly-income">MONTHLY INCOME</label>
                  <ValidatedField id="admin-monthly-income" type="number" min="0" max="99999999.99" step="0.01" placeholder="0.00"
                    className="vin-admin-form-input" field="headMonthlyIncome" errors={validationErrors}
                    value={activeForm.monthlyIncome}
                    onChange={(e) => {
                      clearValidationError('headMonthlyIncome');
                      setActiveForm({ ...activeForm, monthlyIncome: e.target.value });
                    }} />
                </div>
                <div className="vin-admin-form-group">
                  <label className="vin-admin-form-label" htmlFor="admin-worked-dole">WORKED IN DOLE BEFORE?</label>
                  <ValidatedField as="select" id="admin-worked-dole" className="vin-admin-form-select"
                    field="head.hasWorkedDole" errors={validationErrors}
                    value={activeForm.hasWorkedDole == null ? '' : String(activeForm.hasWorkedDole)}
                    onChange={(e) => {
                      const value = e.target.value;
                      clearValidationError('head.hasWorkedDole');
                      clearValidationError('head.doleEmploymentYear');
                      setActiveForm((prev) => ({
                        ...prev,
                        hasWorkedDole: value === '' ? null : value === 'true',
                        ...(value === 'true' ? {} : { doleEmploymentYear: '' }),
                      }));
                    }}>
                    <option value="">Select yes or no</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </ValidatedField>
                </div>
                {activeForm.hasWorkedDole === true && (
                  <div className="vin-admin-form-group">
                    <label className="vin-admin-form-label" htmlFor="admin-dole-year">WHEN? (YEAR)</label>
                    <ValidatedField id="admin-dole-year" type="number" min="1900" max={new Date().getFullYear()}
                      step="1" placeholder="Year" className="vin-admin-form-input"
                      field="head.doleEmploymentYear" errors={validationErrors}
                      value={activeForm.doleEmploymentYear}
                      onChange={(e) => {
                        clearValidationError('head.doleEmploymentYear');
                        setActiveForm((prev) => ({ ...prev, doleEmploymentYear: e.target.value }));
                      }} />
                  </div>
                )}
                <div className="vin-admin-form-group">
                  <label className="vin-admin-form-label" htmlFor="admin-government-assistance">GOVERNMENT ASSISTANCE RECEIVED?</label>
                  <ValidatedField as="select" id="admin-government-assistance" className="vin-admin-form-select"
                    field="head.hasReceivedGovernmentAssistance" errors={validationErrors}
                    value={activeForm.hasReceivedGovernmentAssistance == null ? '' : String(activeForm.hasReceivedGovernmentAssistance)}
                    onChange={(e) => {
                      const value = e.target.value;
                      clearValidationError('head.hasReceivedGovernmentAssistance');
                      clearValidationError('head.govAssistanceAvailed');
                      clearValidationError('head.governmentAssistanceYear');
                      setActiveForm((prev) => ({
                        ...prev,
                        hasReceivedGovernmentAssistance: value === '' ? null : value === 'true',
                        ...(value === 'true' ? {} : { govAssistanceAvailed: [], governmentAssistanceYear: '' }),
                      }));
                    }}>
                    <option value="">Select yes or no</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </ValidatedField>
                </div>
                {activeForm.hasReceivedGovernmentAssistance === true && (
                  <>
                    <div className="vin-admin-form-group">
                      <span className="vin-admin-form-label">AVAILABLE GOVERNMENT ASSISTANCE</span>
                      <ValidatedField as="div" id="admin-gov-assistance" className="vin-admin-form-select"
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
                      </ValidatedField>
                    </div>
                    <div className="vin-admin-form-group">
                      <label className="vin-admin-form-label" htmlFor="admin-assistance-year">YEAR ACQUIRED</label>
                      <ValidatedField id="admin-assistance-year" type="number" min="1900" max={new Date().getFullYear()}
                        step="1" placeholder="Year" className="vin-admin-form-input"
                        field="head.governmentAssistanceYear" errors={validationErrors}
                        value={activeForm.governmentAssistanceYear}
                        onChange={(e) => {
                          clearValidationError('head.governmentAssistanceYear');
                          setActiveForm((prev) => ({ ...prev, governmentAssistanceYear: e.target.value }));
                        }} />
                    </div>
                  </>
                )}
                <div className="vin-admin-form-group">
                  <label className="vin-admin-form-label" htmlFor="admin-relief-assistance">RECEIVED ANY RELIEF ASSISTANCE?</label>
                  <ValidatedField as="select" id="admin-relief-assistance" className="vin-admin-form-select"
                    field="head.hasReceivedReliefAssistance" errors={validationErrors}
                    value={activeForm.hasReceivedReliefAssistance == null ? '' : String(activeForm.hasReceivedReliefAssistance)}
                    onChange={(e) => {
                      const value = e.target.value;
                      clearValidationError('head.hasReceivedReliefAssistance');
                      setActiveForm((prev) => ({
                        ...prev,
                        hasReceivedReliefAssistance: value === '' ? null : value === 'true',
                      }));
                    }}>
                    <option value="">Select yes or no</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </ValidatedField>
                </div>
                <div className="vin-admin-form-group">
                  <label className="vin-admin-form-label" htmlFor="admin-other-income-source">OTHER SOURCE OF INCOME</label>
                  <input id="admin-other-income-source" type="text" maxLength={200}
                    placeholder="Other source of income" className="vin-admin-form-input"
                    value={activeForm.otherIncomeSource}
                    onChange={(e) => setActiveForm({ ...activeForm, otherIncomeSource: e.target.value })} />
                </div>
                <div className="vin-admin-form-group">
                  <span className="vin-admin-form-label">FLOOD DEPTH</span>
                  <div id="admin-flood-depth" className="vin-admin-form-select"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                    onClick={() => setShowFormProfilePicker('floodDepthLevel')} role="button" tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setShowFormProfilePicker('floodDepthLevel')}>
                    <span>{activeForm.floodDepthLevel || 'Select flood depth'}</span>
                    <ChevronDown size={16} />
                  </div>
                </div>
                <div className="vin-admin-form-group">
                  <span className="vin-admin-form-label">CHARACTERISTICS OF THE HOUSE</span>
                  <button type="button" id="admin-characteristics-remarks" className="vin-admin-form-select"
                    aria-haspopup="dialog"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left' }}
                    onClick={() => setShowFormChoicePicker({ target: 'head', field: 'characteristicsRemarks' })}>
                    <span>{activeForm.characteristicsRemarks || 'Select house characteristics'}</span>
                    <ChevronDown size={16} />
                  </button>
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
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr)) auto', gap: 8, alignItems: 'center' }}>
                        <ValidatedField
                          type="text"
                          aria-label={`Member ${idx + 1} first name`}
                          placeholder="First name"
                          className="vin-admin-form-input"
                          style={{ padding: '8px 12px', minWidth: 0 }}
                          field={`member-${idx}.firstName`}
                          errors={validationErrors}
                          value={m.firstName ?? ''}
                          onChange={(e) => setMemberNamePart(idx, 'firstName', e.target.value)}
                        />
                        <input
                          type="text"
                          aria-label={`Member ${idx + 1} middle name`}
                          placeholder="Middle"
                          className="vin-admin-form-input"
                          style={{ padding: '8px 12px', minWidth: 0 }}
                          value={m.middleName ?? ''}
                          onChange={(e) => setMemberNamePart(idx, 'middleName', e.target.value)}
                        />
                        <ValidatedField
                          type="text"
                          aria-label={`Member ${idx + 1} last name`}
                          placeholder="Last name"
                          className="vin-admin-form-input"
                          style={{ padding: '8px 12px', minWidth: 0 }}
                          field={`member-${idx}.lastName`}
                          errors={validationErrors}
                          value={m.lastName ?? ''}
                          onChange={(e) => setMemberNamePart(idx, 'lastName', e.target.value)}
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
                        <ValidatedField
                          type="number"
                          placeholder="Age"
                          className="vin-admin-form-input"
                          style={{ padding: '6px 10px' }}
                          field={`member-${idx}.age`}
                          errors={validationErrors}
                          value={m.ageValue ?? m.age ?? ''}
                          onChange={(e) => {
                            clearValidationError(`member-${idx}.age`);
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
                        <button
                          type="button"
                          className="vin-admin-form-select"
                          style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left' }}
                          onClick={() => setShowGenderPicker({ target: 'member', index: idx })}
                        >
                          {m.sex || 'Gender'}<ChevronDown size={14} />
                        </button>
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
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div className="vin-admin-form-group">
                          <span className="vin-admin-form-label">RELATIONSHIP TO HOUSEHOLD HEAD</span>
                          <button type="button" className="vin-admin-form-select"
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left' }}
                            onClick={() => setShowFormChoicePicker({ target: 'member', index: idx, field: 'relationship' })}>
                            {m.relationship || 'Select relationship'}<ChevronDown size={14} />
                          </button>
                        </div>
                        <div className="vin-admin-form-group">
                          <span className="vin-admin-form-label">OCCUPATION</span>
                          <button type="button" className="vin-admin-form-select"
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left', font: 'inherit' }}
                            onClick={() => setShowFormChoicePicker({ target: 'member', index: idx, field: 'occupation' })}>
                            {m.occupation || 'Select occupation'}<ChevronDown size={14} />
                          </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
                          <span className="vin-admin-form-label">MEMBER PROFILE</span>
                          <div className="vin-admin-form-group">
                            <label className="vin-admin-form-label" htmlFor={`admin-member-monthly-income-${idx}`}>MONTHLY INCOME</label>
                            <ValidatedField id={`admin-member-monthly-income-${idx}`} type="number" min="0" max="99999999.99" step="0.01"
                              placeholder="0.00" className="vin-admin-form-input" value={m.monthlyIncome ?? ''}
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
                          <div className="vin-admin-form-group">
                            <label className="vin-admin-form-label" htmlFor={`admin-member-worked-dole-${idx}`}>WORKED IN DOLE BEFORE?</label>
                            <ValidatedField as="select" id={`admin-member-worked-dole-${idx}`} className="vin-admin-form-select"
                              field={`member-${idx}.hasWorkedDole`} errors={validationErrors}
                              value={m.hasWorkedDole == null ? '' : String(m.hasWorkedDole)}
                              onChange={(e) => {
                                const value = e.target.value;
                                clearValidationError(`member-${idx}.hasWorkedDole`);
                                clearValidationError(`member-${idx}.doleEmploymentYear`);
                                setActiveForm((prev) => ({
                                  ...prev,
                                  members: prev.members.map((member, index) => index === idx
                                    ? {
                                        ...member,
                                        hasWorkedDole: value === '' ? null : value === 'true',
                                        ...(value === 'true' ? {} : { doleEmploymentYear: '' }),
                                      }
                                    : member),
                                }));
                              }}>
                              <option value="">Select yes or no</option>
                              <option value="true">Yes</option>
                              <option value="false">No</option>
                            </ValidatedField>
                          </div>
                          {m.hasWorkedDole === true && (
                            <div className="vin-admin-form-group">
                              <label className="vin-admin-form-label" htmlFor={`admin-member-dole-year-${idx}`}>WHEN? (YEAR)</label>
                              <ValidatedField id={`admin-member-dole-year-${idx}`} type="number" min="1900" max={new Date().getFullYear()}
                                step="1" placeholder="Year" className="vin-admin-form-input" value={m.doleEmploymentYear ?? ''}
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
                          <div className="vin-admin-form-group">
                            <label className="vin-admin-form-label" htmlFor={`admin-member-government-assistance-${idx}`}>GOVERNMENT ASSISTANCE RECEIVED?</label>
                            <ValidatedField as="select" id={`admin-member-government-assistance-${idx}`} className="vin-admin-form-select"
                              field={`member-${idx}.hasReceivedGovernmentAssistance`} errors={validationErrors}
                              value={m.hasReceivedGovernmentAssistance == null ? '' : String(m.hasReceivedGovernmentAssistance)}
                              onChange={(e) => {
                                const value = e.target.value;
                                clearValidationError(`member-${idx}.hasReceivedGovernmentAssistance`);
                                clearValidationError(`member-${idx}.govAssistanceAvailed`);
                                clearValidationError(`member-${idx}.governmentAssistanceYear`);
                                setActiveForm((prev) => ({
                                  ...prev,
                                  members: prev.members.map((member, index) => index === idx
                                    ? {
                                        ...member,
                                        hasReceivedGovernmentAssistance: value === '' ? null : value === 'true',
                                        ...(value === 'true' ? {} : { govAssistanceAvailed: [], governmentAssistanceYear: '' }),
                                      }
                                    : member),
                                }));
                              }}>
                              <option value="">Select yes or no</option>
                              <option value="true">Yes</option>
                              <option value="false">No</option>
                            </ValidatedField>
                          </div>
                          {m.hasReceivedGovernmentAssistance === true && (
                            <>
                              <div className="vin-admin-form-group">
                                <span className="vin-admin-form-label">GOVERNMENT ASSISTANCE</span>
                                <ValidatedField as="button" type="button" className="vin-admin-form-select"
                                  field={`member-${idx}.govAssistanceAvailed`} errors={validationErrors}
                                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left' }}
                                  onClick={() => setShowMemberAssistancePicker(idx)}>
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {m.govAssistanceAvailed?.length ? m.govAssistanceAvailed.join(', ') : 'Select assistance'}
                                  </span>
                                  <ChevronDown size={14} />
                                </ValidatedField>
                              </div>
                              <div className="vin-admin-form-group">
                                <label className="vin-admin-form-label" htmlFor={`admin-member-assistance-year-${idx}`}>YEAR ACQUIRED</label>
                                <ValidatedField id={`admin-member-assistance-year-${idx}`} type="number" min="1900" max={new Date().getFullYear()}
                                  step="1" placeholder="Year" className="vin-admin-form-input" value={m.governmentAssistanceYear ?? ''}
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
                          <div className="vin-admin-form-group">
                            <label className="vin-admin-form-label" htmlFor={`admin-member-relief-assistance-${idx}`}>RECEIVED ANY RELIEF ASSISTANCE?</label>
                            <ValidatedField as="select" id={`admin-member-relief-assistance-${idx}`} className="vin-admin-form-select"
                              field={`member-${idx}.hasReceivedReliefAssistance`} errors={validationErrors}
                              value={m.hasReceivedReliefAssistance == null ? '' : String(m.hasReceivedReliefAssistance)}
                              onChange={(e) => {
                                const value = e.target.value;
                                clearValidationError(`member-${idx}.hasReceivedReliefAssistance`);
                                setActiveForm((prev) => ({
                                  ...prev,
                                  members: prev.members.map((member, index) =>
                                    index === idx ? { ...member, hasReceivedReliefAssistance: value === '' ? null : value === 'true' } : member
                                  ),
                                }));
                              }}>
                              <option value="">Select yes or no</option>
                              <option value="true">Yes</option>
                              <option value="false">No</option>
                            </ValidatedField>
                          </div>
                          <div className="vin-admin-form-group">
                            <label className="vin-admin-form-label" htmlFor={`admin-member-other-income-${idx}`}>OTHER SOURCE OF INCOME</label>
                            <input id={`admin-member-other-income-${idx}`} type="text" maxLength={200}
                              placeholder="Other source of income" className="vin-admin-form-input" value={m.otherIncomeSource || ''}
                              onChange={(e) => setActiveForm((prev) => ({
                                ...prev,
                                members: prev.members.map((member, index) =>
                                  index === idx ? { ...member, otherIncomeSource: e.target.value } : member
                                ),
                              }))} />
                          </div>
                          <div className="vin-admin-form-group">
                            <label className="vin-admin-form-label" htmlFor={`admin-member-flood-depth-${idx}`}>FLOOD DEPTH</label>
                            <select id={`admin-member-flood-depth-${idx}`} className="vin-admin-form-select" value={m.floodDepthLevel || ''}
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
                          <div className="vin-admin-form-group">
                            <label className="vin-admin-form-label" htmlFor={`admin-member-characteristics-${idx}`}>CHARACTERISTICS / REMARKS</label>
                            <textarea id={`admin-member-characteristics-${idx}`} placeholder="Additional characteristics"
                              className="vin-admin-form-input" rows={3} value={m.characteristicsRemarks || ''}
                              onChange={(e) => setActiveForm((prev) => ({
                                ...prev,
                                members: prev.members.map((member, index) =>
                                  index === idx ? { ...member, characteristicsRemarks: e.target.value } : member
                                ),
                              }))} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button type="submit" className="vin-admin-modal-submit-btn" disabled={isSavingHousehold}>
                {isSavingHousehold
                  ? 'Saving household...'
                  : 'Review Information'}
              </button>
            </form>
          </div>
        </div>
      )}
      {showHouseholdReview && modalMode && (
        <HouseholdReviewModal
          form={activeForm}
          mode={modalMode}
          isSaving={isSavingHousehold}
          onEdit={() => setShowHouseholdReview(false)}
          onConfirm={() => handleSaveHousehold(null, true)}
        />
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
      {showFormChoicePicker && (
        <ChoiceSelectSheet
          selected={showFormChoicePicker.target === 'head'
            ? activeForm[showFormChoicePicker.field]
            : activeForm.members[showFormChoicePicker.index]?.[showFormChoicePicker.field]}
          options={
            showFormChoicePicker.field === 'relationship'
              ? HOUSEHOLD_RELATIONSHIPS
              : showFormChoicePicker.field === 'characteristicsRemarks'
                ? HOUSEHOLD_PROFILE_OPTIONS.houseCharacteristics
                : OCCUPATION_OPTIONS
          }
          title={showFormChoicePicker.field === 'relationship'
            ? 'Select Relationship to Head'
            : showFormChoicePicker.field === 'characteristicsRemarks'
              ? 'Characteristics of the House'
              : showFormChoicePicker.target === 'head' ? 'Select Head Occupation' : 'Select Member Occupation'}
          allowOther={showFormChoicePicker.field === 'occupation' || showFormChoicePicker.field === 'characteristicsRemarks'}
          onSelect={(value) => {
            if (showFormChoicePicker.target === 'head') {
              setActiveForm((prev) => ({ ...prev, [showFormChoicePicker.field]: value }));
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
