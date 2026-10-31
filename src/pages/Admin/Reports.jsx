import { Fragment, useContext, useMemo, useState } from 'react';
import { FileSpreadsheet, Printer } from 'lucide-react';
import * as XLSX from 'xlsx';
import './Reports.css';
import { EventContext } from '../../context/eventContext.js';
import { useEvacuationCenters } from '../../lib/evacuationCenters.js';
import { useEventRoomPlacements, useHouseholds } from '../../lib/householdService.js';

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
  if (isHead && hasVulnerability(vulnerabilities, 'SOLOPARENT')) row[21] = 1;
  if (hasVulnerability(vulnerabilities, 'DISABIL') || hasVulnerability(vulnerabilities, 'PWD')) {
    row[22 + sexOffset] = 1;
  }
  if (hasVulnerability(vulnerabilities, 'INDIGENOUS') || hasVulnerability(vulnerabilities, 'IP')) {
    row[24 + sexOffset] = 1;
  }
  if (hasVulnerability(vulnerabilities, '4PS') || hasVulnerability(vulnerabilities, 'FOURPS')) {
    row[26 + sexOffset] = 1;
  }

  row[0] = `${person.name || 'Unnamed'}${isHead ? ' (HEAD)' : ''}`;
  return row;
}

function buildDromicRows(households) {
  return households.flatMap((household) => {
    const head = {
      name: household.name,
      age: household.age,
      ageValue: household.age,
      ageUnit: 'Years',
      sex: household.sex,
      vulnerabilities: household.vulnerabilities || [],
    };
    return [
      personDromicRow(head, household, true),
      ...(household.members || []).map((member) => personDromicRow(member, household, false)),
    ];
  });
}

function createDromicWorksheet({ barangay, disasterType, occurrenceDate, centerName, rows }) {
  const worksheetData = Array.from({ length: 7 }, () => Array(DROMIC_COLUMN_COUNT).fill(''));
  worksheetData[0][0] = 'NAME OF BARANGAY:';
  worksheetData[0][1] = barangay;
  worksheetData[0][22] = 'DROMIC REPORT';
  worksheetData[1][0] = 'TYPE OF DISASTER:';
  worksheetData[1][1] = disasterType;
  worksheetData[2][0] = 'DATE OF OCCURRENCE:';
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
  worksheet['!cols'] = [{ wch: 36 }, ...Array.from({ length: DROMIC_COLUMN_COUNT - 1 }, () => ({ wch: 6 }))];
  worksheet['!rows'] = [
    { hpt: 24 }, { hpt: 24 }, { hpt: 24 }, { hpt: 24 },
    { hpt: 44 }, { hpt: 58 }, { hpt: 24 },
    ...rows.map(() => ({ hpt: 22 })),
  ];
  worksheet['!margins'] = { left: 0.2, right: 0.2, top: 0.3, bottom: 0.3, header: 0.1, footer: 0.1 };
  return worksheet;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character]));
}

