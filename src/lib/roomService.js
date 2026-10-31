import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase.js';

const LOCAL_STORAGE_KEY = 'vinzons_cached_rooms';

/**
 * Normalizes a raw Supabase room row with center display name
 */
export function normalizeRoom(row, centersList = []) {
  if (!row) return null;

  let centerName = row.center?.name || 'Unassigned Center';
  if (row.center_id && Array.isArray(centersList) && centersList.length > 0) {
    const match = centersList.find((c) => c.id === row.center_id);
    if (match) {
      centerName = match.displayName || match.name || centerName;
    }
  } else if (row.center?.location) {
    const snippet = row.center.location
      .split(',')[0]
      .replace(/^Purok\s*\d+/i, '')
      .replace(/^Brgy\.?\s*/i, '')
      .trim();
    if (snippet) {
      centerName = `${row.center.name} (${snippet})`;
    }
  }

  const centerCode = (row.center?.name || 'ROOM')
    .replace(/[^a-zA-Z]/g, '')
    .slice(0, 4)
    .toUpperCase();

  const roomClean = (row.room_name || 'Room 1').replace(/\s+/g, '');

  return {
    id: row.id,
    code: `${centerCode}-${roomClean}`,
    centerId: row.center_id,
    center: centerName,
    roomName: row.room_name,
    capacity: row.capacity_individuals || 30,
    createdAt: row.created_at,
  };
}

/**
 * Hook to consume live rooms with Supabase realtime updates and offline cache
 */
export function useRooms(centersList = []) {
  const [rooms, setRooms] = useState(() => {
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

  const fetchRooms = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('rooms')
        .select(`
          id,
          center_id,
          room_name,
          capacity_individuals,
          created_at,
          center:evacuation_centers ( id, name, location )
        `)
        .order('room_name', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const normalized = data.map((r) => normalizeRoom(r, centersList));
        setRooms(normalized);
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(normalized));
        } catch {
          // ignore
        }
      }
    } catch (err) {
      console.warn('Could not fetch rooms from Supabase, using cache/fallback:', err);
    } finally {
      setLoading(false);
    }
  }, [centersList]);

  useEffect(() => {
    fetchRooms();

    const channel = supabase
      .channel('rooms-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => {
        fetchRooms();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRooms]);

  return { rooms, setRooms, loading, refresh: fetchRooms };
}

/**
 * Add a new room in Supabase
 */
export async function createRoom(roomData, centersList = []) {
  let centerId = roomData.centerId;
  if (!centerId && roomData.center) {
    const found = centersList.find(
      (c) =>
        c.id === roomData.center ||
        c.displayName === roomData.center ||
        c.name === roomData.center
    );
    if (found) centerId = found.id;
  }

  if (!centerId && centersList.length > 0) {
    centerId = centersList[0].id;
  }

  const { data, error } = await supabase
    .from('rooms')
    .insert({
      center_id: centerId,
      room_name: roomData.roomName || roomData.name || 'Room 1',
      capacity_individuals: Number(roomData.capacity) || 30,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateRoomCapacity(roomId, capacity) {
  const { error } = await supabase
    .from('rooms')
    .update({ capacity_individuals: Number(capacity) })
    .eq('id', roomId);

  if (error) throw error;
}
