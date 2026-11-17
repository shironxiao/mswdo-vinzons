import { useState, useEffect, useCallback } from 'react';
import {
  Home,
  Building,
  Ticket,
  Activity,
  ChevronRight,
  MapPin,
  RefreshCw,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEvacuationCenters } from '../../lib/evacuationCenters.js';
import { useHouseholds } from '../../lib/householdService.js';
import { useMonitoringLogs } from '../../lib/monitoringService.js';
import { supabase } from '../../lib/supabase.js';
import './MobileCommon.css';

// Number of activities shown initially and per "See More" click
const PAGE_SIZE = 5;
// How many rows we pull per source per fetch (big enough to allow several
// "See More" clicks without hitting the server again)
const FETCH_BATCH = 50;

function formatActivityTime(timestamp) {
  const elapsedMinutes = Math.floor((Date.now() - new Date(timestamp).getTime()) / 60000);
  if (!Number.isFinite(elapsedMinutes)) return 'Recently';
  if (elapsedMinutes < 1) return 'Just now';
  if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`;
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours}h ago`;
  return `${Math.floor(elapsedHours / 24)}d ago`;
}

function getCenterAndRoom(row, centers) {
  const center = centers.find((item) => item.id === row.center_id);
  return {
    center: center?.displayName || center?.name || row.center?.name || 'Unassigned Center',
    room: row.room?.room_name || 'Room not assigned',
  };
}