function buildDromicPrintHtml({ barangay, disasterType, occurrenceDate, centerName, rows }) {
  const ageHeaders = AGE_GROUPS.map((group) => `<th colspan="2">${escapeHtml(group.label)}</th>`).join('');
  const ageSexHeaders = AGE_GROUPS.map(() => '<th>M</th><th>F</th>').join('');
  const specialGroups = [
    'CHILD HEADED FAMILY',
    'SINGLE HEADED FAMILY',
    'PERSONS W/ DISABILITY',
    'INDIGENOUS PEOPLE (IPs)',
    '4Ps BENEFICIARIES',
  ];
  const specialHeaders = specialGroups.map((label) => `<th colspan="2">${label}</th>`).join('');
  const specialSexHeaders = specialGroups.map(() => '<th>M</th><th>F</th>').join('');
  const body = rows.map((row) => `<tr>${row.map((cell, index) =>
    `<td class="${index === 0 ? 'person-name' : 'count'}">${escapeHtml(cell || '')}</td>`
  ).join('')}</tr>`).join('');

  return `<!doctype html><html><head><meta charset="utf-8"><title>DROMIC Report</title>
    <style>
      @page { size: landscape; margin: 8mm; }
      * { box-sizing: border-box; }
      body { font-family: Arial, sans-serif; color: #111; margin: 0; }
      .report-title { text-align: right; font-weight: 800; font-size: 15px; }
      .meta { border-collapse: collapse; width: 100%; margin-bottom: 4px; }
      .meta td { border: 1px solid #bbb; height: 25px; padding: 3px 6px; font-size: 11px; }
      .meta td:first-child { width: 220px; font-weight: 800; }
      .dromic { width: 100%; border-collapse: collapse; table-layout: fixed; }
      .dromic th, .dromic td { border: 1px solid #111; padding: 3px 2px; text-align: center; font-size: 8px; }
      .dromic thead th { background: #ffe699; font-weight: 800; }
      .dromic thead .age-band { background: #fff2cc; }
      .dromic thead .family-name { background: #c6e0b4; width: 210px; }
      .dromic tbody tr { height: 22px; }
      .dromic tbody td:nth-child(odd) { background: #ddebf7; }
      .dromic tbody .person-name { text-align: left; font-weight: 600; padding-left: 5px; background: #fff; }
      .dromic tbody .count { min-width: 20px; }
      .scroll { overflow-x: auto; }
      @media print { .scroll { overflow: visible; } }
    </style></head><body>
    <table class="meta"><tbody>
      <tr><td>NAME OF BARANGAY:</td><td>${escapeHtml(barangay)}</td><td class="report-title" colspan="8">DROMIC REPORT</td></tr>
      <tr><td>TYPE OF DISASTER:</td><td colspan="9">${escapeHtml(disasterType)}</td></tr>
      <tr><td>DATE OF OCCURRENCE:</td><td colspan="9">${escapeHtml(occurrenceDate)}</td></tr>
      <tr><td>NAME OF EVACUATION CENTER:</td><td colspan="9">${escapeHtml(centerName)}</td></tr>
    </tbody></table>
    <div class="scroll"><table class="dromic"><thead>
      <tr><th class="family-name" rowspan="3">NAME OF FAMILY<br>HEAD/DEPENDENT</th>
        <th class="age-band" colspan="14">SEX &amp; AGE DISTRIBUTION OF IDPs INSIDE ECS</th>
        <th rowspan="3">PREGNANT</th><th rowspan="3">LACTATING MOTHERS</th>
        ${specialHeaders}<th rowspan="3">SOLO PARENT</th></tr>
      <tr>${ageHeaders}${specialGroups.map(() => '<th colspan="2"></th>').join('')}</tr>
      <tr>${ageSexHeaders}${specialSexHeaders}</tr>
    </thead><tbody>${body}</tbody></table></div>
    <script>window.addEventListener('load', () => window.print());</script>
    </body></html>`;
}

