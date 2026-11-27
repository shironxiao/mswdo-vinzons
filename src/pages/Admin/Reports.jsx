import { Fragment, useContext, useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileSpreadsheet,
  Printer,
} from 'lucide-react';
import XLSX from 'xlsx-js-style';
import './Reports.css';
import { EventContext } from '../../context/eventContext.js';
import { useEvacuationCenters, isCenterMatch } from '../../lib/evacuationCenters.js';
import { fetchBarangayEvacuationAssignments } from '../../lib/barangayEvacuationAssignments.js';
import {
  normalizeHousehold,
  useEventRoomPlacements,
  useHouseholds,
} from '../../lib/householdService.js';

const AGE_GROUPS = [
  { label: 'INFANT (0-11 MOS)', min: 0, max: 1, units: 'months' },
  { label: 'TODDLER (1-2 YR)', min: 1, max: 3 },
  { label: 'PRE-SCHOOL (3-5 YR)', min: 3, max: 6 },
  { label: 'SCHOOL CHILD (6-12 YR)', min: 6, max: 13 },
  { label: 'TEENAGE (13-17 YR)', min: 13, max: 18 },
  { label: 'ADULT (18-59 YR)', min: 18, max: 60 },
  { label: 'ELDERLY (60 AND ABOVE)', min: 60, max: Infinity },
];

const DROMIC_COLUMN_COUNT = 28;
const MALE_COLUMNS = new Set([1, 3, 5, 7, 9, 11, 13, 17, 19, 22, 24, 26]);

const BORDER_THIN = {
  top: { style: 'thin', color: { rgb: '000000' } },
  bottom: { style: 'thin', color: { rgb: '000000' } },
  left: { style: 'thin', color: { rgb: '000000' } },
  right: { style: 'thin', color: { rgb: '000000' } },
};

function setWorksheetCellStyle(ws, r, c, style) {
  const ref = XLSX.utils.encode_cell({ r, c });
  if (!ws[ref]) {
    ws[ref] = { t: 's', v: '' };
  }
  ws[ref].s = style;
}

const STYLE_META_LABEL = {
  font: { bold: true, name: 'Arial', sz: 9 },
  alignment: { horizontal: 'left', vertical: 'center' },
  border: BORDER_THIN,
};

const STYLE_META_VALUE = {
  font: { name: 'Arial', sz: 9 },
  alignment: { horizontal: 'left', vertical: 'center' },
  border: BORDER_THIN,
};

const STYLE_META_TITLE = {
  font: { bold: true, name: 'Arial', sz: 12 },
  alignment: { horizontal: 'center', vertical: 'center' },
  border: BORDER_THIN,
};

const STYLE_HEAD_COL = {
  fill: { fgColor: { rgb: 'C6E0B4' } },
  font: { bold: true, name: 'Arial', sz: 9 },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border: BORDER_THIN,
};

const STYLE_AGE_BANNER = {
  fill: { fgColor: { rgb: 'FFF2CC' } },
  font: { bold: true, name: 'Arial', sz: 9 },
  alignment: { horizontal: 'center', vertical: 'center' },
  border: BORDER_THIN,
};

const STYLE_AGE_HEADER = {
  fill: { fgColor: { rgb: 'FFF2CC' } },
  font: { bold: true, name: 'Arial', sz: 8 },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border: BORDER_THIN,
};

const STYLE_AGE_SEX = {
  fill: { fgColor: { rgb: 'FFF2CC' } },
  font: { bold: true, name: 'Arial', sz: 8 },
  alignment: { horizontal: 'center', vertical: 'center' },
  border: BORDER_THIN,
};

const STYLE_VULN_HEADER = {
  fill: { fgColor: { rgb: 'FFE699' } },
  font: { bold: true, name: 'Arial', sz: 8 },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true, textRotation: 90 },
  border: BORDER_THIN,
};

const STYLE_VULN_SEX = {
  fill: { fgColor: { rgb: 'FFE699' } },
  font: { bold: true, name: 'Arial', sz: 8 },
  alignment: { horizontal: 'center', vertical: 'center' },
  border: BORDER_THIN,
};

const STYLE_DATA_NAME = {
  fill: { fgColor: { rgb: 'FFFFFF' } },
  font: { bold: true, name: 'Arial', sz: 9 },
  alignment: { horizontal: 'left', vertical: 'center' },
  border: BORDER_THIN,
};

const STYLE_DATA_MALE = {
  fill: { fgColor: { rgb: 'DDEBF7' } },
  font: { name: 'Arial', sz: 9 },
  alignment: { horizontal: 'center', vertical: 'center' },
  border: BORDER_THIN,
};

const STYLE_DATA_FEMALE = {
  fill: { fgColor: { rgb: 'FFFFFF' } },
  font: { name: 'Arial', sz: 9 },
  alignment: { horizontal: 'center', vertical: 'center' },
  border: BORDER_THIN,
};
const DISASTER_TYPES = [
  'Typhoon',
  'Flood',
  'Earthquake',
  'Fire',
  'Landslide',
  'Tsunami',
  'Storm Surge',
  'Other',
];

