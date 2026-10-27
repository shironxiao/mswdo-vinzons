import { useState, useMemo } from 'react';
import { Plus, PackageCheck, Building, ChevronLeft, ChevronRight } from 'lucide-react';
import './AdminFeatures.css';
import {
  useEvacuationCenters,
  getRoomsForCenter,
  isCenterMatch,
} from '../../lib/evacuationCenters.js';
import { AdminFilterModal, AdminFilterBar } from '../../components/AdminFilterModal.jsx';

const STATUSES = ['All Status', 'Distributed', 'Completed', 'Queued'];

export default function ReliefGoodsStubs() {
  const { centers } = useEvacuationCenters();
  const [filterCenter, setFilterCenter] = useState('All Centers');
  const [filterRoom, setFilterRoom] = useState('All Rooms');
  const [filterStatus, setFilterStatus] = useState('All Status');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customBatches, setCustomBatches] = useState([]);
  const [form, setForm] = useState({
    center: '',
    room: 'All Rooms',
    allocated: '',
    date: 'Oct 27, 2026',
    status: 'Queued',
  });

  const getTodayFormatted = () => {
    const d = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  };

  // Generate batches dynamically connected with Supabase centers
  const allBatches = useMemo(() => {
    const defaultBatches = centers.map((c, index) => {
      const code = c.name.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase();
      const cap = c.capacity || (c.total_rooms * 25);
      const dist = Math.min(cap, Math.round(cap * 0.9));
      const statuses = ['Distributed', 'Completed', 'Distributed', 'Queued'];
      return {
        batchId: `BATCH-2026-${String(index + 1).padStart(3, '0')}`,
        code,
        center: c.displayName,
        room: 'All Rooms',
        allocated: cap,
        distributed: statuses[index % statuses.length] === 'Queued' ? 0 : dist,
        date: getTodayFormatted(),
        status: statuses[index % statuses.length],
      };
    });

    return [...customBatches, ...defaultBatches];
  }, [centers, customBatches]);

  const getNextBatchId = () => {
    const nums = allBatches.map((s) => {
      const match = s.batchId.match(/BATCH-\d+-(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    });
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    const next = String(max + 1).padStart(3, '0');
    return `BATCH-2026-${next}`;
  };

  const handleOpenModal = () => {
    setForm({
      center: filterCenter !== 'All Centers' ? filterCenter : centers[0]?.displayName || 'LGU EC (Mangcaway)',
      room: filterRoom !== 'All Rooms' ? filterRoom : 'All Rooms',
      allocated: '',
      date: getTodayFormatted(),
      status: 'Queued',
    });
    setIsModalOpen(true);
  };

  const handleIssueBatch = (e) => {
    e.preventDefault();
    const allocatedNum = Number(form.allocated);
    if (!allocatedNum || allocatedNum <= 0) return;

    const newBatch = {
      batchId: getNextBatchId(),
      code: form.center.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase(),
      center: form.center,
      room: form.room || 'All Rooms',
      allocated: allocatedNum,
      distributed: 0,
      date: form.date.trim() || getTodayFormatted(),
      status: form.status,
    };

    setCustomBatches([newBatch, ...customBatches]);
    setIsModalOpen(false);
  };

  const filtered = useMemo(() => {
    return allBatches.filter((s) => {
      const matchCenter =
        filterCenter === 'All Centers' ||
        s.center === filterCenter ||
        isCenterMatch(s.center, filterCenter, centers);

      const matchRoom =
        filterRoom === 'All Rooms' ||
        s.room === filterRoom ||
        s.room === 'All Rooms';

      const matchStatus =
        filterStatus === 'All Status' || s.status === filterStatus;

      return matchCenter && matchRoom && matchStatus;
    });
  }, [allBatches, filterCenter, filterRoom, filterStatus, centers]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedBatches = filtered.slice(startIndex, startIndex + pageSize);

  return (
    <div className="vin-feature-page">
      <header className="vin-feature-header">
        <div className="vin-feature-header-left">
          <span className="vin-feature-eyebrow">RELIEF DISTRIBUTION & ASSISTANCE</span>
          <h1 className="vin-feature-title">Relief Goods Stubs</h1>
          <p className="vin-feature-desc">
            Issue, validate, and track relief good claim stubs and distribution batches.
          </p>
        </div>
        <button
          type="button"
          className="vin-feature-action-btn"
          onClick={handleOpenModal}
        >
          <Plus size={18} />
          <span>Issue Stubs Batch</span>
        </button>
      </header>

      <div className="vin-feature-content-card">
        <div className="vin-feature-toolbar">
          <AdminFilterBar
            hasActiveFilters={filterCenter !== 'All Centers' || filterRoom !== 'All Rooms' || filterStatus !== 'All Status'}
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
              filterStatus !== 'All Status' && {
                key: 'status',
                label: 'Status',
                value: filterStatus,
                onRemove: () => {
                  setFilterStatus('All Status');
                  setCurrentPage(1);
                },
              },
            ]}
          />
        </div>

        <table className="vin-feature-table">
          <thead>
            <tr>
              <th>BATCH ID</th>
              <th>CENTER</th>
              <th>ROOM / AREA</th>
              <th>ALLOCATED STUBS</th>
              <th>DISTRIBUTED</th>
              <th>DATE ISSUED</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {paginatedBatches.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  No relief goods stubs match the current filter criteria.
                </td>
              </tr>
            ) : (
              paginatedBatches.map((item) => (
                <tr key={item.batchId}>
                  <td style={{ fontWeight: 700, color: '#0f172a' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <PackageCheck size={16} color="#d97706" />
                      {item.batchId}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <Building size={15} color="#2563eb" />
                      {item.center}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600, color: '#475569' }}>{item.room}</td>
                  <td>{item.allocated} stubs</td>
                  <td style={{ fontWeight: 700, color: '#0d3824' }}>{item.distributed} claimed</td>
                  <td>{item.date}</td>
                  <td>
                    <span className={`vin-status-tag ${item.status === 'Queued' ? 'pending' : 'active'}`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {filtered.length > 0 && (
        <div className="vin-admin-pagination">
          <span className="vin-pagination-info">
            Showing <strong>{startIndex + 1}</strong>–<strong>{Math.min(startIndex + pageSize, filtered.length)}</strong> of <strong>{filtered.length}</strong> relief goods batches
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

      {/* ── Issue Stubs Batch Modal Popup ── */}
      {isModalOpen && (
        <div className="vin-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="vin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="vin-modal-head">
              <div>
                <h2>Issue Stubs Batch</h2>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Allocate a new batch of relief goods claim stubs to an evacuation center.
                </span>
              </div>
              <button
                type="button"
                className="vin-modal-close"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleIssueBatch}>
              {/* Evacuation Center */}
              <div className="vin-form-group">
                <label className="vin-form-label">Evacuation Center</label>
                <select
                  className="vin-form-select"
                  value={form.center}
                  onChange={(e) => setForm({ ...form, center: e.target.value })}
                  required
                >
                  {centers.map((c) => (
                    <option key={c.id || c.displayName} value={c.displayName}>
                      {c.displayName} ({c.location})
                    </option>
                  ))}
                </select>
              </div>

              {/* Room Designation */}
              <div className="vin-form-group">
                <label className="vin-form-label">Room Designation</label>
                <select
                  className="vin-form-select"
                  value={form.room}
                  onChange={(e) => setForm({ ...form, room: e.target.value })}
                >
                  <option value="All Rooms">All Rooms</option>
                  {getRoomsForCenter(form.center, centers).filter((r) => r !== 'All Rooms').map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* Allocated Stubs */}
              <div className="vin-form-group">
                <label className="vin-form-label">Allocated Stubs (Quantity)</label>
                <input
                  type="number"
                  min="1"
                  className="vin-form-input"
                  placeholder="e.g. 100"
                  value={form.allocated}
                  onChange={(e) => setForm({ ...form, allocated: e.target.value })}
                  required
                />
              </div>

              {/* Date & Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="vin-form-group">
                  <label className="vin-form-label">Date Issued</label>
                  <input
                    type="text"
                    className="vin-form-input"
                    placeholder="e.g. Oct 27, 2026"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    required
                  />
                </div>
                <div className="vin-form-group">
                  <label className="vin-form-label">Batch Status</label>
                  <select
                    className="vin-form-select"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    <option value="Queued">Queued</option>
                    <option value="Distributed">Distributed</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="vin-modal-actions">
                <button
                  type="button"
                  className="vin-btn-cancel"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="vin-btn-submit">
                  Allocate Stubs Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ── Mobile-Style Filter Modal ── */}
      <AdminFilterModal
        isOpen={showFilterModal}
        title="Filter Relief Batches"
        statusOptions={STATUSES.map((s) => ({ id: s, label: s }))}
        statusValue={filterStatus}
        centerValue={filterCenter}
        roomValue={filterRoom}
        centersList={centers}
        resultCount={filtered.length}
        onApply={({ status, center, room }) => {
          setFilterStatus(status);
          setFilterCenter(center);
          setFilterRoom(room);
          setCurrentPage(1);
        }}
        onClose={() => setShowFilterModal(false)}
      />
    </div>
  );
}