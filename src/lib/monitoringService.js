import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from './supabase.js';

const LOCAL_STORAGE_KEY = 'vinzons_cached_monitoring_logs';

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
  const [logs, setLogs] = useState(() => {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  const [loading, setLoading] = useState(true);
  const requestId = useRef(0);

  const fetchLogs = useCallback(async () => {
    const currentRequest = ++requestId.current;
    try {
      if (scopedCenterIds && scopedCenterIds.length === 0) {
        if (currentRequest === requestId.current) setLogs([]);
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
        if (batch.length < PAGE_SIZE) break;
      }

      if (currentRequest !== requestId.current) return;
      const normalized = allRows.map((r) => normalizeMonitoringLog(r, centersList));
      setLogs(normalized);
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
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [cacheKey, centerId, centersList, scopedCenterIds]);

  useEffect(() => {
    const initialFetch = window.setTimeout(fetchLogs, 0);
    let refreshTimeout;
    const scheduleRefresh = () => {
      window.clearTimeout(initialFetch);
      window.clearTimeout(refreshTimeout);
      refreshTimeout = window.setTimeout(fetchLogs, 250);
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
      channel.on('postgres_changes', logChangeConfig, scheduleRefresh);
    } else if (scopedCenterIds) {
      const subscriptionCenterIds = centerIdsKey ? centerIdsKey.split('|') : [];
      subscriptionCenterIds.forEach((id) => {
        channel.on('postgres_changes', { ...logChangeConfig, filter: `center_id=eq.${id}` }, scheduleRefresh);
      });
    } else {
      channel.on('postgres_changes', logChangeConfig, scheduleRefresh);
    }
    channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') scheduleRefresh();
      });
    const crossTabChannel = typeof BroadcastChannel === 'undefined'
      ? null
      : new BroadcastChannel('vinzons-monitoring-logs');
    crossTabChannel?.addEventListener('message', scheduleRefresh);

    const refreshWhenOnline = () => scheduleRefresh();
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') scheduleRefresh();
    };
    const refreshInterval = window.setInterval(() => {
      if (document.visibilityState === 'visible' && navigator.onLine) scheduleRefresh();
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
      crossTabChannel?.removeEventListener('message', scheduleRefresh);
      crossTabChannel?.close();
      supabase.removeChannel(channel);
    };
  }, [fetchLogs, centerId, centerIdsKey, scopedCenterIds]);

  const scopedLogs = centerId
    ? logs.filter((log) => log.centerId === centerId)
    : scopedCenterIds
      ? logs.filter((log) => scopedCenterIds.includes(log.centerId))
      : logs;
  return { logs: scopedLogs, setLogs, loading, refresh: fetchLogs };
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