function getPaginationItems(currentPage, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  if (currentPage <= 4) return [1, 2, 3, 4, 5, '...', totalPages];
  if (currentPage >= totalPages - 3) {
    return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
}

function normalizedVulnerabilities(values = []) {
  return values.map((value) => String(value).toUpperCase().replace(/[^A-Z0-9]/g, ''));
}

function hasVulnerability(values, pattern) {
  return normalizedVulnerabilities(values).some((value) => value.includes(pattern));
}

function ageInYears(person) {
  const ageValue = Number(person.ageValue ?? person.age) || 0;
  const unit = String(person.ageUnit || 'Years').toLowerCase();
  if (unit.startsWith('month')) return ageValue / 12;
  if (unit.startsWith('day')) return ageValue / 365;
  return ageValue;
}

function personDromicRow(person, household, isHead) {
  const row = Array(DROMIC_COLUMN_COUNT).fill(0);
  const isFemale = String(person.sex || '').toLowerCase().startsWith('f');
  const sexOffset = isFemale ? 1 : 0;
  const years = ageInYears(person);
  const vulnerabilities = [
    ...(isHead ? household.vulnerabilities || [] : []),
    ...(person.vulnerabilities || []),
  ];

  let ageGroupIndex = AGE_GROUPS.findIndex((group) => years >= group.min && years < group.max);
  if (ageGroupIndex < 0 && String(person.ageUnit || '').toLowerCase().startsWith('month') && years < 1) {
    ageGroupIndex = 0;
  }
  if (ageGroupIndex >= 0) row[1 + ageGroupIndex * 2 + sexOffset] = 1;

  if (isFemale && hasVulnerability(vulnerabilities, 'PREGNANT')) row[15] = 1;
  if (isFemale && hasVulnerability(vulnerabilities, 'LACTAT')) row[16] = 1;
  if (isHead && years < 18) row[17 + sexOffset] = 1;
  if (isHead && hasVulnerability(vulnerabilities, 'SINGLEHEADED')) row[19 + sexOffset] = 1;
  if (isHead && (
    hasVulnerability(vulnerabilities, 'SOLOPARENT') ||
    hasVulnerability(vulnerabilities, 'SINGLEPARENT')
  )) row[21] = 1;
  if (hasVulnerability(vulnerabilities, 'DISABIL') || hasVulnerability(vulnerabilities, 'PWD')) {
    row[22 + sexOffset] = 1;
  }
  if (hasVulnerability(vulnerabilities, 'INDIGENOUS') || hasVulnerability(vulnerabilities, 'IP')) {
    row[24 + sexOffset] = 1;
  }
  if (hasVulnerability(vulnerabilities, '4PS') || hasVulnerability(vulnerabilities, 'FOURPS')) {
    row[26 + sexOffset] = 1;
  }

  row[0] = person.name || person.head_name || person.full_name || household.name || household.head_name || 'Unnamed';
  return row;
}

function buildDromicRows(households) {
  return households.map((household) => {
    const headName = household.name || household.head_name || household.householdHead || '';
    const head = {
      name: headName,
      age: household.age || household.head_age || 0,
      ageValue: household.ageValue ?? household.age ?? household.head_age ?? 0,
      ageUnit: household.ageUnit || 'Years',
      sex: household.sex || household.head_sex || '',
      vulnerabilities: household.vulnerabilities || [],
    };
    const headNameClean = String(headName).trim().toLowerCase();
    const members = (household.members || []).filter((member) => {
      const memberName = String(member.name || member.full_name || '').trim().toLowerCase();
      return (
        !member.isHead &&
        String(member.relationship || member.relationship_to_head || '').trim().toLowerCase() !== 'head' &&
        (!headNameClean || memberName !== headNameClean)
      );
    }).map((member) => ({
      ...member,
      name: member.name || member.full_name || '',
      age: member.age ?? 0,
      ageValue: member.ageValue ?? member.age_value ?? member.age ?? 0,
      ageUnit: member.ageUnit || member.age_unit || 'Years',
      sex: member.sex || '',
      vulnerabilities: member.vulnerabilities || [],
    }));
    const personRows = [
      personDromicRow(head, household, true),
      ...members.map((member) => personDromicRow(member, household, false)),
    ];
    const familyRow = [...personRows[0]];

    personRows.slice(1).forEach((personRow) => {
      for (let column = 1; column < DROMIC_COLUMN_COUNT; column += 1) {
        familyRow[column] += personRow[column];
      }
    });

    return familyRow;
  }).sort((a, b) =>
    String(a[0] || '').localeCompare(String(b[0] || ''), undefined, { sensitivity: 'base', numeric: true })
  );
}

function createDromicWorksheet({ barangay, disasterType, occurrenceDate, centerName, rows }) {
  const worksheetData = Array.from({ length: 7 }, () => Array(DROMIC_COLUMN_COUNT).fill(''));
  worksheetData[0][0] = 'NAME OF BARANGAY:';
  worksheetData[0][1] = barangay;
  worksheetData[0][22] = 'DROMIC REPORT';
  worksheetData[1][0] = 'TYPE OF DISASTER:';
  worksheetData[1][1] = disasterType;
  worksheetData[2][0] = 'DATE OF OCCURRENCE / PERIOD:';
  worksheetData[2][1] = occurrenceDate;
  worksheetData[3][0] = 'NAME OF EVACUATION CENTER:';
  worksheetData[3][1] = centerName;
  worksheetData[4][0] = 'NAME OF FAMILY HEAD/DEPENDENT';
  worksheetData[4][1] = 'SEX & AGE DISTRIBUTION OF IDPs INSIDE ECS';
  worksheetData[4][15] = 'PREGNANT';
  worksheetData[4][16] = 'LACTATING MOTHERS';
  worksheetData[4][17] = 'CHILD HEADED FAMILY';
  worksheetData[4][19] = 'SINGLE HEADED FAMILY';
  worksheetData[4][21] = 'SOLO PARENT';
  worksheetData[4][22] = 'PERSONS W/ DISABILITY';
  worksheetData[4][24] = 'INDIGENOUS PEOPLE (IPs)';
  worksheetData[4][26] = '4Ps BENEFICIARIES';

  AGE_GROUPS.forEach((group, index) => {
    const column = 1 + index * 2;
    worksheetData[5][column] = group.label;
    worksheetData[6][column] = 'M';
    worksheetData[6][column + 1] = 'F';
  });

  [17, 19, 22, 24, 26].forEach((column) => {
    worksheetData[6][column] = 'M';
    worksheetData[6][column + 1] = 'F';
  });

  const merges = [
    { s: { r: 0, c: 1 }, e: { r: 0, c: 21 } },
    { s: { r: 0, c: 22 }, e: { r: 0, c: 27 } },
    { s: { r: 1, c: 1 }, e: { r: 1, c: 27 } },
    { s: { r: 2, c: 1 }, e: { r: 2, c: 27 } },
    { s: { r: 3, c: 1 }, e: { r: 3, c: 27 } },
    { s: { r: 4, c: 0 }, e: { r: 6, c: 0 } },
    { s: { r: 4, c: 1 }, e: { r: 4, c: 14 } },
  ];

  AGE_GROUPS.forEach((_, index) => {
    const column = 1 + index * 2;
    merges.push({ s: { r: 5, c: column }, e: { r: 5, c: column + 1 } });
  });
  [15, 16, 21].forEach((column) => merges.push({
    s: { r: 4, c: column },
    e: { r: 6, c: column },
  }));
  [17, 19, 22, 24, 26].forEach((column) => merges.push({
    s: { r: 5, c: column },
    e: { r: 5, c: column + 1 },
  }));
  [[17, 18], [19, 20], [22, 23], [24, 25], [26, 27]].forEach(([start, end]) => {
    merges.push({ s: { r: 4, c: start }, e: { r: 4, c: end } });
  });

  const data = worksheetData.concat(
    rows.map((row) => row.map((cell, index) => (index > 0 && cell === 0 ? '' : cell)))
  );
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  worksheet['!merges'] = merges;
  worksheet['!cols'] = [{ wch: 34 }, ...Array.from({ length: DROMIC_COLUMN_COUNT - 1 }, () => ({ wch: 6 }))];
  worksheet['!rows'] = [
    { hpt: 22 }, { hpt: 22 }, { hpt: 22 }, { hpt: 22 },
    { hpt: 35 }, { hpt: 55 }, { hpt: 22 },
    ...rows.map(() => ({ hpt: 22 })),
  ];
  worksheet['!margins'] = { left: 0.2, right: 0.2, top: 0.3, bottom: 0.3, header: 0.1, footer: 0.1 };

  const totalRows = data.length;
  for (let r = 0; r < totalRows; r += 1) {
    for (let c = 0; c < DROMIC_COLUMN_COUNT; c += 1) {
      if (r < 4) {
        if (r === 0 && c >= 22) {
          setWorksheetCellStyle(worksheet, r, c, STYLE_META_TITLE);
        } else if (c === 0) {
          setWorksheetCellStyle(worksheet, r, c, STYLE_META_LABEL);
        } else {
          setWorksheetCellStyle(worksheet, r, c, STYLE_META_VALUE);
        }
      } else if (r === 4) {
        if (c === 0) {
          setWorksheetCellStyle(worksheet, r, c, STYLE_HEAD_COL);
        } else if (c <= 14) {
          setWorksheetCellStyle(worksheet, r, c, STYLE_AGE_BANNER);
        } else {
          setWorksheetCellStyle(worksheet, r, c, STYLE_VULN_HEADER);
        }
      } else if (r === 5) {
        if (c === 0) {
          setWorksheetCellStyle(worksheet, r, c, STYLE_HEAD_COL);
        } else if (c <= 14) {
          setWorksheetCellStyle(worksheet, r, c, STYLE_AGE_HEADER);
        } else {
          setWorksheetCellStyle(worksheet, r, c, STYLE_VULN_HEADER);
        }
      } else if (r === 6) {
        if (c === 0) {
          setWorksheetCellStyle(worksheet, r, c, STYLE_HEAD_COL);
        } else if (c <= 14) {
          setWorksheetCellStyle(worksheet, r, c, STYLE_AGE_SEX);
        } else if ([15, 16, 21].includes(c)) {
          setWorksheetCellStyle(worksheet, r, c, STYLE_VULN_HEADER);
        } else {
          setWorksheetCellStyle(worksheet, r, c, STYLE_VULN_SEX);
        }
      } else {
        if (c === 0) {
          setWorksheetCellStyle(worksheet, r, c, STYLE_DATA_NAME);
        } else if (MALE_COLUMNS.has(c)) {
          setWorksheetCellStyle(worksheet, r, c, STYLE_DATA_MALE);
        } else {
          setWorksheetCellStyle(worksheet, r, c, STYLE_DATA_FEMALE);
        }
      }
    }
  }

  return worksheet;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character]));
}

