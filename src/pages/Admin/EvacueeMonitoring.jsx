import { useState, useMemo } from 'react';
import { CheckCircle2, Clock, Building, ChevronLeft, ChevronRight } from 'lucide-react';
import './AdminFeatures.css';
import {
  useEvacuationCenters,
  isCenterMatch,
} from '../../lib/evacuationCenters.js';
import { useHouseholds } from '../../lib/householdService.js';
import { AdminFilterModal, AdminFilterBar } from '../../components/AdminFilterModal.jsx';

const STATUSES = ['All Status', 'Complete', 'Pending'];

export default function EvacueeMonitoring() {
  const { centers } = useEvacuationCenters();
  const { households } = useHouseholds(centers);
  const [filterCenter, setFilterCenter] = useState('All Centers');
  const [filterRoom, setFilterRoom] = useState('All Rooms');
  const [filterStatus, setFilterStatus] = useState('All Status');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Generate monitoring records dynamically connected to live Supabase households & centers
  const monitoringRecords = useMemo(() => {
    if (!centers || centers.length === 0) return [];

    const list = [];
    centers.forEach((c, index) => {
      const code = c.name.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase();
      const centerHouseholds = households.filter(
        (h) => h.center === c.displayName || isCenterMatch(h.center, c.displayName, centers)
      );

      // Real count of checked individuals (head + dependents)
      const totalChecked = centerHouseholds.reduce((sum, h) => sum + (h.familyCount || 1), 0);
      const allIssued = centerHouseholds.length > 0 && centerHouseholds.every((h) => h.stubIssued);

      // Morning Verification round for the entire center
      list.push({
        id: `CHK-${String(index * 2 + 1).padStart(2, '0')}`,
        code,
        center: c.displayName,
        room: 'All Rooms',
        checked: totalChecked,
        round: 'Morning Verification',
        time: '08:30 AM',
        status: allIssued ? 'Complete' : 'Pending',
      });

      // Group by distinct room if center has registered households with room designations
      const roomsWithEvacuees = Array.from(new Set(centerHouseholds.map((h) => h.room).filter(Boolean)));
      if (roomsWithEvacuees.length > 0) {
        roomsWithEvacuees.slice(0, 2).forEach((roomName, rIdx) => {
          const roomHH = centerHouseholds.filter((h) => h.room === roomName);
          const roomChecked = roomHH.reduce((sum, h) => sum + (h.familyCount || 1), 0);
          const roomAllIssued = roomHH.length > 0 && roomHH.every((h) => h.stubIssued);

          list.push({
            id: `CHK-${String(index * 2 + 2 + rIdx).padStart(2, '0')}`,
            code,
            center: c.displayName,
            room: roomName,
            checked: roomChecked,
            round: 'Afternoon Verification',
            time: '02:00 PM',
            status: roomAllIssued ? 'Complete' : 'Pending',
          });
        });
      }
    });

    return list;
  }, [centers, households]);

  const filtered = useMemo(() => {
    return monitoringRecords.filter((m) => {
      const matchCenter =
        filterCenter === 'All Centers' ||
        m.center === filterCenter ||
        isCenterMatch(m.center, filterCenter, centers);

      const matchRoom =
        filterRoom === 'All Rooms' ||
        m.room === filterRoom ||
        m.room === 'All Rooms';

      const matchStatus =
        filterStatus === 'All Status' || m.status === filterStatus;

      return matchCenter && matchRoom && matchStatus;
    });
  }, [monitoringRecords, filterCenter, filterRoom, filterStatus, centers]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedMonitoring = filtered.slice(startIndex, startIndex + pageSize);

  return (
    <div className="vin-feature-page">
      <header className="vin-feature-header">
        <div className="vin-feature-header-left">
          <span className="vin-feature-eyebrow">DAILY VERIFICATION & HEADCOUNT</span>
          <h1 className="vin-feature-title">Evacuee Monitoring</h1>
          <p className="vin-feature-desc">
            Monitor daily attendance, evacuee headcounts, and operational verification rounds.
          </p>
        </div>
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
              <th>CENTER CODE</th>
              <th>EVACUATION CENTER</th>
              <th>ROOM / AREA</th>
              <th>CHECK ROUND</th>
              <th>PEOPLE CHECKED</th>
              <th>TIME STAMP</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {paginatedMonitoring.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  No monitoring records match the current filter criteria.
                </td>
              </tr>
            ) : (
              paginatedMonitoring.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 700, color: '#0f172a' }}>{item.code}</td>
                  <td style={{ fontWeight: 600 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <Building size={15} color="#2563eb" />
                      {item.center}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600, color: '#475569' }}>{item.room}</td>
                  <td>{item.round}</td>
                  <td style={{ fontWeight: 700, color: '#0d3824' }}>{item.checked} individuals</td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={15} color="#64748b" />
                      {item.time}
                    </span>
                  </td>
                  <td>
                    <span className={`vin-status-tag ${item.status === 'Complete' ? 'active' : 'pending'}`}>
                      <CheckCircle2 size={13} style={{ marginRight: '4px' }} />
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
            Showing <strong>{startIndex + 1}</strong>–<strong>{Math.min(startIndex + pageSize, filtered.length)}</strong> of <strong>{filtered.length}</strong> verification rounds
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
      {/* ── Mobile-Style Filter Modal ── */}
      <AdminFilterModal
        isOpen={showFilterModal}
        title="Filter Evacuee Monitoring"
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