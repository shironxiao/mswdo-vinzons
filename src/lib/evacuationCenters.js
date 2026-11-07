import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './supabase.js';


const STORAGE_KEY = 'vinzons_cached_evac_centers';
const ROOM_NAMES_KEY = 'vinzons_center_room_names';

/**
 * Retrieve saved custom room designations/names from storage
 */
export function getCustomRoomNamesMap() {
  try {
    const raw = localStorage.getItem(ROOM_NAMES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Save custom room designations/names for a center to storage
 */
export function saveCustomRoomNamesMap(centerKey, roomMap) {
  try {
    const existing = getCustomRoomNamesMap();
    existing[centerKey] = {
      ...(existing[centerKey] || {}),
      ...roomMap,
    };
    localStorage.setItem(ROOM_NAMES_KEY, JSON.stringify(existing));
    return existing;
  } catch (err) {
    console.warn('Could not save custom room names to storage:', err);
    return {};
  }
}

/**
 * Normalizes raw Supabase database rows into a structured object with rooms & display names,
 * and dynamically sorts them in alphabetical order A-Z by center name.
 */
export function normalizeCenters(rows = []) {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  // Count names to detect duplicates (e.g., multiple "LGU EC" entries)
  const nameCounts = {};
  rows.forEach((r) => {
    const key = (r.name || '').trim().toLowerCase();
    nameCounts[key] = (nameCounts[key] || 0) + 1;
  });

  const mapped = rows.map((r, index) => {
    const key = (r.name || '').trim().toLowerCase();
    const isDuplicate = (nameCounts[key] || 0) > 1;

    // Distinguish duplicate names by appending the location prefix (e.g. "LGU EC (Mangcaway)")
    let displayName = r.name || `Center ${index + 1}`;
    if (isDuplicate && r.location) {
      const snippet = r.location
        .split(',')[0]
        .replace(/^Purok\s*\d+/i, '')
        .replace(/^Brgy\.?\s*/i, '')
        .trim();
      displayName = `${r.name} (${snippet || r.location.slice(0, 16)})`;
    }

    const hasDatabaseRooms = Array.isArray(r.rooms);
    const roomCount = hasDatabaseRooms
      ? r.rooms.length
      : Math.max(1, Number(r.total_rooms) || 1);
    const avgCap = r.capacity && roomCount > 0 ? Math.round(r.capacity / roomCount) : 25;

    const savedRoomMap = getCustomRoomNamesMap();
    const centerCustomRooms =
      (r.id && savedRoomMap[r.id]) ||
      savedRoomMap[displayName] ||
      savedRoomMap[r.name] ||
      {};

    const rooms = hasDatabaseRooms
      ? r.rooms.map((room) => {
          const defaultName = room.room_name || 'Room';
          const customName = centerCustomRooms[defaultName] || defaultName;
          const capacity = Number(room.capacity_individuals) || avgCap || 25;
          return {
            id: defaultName,
            dbId: room.id,
            name: customName,
            capacity,
            occupied: 0,
            description: customName !== defaultName
              ? `${customName} (Cap. ${capacity})`
              : `Capacity: ${capacity} persons`,
          };
        })
      : [];

    return {
      id: r.id || `center-${index + 1}`,
      name: r.name,
      displayName,
      location: r.location || 'Vinzons, Camarines Norte',
      total_rooms: hasDatabaseRooms ? roomCount : Number(r.total_rooms) || roomCount,
      capacity: r.capacity || null,
      rooms,
    };
  });

  // Dynamic alphabetical sorting (A to Z) by display name
  return mapped.sort((a, b) =>
    (a.displayName || a.name || '').localeCompare(
      b.displayName || b.name || '',
      undefined,
      { sensitivity: 'base', numeric: true }
    )
  );
}

/**
 * Fetch evacuation centers directly from Supabase with offline cache fallback
 */
export async function fetchEvacuationCenters() {
  try {
    const { data, error } = await supabase
      .from('evacuation_centers')
      .select('*, rooms(id, room_name, capacity_individuals)')
      .order('name', { ascending: true });

    if (error) throw error;

    const normalized = normalizeCenters(data || []);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    } catch {
      // ignore localStorage quota errors
    }
    return normalized;
  } catch (err) {
    console.warn('Could not fetch evacuation centers from Supabase; using cached centers:', err?.message || err);
    return getCachedCenters();
  }
}

export async function createEvacuationCenter({ name, location, total_rooms, capacity }) {
  const roomCount = Math.max(1, Number(total_rooms) || 1);
  const centerCapacity = Number(capacity) || roomCount * 25;
  const { data: center, error: centerError } = await supabase
    .from('evacuation_centers')
    .insert({
      name: name.trim(),
      location: (location || 'Vinzons, Camarines Norte').trim(),
      total_rooms: roomCount,
      capacity: centerCapacity,
    })
    .select('id')
    .single();

  if (centerError) throw centerError;

  const roomCapacity = Math.max(1, Math.floor(centerCapacity / roomCount));
  const roomRows = Array.from({ length: roomCount }, (_, index) => ({
    center_id: center.id,
    room_name: `Room ${index + 1}`,
    capacity_individuals: roomCapacity,
  }));
  const { error: roomsError } = await supabase.from('rooms').insert(roomRows);

  if (roomsError) {
    const { error: rollbackError } = await supabase
      .from('evacuation_centers')
      .delete()
      .eq('id', center.id);
    if (rollbackError) {
      console.error('Could not roll back evacuation center after room creation failed:', rollbackError);
    }
    throw roomsError;
  }

  return center;
}

/**
 * Update an existing evacuation center (details and room designations)
 * in both Supabase and local cache
 */
export async function updateEvacuationCenter(centerId, {
  name,
  location,
  total_rooms,
  capacity,
  room_names,
  room_capacities,
}) {
  const updatePayload = {
    name: name.trim(),
    location: (location || 'Vinzons, Camarines Norte').trim(),
    total_rooms: Math.max(1, Number(total_rooms) || 1),
    capacity: Number(capacity) || 50,
  };

  const { data, error } = await supabase
    .from('evacuation_centers')
    .update(updatePayload)
    .eq('id', centerId)
    .select('id')
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Evacuation center could not be found.');

  if (room_names && Object.keys(room_names).length > 0) {
    if (centerId) saveCustomRoomNamesMap(centerId, room_names);
    if (name) saveCustomRoomNamesMap(name, room_names);
  }

  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      const updated = parsed.map((c) => {
        if (c.id === centerId) {
          const roomCount = Math.max(1, Number(total_rooms) || c.total_rooms || 1);
          const capNum = Number(capacity) || c.capacity || 50;
          const avgCap = Math.round(capNum / roomCount);
          const newRooms = [];
          for (let i = 1; i <= roomCount; i++) {
            const rId = `Room ${i}`;
            const rName = room_names?.[rId] || c.rooms?.[i - 1]?.name || rId;
            const roomCapacity = Number(room_capacities?.[rId]) || avgCap;
            newRooms.push({
              id: rId,
              name: rName,
              capacity: roomCapacity,
              occupied: c.rooms?.[i - 1]?.occupied || 0,
              description: rName !== rId
                ? `${rName} (Cap. ${roomCapacity})`
                : `Capacity: ${roomCapacity} persons`,
            });
          }
          return {
            ...c,
            name: name.trim(),
            displayName: name.trim(),
            location: location.trim(),
            total_rooms: roomCount,
            capacity: capNum,
            rooms: newRooms,
          };
        }
        return c;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
  } catch (err) {
    console.warn('Cache update error:', err);
  }

}

function getCachedCenters() {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return [];
}

/**
 * Helper to get database rooms for a center
 */
export function getRoomsForCenter(centerName, centersList = []) {
  if (!centerName || centerName === 'All Centers') {
    return getAllUniqueRooms(centersList);
  }

  const found = centersList.find(
    (c) =>
      c.displayName === centerName ||
      c.name === centerName ||
      (c.id && c.id === centerName)
  );

  if (found && Array.isArray(found.rooms)) {
    return ['All Rooms', ...found.rooms.map((r) => r.name || r.id)];
  }

  return ['All Rooms'];
}

/**
 * Helper to get all unique rooms across all centers
 */
export function getAllUniqueRooms(centersList = []) {
  const roomSet = new Set();
  centersList.forEach((c) => {
    (c.rooms || []).forEach((r) => {
      roomSet.add(r.id);
    });
  });

  // Sort rooms naturally (Room 1, Room 2, Room 10, etc.)
  const sorted = Array.from(roomSet).sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
    const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
    return numA - numB;
  });

  return ['All Rooms', ...sorted];
}

/**
 * Matcher for checking if a record's center field matches the filter center
 */
export function isCenterMatch(recordCenter, filterCenter, centersList = []) {
  if (!filterCenter || filterCenter === 'All Centers') return true;
  if (!recordCenter) return false;

  const rec = recordCenter.trim().toLowerCase();
  const filt = filterCenter.trim().toLowerCase();

  if (rec === filt) return true;

  // Find center object
  const found = centersList.find(
    (c) =>
      c.displayName.toLowerCase() === filt ||
      c.name.toLowerCase() === filt ||
      c.id === filterCenter
  );

  if (found) {
    if (rec === found.displayName.toLowerCase() || rec === found.name.toLowerCase()) {
      return true;
    }
    // Check if the record center matches prefix or contains location
    if (found.location && rec.includes(found.name.toLowerCase())) {
      const locSnippet = found.location.split(',')[0].toLowerCase().trim();
      if (locSnippet && rec.includes(locSnippet)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * React hook for dynamic evacuation centers
 */
export function useEvacuationCenters() {
  const [centers, setCenters] = useState(() => getCachedCenters());
  const [loading, setLoading] = useState(true);
  const requestId = useRef(0);

  const loadData = useCallback(async () => {
    const currentRequest = ++requestId.current;
    const data = await fetchEvacuationCenters();
    if (currentRequest !== requestId.current) return;
    setCenters(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    const initialFetch = window.setTimeout(loadData, 0);
    let refreshTimeout;
    const scheduleRefresh = () => {
      window.clearTimeout(initialFetch);
      window.clearTimeout(refreshTimeout);
      refreshTimeout = window.setTimeout(loadData, 250);
    };

    const channel = supabase
      .channel('evac_centers_live_updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'evacuation_centers' },
        scheduleRefresh
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, scheduleRefresh)
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') scheduleRefresh();
      });

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
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  return { centers, loading, refetch: loadData };
}
