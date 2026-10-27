import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase.js';

/**
 * Fallback static centers in case device is completely offline on initial first-time load
 */
export const FALLBACK_CENTERS = [
  { id: '1', name: 'LGU EC', location: 'Mangcaway, Brgy. Calangcawan Sur, Vinzons, Camarines Norte', total_rooms: 20, capacity: 300 },
  { id: '2', name: 'LGU EC', location: 'Bliss, Brgy. Calangcawan Sur', total_rooms: 5, capacity: 40 },
  { id: '3', name: 'PLGU EC', location: 'Mat-I, Brgy. Sto. Domingo', total_rooms: 1, capacity: 200 },
  { id: '4', name: 'Pinagtigasan EC', location: 'Purok 1, Brgy. Pinagtigasan', total_rooms: 1, capacity: 100 },
  { id: '5', name: 'St. Peter Parish AVR', location: 'Brgy. Poblacion III', total_rooms: 1, capacity: 50 },
  { id: '6', name: 'Biday EC', location: 'Brgy. Banocboc', total_rooms: 1, capacity: 50 },
  { id: '7', name: 'Sugod EC', location: 'Brgy. Banocboc', total_rooms: 1, capacity: 50 },
  { id: '8', name: 'Mormons', location: 'Brgy. Calangcawan Sur', total_rooms: 4, capacity: 65 },
  { id: '9', name: 'Marabe Church', location: 'Brgy. Calangcawan Sur', total_rooms: 1, capacity: 150 },
  { id: '10', name: 'Adorno Fathers', location: 'Sto. Domingo', total_rooms: 3, capacity: 215 },
  { id: '11', name: 'Mangcawayan EC', location: 'Mangcawayan Island', total_rooms: 1, capacity: 50 },
  { id: '12', name: 'Our Lady of Fatima Shrine', location: 'Mangcawayan, Brgy. Calangcawan Sur', total_rooms: 2, capacity: 25 },
  { id: '13', name: 'Brgy. Hall', location: 'Brgy. Aguit-it', total_rooms: 1, capacity: 50 },
];

const STORAGE_KEY = 'vinzons_cached_evac_centers';

/**
 * Normalizes raw Supabase database rows into a structured object with rooms & display names
 */
export function normalizeCenters(rows = []) {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  // Count names to detect duplicates (e.g., multiple "LGU EC" entries)
  const nameCounts = {};
  rows.forEach((r) => {
    const key = (r.name || '').trim().toLowerCase();
    nameCounts[key] = (nameCounts[key] || 0) + 1;
  });

  return rows.map((r, index) => {
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

    const roomCount = Math.max(1, Number(r.total_rooms) || 1);
    const avgCap = r.capacity && roomCount > 0 ? Math.round(r.capacity / roomCount) : 25;

    const rooms = [];
    for (let i = 1; i <= roomCount; i++) {
      rooms.push({
        id: `Room ${i}`,
        name: `Room ${i}`,
        capacity: avgCap,
        occupied: 0,
        description: `Capacity: ${avgCap} persons`,
      });
    }

    return {
      id: r.id || `center-${index + 1}`,
      name: r.name,
      displayName,
      location: r.location || 'Vinzons, Camarines Norte',
      total_rooms: roomCount,
      capacity: r.capacity || null,
      rooms,
    };
  });
}

/**
 * Fetch evacuation centers directly from Supabase with offline cache fallback
 */
export async function fetchEvacuationCenters() {
  try {
    const { data, error } = await supabase
      .from('evacuation_centers')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('Could not fetch evacuation_centers from Supabase:', error.message);
      return getCachedOrFallbackCenters();
    }

    if (data && data.length > 0) {
      const normalized = normalizeCenters(data);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      } catch {
        // ignore localStorage quota errors
      }
      return normalized;
    }

    return getCachedOrFallbackCenters();
  } catch (err) {
    console.warn('Network error fetching evacuation centers:', err);
    return getCachedOrFallbackCenters();
  }
}

function getCachedOrFallbackCenters() {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return normalizeCenters(FALLBACK_CENTERS);
}

/**
 * Helper to get rooms for a center (or default 1-5 rooms)
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

  if (found && Array.isArray(found.rooms) && found.rooms.length > 0) {
    return ['All Rooms', ...found.rooms.map((r) => r.id)];
  }

  return ['All Rooms', 'Room 1', 'Room 2', 'Room 3', 'Room 4', 'Room 5'];
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

  if (roomSet.size === 0) {
    return ['All Rooms', 'Room 1', 'Room 2', 'Room 3', 'Room 4', 'Room 5'];
  }

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
  const [centers, setCenters] = useState(() => getCachedOrFallbackCenters());
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const data = await fetchEvacuationCenters();
    setCenters(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();

    // Setup Supabase Realtime subscription so any change in database updates UI live
    const channel = supabase
      .channel('evac_centers_live_updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'evacuation_centers' },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  return { centers, loading, refetch: loadData };
}
