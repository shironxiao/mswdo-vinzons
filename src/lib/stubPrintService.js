import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QRCodeSVG } from 'qrcode.react';

/**
 * Generates an in-memory, self-contained SVG string of a QR Code.
 * 100% reliable - does not rely on DOM element lookups or hidden divs.
 */
export function generateQrSvgString(value, size = 80, fgColor = '#000000', bgColor = '#ffffff') {
  try {
    const stringValue = String(value || '').trim() || 'NO-CODE';
    return renderToStaticMarkup(
      React.createElement(QRCodeSVG, {
        value: stringValue,
        size,
        level: 'M',
        bgColor,
        fgColor,
        includeMargin: false,
      })
    );
  } catch (err) {
    console.error('Error generating QR SVG string:', err);
    return `<div style="width:${size}px;height:${size}px;border:1px solid #ccc;display:flex;align-items:center;justify-content:center;font-size:10px;">QR Error</div>`;
  }
}

/**
 * Chunks an array into smaller groups (e.g. 9 stubs per A4 page in 3x3 layout).
 */
export function chunkArray(arr, size = 9) {
  if (!Array.isArray(arr)) return [];
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * Clean string for file names (e.g. "Barangay Auit" -> "Barangay_Auit")
 */
function sanitizeFilename(str) {
  return String(str || '')
    .trim()
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .replace(/_+/g, '_');
}

function formatBarangayLocation(value) {
  const barangay = String(value || '').trim();
  if (!barangay || /^(all barangays|unassigned)$/i.test(barangay)) return '';
  return /^brgy\.?\s*/i.test(barangay)
    ? barangay.replace(/^brgy\.?\s*/i, 'Brgy. ')
    : `Brgy. ${barangay.replace(/^barangay\s*/i, '')}`;
}

function formatPurokLocation(value) {
  const purok = String(value || '').trim();
  if (!purok || /^(all puroks|unassigned)$/i.test(purok)) return '';
  return /^purok\s*/i.test(purok) ? purok : `Purok ${purok}`;
}

function getHouseholdLocation(household, barangay, purok) {
  return [
    formatBarangayLocation(household.barangay || barangay),
    formatPurokLocation(household.purok || purok),
  ].filter(Boolean).join(' ');
}

function getPageLocation(households, barangay, purok) {
  const locations = households.map((household) => getHouseholdLocation(household, barangay, purok));
  const uniqueLocations = new Set(locations.filter(Boolean));
  if (uniqueLocations.size === 1 && locations.every(Boolean)) return [...uniqueLocations][0];
  if (uniqueLocations.size > 0) return 'Multiple Locations';
  return 'Location not specified';
}

/**
 * Builds the complete HTML page for 3x3 grid or single stub printing.
 */
export function buildStubsHtml({
  barangay = 'All Barangays',
  purok = 'All Puroks',
  households = [],
  isSingle = false,
  autoPrint = true,
}) {
  const generatedAt = new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  // Single stub layout
  if (isSingle && households.length === 1) {
    const h = households[0];
    const displayCode = h.stubCode || h.householdCode || `HH-${h.id}`;
    const qrSvg = generateQrSvgString(displayCode, 130, '#4c1d95');
    const locationText = getHouseholdLocation(h, barangay, purok);
    const docTitle = `${sanitizeFilename(h.barangay || 'Household')}_${sanitizeFilename(displayCode)}_Stub`;

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>${docTitle}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background: #f8fafc;
            color: #0f172a;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 20px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .single-stub-wrapper {
            width: 100%;
            max-width: 360px;
            background: #ffffff;
            border: 2px dashed #7c3aed;
            border-radius: 14px;
            padding: 22px 18px;
            text-align: center;
            box-shadow: 0 10px 25px rgba(0,0,0,0.06);
          }
          .stub-org {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #64748b;
            font-weight: 700;
          }
          .stub-title {
            font-size: 16px;
            font-weight: 900;
            text-transform: uppercase;
            color: #1e1b4b;
            letter-spacing: 0.5px;
            margin: 2px 0 6px;
          }
          .stub-badge-row {
            display: flex;
            justify-content: center;
            gap: 6px;
            margin-bottom: 10px;
            flex-wrap: wrap;
          }
          .stub-pill {
            display: inline-block;
            background: #ede9fe;
            color: #6d28d9;
            font-size: 11px;
            font-weight: 700;
            padding: 3px 8px;
            border-radius: 6px;
          }
          .stub-code {
            font-size: 24px;
            font-weight: 900;
            color: #6b21a8;
            letter-spacing: 2px;
            margin: 6px 0;
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          }
          .stub-qr {
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 12px auto;
            padding: 8px;
            background: #fff;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            width: 136px;
            height: 136px;
          }
          .stub-head-box {
            border-top: 1.5px solid #e2e8f0;
            padding-top: 10px;
            margin-top: 6px;
          }
          .stub-head-label {
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 0.6px;
            color: #64748b;
            font-weight: 700;
          }
          .stub-head-name {
            font-size: 16px;
            font-weight: 800;
            color: #0f172a;
            margin-top: 2px;
          }
          .stub-meta-info {
            font-size: 10.5px;
            color: #475569;
            margin-top: 6px;
            line-height: 1.4;
          }
          @media print {
            body { background: #ffffff; padding: 0; }
            .single-stub-wrapper {
              box-shadow: none;
              border: 1.5px dashed #000;
              max-width: 90mm;
              margin: 10mm auto;
            }
          }
        </style>
      </head>
      <body>
        <div class="single-stub-wrapper">
          <div class="stub-org">Vinzons Municipal Social Welfare and Development</div>
          <div class="stub-title">Relief Goods Stub</div>
          ${locationText ? `<div class="stub-badge-row"><span class="stub-pill">${locationText}</span></div>` : ''}
          <div class="stub-code">${displayCode}</div>
          <div class="stub-qr">${qrSvg}</div>
          <div class="stub-head-box">
            <div class="stub-head-label">Household Head</div>
            <div class="stub-head-name">${h.name || 'Resident'}</div>
            <div class="stub-meta-info">
              ${h.roomName ? `<strong>Room:</strong> ${h.roomName} • ` : ''}
              <strong>Family Size:</strong> ${h.familyCount || 1} members
            </div>
          </div>
        </div>
        ${autoPrint ? `
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 250);
          };
        </script>` : ''}
      </body>
      </html>
    `;
  }

  // Multi-stub (3x3 grid per A4 page)
  const chunks = chunkArray(households, 9);
  const totalPages = chunks.length || 1;
  const docTitle = `${sanitizeFilename(barangay)}_Relief_Stubs`;

  const pagesHtml = chunks.map((chunk, pageIndex) => {
    const pageLocation = getPageLocation(chunk, barangay, purok);
    const cardsHtml = chunk.map((h) => {
      const code = h.stubCode || h.householdCode || `HH-${h.id}`;
      const qrSvg = generateQrSvgString(code, 76, '#000000');
      const locationText = getHouseholdLocation(h, barangay, purok);
      const locationTagHtml = locationText
        ? `<div class="stub-location-tag">${locationText}</div>`
        : '';

      return `
        <div class="stub-card">
          <div class="stub-card-top">
            <div class="stub-title">RELIEF GOODS STUB</div>
            <div class="stub-org">Vinzons Municipal Social Welfare</div>
          </div>
          ${locationTagHtml}
          <div class="stub-code">${code}</div>
          <div class="stub-qr">${qrSvg}</div>
          <div class="stub-footer">
            <div class="stub-head-label">Household Head</div>
            <div class="stub-head-name" title="${h.name || ''}">${h.name || 'Resident'}</div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="print-page">
        <!-- SHEET HEADER WITH BARANGAY & PUROK -->
        <header class="sheet-header">
          <div class="sheet-header-left">
            <div class="sheet-mun-title">MUNICIPALITY OF VINZONS • MSWDO RELIEF OPERATION</div>
            <div class="sheet-location-title">${pageLocation}</div>
          </div>
          <div class="sheet-header-right">
            <div class="sheet-meta-item"><strong>Date:</strong> ${generatedAt}</div>
            <div class="sheet-meta-item"><strong>Page:</strong> ${pageIndex + 1} of ${totalPages}</div>
          </div>
        </header>

        <!-- 3x3 GRID (9 STUBS) -->
        <div class="grid-3x3">
          ${cardsHtml}
        </div>
      </div>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>${docTitle}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @page {
          size: A4 portrait;
          margin: 6mm;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
          background: #f1f5f9;
          color: #0f172a;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .print-page {
          width: 198mm;
          height: 284mm;
          margin: 0 auto 10mm;
          background: #fff;
          padding: 4mm 4mm 3mm;
          box-sizing: border-box;
          page-break-after: always;
          break-after: page;
          display: flex;
          flex-direction: column;
          box-shadow: 0 4px 15px rgba(0,0,0,0.05);
        }
        .print-page:last-child {
          margin-bottom: 0;
          page-break-after: auto;
          break-after: auto;
        }

        /* ── Official Sheet Header ── */
        .sheet-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          border-bottom: 2px solid #0f172a;
          padding-bottom: 4px;
          margin-bottom: 4mm;
        }
        .sheet-mun-title {
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          color: #64748b;
        }
        .sheet-location-title {
          font-size: 13px;
          font-weight: 900;
          color: #0f172a;
          letter-spacing: 0.3px;
          margin: 1px 0 3px;
        }
        .sheet-header-right {
          text-align: right;
          font-size: 8px;
          color: #475569;
          line-height: 1.35;
          white-space: nowrap;
        }

        /* ── 3x3 Grid ── */
        .grid-3x3 {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          grid-template-rows: repeat(3, 1fr);
          gap: 3.5mm;
          flex: 1;
          width: 100%;
          height: 100%;
        }

        /* ── Individual Stub Card ── */
        .stub-card {
          border: 1.5px dashed #64748b;
          border-radius: 7px;
          padding: 6px 5px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          text-align: center;
          background: #ffffff;
          overflow: hidden;
        }
        .stub-card-top {
          width: 100%;
        }
        .stub-title {
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
          color: #0f172a;
          letter-spacing: 0.4px;
          line-height: 1.1;
        }
        .stub-org {
          font-size: 7.2px;
          color: #64748b;
          margin-top: 1px;
          line-height: 1.1;
        }
        .stub-location-tag {
          font-size: 7.5px;
          font-weight: 700;
          color: #6b21a8;
          background: #faf5ff;
          padding: 1px 5px;
          border-radius: 3px;
          margin: 2px 0 1px;
          display: inline-flex;
          align-items: center;
          gap: 3px;
        }
        .stub-code {
          font-size: 13.5px;
          font-weight: 900;
          letter-spacing: 1.5px;
          color: #6b21a8;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          line-height: 1.1;
        }
        .stub-qr {
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 1px 0;
        }
        .stub-qr svg {
          width: 74px !important;
          height: 74px !important;
          display: block;
        }
        .stub-footer {
          width: 100%;
          border-top: 1px solid #e2e8f0;
          padding-top: 2px;
        }
        .stub-head-label {
          display: block;
          font-size: 6.8px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          font-weight: 700;
        }
        .stub-head-name {
          display: block;
          font-size: 10.5px;
          font-weight: 900;
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
            padding: 4mm 4mm 3mm;
            box-shadow: none;
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
      ${autoPrint ? `
      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 250);
        };
      </script>` : ''}
    </body>
    </html>
  `;
}

/**
 * Opens a print window with the rendered HTML.
 */
export function openPrintWindow(html) {
  const win = window.open('', '_blank');
  if (!win) {
    alert('Please allow popups for this site so the print window can open.');
    return null;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  return win;
}

/**
 * Groups a collection of households by their Barangay, then collects unique puroks.
 */
export function groupHouseholdsByBarangay(households = []) {
  const groups = new Map();

  households.forEach((h) => {
    const brgy = (h.barangay || 'Unassigned').trim();
    if (!groups.has(brgy)) {
      groups.set(brgy, {
        barangay: brgy,
        puroks: new Set(),
        households: [],
      });
    }
    const group = groups.get(brgy);
    if (h.purok) group.puroks.add(h.purok.trim());
    group.households.push(h);
  });

  return Array.from(groups.values()).sort((a, b) => a.barangay.localeCompare(b.barangay));
}
