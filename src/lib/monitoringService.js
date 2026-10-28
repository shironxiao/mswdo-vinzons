import { useState, useEffect, useCallback } from 'react';
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

  const roomName = row.room?.room_name || 'Room 1';
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
export function useMonitoringLogs(centersList = []) {
  const [logs, setLogs] = useState(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
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
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const normalized = data.map((r) => normalizeMonitoringLog(r, centersList));
        setLogs(normalized);
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(normalized));
        } catch {
          // ignore
        }
      }
    } catch (err) {
      console.warn('Could not fetch monitoring_logs from Supabase, using cache/fallback:', err);
    } finally {
      setLoading(false);
    }
  }, [centersList]);

  useEffect(() => {
    fetchLogs();

    const channel = supabase
      .channel('monitoring-logs-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'monitoring_logs' }, () => {
        fetchLogs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLogs]);

  return { logs, setLogs, loading, refresh: fetchLogs };
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
  return data;
}
