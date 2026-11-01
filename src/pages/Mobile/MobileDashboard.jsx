import { useState, useEffect, useCallback } from 'react';
import {
  Home,
  Building,
  Ticket,
  Activity,
  ChevronRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEvacuationCenters } from '../../lib/evacuationCenters.js';
import { supabase } from '../../lib/supabase.js';
import './MobileCommon.css';

// Seed fallback data
const SEED_HOUSEHOLDS = [
  { id: 1, name: 'Antonio Magno', familyCount: 4, center: 'LGU EC (Mangcaway)', room: 'Room 1', stubCode: null },
  { id: 2, name: 'Rosa Santos', familyCount: 4, center: 'LGU EC (Mangcaway)', room: 'Room 2', stubCode: 'STB-001002' },
  { id: 3, name: 'Patricia Cruz', familyCount: 3, center: 'LGU EC (Bliss)', room: 'Room 1', stubCode: null },
  { id: 4, name: 'Juan Dela Cruz', familyCount: 5, center: 'PLGU EC (Mat-I)', room: 'Room 2', stubCode: 'STB-001004' },
  { id: 5, name: 'Carmen Reyes', familyCount: 3, center: 'PLGU EC (Mat-I)', room: 'Room 1', stubCode: null },
  { id: 6, name: 'Domingo Ramos', familyCount: 2, center: 'LGU EC (Bliss)', room: 'Room 3', stubCode: 'STB-001006' },
];

const SEED_STUBS = [
  { id: 'RG-10248', household: 'Antonio Magno', area: 'Room 1, LGU EC (Mangcaway)', status: 'Marked Issued' },
  { id: 'RG-10249', household: 'Rosa Santos', area: 'Room 2, LGU EC (Mangcaway)', status: 'Marked Issued' },
  { id: 'RG-10250', household: 'Patricia Cruz', area: 'Room 1, LGU EC (Bliss)', status: 'Pending' },
  { id: 'RG-10251', household: 'Juan Dela Cruz', area: 'Room 2, PLGU EC (Mat-I)', status: 'Marked Issued' },
];

const SEED_MONITORING = [
  { id: 1, name: 'Antonio Magno', status: 'Recorded', present: 4, total: 4 },
  { id: 2, name: 'Rosa Santos', status: 'Recorded', present: 4, total: 4 },
  { id: 3, name: 'Patricia Cruz', status: 'Absent', present: 0, total: 3 },
  { id: 4, name: 'Juan Dela Cruz', status: 'Recorded', present: 5, total: 5 },
];

const RECENT_ACTIVITY_LIMIT = 5;

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
  const [recentActivities, setRecentActivities] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState(false);

  const fetchRecentActivities = useCallback(async () => {
    const [householdsResult, monitoringResult] = await Promise.all([
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
          center:evacuation_centers ( id, name, location ),
          room:rooms ( id, room_name ),
          members:household_members ( id )
        `)
        .order('created_at', { ascending: false })
        .limit(RECENT_ACTIVITY_LIMIT),
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
        .limit(RECENT_ACTIVITY_LIMIT),
    ]);

    if (householdsResult.error) {
      console.warn('Could not fetch household activity:', householdsResult.error.message);
    }
    if (monitoringResult.error) {
      console.warn('Could not fetch monitoring activity:', monitoringResult.error.message);
    }
    if (householdsResult.error && monitoringResult.error) {
      setActivityError(true);
      setActivityLoading(false);
      return;
    }

    const activities = [];
    (householdsResult.data || []).forEach((household) => {
      const { center, room } = getCenterAndRoom(household, centers);
      const title = household.head_name || 'Household';
      const familyCount = (household.members?.length || 0) + 1;

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
    setRecentActivities(activities.slice(0, RECENT_ACTIVITY_LIMIT));
    setActivityError(false);
    setActivityLoading(false);
  }, [centers]);

  useEffect(() => {
    let isMounted = true;
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
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [fetchRecentActivities]);

  // Dynamic metrics state
  const [metrics, setMetrics] = useState({
    householdsCount: SEED_HOUSEHOLDS.length,
    evacueesCount: SEED_HOUSEHOLDS.reduce((acc, h) => acc + (h.familyCount || 0), 0),
    centersCount: centers.length || 10,
    stubsCount: SEED_STUBS.filter((s) => s.status === 'Marked Issued').length,
    monitoringCount: SEED_MONITORING.filter((m) => m.status === 'Recorded').length,
    isLoading: true,
  });

  // Fetch dynamic stats from Supabase or fallback
  useEffect(() => {
    let isMounted = true;

    async function fetchDynamicStats() {
      try {
        let hhCount = SEED_HOUSEHOLDS.length;
        let evacuees = SEED_HOUSEHOLDS.reduce((acc, h) => acc + (h.familyCount || 0), 0);
        let stubs = SEED_STUBS.filter((s) => s.status === 'Marked Issued').length;
        let monitored = SEED_MONITORING.filter((m) => m.status === 'Recorded').length;

        // Attempt Supabase fetch
        if (supabase) {
          const [hhRes, stubsRes] = await Promise.allSettled([
            supabase.from('households').select('id, members_count', { count: 'exact' }),
            supabase.from('relief_stubs').select('id, status', { count: 'exact' }),
          ]);

          if (hhRes.status === 'fulfilled' && hhRes.value?.data && hhRes.value.data.length > 0) {
            hhCount = hhRes.value.data.length;
            evacuees = hhRes.value.data.reduce((sum, h) => sum + (h.members_count || 1), 0);
          }

          if (stubsRes.status === 'fulfilled' && stubsRes.value?.data && stubsRes.value.data.length > 0) {
            stubs = stubsRes.value.data.filter((s) => s.status === 'Issued' || s.status === 'Marked Issued').length;
          }
        }

        if (isMounted) {
          setMetrics({
            householdsCount: hhCount,
            evacueesCount: evacuees,
            centersCount: centers.length || 10,
            stubsCount: stubs,
            monitoringCount: monitored,
            isLoading: false,
          });
        }
      } catch (err) {
        console.warn('Dashboard live metrics fetch error, using seeded data:', err);
        if (isMounted) {
          setMetrics((prev) => ({
            ...prev,
            centersCount: centers.length || 10,
            isLoading: false,
          }));
        }
      }
    }

    fetchDynamicStats();

    return () => {
      isMounted = false;
    };
  }, [centers]);

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
        {recentActivities.map((act) => {
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
      </div>
    </div>
  );
}
