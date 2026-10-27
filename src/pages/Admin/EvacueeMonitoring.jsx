import { useState, useMemo } from 'react';
import { CheckCircle2, Clock, Building } from 'lucide-react';
import './AdminFeatures.css';
import {
  useEvacuationCenters,
  isCenterMatch,
} from '../../lib/evacuationCenters.js';
import { AdminFilterModal, AdminFilterBar } from '../../components/AdminFilterModal.jsx';

const STATUSES = ['All Status', 'Complete', 'Pending'];

export default function EvacueeMonitoring() {
  const { centers } = useEvacuationCenters();
  const [filterCenter, setFilterCenter] = useState('All Centers');
  const [filterRoom, setFilterRoom] = useState('All Rooms');
  const [filterStatus, setFilterStatus] = useState('All Status');
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Generate monitoring records dynamically based on Supabase centers
  const monitoringRecords = useMemo(() => {
    if (!centers || centers.length === 0) return [];

    const list = [];
    centers.forEach((c, index) => {
      const code = c.name.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase();
      const rooms = c.rooms || [];
      const totalOcc = rooms.reduce((sum, r) => sum + (r.occupied || 0), 0);

      // Morning check for the entire center
      list.push({
        id: `CHK-${String(index * 2 + 1).padStart(2, '0')}`,
        code,
        center: c.displayName,
        room: 'All Rooms',
        checked: totalOcc || 35,
        round: 'Morning Verification',
        time: '08:30 AM',
        status: index % 3 === 0 ? 'Pending' : 'Complete',
      });

      // Specific room check if center has multiple rooms
      if (rooms.length > 1) {
        list.push({
          id: `CHK-${String(index * 2 + 2).padStart(2, '0')}`,
          code,
          center: c.displayName,
          room: rooms[0]?.id || 'Room 1',
          checked: rooms[0]?.occupied || 15,
          round: 'Afternoon Verification',
          time: '02:00 PM',
          status: index % 2 === 0 ? 'Complete' : 'Pending',
        });
      }
    });

    return list;
  }, [centers]);

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
                onRemove: () => setFilterCenter('All Centers'),
              },
              filterRoom !== 'All Rooms' && {
                key: 'room',
                label: 'Room',
                value: filterRoom,
                onRemove: () => setFilterRoom('All Rooms'),
              },
              filterStatus !== 'All Status' && {
                key: 'status',
                label: 'Status',
                value: filterStatus,
                onRemove: () => setFilterStatus('All Status'),
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
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  No monitoring records match the current filter criteria.
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
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
      {/* ── Mobile-Style Filter Modal ── */}
      <AdminFilterModal
        isOpen={showFilterModal}
        title="Filter Evacuee Monitoring"
        statusOptions={[
          { id: 'All Status', label: 'All Status' },
          { id: 'Complete', label: 'Complete' },
          { id: 'Pending', label: 'Pending' },
        ]}
        statusValue={filterStatus}
        centerValue={filterCenter}
        roomValue={filterRoom}
        centersList={centers}
        resultCount={filtered.length}
        onApply={({ status, center, room }) => {
          setFilterStatus(status);
          setFilterCenter(center);
          setFilterRoom(room);
        }}
        onClose={() => setShowFilterModal(false)}
      />
    </div>
  );
}