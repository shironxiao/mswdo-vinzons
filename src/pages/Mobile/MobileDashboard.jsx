import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Home,
  Building,
  Ticket,
  Activity,
  ChevronRight,
  MapPin,
  RefreshCw,
  Layers,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMobileCenter } from '../../context/MobileCenterContext.jsx';
import { supabase } from '../../lib/supabase.js';
import './MobileCommon.css';

// Number of activities shown initially and per "See More" click
const PAGE_SIZE = 5;
// How many rows we pull per source per fetch
const FETCH_BATCH = 30;

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
  const {
    centers,
    assignedCenter,
    assignedCenterId,
    assignedCenterObj,
    hasSelectedCenter,
    openCenterPicker,
  } = useMobileCenter();

  // If no center has been selected yet, route to the center selection panel
  useEffect(() => {
    if (!hasSelectedCenter) {
      navigate('/mobile/select-center', { replace: true });
    }
  }, [hasSelectedCenter, navigate]);

  const [activityState, setActivityState] = useState({
    scopeKey: null,
    activities: [],
    loading: true,
    error: false,
  });
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const activityRequestSequence = useRef(0);

  // Fast, lightweight counts queried directly via Supabase HEAD requests
  const [metrics, setMetrics] = useState({
    householdsCount: 0,
    stubsCount: 0,
    monitoringCount: 0,
    loading: true,
  });

  const isAllCenters = assignedCenter === 'All Centers';
  const activeCenterId = assignedCenterObj?.id || (isAllCenters ? null : assignedCenterId);
  const activityScopeKey = activeCenterId || (isAllCenters ? 'all-centers' : `unresolved:${assignedCenter || 'none'}`);
  const recentActivities = activityState.scopeKey === activityScopeKey ? activityState.activities : [];
  const activityLoading = activityState.scopeKey === activityScopeKey ? activityState.loading : true;
  const activityError = activityState.scopeKey === activityScopeKey ? activityState.error : false;

  // Load lightweight exact HEAD counts scoped to the assigned center
  const loadScopedMetrics = useCallback(async () => {
    try {
      let hhQuery = supabase.from('households').select('*', { count: 'exact', head: true });
      let stubsQuery = supabase.from('households').select('*', { count: 'exact', head: true }).eq('stub_issued', true);
      let monQuery = supabase.from('monitoring_logs').select('*', { count: 'exact', head: true });

      if (activeCenterId) {
        hhQuery = hhQuery.eq('center_id', activeCenterId);
        stubsQuery = stubsQuery.eq('center_id', activeCenterId);
        monQuery = monQuery.eq('center_id', activeCenterId);
      }

      const [hhRes, stubsRes, monRes] = await Promise.all([
        hhQuery,
        stubsQuery,
        monQuery,
      ]);

      setMetrics({
        householdsCount: hhRes.count ?? 0,
        stubsCount: stubsRes.count ?? 0,
        monitoringCount: monRes.count ?? 0,
        loading: false,
      });
    } catch (err) {
      console.warn('Error loading dashboard scoped metrics:', err);
    }
  }, [activeCenterId]);

  // Fetch recent activities filtered by assigned center
  const fetchRecentActivities = useCallback(async () => {
    const requestId = ++activityRequestSequence.current;
    setActivityState((previous) => ({
      scopeKey: activityScopeKey,
      activities: previous.scopeKey === activityScopeKey ? previous.activities : [],
      loading: previous.scopeKey === activityScopeKey ? previous.loading : true,
      error: false,
    }));

    if (!hasSelectedCenter || (!isAllCenters && !activeCenterId)) {
      setActivityState({
        scopeKey: activityScopeKey,
        activities: [],
        loading: false,
        error: false,
      });
      return;
    }

    try {
      let hhQuery = supabase
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
        .limit(FETCH_BATCH);

      let monQuery = supabase
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
        .limit(FETCH_BATCH);

      let placeQuery = supabase
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
        .limit(FETCH_BATCH);

      // CRITICAL: Scope queries to active center to prevent memory crashes on mobile!
      if (activeCenterId) {
        hhQuery = hhQuery.eq('center_id', activeCenterId);
        monQuery = monQuery.eq('center_id', activeCenterId);
        placeQuery = placeQuery.eq('center_id', activeCenterId);
      }

      const [householdsResult, monitoringResult, placementsResult] = await Promise.all([
        hhQuery,
        monQuery,
        placeQuery,
      ]);

      if (requestId !== activityRequestSequence.current) return;
      if (householdsResult.error && monitoringResult.error && placementsResult.error) {
        setActivityState((previous) => ({
          scopeKey: activityScopeKey,
          activities: previous.scopeKey === activityScopeKey ? previous.activities : [],
          loading: false,
          error: true,
        }));
        return;
      }

      const activities = [];
      (householdsResult.data || []).forEach((household) => {
        const { center, room } = getCenterAndRoom(household, centers);
        const title = household.head_name || 'Household';
        const members = household.members || [];
        const familyCount = members.length > 0 ? members.length : 1;

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
            badgeVariant: 'green',
            icon: Ticket,
            iconColor: '#7c3aed',
            iconBgClass: 'green',
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
      setActivityState({
        scopeKey: activityScopeKey,
        activities,
        loading: false,
        error: false,
      });
    } catch (err) {
      if (requestId !== activityRequestSequence.current) return;
      console.warn('Could not fetch recent activities:', err);
      setActivityState((previous) => ({
        scopeKey: activityScopeKey,
        activities: previous.scopeKey === activityScopeKey ? previous.activities : [],
        loading: false,
        error: true,
      }));
    }
  }, [activeCenterId, activityScopeKey, centers, hasSelectedCenter, isAllCenters]);

  useEffect(() => {
    let refreshTimeout;
    const initialFetch = window.setTimeout(() => {
      fetchRecentActivities();
      loadScopedMetrics();
    }, 0);
    const scheduleRefresh = () => {
      window.clearTimeout(initialFetch);
      window.clearTimeout(refreshTimeout);
      refreshTimeout = window.setTimeout(() => {
        fetchRecentActivities();
        loadScopedMetrics();
      }, 300);
    };

    const householdChanges = { event: '*', schema: 'public', table: 'households' };
    const monitoringChanges = { event: '*', schema: 'public', table: 'monitoring_logs' };
    const placementChanges = { event: '*', schema: 'public', table: 'room_placements' };
    if (activeCenterId) {
      householdChanges.filter = `center_id=eq.${activeCenterId}`;
      monitoringChanges.filter = `center_id=eq.${activeCenterId}`;
      placementChanges.filter = `center_id=eq.${activeCenterId}`;
    }

    const channel = supabase
      .channel(`mobile-dash-${activeCenterId || 'all'}`)
      .on('postgres_changes', householdChanges, scheduleRefresh)
      .on('postgres_changes', monitoringChanges, scheduleRefresh)
      .on('postgres_changes', placementChanges, scheduleRefresh)
      .subscribe();

    return () => {
      activityRequestSequence.current += 1;
      window.clearTimeout(initialFetch);
      window.clearTimeout(refreshTimeout);
      supabase.removeChannel(channel);
    };
  }, [fetchRecentActivities, loadScopedMetrics, activeCenterId]);

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + PAGE_SIZE);
  };

  const visibleActivities = recentActivities.slice(0, visibleCount);
  const hasMore = recentActivities.length > visibleCount;

  // Active Station details for the Center card
  const centerCardDetails = useMemo(() => {
    if (assignedCenterObj) {
      const roomCount = assignedCenterObj.rooms?.length || assignedCenterObj.total_rooms || 1;
      const cap = assignedCenterObj.capacity || (roomCount * 25);
      return {
        value: `${roomCount} ${roomCount === 1 ? 'Room' : 'Rooms'}`,
        label: `Capacity: ${cap} pers.`,
      };
    }
    return {
      value: centers.length || 27,
      label: 'Total Centers',
    };
  }, [assignedCenterObj, centers.length]);

  return (
    <div className="vin-mob-page">
      {/* Header */}
      <header className="vin-mob-header">
        <div className="vin-mob-header-info">
          <h1 className="vin-mob-title">Dashboard</h1>
          <p className="vin-mob-subtitle">MSWDO Vinzons evacuee operations overview</p>
        </div>
      </header>

      {/* Active Evacuation Center Station Banner */}
      <div className="vin-mob-station-card">
        <div className="vin-mob-station-card-left">
          <span className="vin-mob-station-badge">Current Station</span>
          <h2 className="vin-mob-station-title">
            {assignedCenterObj?.displayName || assignedCenter || 'All Evacuation Centers'}
          </h2>
          <p className="vin-mob-station-sub">
            <MapPin size={12} />
            <span>{assignedCenterObj?.location || 'Town-wide Overview (27 Centers)'}</span>
            {assignedCenterObj?.total_rooms ? (
              <span>• {assignedCenterObj.total_rooms} Rooms</span>
            ) : null}
            {assignedCenterObj?.capacity ? (
              <span>• Cap: {assignedCenterObj.capacity} pers.</span>
            ) : null}
          </p>
        </div>
        <button
          type="button"
          className="vin-mob-station-switch-btn"
          onClick={openCenterPicker}
          title="Switch Evacuation Center"
        >
          Switch
        </button>
      </div>

      {/* 2x2 Scoped Dynamic Metric Cards Grid */}
      <div className="vin-mob-metrics-grid">
        {/* Card 1: Households in this Station */}
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
          <div className="vin-mob-metric-lbl">
            {assignedCenterObj ? 'Station Families' : 'Households'}
          </div>
        </div>

        {/* Card 2: Center Rooms & Capacity */}
        <div
          className="vin-mob-metric-card"
          onClick={() => navigate('/mobile/centers')}
          style={{ cursor: 'pointer' }}
          title="View Evacuation Centers"
        >
          <div className="vin-mob-icon-box blue">
            <Building size={22} />
          </div>
          <div className="vin-mob-metric-val">{centerCardDetails.value}</div>
          <div className="vin-mob-metric-lbl">{centerCardDetails.label}</div>
        </div>

        {/* Card 3: Stubs Issued in this Station */}
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

        {/* Card 4: Attendance Checks in this Station */}
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
          <div className="vin-mob-metric-lbl">Attendance Logs</div>
        </div>
      </div>

      {/* ── Recent Activity Section (Scoped Timeline Feed) ── */}
      <div className="vin-mob-section-head">
        <h2 className="vin-mob-section-title">Recent Activity</h2>
        <span className="vin-mob-section-sub">
          {assignedCenterObj ? `Station: ${assignedCenterObj.displayName || assignedCenter}` : 'All Centers'}
        </span>
      </div>

      <div className="vin-mob-activity-feed">
        {activityLoading && recentActivities.length === 0 && (
          <p className="vin-mob-section-sub" role="status">Loading station activity...</p>
        )}
        {!activityLoading && activityError && recentActivities.length === 0 && (
          <p className="vin-mob-section-sub" role="alert">Could not load recent activity. Please try again later.</p>
        )}
        {!activityLoading && !activityError && recentActivities.length === 0 && (
          <p className="vin-mob-section-sub">
            No recent activity recorded yet for {assignedCenterObj?.displayName || assignedCenter || 'this center'}.
          </p>
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