export default function Reports() {
  const { selectedEvent } = useContext(EventContext);
  const { centers } = useEvacuationCenters();
  const { households } = useHouseholds(centers);
  const { placements } = useEventRoomPlacements(selectedEvent?.id);
  const [selectedCenterId, setSelectedCenterId] = useState('');
  const [barangayName, setBarangayName] = useState('');
  const [disasterType, setDisasterType] = useState(selectedEvent?.event_type || 'Typhoon');
  const [occurrenceDate, setOccurrenceDate] = useState(
    selectedEvent?.declared_at ? new Date(selectedEvent.declared_at).toISOString().slice(0, 10) : ''
  );
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const selectedCenter = centers.find((center) => center.id === selectedCenterId) || centers[0];
  const currentPlacements = useMemo(() => placements.filter((placement) => (
    placement.event_id === selectedEvent?.id &&
    (selectedEvent?.status === 'Active' ? placement.status === 'Evacuated' : true)
  )), [placements, selectedEvent?.id, selectedEvent?.status]);
  const eventHouseholds = useMemo(() => currentPlacements
    .map((placement) => {
      const household = households.find((item) => item.id === placement.household_id);
      return household ? { ...household, placement } : null;
    })
    .filter(Boolean), [currentPlacements, households]);
  const centerHouseholds = eventHouseholds.filter((household) =>
    household.placement.center_id === selectedCenter?.id
  );
  const dromicRows = useMemo(() => buildDromicRows(centerHouseholds), [centerHouseholds]);
  const headerBarangay = barangayName || selectedCenter?.location || '';
  const headerDisaster = disasterType || selectedEvent?.event_type || 'Disaster';
  const headerDate = occurrenceDate || (
    selectedEvent?.declared_at ? new Date(selectedEvent.declared_at).toLocaleDateString() : ''
  );
  const totalEvacuees = eventHouseholds.reduce((sum, household) => sum + (household.familyCount || 1), 0);
  const activeCenterCount = new Set(eventHouseholds.map((household) => household.placement.center_id)).size;
  const issuedStubCount = eventHouseholds.filter((household) => household.stubIssued).length;

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
          <span className="vin-rep-metric-number">{households.length}</span>
          <span className="vin-rep-metric-label">Households On Masterlist</span>
        </div>
        <div className="vin-rep-metric-card card-yellow">
          <span className="vin-rep-metric-number">{totalEvacuees}</span>
          <span className="vin-rep-metric-label">Evacuees In Selected Event</span>
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
                const center = centers.find((item) => item.id === event.target.value);
                setSelectedCenterId(event.target.value);
                setBarangayName(center?.location || '');
              }}
            >
              {centers.map((center) => (
                <option key={center.id} value={center.id}>{center.displayName || center.name}</option>
              ))}
            </select>
          </label>
          <label>
            Name of barangay
            <input value={headerBarangay} onChange={(event) => setBarangayName(event.target.value)} />
          </label>
          <label>
            Type of disaster
            <input value={headerDisaster} onChange={(event) => setDisasterType(event.target.value)} />
          </label>
          <label>
            Date of occurrence
            <input
              type="date"
              value={occurrenceDate || (selectedEvent?.declared_at ? new Date(selectedEvent.declared_at).toISOString().slice(0, 10) : '')}
              onChange={(event) => setOccurrenceDate(event.target.value)}
            />
          </label>
        </div>

        <div className="dromic-preview-summary">
          <span>{selectedCenter?.displayName || selectedCenter?.name || 'No center selected'}</span>
          <span>{centerHouseholds.length} family{centerHouseholds.length === 1 ? '' : 'ies'} • {dromicRows.length} people</span>
        </div>
        <div className="dromic-meta-grid">
          <strong>NAME OF BARANGAY:</strong><span>{headerBarangay || '—'}</span>
          <strong>DROMIC REPORT</strong>
          <strong>TYPE OF DISASTER:</strong><span>{headerDisaster}</span><span />
          <strong>DATE OF OCCURRENCE:</strong><span>{headerDate || '—'}</span><span />
          <strong>NAME OF EVACUATION CENTER:</strong><span>{selectedCenter?.displayName || selectedCenter?.name || '—'}</span><span />
        </div>
        <div className={`dromic-table-wrap ${isPreviewOpen ? 'is-open' : ''}`}>
          <table className="dromic-table">
            <thead>
              <tr>
                <th className="family-name" rowSpan={3}>NAME OF FAMILY<br />HEAD/DEPENDENT</th>
                <th className="age-band" colSpan={14}>SEX &amp; AGE DISTRIBUTION OF IDPs INSIDE ECS</th>
                <th rowSpan={3}>PREGNANT</th>
                <th rowSpan={3}>LACTATING MOTHERS</th>
                <th colSpan={2}>CHILD HEADED FAMILY</th>
                <th colSpan={2}>SINGLE HEADED FAMILY</th>
                <th rowSpan={3}>SOLO PARENT</th>
                <th colSpan={2}>PERSONS W/ DISABILITY</th>
                <th colSpan={2}>INDIGENOUS PEOPLE (IPs)</th>
                <th colSpan={2}>4Ps BENEFICIARIES</th>
              </tr>
              <tr>
                {AGE_GROUPS.map((group) => <th key={group.label} colSpan={2}>{group.label}</th>)}
                {[0, 1, 2, 3, 4].map((group) => <th key={`sex-${group}`} colSpan={2} />)}
              </tr>
              <tr>
                {AGE_GROUPS.map((group) => <Fragment key={`sex-${group.label}`}><th>M</th><th>F</th></Fragment>)}
                {Array.from({ length: 5 }, (_, index) => <Fragment key={`special-${index}`}><th>M</th><th>F</th></Fragment>)}
              </tr>
            </thead>
            <tbody>
              {dromicRows.length === 0 ? (
                <tr><td colSpan={DROMIC_COLUMN_COUNT}>No households are placed at this center for the selected event.</td></tr>
              ) : dromicRows.map((row, index) => (
                <tr key={`${row[0]}-${index}`}>
                  {row.map((cell, cellIndex) => (
                    <td key={`${index}-${cellIndex}`}>{cell || ''}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" className="dromic-expand-btn" onClick={() => setIsPreviewOpen((open) => !open)}>
          {isPreviewOpen ? 'Collapse table preview' : 'Expand table preview'}
        </button>
      </section>

    </div>
  );
}