function buildDromicPrintHtml({ barangay, disasterType, occurrenceDate, centerName, rows }) {
  const ageHeaders = AGE_GROUPS.map((group) => `<th class="age-band" colspan="2">${escapeHtml(group.label)}</th>`).join('');
  const ageSexHeaders = AGE_GROUPS.map(() => '<th class="age-sex">M</th><th class="age-sex">F</th>').join('');
  const specialGroups = [
    'CHILD HEADED FAMILY',
    'SINGLE HEADED FAMILY',
    'PERSONS W/ DISABILITY',
    'INDIGENOUS PEOPLE (IPs)',
    '4Ps BENEFICIARIES',
  ];
  const specialHeaders = specialGroups.map((label) => `<th class="vulnerability-header vertical-text" colspan="2">${label}</th>`);
  const specialSexHeaders = specialGroups.map(() => '<th class="vulnerability-sex">M</th><th class="vulnerability-sex">F</th>').join('');
  const body = rows.map((row) => `<tr>${row.map((cell, index) => {
    let cellClass = 'female-cell';
    if (index === 0) cellClass = 'person-name';
    else if (MALE_COLUMNS.has(index)) cellClass = 'male-cell';
    return `<td class="${cellClass}">${escapeHtml(index > 0 && cell === 0 ? '' : cell || '')}</td>`;
  }).join('')}</tr>`).join('');

  return `<!doctype html><html><head><meta charset="utf-8"><title>DROMIC Report</title>
    <style>
      @page { size: landscape; margin: 8mm; }
      * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      body { font-family: Arial, sans-serif; color: #111; margin: 0; }
      .report-title { text-align: right; font-weight: 800; font-size: 14px; }
      .meta { border-collapse: collapse; width: 100%; margin-bottom: 4px; }
      .meta td { border: 1px solid #111; height: 24px; padding: 3px 6px; font-size: 10px; }
      .meta td:first-child { width: 220px; font-weight: 800; }
      .dromic { width: 100%; border-collapse: collapse; table-layout: fixed; }
      .dromic th, .dromic td { border: 1px solid #111; padding: 2px 1px; text-align: center; font-size: 8px; }
      .dromic thead th { background: #ffe699; font-weight: 800; }
      .dromic thead .family-name { background: #c6e0b4 !important; width: 210px; vertical-align: middle; }
      .dromic thead .age-band { background: #fff2cc !important; }
      .dromic thead .age-sex { background: #fff2cc !important; }
      .dromic thead .vulnerability-header { background: #ffe699 !important; }
      .dromic thead .vulnerability-sex { background: #ffe699 !important; }
      .dromic thead .vertical-text {
        writing-mode: vertical-rl;
        transform: rotate(180deg);
        white-space: normal;
        height: 120px;
        vertical-align: bottom;
        padding-bottom: 4px;
      }
      .dromic tbody tr { height: 20px; }
      .dromic thead { display: table-header-group; }
      .dromic tbody tr { break-inside: avoid; page-break-inside: avoid; }
      .dromic tbody .person-name { text-align: left; font-weight: 600; padding-left: 5px; background: #ffffff !important; }
      .dromic tbody .male-cell { background: #ddebf7 !important; text-align: center; }
      .dromic tbody .female-cell { background: #ffffff !important; text-align: center; }
      .scroll { overflow-x: auto; }
      @media print { .scroll { overflow: visible; } }
    </style></head><body>
    <table class="meta"><tbody>
      <tr><td>NAME OF BARANGAY:</td><td>${escapeHtml(barangay)}</td><td class="report-title" colspan="8">DROMIC REPORT</td></tr>
      <tr><td>TYPE OF DISASTER:</td><td colspan="9">${escapeHtml(disasterType)}</td></tr>
      <tr><td>DATE OF OCCURRENCE / PERIOD:</td><td colspan="9">${escapeHtml(occurrenceDate)}</td></tr>
      <tr><td>NAME OF EVACUATION CENTER:</td><td colspan="9">${escapeHtml(centerName)}</td></tr>
    </tbody></table>
    <div class="scroll"><table class="dromic"><thead>
      <tr><th class="family-name" rowspan="3">NAME OF FAMILY<br>HEAD/DEPENDENT</th>
        <th class="age-band" colspan="14">SEX &amp; AGE DISTRIBUTION OF IDPs INSIDE ECS</th>
        <th class="vulnerability-header vertical-text" rowspan="3">PREGNANT</th>
        <th class="vulnerability-header vertical-text" rowspan="3">LACTATING MOTHERS</th>
        ${specialHeaders.slice(0, 2).join('')}
        <th class="vulnerability-header vertical-text" rowspan="3">SOLO PARENT</th>
        ${specialHeaders.slice(2).join('')}
      </tr>
      <tr>${ageHeaders}${specialGroups.map(() => '<th class="vulnerability-header" colspan="2"></th>').join('')}</tr>
      <tr>${ageSexHeaders}${specialSexHeaders}</tr>
    </thead><tbody>${body}</tbody></table></div>
    <script>window.addEventListener('load', () => window.print());</script>
    </body></html>`;
}

