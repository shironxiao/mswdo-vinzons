import { useState, useEffect } from 'react';
import {
  Home,
  Building,
  Ticket,
  Activity,
  ChevronRight,
  Clock,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  PackageCheck,
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

// Clickable Recent Activity feed items mapping to their respective sections
const RECENT_ACTIVITIES = [
  {
    id: 'act-1',
    section: 'households',
    path: '/mobile/households',
    type: 'Household Registered',
    title: 'Antonio Magno & Family',
    sub: 'Room 1 • LGU EC (Mangcaway)',
    time: '12m ago',
    badge: '4 Members',
    badgeVariant: 'green',
    icon: Home,
    iconColor: '#15803d',
    iconBgClass: 'green',
  },
  {
    id: 'act-2',
    section: 'relief',
    path: '/mobile/relief',
    type: 'Relief Stub Issued',
    title: 'Rosa Santos • RG-10249',
    sub: 'Family Food Pack • Marked Issued',
    time: '34m ago',
    badge: 'Issued',
    badgeVariant: 'amber',
    icon: Ticket,
    iconColor: '#b45309',
    iconBgClass: 'amber',
  },
  {
    id: 'act-3',
    section: 'monitor',
    path: '/mobile/monitor',
    type: 'Attendance Check',
    title: 'Juan Dela Cruz Family',
    sub: 'PLGU EC (Mat-I) • 5/5 Present',
    time: '1h ago',
    badge: 'Recorded',
    badgeVariant: 'blue',
    icon: Activity,
    iconColor: '#0284c7',
    iconBgClass: 'blue',
  },
  {
    id: 'act-4',
    section: 'centers',
    path: '/mobile/centers',
    type: 'Center Room Assigned',
    title: 'Vinzons Central Elementary School',
    sub: 'Room 3 designated for incoming evacuees',
    time: '2h ago',
    badge: 'Active',
    badgeVariant: 'mint',
    icon: Building,
    iconColor: '#059669',
    iconBgClass: 'mint',
  },
  {
    id: 'act-5',
    section: 'relief',
    path: '/mobile/relief',
    type: 'Distribution Verification',
    title: 'Patricia Cruz • RG-10250',
    sub: 'Pending distribution verification',
    time: '3h ago',
    badge: 'Pending',
    badgeVariant: 'amber',
    icon: Ticket,
    iconColor: '#b45309',
    iconBgClass: 'amber',
  },
];

export default function MobileDashboard() {
  const navigate = useNavigate();
  const { centers } = useEvacuationCenters();

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

        {/* Card 3: Stubs Recorded (Dynamic) */}
        <div
          className="vin-mob-metric-card"
          onClick={() => navigate('/mobile/relief')}
          style={{ cursor: 'pointer' }}
          title="View Relief Goods Stubs"
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
        {RECENT_ACTIVITIES.map((act) => {
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
                    <span className="vin-mob-activity-time">• {act.time}</span>
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
