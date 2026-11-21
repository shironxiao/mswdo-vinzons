import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Printer,
  FileDown,
  X,
  Building,
  MapPin,
  Compass,
  Users,
  Search,
  CheckCircle2,
  Layers,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
} from 'lucide-react';
import {
  buildStubsHtml,
  openPrintWindow,
  generateQrSvgString,
} from '../lib/stubPrintService.js';
import {
  fetchPaginatedHouseholds,
  fetchHouseholdsForPrint,
  countHouseholdsForPrint,
  VINZONS_BARANGAYS,
} from '../lib/householdService.js';
import './PrintStubModal.css';

const STANDARD_PUROKS = [
  'All Puroks',
  'Purok 1',
  'Purok 2',
  'Purok 3',
  'Purok 4',
  'Purok 5',
  'Purok 6',
  'Purok 7',
  'Purok 8',
];

export function PrintStubModal({
  isOpen,
  onClose,
  selectedEvent,
  centers = [],
  initialCenter = 'All Centers',
  initialBarangay = 'All Barangays',
  initialHousehold = null,
}) {
  const [mode, setMode] = useState(initialHousehold ? 'single' : 'batch');
  const [selectedCenter, setSelectedCenter] = useState(initialCenter);
  const [selectedBarangay, setSelectedBarangay] = useState(initialBarangay);
  const [selectedPurok, setSelectedPurok] = useState('All Puroks');

  // Batch Printing Database States
  const [batchDbCount, setBatchDbCount] = useState(0);
  const [loadingBatchCount, setLoadingBatchCount] = useState(false);
  const [batchChunkSize, setBatchChunkSize] = useState(90); // 90 households = 10 pages of 3x3
  const [selectedBatchPage, setSelectedBatchPage] = useState(1);
  const [isGeneratingPrint, setIsGeneratingPrint] = useState(false);
  const [generationProgress, setGenerationProgress] = useState('');

  // Single Household Server-Side Search & Pagination States
  const [searchHousehold, setSearchHousehold] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [singlePage, setSinglePage] = useState(1);
  const singlePageSize = 8;
  const [singleResults, setSingleResults] = useState([]);
  const [singleTotalCount, setSingleTotalCount] = useState(0);
  const [singleTotalPages, setSingleTotalPages] = useState(1);
  const [loadingSingle, setLoadingSingle] = useState(false);
  const [selectedSingleHh, setSelectedSingleHh] = useState(initialHousehold);

  const searchTimerRef = useRef(null);

  // Sync initial props when opened
  useEffect(() => {
    if (isOpen) {
      if (initialHousehold) {
        setMode('single');
        setSelectedSingleHh(initialHousehold);
      } else {
        setMode('batch');
      }
      if (initialCenter) setSelectedCenter(initialCenter);
      if (initialBarangay) setSelectedBarangay(initialBarangay);
    }
  }, [isOpen, initialHousehold, initialCenter, initialBarangay]);

  // Debounce search input for Single Household Mode
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchHousehold.trim());
      setSinglePage(1);
    }, 350);
    return () => clearTimeout(searchTimerRef.current);
  }, [searchHousehold]);

  // Query live database count for Batch Mode whenever filters change
  useEffect(() => {
    if (!isOpen) return;
    let isCancelled = false;
    setLoadingBatchCount(true);

    const centerObj = centers.find((c) => c.displayName === selectedCenter || c.name === selectedCenter);
    const centerParam = centerObj ? centerObj.id : (selectedCenter !== 'All Centers' ? selectedCenter : '');

    countHouseholdsForPrint({
      barangay: selectedBarangay,
      purok: selectedPurok,
      centerId: centerParam,
    })
      .then((count) => {
        if (!isCancelled) {
          setBatchDbCount(count);
          setSelectedBatchPage(1);
          setLoadingBatchCount(false);
        }
      })
      .catch((err) => {
        console.warn('Could not count households for print:', err);
        if (!isCancelled) setLoadingBatchCount(false);
      });

    return () => { isCancelled = true; };
  }, [isOpen, selectedCenter, selectedBarangay, selectedPurok, centers]);

  // Query live paginated households from database for Single Mode
  useEffect(() => {
    if (!isOpen || mode !== 'single') return;
    let isCancelled = false;
    setLoadingSingle(true);

    fetchPaginatedHouseholds({
      page: singlePage,
      pageSize: singlePageSize,
      search: debouncedSearch,
      centersList: centers,
    })
      .then((res) => {
        if (!isCancelled) {
          setSingleResults(res.data || []);
          setSingleTotalCount(res.totalCount || 0);
          setSingleTotalPages(res.totalPages || 1);
          // If no household is currently selected, select the first in the page
          if (!selectedSingleHh && res.data && res.data.length > 0) {
            setSelectedSingleHh(res.data[0]);
          }
          setLoadingSingle(false);
        }
      })
      .catch((err) => {
        console.warn('Error fetching paginated households for single print:', err);
        if (!isCancelled) setLoadingSingle(false);
      });

    return () => { isCancelled = true; };
  }, [isOpen, mode, singlePage, debouncedSearch, centers]);

  const eventName = selectedEvent?.event_name || 'Municipal Relief Operation';

  // Calculate batch pages
  const totalBatchPages = Math.ceil(batchDbCount / batchChunkSize) || 1;

  // Handle direct print for the batch
  const handlePrintBatch = async () => {
    if (batchDbCount === 0 || isGeneratingPrint) return;
    setIsGeneratingPrint(true);
    setGenerationProgress(`Fetching households from database...`);

    try {
      const centerObj = centers.find((c) => c.displayName === selectedCenter || c.name === selectedCenter);
      const centerParam = centerObj ? centerObj.id : (selectedCenter !== 'All Centers' ? selectedCenter : '');

      const offset = (selectedBatchPage - 1) * batchChunkSize;
      const limit = batchChunkSize === 'all' ? batchDbCount : batchChunkSize;

      const householdsToPrint = await fetchHouseholdsForPrint({
        barangay: selectedBarangay,
        purok: selectedPurok,
        centerId: centerParam,
        offset,
        limit,
        centersList: centers,
      });

      setGenerationProgress(`Rendering QR codes for ${householdsToPrint.length} stubs...`);

      const html = buildStubsHtml({
        eventName,
        centerName: selectedCenter,
        barangay: selectedBarangay,
        purok: selectedPurok,
        households: householdsToPrint,
        isSingle: false,
        autoPrint: true,
      });

      openPrintWindow(html);
    } catch (err) {
      alert(`Could not generate stubs for printing: ${err.message || 'Error'}`);
    } finally {
      setIsGeneratingPrint(false);
      setGenerationProgress('');
    }
  };

  // Handle download PDF for the batch
  const handleDownloadBatchPdf = async () => {
    await handlePrintBatch();
  };

  // Print single household stub
  const handlePrintSingle = () => {
    if (!selectedSingleHh) return;
    const html = buildStubsHtml({
      eventName,
      centerName: selectedSingleHh.centerName || selectedCenter,
      barangay: selectedSingleHh.barangay || 'Unassigned',
      purok: selectedSingleHh.purok || 'Unassigned',
      households: [selectedSingleHh],
      isSingle: true,
      autoPrint: true,
    });
    openPrintWindow(html);
  };

  if (!isOpen) return null;

  return (
    <div className="vin-print-modal-overlay" onClick={onClose}>
      <div className="vin-print-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Loading Overlay */}
        {isGeneratingPrint && (
          <div className="vin-print-loading-overlay">
            <div className="vin-print-spinner" />
            <div className="vin-print-loading-text">{generationProgress}</div>
          </div>
        )}

        {/* Header */}
        <div className="vin-print-modal-header">
          <div className="vin-print-modal-header-left">
            <div className="vin-print-icon-badge">
              <Printer size={24} />
            </div>
            <div>
              <h2 className="vin-print-modal-title">Print Relief Goods Stubs</h2>
              <p className="vin-print-modal-subtitle">
                Masterlist Database Print • Organized by Barangay & Purok for Lamination
              </p>
            </div>
          </div>
          <button
            type="button"
            className="vin-print-modal-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="vin-print-modal-body">
          {/* Mode Switcher */}
          <div className="vin-print-mode-tabs">
            <button
              type="button"
              className={`vin-print-tab-btn ${mode === 'batch' ? 'active' : ''}`}
              onClick={() => setMode('batch')}
            >
              <Layers size={16} />
              <span>Batch Print (By Barangay & Purok)</span>
            </button>
            <button
              type="button"
              className={`vin-print-tab-btn ${mode === 'single' ? 'active' : ''}`}
              onClick={() => setMode('single')}
            >
              <FileText size={16} />
              <span>Print Single Household (Database Search)</span>
            </button>
          </div>

          {mode === 'batch' ? (
            <>
              {/* Filter Controls */}
              <div className="vin-print-filter-grid">
                {/* 1. Center */}
                <div className="vin-print-field">
                  <label className="vin-print-label">
                    <Building size={14} style={{ flexShrink: 0 }} />
                    <span>Center</span>
                  </label>
                  <select
                    className="vin-print-select"
                    value={selectedCenter}
                    onChange={(e) => setSelectedCenter(e.target.value)}
                  >
                    <option value="All Centers">All Centers (Masterlist)</option>
                    {centers.map((c) => (
                      <option key={c.id || c.displayName} value={c.displayName || c.name}>
                        {c.displayName || c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Barangay */}
                <div className="vin-print-field">
                  <label className="vin-print-label">
                    <MapPin size={14} style={{ flexShrink: 0 }} />
                    <span>Barangay</span>
                  </label>
                  <select
                    className="vin-print-select"
                    value={selectedBarangay}
                    onChange={(e) => {
                      setSelectedBarangay(e.target.value);
                      setSelectedPurok('All Puroks');
                    }}
                  >
                    <option value="All Barangays">All Barangays</option>
                    {VINZONS_BARANGAYS.map((b) => (
                      <option key={b} value={b}>
                        Barangay {b}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Purok */}
                <div className="vin-print-field">
                  <label className="vin-print-label">
                    <Compass size={14} style={{ flexShrink: 0 }} />
                    <span>Purok / Sitio</span>
                  </label>
                  <select
                    className="vin-print-select"
                    value={selectedPurok}
                    disabled={selectedBarangay === 'All Barangays'}
                    onChange={(e) => setSelectedPurok(e.target.value)}
                  >
                    {STANDARD_PUROKS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Status Summary Banner */}
              <div className="vin-print-summary-box">
                <div className="vin-print-summary-left">
                  <div className="vin-print-summary-title">
                    {selectedBarangay === 'All Barangays'
                      ? `All Barangays in ${selectedCenter}`
                      : `Barangay ${selectedBarangay} (${selectedPurok})`}
                  </div>
                  <div className="vin-print-summary-meta">
                    Masterlist Database Query • Standard <strong>3×3 Grid (9 Stubs per A4 Page)</strong>
                  </div>
                </div>
                <div className="vin-print-summary-badge">
                  {loadingBatchCount ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Loader2 size={13} className="vin-spin" /> Counting...
                    </span>
                  ) : (
                    <>
                      <Users size={14} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle' }} />
                      {batchDbCount.toLocaleString()} Households Found
                    </>
                  )}
                </div>
              </div>

              {/* Batch Chunking & Pagination Selector for large counts */}
              {batchDbCount > 0 && (
                <div className="vin-batch-range-box">
                  <div className="vin-batch-range-info">
                    <span className="vin-batch-range-title">Printing Batch Range:</span>
                    <span className="vin-batch-range-desc">
                      Total {batchDbCount} stubs will print across {Math.ceil(batchDbCount / 9)} A4 pages.
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {totalBatchPages > 1 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 700 }}>Batch:</span>
                        <select
                          className="vin-print-select"
                          style={{ padding: '4px 8px', fontSize: '0.82rem' }}
                          value={selectedBatchPage}
                          onChange={(e) => setSelectedBatchPage(Number(e.target.value))}
                        >
                          {Array.from({ length: totalBatchPages }, (_, i) => i + 1).map((p) => {
                            const start = (p - 1) * batchChunkSize + 1;
                            const end = Math.min(p * batchChunkSize, batchDbCount);
                            const pages = Math.ceil((end - start + 1) / 9);
                            return (
                              <option key={p} value={p}>
                                Batch {p} (Households {start}–{end} • {pages} Sheets)
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Single Household Mode with Server-Side Search & Pagination */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="vin-print-field">
                <label className="vin-print-label">
                  Search Masterlist Database (Head Name, Code, Barangay, or Purok)
                </label>
                <div style={{ position: 'relative' }}>
                  <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 10, top: 11 }} />
                  <input
                    type="text"
                    className="vin-print-input"
                    style={{ width: '100%', boxSizing: 'border-box', paddingLeft: 34 }}
                    placeholder="Search over 10,000+ households (e.g., Jimmy Batas, HH-SUL-0001, Aaron James)..."
                    value={searchHousehold}
                    onChange={(e) => setSearchHousehold(e.target.value)}
                  />
                </div>
              </div>

              {/* Paginated Household List */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ maxHeight: 200, overflowY: 'auto', padding: 6, background: '#ffffff' }}>
                  {loadingSingle ? (
                    <div style={{ textAlign: 'center', padding: '30px', color: '#64748b', fontSize: '0.86rem' }}>
                      <Loader2 size={20} className="vin-spin" style={{ margin: '0 auto 8px' }} />
                      Searching database records...
                    </div>
                  ) : singleResults.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontSize: '0.86rem' }}>
                      No households matched your search query.
                    </div>
                  ) : (
                    singleResults.map((h) => {
                      const isSelected = selectedSingleHh?.id === h.id;
                      const displayCode = h.stubCode || h.householdCode || `HH-${h.id}`;
                      return (
                        <div
                          key={h.id}
                          onClick={() => setSelectedSingleHh(h)}
                          style={{
                            padding: '8px 12px',
                            borderRadius: 8,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: isSelected ? '#f3e8ff' : '#ffffff',
                            border: `1px solid ${isSelected ? '#c084fc' : '#f1f5f9'}`,
                            marginBottom: 4,
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div>
                            <strong style={{ color: '#0f172a', fontSize: '0.88rem' }}>{h.name}</strong>
                            <div style={{ color: '#64748b', fontSize: '0.78rem', marginTop: 2 }}>
                              <span style={{ fontWeight: 700, color: '#6b21a8' }}>{displayCode}</span> • Brgy. {h.barangay || '—'} (Purok: {h.purok || '—'})
                            </div>
                          </div>
                          {isSelected && <CheckCircle2 size={18} color="#7c3aed" />}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Pagination Controls */}
                <div className="vin-single-pagination">
                  <span>
                    Showing <strong>{singleResults.length > 0 ? (singlePage - 1) * singlePageSize + 1 : 0}</strong>–
                    <strong>{Math.min(singlePage * singlePageSize, singleTotalCount)}</strong> of{' '}
                    <strong>{singleTotalCount.toLocaleString()}</strong> households
                  </span>

                  <div className="vin-single-page-btns">
                    <button
                      type="button"
                      className="vin-single-page-nav-btn"
                      disabled={singlePage <= 1 || loadingSingle}
                      onClick={() => setSinglePage(1)}
                      title="First Page"
                    >
                      <ChevronsLeft size={14} />
                    </button>
                    <button
                      type="button"
                      className="vin-single-page-nav-btn"
                      disabled={singlePage <= 1 || loadingSingle}
                      onClick={() => setSinglePage((p) => Math.max(1, p - 1))}
                      title="Previous Page"
                    >
                      <ChevronLeft size={14} /> Prev
                    </button>

                    <span style={{ fontWeight: 700, padding: '0 4px' }}>
                      {singlePage} / {singleTotalPages}
                    </span>

                    <button
                      type="button"
                      className="vin-single-page-nav-btn"
                      disabled={singlePage >= singleTotalPages || loadingSingle}
                      onClick={() => setSinglePage((p) => Math.min(singleTotalPages, p + 1))}
                      title="Next Page"
                    >
                      Next <ChevronRight size={14} />
                    </button>
                    <button
                      type="button"
                      className="vin-single-page-nav-btn"
                      disabled={singlePage >= singleTotalPages || loadingSingle}
                      onClick={() => setSinglePage(singleTotalPages)}
                      title="Last Page"
                    >
                      <ChevronsRight size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Selected Household Live Card Preview */}
              {selectedSingleHh && (
                <div className="vin-single-hh-preview">
                  <div
                    className="vin-single-hh-qr"
                    dangerouslySetInnerHTML={{
                      __html: generateQrSvgString(
                        selectedSingleHh.stubCode || selectedSingleHh.householdCode || selectedSingleHh.id,
                        66
                      ),
                    }}
                  />
                  <div className="vin-single-hh-info">
                    <span className="vin-single-hh-name">{selectedSingleHh.name}</span>
                    <span className="vin-single-hh-code">
                      {selectedSingleHh.stubCode || selectedSingleHh.householdCode || `HH-${selectedSingleHh.id}`}
                    </span>
                    <span className="vin-single-hh-meta">
                      📍 <strong>Barangay:</strong> {selectedSingleHh.barangay || 'Unassigned'} •{' '}
                      <strong>Purok:</strong> {selectedSingleHh.purok || 'Unassigned'}<br />
                      🏢 <strong>Center:</strong> {selectedSingleHh.centerName || selectedCenter}
                      {selectedSingleHh.roomName ? ` • Room: ${selectedSingleHh.roomName}` : ''} •{' '}
                      <strong>Family Size:</strong> {selectedSingleHh.familyCount || 1} members
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="vin-print-modal-footer">
          <button type="button" className="vin-btn-secondary" onClick={onClose}>
            Cancel
          </button>

          {mode === 'batch' ? (
            <>
              <button
                type="button"
                className="vin-btn-pdf-download"
                onClick={handleDownloadBatchPdf}
                disabled={batchDbCount === 0 || isGeneratingPrint}
              >
                <FileDown size={16} />
                <span>
                  {selectedBarangay !== 'All Barangays'
                    ? `Download ${selectedBarangay} PDF`
                    : 'Download PDF'}
                </span>
              </button>

              <button
                type="button"
                className="vin-btn-print-primary"
                onClick={handlePrintBatch}
                disabled={batchDbCount === 0 || isGeneratingPrint}
              >
                <Printer size={16} />
                <span>
                  Direct Print ({Math.min(batchChunkSize === 'all' ? batchDbCount : batchChunkSize, batchDbCount)} Stubs)
                </span>
              </button>
            </>
          ) : (
            <button
              type="button"
              className="vin-btn-print-primary"
              onClick={handlePrintSingle}
              disabled={!selectedSingleHh}
            >
              <Printer size={16} />
              <span>Print This Household Stub</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
