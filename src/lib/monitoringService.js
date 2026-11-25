import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from './supabase.js';

const LOCAL_STORAGE_KEY = 'vinzons_cached_monitoring_logs';
const MONITORING_CACHE_TTL_MS = 30_000;
const monitoringLogsCache = new Map();

function readMonitoringLogsCache(cacheKey) {
  const cached = monitoringLogsCache.get(cacheKey);
  if (cached) return cached;

  try {
    const stored = localStorage.getItem(cacheKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return { logs: parsed, updatedAt: 0 };
    }
  } catch {
    // Ignore unavailable or malformed browser cache.
  }
  return null;
}

/**
 * Normalizes raw Supabase monitoring_logs row
 */
export function normalizeMonitoringLog(row, centersList = []) {
  if (!row) return null;

  let centerName = row.center?.name || 'Unassigned Center';
  if (row.center_id && Array.isArray(centersList) && centersList.length > 0) {
    const match = centersList.find((c) => c.id === row.center_id);
    if (match) {
      centerName = match.displayName || match.name || centerName;
    }
  }

  const roomName = row.room?.room_name || 'Unassigned';
  const headName = row.household?.head_name || 'Household';

  return {
    id: row.id,
    householdId: row.household_id,
    householdCode: row.household?.household_code || 'HH',
    headName,
    centerId: row.center_id,
    center: centerName,
    roomId: row.room_id,
    room: roomName,
    monitoringInterval: row.monitoring_interval || 'Every 2-3 hours',
    checkedBy: row.checked_by || 'MSWDO Staff',
    householdStatus: row.household_status || 'Present',
    membersAttendance: Array.isArray(row.members_attendance) ? row.members_attendance : [],
    totalMembers: Number(row.total_members) || 1,
    presentCount: Number(row.present_count) || 0,
    absentCount: Number(row.absent_count) || 0,
    lateCount: Number(row.late_count) || 0,
    remarks: row.remarks || '',
    createdAt: row.created_at,
  };
}

/**
 * Hook to consume live monitoring logs with Supabase realtime updates and offline cache
 */