function filterByDateRange(dateValue, startDate, endDate) {
  if (!startDate && !endDate) return true;
  if (!dateValue) return false;

  const itemDate = new Date(dateValue);
  if (isNaN(itemDate.getTime())) return false;

  const y = itemDate.getFullYear();
  const m = String(itemDate.getMonth() + 1).padStart(2, '0');
  const d = String(itemDate.getDate()).padStart(2, '0');
  const itemYmd = `${y}-${m}-${d}`;

  if (startDate && endDate) {
    const min = startDate <= endDate ? startDate : endDate;
    const max = startDate <= endDate ? endDate : startDate;
    return itemYmd >= min && itemYmd <= max;
  }
  if (startDate && !endDate) {
    return itemYmd === startDate;
  }
  if (!startDate && endDate) {
    return itemYmd <= endDate;
  }
  return true;
}

export default function Reports() {
  const { selectedEvent } = useContext(EventContext);
  const { centers } = useEvacuationCenters();
  const { households, totalCount: masterlistCount } = useHouseholds(centers, { fetchAll: true });
  const { placements } = useEventRoomPlacements(selectedEvent?.id, { includeMemberAgeDetails: true });
  const initialDisasterType = selectedEvent?.event_type || 'Typhoon';
  const [selectedCenterId, setSelectedCenterId] = useState('');
  const [barangayName, setBarangayName] = useState('');
  const [centerAssignments, setCenterAssignments] = useState([]);
  const [centerAssignmentsLoading, setCenterAssignmentsLoading] = useState(true);
  const [disasterType, setDisasterType] = useState(() => (
    DISASTER_TYPES.includes(initialDisasterType) ? initialDisasterType : 'Other'
  ));
  const [customDisasterType, setCustomDisasterType] = useState(() => (
    !DISASTER_TYPES.includes(initialDisasterType)
      ? initialDisasterType
      : ''
  ));
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const todayString = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [reportPage, setReportPage] = useState(1);
  const [reportPageSize, setReportPageSize] = useState(25);

  useEffect(() => {
    let isCurrent = true;
    fetchBarangayEvacuationAssignments()
      .then((rows) => {
        if (isCurrent) setCenterAssignments(Array.isArray(rows) ? rows : []);
      })
      .catch((err) => {
        console.warn('Could not load barangay assignments in Reports:', err);
      })
      .finally(() => {
        if (isCurrent) setCenterAssignmentsLoading(false);
      });
    return () => {
      isCurrent = false;
    };
  }, []);

  const selectedCenter = centers.find((center) => center.id === selectedCenterId) || centers[0];

  // Derive all active evacuee households for the current operation (matching EvacueeMonitoring)
  const eventHouseholds = useMemo(() => {
    const activePlacements = placements
      .filter((placement) => (
        placement.event_id === selectedEvent?.id &&
        (selectedEvent?.status === 'Active' ? placement.status === 'Evacuated' : true)
      ))
      .map((placement) => {
        const found = households.find((item) => item.id === placement.household_id);
        const household = found
          ? found
          : (placement.household ? normalizeHousehold(placement.household, centers) : null);
        if (!household) return null;
        const center = centers.find((item) => item.id === placement.center_id);
        return {
          ...household,
          center: center?.displayName || center?.name || household.center,
          centerId: placement.center_id || household.centerId,
          eventPlacement: placement,
        };
      })
      .filter(Boolean);

    if (selectedEvent?.status !== 'Active') return activePlacements;

    const placedIds = new Set(activePlacements.map((household) => household.id));
    const unplacedActiveHouseholds = households
      .filter((household) => (
        household.evacueeStatus === 'Active' &&
        household.centerId &&
        household.roomId &&
        household.room &&
        household.room !== 'Unassigned' &&
        household.room.trim().toLowerCase() !== 'unassigned' &&
        !placedIds.has(household.id)
      ))
      .map((household) => ({
        ...household,
        eventPlacement: {
          event_id: selectedEvent.id,
          center_id: household.centerId,
          room_id: household.roomId,
          status: 'Evacuated',
          check_in_at: household.createdAt,
          check_out_at: null,
        },
      }));

    return [...activePlacements, ...unplacedActiveHouseholds];
  }, [placements, selectedEvent, households, centers]);

  // All evacuees placed in the selected evacuation center for the current operation
  const centerEvacueesAll = useMemo(() => {
    if (!selectedCenter?.id) return [];
    return eventHouseholds.filter((household) => {
      const placement = household.eventPlacement;
      if (placement && placement.center_id === selectedCenter.id) return true;
      if (household.centerId === selectedCenter.id) return true;
      if (isCenterMatch(household.center, selectedCenter.displayName, centers)) return true;
      return false;
    });
  }, [eventHouseholds, selectedCenter, centers]);

  // Assigned barangays configured in barangay_evacuation_assignments for this center
  const assignedBarangaysForCenter = useMemo(() => {
    if (!selectedCenter?.id) return [];
    const assigned = centerAssignments.filter((a) => {
      const ids = Array.isArray(a.center_ids) && a.center_ids.length
        ? a.center_ids
        : Array.isArray(a.centerIds) && a.centerIds.length
          ? a.centerIds
          : [a.center_id].filter(Boolean);
      return ids.includes(selectedCenter.id);
    });
    return Array.from(new Set(assigned.map((a) => a.barangay).filter(Boolean))).sort();
  }, [selectedCenter, centerAssignments]);

  // Derived effective selected barangay (strictly from assigned barangays)
  const selectedBarangay = useMemo(() => {
    if (barangayName && assignedBarangaysForCenter.includes(barangayName)) {
      return barangayName;
    }
    return assignedBarangaysForCenter[0] || '';
  }, [barangayName, assignedBarangaysForCenter]);

  // Filtered evacuee households for the selected center, assigned barangay, and date range
  const centerHouseholds = useMemo(() => {
    if (!selectedCenter?.id) return [];

    return centerEvacueesAll.filter((household) => {
      // 1. Strictly filter to the assigned barangay of this center
      const targetBarangay = selectedBarangay || assignedBarangaysForCenter[0];
      if (targetBarangay) {
        if (household.barangay !== targetBarangay) return false;
      } else if (assignedBarangaysForCenter.length > 0) {
        if (!assignedBarangaysForCenter.includes(household.barangay)) return false;
      }

      // 2. Date range filter
      if (startDate || endDate) {
        const placement = household.eventPlacement;
        const dateVal =
          placement?.check_in_at ||
          placement?.created_at ||
          household.evacuatedAt ||
          household.createdAt;
        if (!filterByDateRange(dateVal, startDate, endDate)) {
          return false;
        }
      }

      return true;
    });
  }, [selectedCenter, centerEvacueesAll, selectedBarangay, assignedBarangaysForCenter, startDate, endDate]);

  const dromicRows = useMemo(() => buildDromicRows(centerHouseholds), [centerHouseholds]);
  const centerEvacueesCount = centerHouseholds.reduce(
    (total, household) => total + (household.familyCount || 1),
    0
  );
  const reportTotalPages = Math.max(1, Math.ceil(dromicRows.length / reportPageSize));
  const currentReportPage = Math.min(reportPage, reportTotalPages);
  const reportStartIndex = (currentReportPage - 1) * reportPageSize;
  const paginatedDromicRows = dromicRows.slice(reportStartIndex, reportStartIndex + reportPageSize);

  const headerBarangay = useMemo(() => {
    if (selectedBarangay && selectedBarangay !== 'ALL') return selectedBarangay;
    if (assignedBarangaysForCenter.length === 1) return assignedBarangaysForCenter[0];
    if (assignedBarangaysForCenter.length > 1) return assignedBarangaysForCenter.join(', ');
    return 'All Barangays';
  }, [selectedBarangay, assignedBarangaysForCenter]);

  const headerDisaster = disasterType === 'Other'
    ? customDisasterType.trim() || 'Other'
    : disasterType || selectedEvent?.event_type || 'Disaster';

  const headerDate = useMemo(() => {
    if (startDate && endDate) {
      if (startDate === endDate) return startDate;
      return `${startDate} to ${endDate}`;
    }
    if (startDate) return startDate;
    if (endDate) return `Up to ${endDate}`;
    if (selectedEvent?.declared_at) {
      return new Date(selectedEvent.declared_at).toISOString().slice(0, 10);
    }
    return 'All Dates';
  }, [startDate, endDate, selectedEvent]);

  // Overall operation KPI metrics
  const totalEvacuees = useMemo(() => {
    return eventHouseholds.reduce((sum, household) => sum + (household.familyCount || 1), 0);
  }, [eventHouseholds]);

  const activeCenterCount = useMemo(() => {
    const centersWithEvacuees = new Set();
    eventHouseholds.forEach((h) => {
      if (h.centerId) {
        centersWithEvacuees.add(h.centerId);
      } else if (h.center) {
        const match = centers.find((c) => isCenterMatch(h.center, c.displayName, centers));
        if (match) centersWithEvacuees.add(match.id);
      }
    });
    return centersWithEvacuees.size;
  }, [eventHouseholds, centers]);

  const issuedStubCount = useMemo(() => {
    return eventHouseholds.filter((household) => household.stubIssued).length;
  }, [eventHouseholds]);

  const handleDownloadDromic = () => {
    if (!selectedCenter) return;
    const worksheet = createDromicWorksheet({
      barangay: headerBarangay,
      disasterType: headerDisaster,
      occurrenceDate: headerDate,
      centerName: selectedCenter.displayName || selectedCenter.name,
      rows: dromicRows,
    });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'DROMIC Report');
    XLSX.writeFile(
      workbook,
      `DROMIC_${(selectedCenter.displayName || selectedCenter.name).replace(/[^a-z0-9]+/gi, '_')}_${headerDate || 'report'}.xlsx`
    );
  };

  const handlePrintDromic = () => {
    if (!selectedCenter) return;
    const previewWindow = window.open('', '_blank');
    if (!previewWindow) {
      window.alert('Please allow pop-ups to open the DROMIC print preview.');
      return;
    }

    previewWindow.document.open();
    previewWindow.document.write(buildDromicPrintHtml({
      barangay: headerBarangay,
      disasterType: headerDisaster,
      occurrenceDate: headerDate,
      centerName: selectedCenter.displayName || selectedCenter.name,
      rows: dromicRows,
    }));
    previewWindow.document.close();
  };

  return (
    <div className="vin-reports-page">
      <header className="vin-reports-header">
        <span className="vin-reports-eyebrow">RECORDS &amp; EXPORT</span>
        <h1 className="vin-reports-title">Reports</h1>
        <p className="vin-reports-desc">
          Reports for {selectedEvent?.event_name || 'the selected evacuation operation'}
          {selectedEvent?.status !== 'Active' ? ' (historical, read-only)' : ''}.
        </p>
      </header>

      <section className="vin-reports-metrics-grid">
        <div className="vin-rep-metric-card card-green">
          <span className="vin-rep-metric-number">{activeCenterCount}</span>
          <span className="vin-rep-metric-label">Centers With Evacuees</span>
        </div>
        <div className="vin-rep-metric-card card-yellow">
          <span className="vin-rep-metric-number">{masterlistCount}</span>
          <span className="vin-rep-metric-label">Households On Masterlist</span>
        </div>
        <div className="vin-rep-metric-card card-yellow">
          <span className="vin-rep-metric-number">{totalEvacuees}</span>
          <span className="vin-rep-metric-label">Evacuees Across All Centers</span>
        </div>
        <div className="vin-rep-metric-card card-green">
          <span className="vin-rep-metric-number">{issuedStubCount}</span>
          <span className="vin-rep-metric-label">Relief Stubs Issued</span>
        </div>
      </section>

      <section className="dromic-report-card">
        <div className="dromic-report-heading">
          <div>
            <span className="vin-reports-eyebrow">OFFICIAL DSWD INCIDENT REPORT</span>
            <h2>DROMIC Report</h2>
            <p>Excel-style family and sex/age distribution table for one evacuation center.</p>
          </div>
          <div className="dromic-actions">
            <button type="button" className="vin-download-btn" onClick={handleDownloadDromic}>
              <FileSpreadsheet size={16} /> Download Excel
            </button>
            <button type="button" className="vin-download-btn dromic-print-btn" onClick={handlePrintDromic}>
              <Printer size={16} /> Print Preview
            </button>
          </div>
        </div>

        <div className="dromic-form-grid">
          <label>
            Evacuation center
            <select
              value={selectedCenter?.id || ''}
              onChange={(event) => {
                setSelectedCenterId(event.target.value);
                setBarangayName('');
                setReportPage(1);
              }}
            >
              {centers.map((center) => (
                <option key={center.id} value={center.id}>{center.displayName || center.name}</option>
              ))}
            </select>
          </label>
          <label>
            Name of barangay
            <select
              value={selectedBarangay}
              onChange={(event) => {
                setBarangayName(event.target.value);
                setReportPage(1);
              }}
              disabled={centerAssignmentsLoading || assignedBarangaysForCenter.length <= 1}
            >
              {centerAssignmentsLoading ? (
                <option value="">Loading assigned barangays...</option>
              ) : assignedBarangaysForCenter.length === 0 ? (
                <option value="">No assigned barangay</option>
              ) : (
                assignedBarangaysForCenter.map((barangay) => (
                  <option key={barangay} value={barangay}>{barangay}</option>
                ))
              )}
            </select>
          </label>
          <label>
            Type of disaster
            <div className="dromic-disaster-control">
              <select
                value={disasterType}
                onChange={(event) => {
                  setDisasterType(event.target.value);
                  if (event.target.value !== 'Other') setCustomDisasterType('');
                }}
              >
                {DISASTER_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
              {disasterType === 'Other' && (
                <input
                  value={customDisasterType}
                  onChange={(event) => setCustomDisasterType(event.target.value)}
                  placeholder="Type disaster"
                  aria-label="Other disaster type"
                />
              )}
            </div>
          </label>
          <label>
            Date from
            <input
              type="date"
              value={startDate}
              max={endDate || todayString}
              onChange={(event) => {
                const val = event.target.value;
                if (val && val > todayString) return;
                setStartDate(val);
                setReportPage(1);
              }}
              aria-label="Filter evacuees from date"
            />
          </label>
          <label>
            <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Date to</span>
              {(startDate || endDate) && (
                <button
                  type="button"
                  className="dromic-clear-dates-btn"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                    setReportPage(1);
                  }}
                >
                  Clear dates
                </button>
              )}
            </span>
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              max={todayString}
              onChange={(event) => {
                const val = event.target.value;
                if (val && val > todayString) return;
                setEndDate(val);
                setReportPage(1);
              }}
              aria-label="Filter evacuees to date"
            />
          </label>
        </div>

        <div className="dromic-preview-summary">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span>{selectedCenter?.displayName || selectedCenter?.name || 'No center selected'}</span>
            {(startDate || endDate) && (
              <span className="dromic-date-filter-badge">
                {startDate && endDate ? `${startDate} to ${endDate}` : startDate ? `${startDate}` : `Up to ${endDate}`}
                <button
                  type="button"
                  onClick={() => { setStartDate(''); setEndDate(''); setReportPage(1); }}
                  title="Clear date filter"
                  aria-label="Clear date filter"
                >
                  ✕
                </button>
              </span>
            )}
          </div>
          <span>
            {centerHouseholds.length} {centerHouseholds.length === 1 ? 'family' : 'families'} • {centerEvacueesCount} people
          </span>
        </div>
        <div className="dromic-meta-grid">
          <strong>NAME OF BARANGAY:</strong><span>{headerBarangay || '—'}</span>
          <strong>DROMIC REPORT</strong>
          <strong>TYPE OF DISASTER:</strong><span>{headerDisaster}</span><span />
          <strong>DATE / PERIOD:</strong><span>{headerDate || '—'}</span><span />
          <strong>NAME OF EVACUATION CENTER:</strong><span>{selectedCenter?.displayName || selectedCenter?.name || '—'}</span><span />
        </div>
        <div className={`dromic-table-wrap ${isPreviewOpen ? 'is-open' : ''}`}>
          <table className="dromic-table">
            <thead>
              <tr>
                <th className="family-name" rowSpan={3}>NAME OF FAMILY<br />HEAD/DEPENDENT</th>
                <th className="age-band" colSpan={14}>SEX &amp; AGE DISTRIBUTION OF IDPs INSIDE ECS</th>
                <th className="vulnerability-header" rowSpan={3}>PREGNANT</th>
                <th className="vulnerability-header" rowSpan={3}>LACTATING MOTHERS</th>
                <th className="vulnerability-header" colSpan={2}>CHILD HEADED FAMILY</th>
                <th className="vulnerability-header" colSpan={2}>SINGLE HEADED FAMILY</th>
                <th className="vulnerability-header" rowSpan={3}>SOLO PARENT</th>
                <th className="vulnerability-header" colSpan={2}>PERSONS W/ DISABILITY</th>
                <th className="vulnerability-header" colSpan={2}>INDIGENOUS PEOPLE (IPs)</th>
                <th className="vulnerability-header" colSpan={2}>4Ps BENEFICIARIES</th>
              </tr>
              <tr>
                {AGE_GROUPS.map((group) => <th key={group.label} className="age-group" colSpan={2}>{group.label}</th>)}
                {[0, 1, 2, 3, 4].map((group) => <th key={`sex-${group}`} className="vulnerability-header" colSpan={2} />)}
              </tr>
              <tr>
                {AGE_GROUPS.map((group) => <Fragment key={`sex-${group.label}`}><th className="age-sex">M</th><th className="age-sex">F</th></Fragment>)}
                {Array.from({ length: 5 }, (_, index) => <Fragment key={`special-${index}`}><th className="vulnerability-sex">M</th><th className="vulnerability-sex">F</th></Fragment>)}
              </tr>
            </thead>
            <tbody>
              {dromicRows.length === 0 ? (
                <tr>
                  <td colSpan={DROMIC_COLUMN_COUNT}>
                    {centerEvacueesAll.length === 0
                      ? 'No evacuee households are placed at this center for the current operation.'
                      : (startDate || endDate)
                        ? `No evacuee households found for the selected date (${headerDate}).`
                        : selectedBarangay && selectedBarangay !== 'ALL'
                          ? `No evacuee households from ${selectedBarangay} are placed at this center.`
                          : 'No households found matching the current filters.'}
                  </td>
                </tr>
              ) : paginatedDromicRows.map((row, index) => (
                <tr key={`${row[0]}-${index}`}>
                  {row.map((cell, cellIndex) => {
                    let cellClass = 'female-cell';
                    if (cellIndex === 0) cellClass = 'person-name';
                    else if (MALE_COLUMNS.has(cellIndex)) cellClass = 'male-cell';
                    return (
                      <td key={`${index}-${cellIndex}`} className={cellClass}>
                        {cellIndex > 0 && cell === 0 ? '' : cell || ''}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {dromicRows.length > 0 && (
          <div className="dromic-pagination">
            <div className="dromic-pagination-summary">
              <span>
                Showing <strong>{(reportStartIndex + 1).toLocaleString()}</strong>–
                <strong>{Math.min(reportStartIndex + reportPageSize, dromicRows.length).toLocaleString()}</strong>
                {' '}of <strong>{dromicRows.length.toLocaleString()}</strong> families
              </span>
              <label className="dromic-page-size">
                Rows:
                <select
                  value={reportPageSize}
                  onChange={(event) => {
                    setReportPageSize(Number(event.target.value));
                    setReportPage(1);
                  }}
                  aria-label="Rows per report page"
                >
                  {[10, 25, 50, 100].map((size) => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="dromic-page-controls">
              <button
                type="button"
                disabled={currentReportPage === 1}
                onClick={() => setReportPage(1)}
                title="First page"
                aria-label="First report page"
              >
                <ChevronsLeft size={16} />
              </button>
              <button
                type="button"
                disabled={currentReportPage === 1}
                onClick={() => setReportPage(Math.max(1, currentReportPage - 1))}
                title="Previous page"
                aria-label="Previous report page"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="dromic-page-numbers">
                {getPaginationItems(currentReportPage, reportTotalPages).map((item, index) => (
                  item === '...'
                    ? <span key={`dots-${index}`} aria-hidden="true">…</span>
                    : (
                      <button
                        key={item}
                        type="button"
                        className={Number(item) === currentReportPage ? 'active' : ''}
                        aria-current={Number(item) === currentReportPage ? 'page' : undefined}
                        onClick={() => setReportPage(Number(item))}
                      >
                        {item}
                      </button>
                    )
                ))}
              </div>
              <button
                type="button"
                disabled={currentReportPage === reportTotalPages}
                onClick={() => setReportPage(Math.min(reportTotalPages, currentReportPage + 1))}
                title="Next page"
                aria-label="Next report page"
              >
                <ChevronRight size={16} />
              </button>
              <button
                type="button"
                disabled={currentReportPage === reportTotalPages}
                onClick={() => setReportPage(reportTotalPages)}
                title="Last page"
                aria-label="Last report page"
              >
                <ChevronsRight size={16} />
              </button>
            </div>
          </div>
        )}
        <button type="button" className="dromic-expand-btn" onClick={() => setIsPreviewOpen((open) => !open)}>
          {isPreviewOpen ? 'Collapse table preview' : 'Expand table preview'}
        </button>
      </section>

    </div>
  );
}