export default function MobileDashboard() {
  const navigate = useNavigate();
  const { centers } = useEvacuationCenters();
  const { households } = useHouseholds(centers);
  const { logs } = useMonitoringLogs(centers);
  const [recentActivities, setRecentActivities] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const fetchRecentActivities = useCallback(async () => {
    const [householdsResult, monitoringResult, placementsResult] = await Promise.all([
      supabase
        .from('households')
        .select(`
          id,
          head_name,
          center_id,
          stub_code,
          stub_issued,
          stub_issued_at,
          created_at,
          updated_at,
          center:evacuation_centers!households_center_id_fkey ( id, name, location ),
          room:rooms ( id, room_name ),
          members:household_members ( id )
        `)
        .order('updated_at', { ascending: false })
        .limit(FETCH_BATCH),
      supabase
        .from('monitoring_logs')
        .select(`
          id,
          center_id,
          household_status,
          total_members,
          present_count,
          created_at,
          household:households ( id, head_name ),
          center:evacuation_centers ( id, name, location ),
          room:rooms ( id, room_name )
        `)
        .order('created_at', { ascending: false })
        .limit(FETCH_BATCH),
      supabase
        .from('room_placements')
        .select(`
          id,
          household_id,
          center_id,
          room_id,
          status,
          check_in_at,
          check_out_at,
          household:households ( id, head_name ),
          center:evacuation_centers ( id, name, location ),
          room:rooms ( id, room_name )
        `)
        .order('check_in_at', { ascending: false })
        .limit(FETCH_BATCH),
    ]);

    if (householdsResult.error) {
      console.warn('Could not fetch household activity:', householdsResult.error.message);
    }
    if (monitoringResult.error) {
      console.warn('Could not fetch monitoring activity:', monitoringResult.error.message);
    }
    if (placementsResult.error) {
      console.warn('Could not fetch placement activity:', placementsResult.error.message);
    }
    if (householdsResult.error && monitoringResult.error && placementsResult.error) {
      setActivityError(true);
      setActivityLoading(false);
      return;
    }

    const activities = [];
    (householdsResult.data || []).forEach((household) => {
      const { center, room } = getCenterAndRoom(household, centers);
      const title = household.head_name || 'Household';
      const members = household.members || [];
      const headName = (household.head_name || '').trim().toLowerCase();
      const hasHead = members.some((m) =>
        m.is_household_head ||
        (m.relationship_to_head && String(m.relationship_to_head).toLowerCase() === 'head') ||
        (m.full_name && m.full_name.trim().toLowerCase() === headName)
      );
      const familyCount = hasHead ? Math.max(1, members.length) : (members.length > 0 ? 1 + members.length : 1);

      if (household.created_at) {
        activities.push({
          id: `household-${household.id}`,
          path: '/mobile/households',
          type: 'Household Registered',
          title: `${title} & Family`,
          sub: `${room} • ${center}`,
          timestamp: household.created_at,
          badge: `${familyCount} Members`,
          badgeVariant: 'green',
          icon: Home,
          iconColor: '#7c3aed',
          iconBgClass: 'green',
        });
      }

      if (household.stub_issued && household.stub_issued_at) {
        activities.push({
          id: `stub-${household.id}`,
          path: '/mobile/households',
          type: 'Relief Stub Issued',
          title: `${title} • ${household.stub_code || 'Stub'}`,
          sub: `${room} • ${center}`,
          timestamp: household.stub_issued_at,
          badge: 'Issued',
          badgeVariant: 'amber',
          icon: Ticket,
          iconColor: '#b45309',
          iconBgClass: 'amber',
        });
      }
    });

    (placementsResult.data || []).forEach((placement) => {
      if (!placement.check_in_at) return;
      const { center, room } = getCenterAndRoom(placement, centers);
      const title = placement.household?.head_name || 'Household';
      const isDecamped = placement.status === 'Decamped';
      activities.push({
        id: `placement-${placement.id}`,
        path: '/mobile/households',
        type: isDecamped ? 'Decamped from Center' : 'Assigned to Center',
        title: `${title} & Family`,
        sub: `${room} • ${center}`,
        timestamp: isDecamped ? (placement.check_out_at || placement.check_in_at) : placement.check_in_at,
        badge: isDecamped ? 'Decamped' : 'Assigned',
        badgeVariant: isDecamped ? 'blue' : 'mint',
        icon: MapPin,
        iconColor: isDecamped ? '#0284c7' : '#6b21a8',
        iconBgClass: isDecamped ? 'blue' : 'mint',
      });
    });

    (monitoringResult.data || []).forEach((log) => {
      const { center, room } = getCenterAndRoom(log, centers);
      const status = log.household_status || 'Recorded';
      activities.push({
        id: `monitoring-${log.id}`,
        path: '/mobile/monitor',
        type: 'Attendance Check',
        title: `${log.household?.head_name || 'Household'} Family`,
        sub: `${center} • ${log.present_count || 0}/${log.total_members || 0} Present • ${room}`,
        timestamp: log.created_at,
        badge: status,
        badgeVariant: 'blue',
        icon: Activity,
        iconColor: '#0284c7',
        iconBgClass: 'blue',
      });
    });

    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    setRecentActivities(activities);
    setActivityError(false);
    setActivityLoading(false);
  }, [centers]);

  useEffect(() => {
    let isMounted = true;
    let refreshTimeout;
    const scheduleRefresh = () => {
      window.clearTimeout(refreshTimeout);
      refreshTimeout = window.setTimeout(loadRecentActivities, 250);
    };
    const loadRecentActivities = async () => {
      try {
        await fetchRecentActivities();
      } catch (error) {
        console.warn('Could not load recent dashboard activity:', error);
        if (isMounted) {
          setActivityError(true);
          setActivityLoading(false);
        }
      }
    };

    loadRecentActivities();
    const channel = supabase
      .channel('mobile-dashboard-recent-activity')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'households' }, loadRecentActivities)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'monitoring_logs' }, loadRecentActivities)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_placements' }, loadRecentActivities)
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') scheduleRefresh();
      });
    const householdChannel = typeof BroadcastChannel === 'undefined'
      ? null
      : new BroadcastChannel('vinzons-households');
    const monitoringChannel = typeof BroadcastChannel === 'undefined'
      ? null
      : new BroadcastChannel('vinzons-monitoring-logs');
    householdChannel?.addEventListener('message', scheduleRefresh);
    monitoringChannel?.addEventListener('message', scheduleRefresh);
    const refreshInterval = window.setInterval(() => {
      if (document.visibilityState === 'visible' && navigator.onLine) scheduleRefresh();
    }, 30000);
    window.addEventListener('online', scheduleRefresh);
    window.addEventListener('focus', scheduleRefresh);
    document.addEventListener('visibilitychange', scheduleRefresh);

    return () => {
      isMounted = false;
      window.clearTimeout(refreshTimeout);
      window.clearInterval(refreshInterval);
      window.removeEventListener('online', scheduleRefresh);
      window.removeEventListener('focus', scheduleRefresh);
      document.removeEventListener('visibilitychange', scheduleRefresh);
      householdChannel?.removeEventListener('message', scheduleRefresh);
      monitoringChannel?.removeEventListener('message', scheduleRefresh);
      householdChannel?.close();
      monitoringChannel?.close();
      supabase.removeChannel(channel);
    };
  }, [fetchRecentActivities]);

  const metrics = {
    householdsCount: households.length,
    centersCount: centers.length,
    stubsCount: households.filter((household) => household.stubIssued).length,
    monitoringCount: new Set(logs.map((log) => log.householdId)).size,
  };

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + PAGE_SIZE);
  };

  const visibleActivities = recentActivities.slice(0, visibleCount);
  const hasMore = recentActivities.length > visibleCount;

  return (
    <div className="vin-mob-page">
      {/* Header */}
      <header className="vin-mob-header">
        <div className="vin-mob-header-info">
          <h1 className="vin-mob-title">Dashboard</h1>
          <p className="vin-mob-subtitle">MSWDO Vinzons evacuee management overview</p>
        </div>
      </header>

      {/* 2x2 Dynamic Metric Cards Grid */}
      <div className="vin-mob-metrics-grid">
        {/* Card 1: Households (Dynamic) */}
        <div
          className="vin-mob-metric-card"
          onClick={() => navigate('/mobile/households')}
          style={{ cursor: 'pointer' }}
          title="View Households"
        >
          <div className="vin-mob-icon-box green">
            <Home size={22} />
          </div>
          <div className="vin-mob-metric-val">{metrics.householdsCount}</div>
          <div className="vin-mob-metric-lbl">Households</div>
        </div>

        {/* Card 2: Centers (Dynamic) */}
        <div
          className="vin-mob-metric-card"
          onClick={() => navigate('/mobile/centers')}
          style={{ cursor: 'pointer' }}
          title="View Evacuation Centers"
        >
          <div className="vin-mob-icon-box blue">
            <Building size={22} />
          </div>
          <div className="vin-mob-metric-val">{metrics.centersCount}</div>
          <div className="vin-mob-metric-lbl">Centers</div>
        </div>

        {/* Card 3: Stubs Recorded (Goes to Households) */}
        <div
          className="vin-mob-metric-card"
          onClick={() => navigate('/mobile/households')}
          style={{ cursor: 'pointer' }}
          title="View Households & Stubs"
        >
          <div className="vin-mob-icon-box yellow">
            <Ticket size={22} />
          </div>
          <div className="vin-mob-metric-val">{metrics.stubsCount}</div>
          <div className="vin-mob-metric-lbl">Stubs Issued</div>
        </div>

        {/* Card 4: Recorded Activity (Dynamic) */}
        <div
          className="vin-mob-metric-card"
          onClick={() => navigate('/mobile/monitor')}
          style={{ cursor: 'pointer' }}
          title="View Evacuee Monitoring"
        >
          <div className="vin-mob-icon-box mint">
            <Activity size={22} />
          </div>
          <div className="vin-mob-metric-val">{metrics.monitoringCount}</div>
          <div className="vin-mob-metric-lbl">Recorded</div>
        </div>
      </div>

      {/* ── Recent Activity Section (Detailed Timeline Feed) ── */}
      <div className="vin-mob-section-head">
        <h2 className="vin-mob-section-title">Recent Activity</h2>
        <span className="vin-mob-section-sub">Live operations</span>
      </div>

      <div className="vin-mob-activity-feed">
        {activityLoading && recentActivities.length === 0 && (
          <p className="vin-mob-section-sub" role="status">Loading recent activity...</p>
        )}
        {!activityLoading && activityError && recentActivities.length === 0 && (
          <p className="vin-mob-section-sub" role="alert">Could not load recent activity. Please try again later.</p>
        )}
        {!activityLoading && !activityError && recentActivities.length === 0 && (
          <p className="vin-mob-section-sub">No recent activity yet.</p>
        )}
        {visibleActivities.map((act) => {
          const IconComponent = act.icon;
          return (
            <div
              key={act.id}
              className="vin-mob-activity-item"
              onClick={() => navigate(act.path)}
              role="button"
              tabIndex={0}
              title={`Go to ${act.type}`}
            >
              <div className="vin-mob-activity-left">
                <div className={`vin-mob-activity-icon ${act.iconBgClass}`}>
                  <IconComponent size={20} color={act.iconColor} />
                </div>
                <div className="vin-mob-activity-info">
                  <div className="vin-mob-activity-header">
                    <span className="vin-mob-activity-type">{act.type}</span>
                    <span className="vin-mob-activity-time">• {formatActivityTime(act.timestamp)}</span>
                  </div>
                  <span className="vin-mob-activity-title">{act.title}</span>
                  <span className="vin-mob-activity-sub">{act.sub}</span>
                </div>
              </div>

              <div className="vin-mob-activity-right">
                <span className={`vin-mob-activity-badge ${act.badgeVariant}`}>
                  {act.badge}
                </span>
                <ChevronRight size={18} className="vin-mob-activity-arrow" />
              </div>
            </div>
          );
        })}

        {hasMore && (
          <button
            type="button"
            className="vin-mob-load-more-btn"
            onClick={handleLoadMore}
          >
            <RefreshCw size={16} />
            See {Math.min(PAGE_SIZE, recentActivities.length - visibleCount)} more
          </button>
        )}
      </div>
    </div>
  );
}