export function useMonitoringLogs(centersList = [], centerId = null, centerIds = null) {
  const scopedCenterIds = useMemo(
    () => Array.isArray(centerIds) ? [...new Set(centerIds.filter(Boolean))].sort() : null,
    [centerIds]
  );
  const centerIdsKey = scopedCenterIds ? scopedCenterIds.join('|') : null;
  const cacheKey = centerId
    ? `${LOCAL_STORAGE_KEY}:${centerId}`
    : scopedCenterIds
      ? `${LOCAL_STORAGE_KEY}:centers:${centerIdsKey || 'none'}`
      : LOCAL_STORAGE_KEY;
  const cachedLogsForKey = useMemo(() => readMonitoringLogsCache(cacheKey), [cacheKey]);
  const [logState, setLogState] = useState(() => ({
    cacheKey,
    logs: cachedLogsForKey?.logs || [],
  }));
  const logs = logState.cacheKey === cacheKey
    ? logState.logs
    : cachedLogsForKey?.logs || [];
  const [loadingState, setLoadingState] = useState(() => ({
    cacheKey,
    loading: !cachedLogsForKey?.logs,
  }));
  const loading = loadingState.cacheKey === cacheKey
    ? loadingState.loading
    : !cachedLogsForKey?.logs;
  const requestId = useRef(0);

  const fetchLogs = useCallback(async (force = false) => {
    const currentRequest = ++requestId.current;
    const cached = readMonitoringLogsCache(cacheKey);
    if (
      !force &&
      cached?.updatedAt &&
      Date.now() - cached.updatedAt < MONITORING_CACHE_TTL_MS
    ) {
      setLogState({ cacheKey, logs: cached.logs });
      setLoadingState({ cacheKey, loading: false });
      return;
    }

    try {
      if (scopedCenterIds && scopedCenterIds.length === 0) {
        if (currentRequest === requestId.current) {
          setLogState({ cacheKey, logs: [] });
          monitoringLogsCache.set(cacheKey, { logs: [], updatedAt: Date.now() });
        }
        return;
      }

      const PAGE_SIZE = 300;
      const allRows = [];
      for (let offset = 0; ; offset += PAGE_SIZE) {
        if (currentRequest !== requestId.current) return;
        let logsQuery = supabase
          .from('monitoring_logs')
          .select(`
            id,
            household_id,
            center_id,
            room_id,
            monitoring_interval,
            checked_by,
            household_status,
            members_attendance,
            total_members,
            present_count,
            absent_count,
            late_count,
            remarks,
            created_at,
            household:households ( id, head_name, household_code ),
            center:evacuation_centers ( id, name, location ),
            room:rooms ( id, room_name )
          `);
        if (centerId) logsQuery = logsQuery.eq('center_id', centerId);
        else if (scopedCenterIds) logsQuery = logsQuery.in('center_id', scopedCenterIds);
        const { data, error } = await logsQuery
          .order('created_at', { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1);

        if (error) throw error;
        const batch = data || [];
        allRows.push(...batch);
        if (!cached?.logs?.length) {
          setLogState({
            cacheKey,
            logs: allRows.map((row) => normalizeMonitoringLog(row, centersList)),
          });
        }
        if (batch.length < PAGE_SIZE) break;
      }

      if (currentRequest !== requestId.current) return;
      const normalized = allRows.map((r) => normalizeMonitoringLog(r, centersList));
      setLogState({ cacheKey, logs: normalized });
      monitoringLogsCache.set(cacheKey, { logs: normalized, updatedAt: Date.now() });
      try {
        localStorage.setItem(cacheKey, JSON.stringify(normalized));
      } catch {
        // ignore
      }
    } catch (err) {
      if (currentRequest === requestId.current) {
        console.warn('Could not fetch monitoring_logs from Supabase, using cache/fallback:', err);
      }
    } finally {
      if (currentRequest === requestId.current) {
        setLoadingState({ cacheKey, loading: false });
      }
    }
  }, [cacheKey, centerId, centersList, scopedCenterIds]);

  useEffect(() => {
    const initialFetch = window.setTimeout(fetchLogs, 0);
    let refreshTimeout;
    const scheduleRefresh = (force = true) => {
      window.clearTimeout(initialFetch);
      window.clearTimeout(refreshTimeout);
      refreshTimeout = window.setTimeout(() => fetchLogs(force), 250);
    };

    const logChangeConfig = {
      event: '*',
      schema: 'public',
      table: 'monitoring_logs',
    };
    if (centerId) logChangeConfig.filter = `center_id=eq.${centerId}`;

    const channel = supabase.channel('monitoring-logs-live');
    if (centerId) {
      logChangeConfig.filter = `center_id=eq.${centerId}`;
      channel.on('postgres_changes', logChangeConfig, () => scheduleRefresh(true));
    } else if (scopedCenterIds) {
      const subscriptionCenterIds = centerIdsKey ? centerIdsKey.split('|') : [];
      subscriptionCenterIds.forEach((id) => {
        channel.on('postgres_changes', { ...logChangeConfig, filter: `center_id=eq.${id}` }, () => scheduleRefresh(true));
      });
    } else {
      channel.on('postgres_changes', logChangeConfig, () => scheduleRefresh(true));
    }
    channel.subscribe();
    const crossTabChannel = typeof BroadcastChannel === 'undefined'
      ? null
      : new BroadcastChannel('vinzons-monitoring-logs');
    const refreshFromOtherTab = () => scheduleRefresh(true);
    crossTabChannel?.addEventListener('message', refreshFromOtherTab);

    const refreshWhenOnline = () => scheduleRefresh(true);
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') scheduleRefresh(true);
    };
    const refreshInterval = window.setInterval(() => {
      if (document.visibilityState === 'visible' && navigator.onLine) scheduleRefresh(true);
    }, 30000);

    window.addEventListener('online', refreshWhenOnline);
    window.addEventListener('focus', refreshWhenOnline);
    window.addEventListener('pageshow', refreshWhenOnline);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      window.clearTimeout(initialFetch);
      window.clearTimeout(refreshTimeout);
      window.clearInterval(refreshInterval);
      window.removeEventListener('online', refreshWhenOnline);
      window.removeEventListener('focus', refreshWhenOnline);
      window.removeEventListener('pageshow', refreshWhenOnline);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      crossTabChannel?.removeEventListener('message', refreshFromOtherTab);
      crossTabChannel?.close();
      supabase.removeChannel(channel);
    };
  }, [fetchLogs, cacheKey, centerId, centerIdsKey, scopedCenterIds]);

  const setLogs = useCallback((nextLogs) => {
    setLogState((previous) => {
      const currentLogs = previous.cacheKey === cacheKey
        ? previous.logs
        : cachedLogsForKey?.logs || [];
      return {
        cacheKey,
        logs: typeof nextLogs === 'function' ? nextLogs(currentLogs) : nextLogs,
      };
    });
  }, [cacheKey, cachedLogsForKey]);
  const refreshLogs = useCallback(() => fetchLogs(true), [fetchLogs]);
  const scopedLogs = centerId
    ? logs.filter((log) => log.centerId === centerId)
    : scopedCenterIds
      ? logs.filter((log) => scopedCenterIds.includes(log.centerId))
      : logs;
  return { logs: scopedLogs, setLogs, loading, refresh: refreshLogs };
}

/**
 * Insert a new 2-3 hour monitoring verification round into Supabase
 */
export async function recordMonitoringLog(logData) {
  const { data, error } = await supabase
    .from('monitoring_logs')
    .insert({
      household_id: logData.householdId,
      center_id: logData.centerId,
      room_id: logData.roomId || null,
      monitoring_interval: logData.monitoringInterval || 'Every 2-3 hours',
      checked_by: logData.checkedBy || 'MSWDO Personnel',
      household_status: logData.householdStatus || 'Present',
      members_attendance: logData.membersAttendance || [],
      total_members: Number(logData.totalMembers) || 1,
      present_count: Number(logData.presentCount) || 0,
      absent_count: Number(logData.absentCount) || 0,
      late_count: Number(logData.lateCount) || 0,
      remarks: logData.remarks || null,
    })
    .select()
    .single();

  if (error) throw error;
  if (typeof BroadcastChannel !== 'undefined') {
    const channel = new BroadcastChannel('vinzons-monitoring-logs');
    channel.postMessage({ type: 'updated' });
    channel.close();
  }
  return data;
}
