import { useContext, useMemo } from 'react';
import {
  Home,
  Users,
  Building,
  Package,
  ArrowUpRight,
  Gift,
  CheckCircle2,
  MapPin,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import './Dashboard.css';
import { EventContext } from '../../context/eventContext.js';
import { useEvacuationCenters } from '../../lib/evacuationCenters.js';
import { useEventRoomPlacements, useHouseholds } from '../../lib/householdService.js';
import { useRooms } from '../../lib/roomService.js';
import { useMonitoringLogs } from '../../lib/monitoringService.js';

function isLogForPlacement(log, placement) {
  if (log.householdId !== placement.household_id || !log.createdAt) return false;
  const loggedAt = new Date(log.createdAt).getTime();
  const checkedInAt = placement.check_in_at ? new Date(placement.check_in_at).getTime() : 0;
  const checkedOutAt = placement.check_out_at ? new Date(placement.check_out_at).getTime() : Infinity;
  return loggedAt >= checkedInAt && loggedAt <= checkedOutAt;
}

function formatTime(date) {
  return date
    ? new Date(date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : 'No checks yet';
}

export default function Dashboard() {
  const { selectedEvent, isReadOnly } = useContext(EventContext);
  const { centers } = useEvacuationCenters();
  const { households } = useHouseholds(centers);
  const { rooms } = useRooms(centers);
  const { placements } = useEventRoomPlacements(selectedEvent?.id);
  const { logs } = useMonitoringLogs(centers);

  const eventPlacements = useMemo(() => placements.filter((placement) => (
    placement.event_id === selectedEvent?.id &&
    (isReadOnly || placement.status === 'Evacuated')
  )), [placements, selectedEvent?.id, isReadOnly]);
  const eventHouseholds = useMemo(() => eventPlacements.map((placement) => {
    const household = households.find((item) => item.id === placement.household_id);
    return household ? { ...household, placement } : null;
  }).filter(Boolean), [eventPlacements, households]);

  const recentLogs = useMemo(() => logs
    .filter((log) => eventPlacements.some((placement) => isLogForPlacement(log, placement)))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  [logs, eventPlacements]);

  const centerSummaries = useMemo(() => {
    const placementByCenter = new Map();
    eventHouseholds.forEach((household) => {
      const centerId = household.placement.center_id;
      const summary = placementByCenter.get(centerId) || {
        centerId,
        households: [],
        people: 0,
      };
      summary.households.push(household);
      summary.people += household.familyCount || 1;
      placementByCenter.set(centerId, summary);
    });

    return [...placementByCenter.values()].map((summary) => {
      const center = centers.find((item) => item.id === summary.centerId);
      const householdIds = new Set(summary.households.map((household) => household.id));
      const centerLogs = recentLogs.filter((log) => householdIds.has(log.householdId));
      const latestLog = centerLogs[0];
      const checkedHouseholds = new Set(centerLogs.map((log) => log.householdId)).size;
      return {
        ...summary,
        name: center?.displayName || center?.name || 'Evacuation Center',
        location: center?.location || '',
        checkedHouseholds,
        status: checkedHouseholds >= summary.households.length ? 'Complete' : 'In progress',
        latestLog,
      };
    }).sort((a, b) => b.people - a.people);
  }, [eventHouseholds, centers, recentLogs]);

  const totalPeople = eventHouseholds.reduce((sum, household) => sum + (household.familyCount || 1), 0);
  const occupiedRoomIds = new Set(eventPlacements.map((placement) => placement.room_id).filter(Boolean));
  const totalRooms = rooms.length || centers.reduce((sum, center) => sum + (center.total_rooms || 0), 0);
  const issuedStubs = eventHouseholds.filter((household) => household.stubIssued).length;
  const occupancyPercent = totalRooms ? Math.round((occupiedRoomIds.size / totalRooms) * 100) : 0;

  return (
    <div className="vin-dashboard">
      <header className="vin-dash-header">
        <span className="vin-dash-date">
          {selectedEvent?.status === 'Active' ? 'ACTIVE OPERATION' : 'HISTORICAL OPERATION'}
        </span>
        <h1 className="vin-dash-title">{selectedEvent?.event_name || 'MSWDO-Vinzons Command Center'}</h1>
        <p className="vin-dash-desc">
          {isReadOnly ? 'Historical data is shown in read-only mode.' : 'Live evacuation status and monitoring for the selected operation.'}
        </p>
      </header>

      <section className="vin-metrics-grid">
        <div className="vin-metric-card">
          <div className="vin-metric-top"><div className="vin-metric-icon-box icon-box-green"><Home size={19} /></div><ArrowUpRight className="vin-metric-arrow" size={17} /></div>
          <div className="vin-metric-value">{centerSummaries.length}</div>
          <div className="vin-metric-label">Centers with evacuees</div>
          <div className="vin-metric-divider" />
          <div className="vin-metric-footer">{centers.length} registered centers</div>
        </div>
        <div className="vin-metric-card">
          <div className="vin-metric-top"><div className="vin-metric-icon-box icon-box-amber"><Users size={19} /></div><ArrowUpRight className="vin-metric-arrow" size={17} /></div>
          <div className="vin-metric-value">{totalPeople}</div>
          <div className="vin-metric-label">Individual evacuees</div>
          <div className="vin-metric-divider" />
          <div className="vin-metric-footer">{eventHouseholds.length} families in this operation</div>
        </div>
        <div className="vin-metric-card">
          <div className="vin-metric-top"><div className="vin-metric-icon-box icon-box-blue"><Building size={19} /></div><ArrowUpRight className="vin-metric-arrow" size={17} /></div>
          <div className="vin-metric-value">{occupiedRoomIds.size} / {totalRooms}</div>
          <div className="vin-metric-label">Occupied rooms</div>
          <div className="vin-metric-divider" />
          <div className="vin-metric-footer">{occupancyPercent}% room occupancy</div>
        </div>
        <div className="vin-metric-card">
          <div className="vin-metric-top"><div className="vin-metric-icon-box icon-box-orange"><Package size={19} /></div><ArrowUpRight className="vin-metric-arrow" size={17} /></div>
          <div className="vin-metric-value">{issuedStubs}</div>
          <div className="vin-metric-label">Relief stubs issued</div>
          <div className="vin-metric-divider" />
          <div className="vin-metric-footer">{eventHouseholds.length} families checked in</div>
        </div>
      </section>

      <section className="vin-dash-bottom-grid">
        <div className="vin-card">
          <div className="vin-card-header">
            <div>
              <span className="vin-card-eyebrow">DAILY CHECKS</span>
              <h2 className="vin-card-title">Evacuee monitoring</h2>
            </div>
            <Link to="/admin/evacuee-monitoring" className="vin-card-link">
              Open monitoring <ArrowUpRight size={14} />
            </Link>
          </div>

          <div className="vin-table-list">
            {centerSummaries.length === 0 ? (
              <div className="vin-table-row">
                <div className="vin-row-info">No families are recorded for this operation yet.</div>
              </div>
            ) : centerSummaries.map((center) => (
              <div className="vin-table-row" key={center.centerId}>
                <div className="vin-row-left">
                  <div className="vin-badge-code">{center.name.replace(/[^a-z]/gi, '').slice(0, 4).toUpperCase()}</div>
                  <div className="vin-row-info">
                    <div className="vin-row-name">{center.name}</div>
                    <div className="vin-row-sub">
                      {center.people} people checked in • {center.checkedHouseholds}/{center.households.length} families monitored
                    </div>
                  </div>
                </div>
                <div className="vin-row-right">
                  <span className={`vin-status-pill ${center.status === 'Complete' ? 'complete' : ''}`}>{center.status}</span>
                  <span className="vin-row-time">{formatTime(center.latestLog?.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="vin-card">
          <div className="vin-card-header">
            <div>
              <span className="vin-card-eyebrow">ACTIVITY LOG</span>
              <h2 className="vin-card-title">Recent monitoring rounds</h2>
            </div>
          </div>
          <div className="vin-activity-list">
            {recentLogs.length === 0 ? (
              <div className="vin-activity-item">
                <div className="vin-activity-icon icon-box-green"><MapPin size={18} /></div>
                <div className="vin-activity-details">
                  <div className="vin-activity-title">No monitoring rounds yet</div>
                  <div className="vin-activity-sub">Rounds for this operation will appear here.</div>
                </div>
              </div>
            ) : recentLogs.slice(0, 5).map((log) => (
              <div className="vin-activity-item" key={log.id}>
                <div className="vin-activity-icon icon-box-green"><CheckCircle2 size={18} /></div>
                <div className="vin-activity-details">
                  <div className="vin-activity-title">Monitoring round recorded</div>
                  <div className="vin-activity-sub">
                    {log.center} • {log.headName} • {formatTime(log.createdAt)}
                  </div>
                </div>
              </div>
            ))}
            {issuedStubs > 0 && (
              <div className="vin-activity-item">
                <div className="vin-activity-icon icon-box-amber"><Gift size={18} /></div>
                <div className="vin-activity-details">
                  <div className="vin-activity-title">Relief stubs issued</div>
                  <div className="vin-activity-sub">{issuedStubs} of {eventHouseholds.length} families</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
