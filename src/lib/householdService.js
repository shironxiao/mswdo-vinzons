import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './supabase.js';
import { db, isOnline, queuePendingMutation } from './offlineDb.js';


const HOUSEHOLDS_CHANGED_EVENT = 'vinzons-households-changed';
const ADMIN_DATA_CACHE_TTL_MS = 30_000;
const householdRowsCache = new Map();
const roomPlacementsCache = new Map();
const householdSyncChannel = typeof BroadcastChannel === 'undefined'
  ? null
  : new BroadcastChannel('vinzons-households');

function notifyHouseholdChanges() {
  householdRowsCache.clear();
  roomPlacementsCache.clear();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(HOUSEHOLDS_CHANGED_EVENT));
  }
  try {
    householdSyncChannel?.postMessage({ type: 'updated' });
  } catch (error) {
    console.warn('Could not notify other tabs that households changed:', error);
  }
}

function getHouseholdStubCode(stubCode, householdCode, householdId) {
  if (stubCode) return stubCode;
  const codeSuffix = householdCode ? String(householdCode).replace(/^HH-/i, '') : '';
  if (codeSuffix) return `STB-${codeSuffix}`;
  if (!householdId) return '';
  return `STB-${String(householdId).replace(/-/g, '').toUpperCase()}`;
}

/**
 * Normalizes raw Supabase joined records into the shape used across Mobile and Admin components
 */
export function normalizeHousehold(row, centersList = []) {
  if (!row) return null;
  const profile = Array.isArray(row.profile) ? row.profile[0] : row.profile;

  // Resolve center display name
  let centerName = row.center?.name || 'Unassigned Center';
  if (row.center_id && Array.isArray(centersList) && centersList.length > 0) {
    const match = centersList.find((c) => c.id === row.center_id);
    if (match) {
      centerName = match.displayName || match.name || centerName;
    }
  } else if (row.center?.location) {
    const snippet = row.center.location.split(',')[0].replace(/^Purok\s*\d+/i, '').replace(/^Brgy\.?\s*/i, '').trim();
    if (snippet) {
      centerName = `${row.center.name} (${snippet})`;
    }
  }

  const roomName = row.room?.room_name || 'Unassigned';
  const members = Array.isArray(row.members)
    ? row.members.map((m) => {
        const memberProfile = Array.isArray(m.profile) ? m.profile[0] : m.profile;
        return {
          id: m.id,
          name: m.full_name,
          age: m.age,
          ageValue: m.age_value !== null && m.age_value !== undefined ? m.age_value : m.age,
          ageUnit: m.age_unit || 'Years',
          sex: m.sex,
          relationship: m.relationship_to_head || 'MEMBER',
          occupation: m.occupation || '',
          isHead: Boolean(m.is_household_head),
          vulnerabilities: Array.isArray(m.vulnerabilities) ? m.vulnerabilities : [],
          monthlyIncome: memberProfile?.monthly_income ?? '',
          hasWorkedDole: memberProfile?.has_worked_dole ?? null,
          doleEmploymentYear: memberProfile?.dole_employment_year ?? '',
          hasReceivedGovernmentAssistance: memberProfile?.has_received_government_assistance ?? null,
          govAssistanceAvailed: Array.isArray(memberProfile?.gov_assistance_availed)
            ? memberProfile.gov_assistance_availed
            : [],
          governmentAssistanceYear: memberProfile?.government_assistance_year ?? '',
          hasReceivedReliefAssistance: memberProfile?.has_received_relief_assistance ?? null,
          otherIncomeSource: memberProfile?.other_income_source || '',
          floodDepthLevel: memberProfile?.flood_depth_level || '',
          characteristicsRemarks: memberProfile?.characteristics_remarks || '',
        };
      })
    : [];

  const headNameClean = (row.head_name || '').trim().toLowerCase();
  const headIncludedInMembers = members.some((m) =>
    m.isHead ||
    (m.relationship && String(m.relationship).trim().toLowerCase() === 'head') ||
    (m.name && headNameClean && m.name.trim().toLowerCase() === headNameClean)
  );

  const familyCount = headIncludedInMembers
    ? Math.max(1, members.length)
    : (members.length > 0 ? 1 + members.length : 1);

  return {
    id: row.id,
    householdCode: row.household_code || `HH-${String(row.id).slice(-4)}`,
    name: row.head_name,
    age: row.head_age,
    sex: row.head_sex,
    headOccupation: row.head_occupation || '',
    barangay: row.barangay || 'Unassigned',
    purok: row.purok || 'Unassigned',
    evacueeStatus: row.evacuee_status || (row.center_id ? 'Active' : 'Decamped'),
    vulnerabilities: Array.isArray(row.vulnerabilities) ? row.vulnerabilities : [],
    center: centerName,
    centerId: row.center_id || row.center?.id || null,
    room: roomName,
    roomId: row.room_id || row.room?.id || null,
    familyCount,
    members,
    monthlyIncome: profile?.monthly_income ?? 0,
    hasWorkedDole: profile?.has_worked_dole ?? null,
    doleEmploymentYear: profile?.dole_employment_year ?? '',
    hasReceivedGovernmentAssistance: profile?.has_received_government_assistance ?? null,
    govAssistanceAvailed: Array.isArray(profile?.gov_assistance_availed)
      ? profile.gov_assistance_availed
      : [],
    governmentAssistanceYear: profile?.government_assistance_year ?? '',
    hasReceivedReliefAssistance: profile?.has_received_relief_assistance ?? null,
    otherIncomeSource: profile?.other_income_source || '',
    floodDepthLevel: profile?.flood_depth_level || '',
    characteristicsRemarks: profile?.characteristics_remarks || '',
    stubCode: getHouseholdStubCode(row.stub_code, row.household_code, row.id),
    stubIssued: Boolean(row.stub_issued),
    stubIssuedAt: row.stub_issued_at || null,
    createdAt: row.created_at || null,
  };
}

export const HOUSEHOLD_DETAIL_SELECT = `
  id,
  household_code,
  head_name,
  head_age,
  head_sex,
  head_occupation,
  barangay,
  purok,
  evacuee_status,
  vulnerabilities,
  center_id,
  room_id,
  stub_code,
  stub_issued,
  stub_issued_at,
  created_at,
  center:evacuation_centers!households_center_id_fkey ( id, name, location ),
  room:rooms ( id, room_name ),
  profile:household_profiles ( monthly_income, has_worked_dole, dole_employment_year, has_received_government_assistance, gov_assistance_availed, government_assistance_year, has_received_relief_assistance, other_income_source, flood_depth_level, characteristics_remarks ),
  members:household_members ( id, full_name, age, age_value, age_unit, sex, relationship_to_head, occupation, is_household_head, vulnerabilities, profile:household_member_profiles ( monthly_income, has_worked_dole, dole_employment_year, has_received_government_assistance, gov_assistance_availed, government_assistance_year, has_received_relief_assistance, other_income_source, flood_depth_level, characteristics_remarks ) )
`;

export const HOUSEHOLD_SUMMARY_SELECT = `
  id,
  household_code,
  head_name,
  head_age,
  head_sex,
  head_occupation,
  barangay,
  purok,
  evacuee_status,
  vulnerabilities,
  center_id,
  room_id,
  stub_code,
  stub_issued,
  stub_issued_at,
  created_at,
  center:evacuation_centers!households_center_id_fkey ( id, name, location ),
  room:rooms ( id, room_name ),
  members:household_members ( id, full_name, age, sex, relationship_to_head, is_household_head, vulnerabilities )
`;

export const HOUSEHOLD_JOIN_SELECT = HOUSEHOLD_SUMMARY_SELECT;

/**
 * Fetches the complete profile and member tree for a single household on demand
 */
export async function fetchHouseholdDetails(id, centersList = []) {
  if (!id) return null;

  // 1. Check local offline cache first
  try {
    const cachedEntry = await db.household_details.get(id);
    if (cachedEntry?.data) {
      if (!isOnline() || Date.now() - (cachedEntry.updatedAt || 0) < 60_000) {
        return cachedEntry.data;
      }
    }
  } catch (err) {
    console.warn('Could not read cached household details from Dexie:', err);
  }

  // 2. Fetch from Supabase cloud
  try {
    const { data, error } = await supabase
      .from('households')
      .select(HOUSEHOLD_DETAIL_SELECT)
      .eq('id', id)
      .single();

    if (error || !data) throw error || new Error('Household details not found');
    const normalized = normalizeHousehold(data, centersList);

    // Save to local cache
    try {
      await db.household_details.put({ id, data: normalized, updatedAt: Date.now() });
    } catch {}

    return normalized;
  } catch (cloudErr) {
    // If network fails or offline, fall back to basic household from Dexie
    try {
      const basic = await db.households.get(id);
      if (basic) return basic;
    } catch {}
    throw cloudErr;
  }
}

export const VINZONS_BARANGAYS = [
  'Aguit-it',
  'Banocboc',
  'Barangay I (Poblacion)',
  'Barangay II (Poblacion)',
  'Barangay III (Poblacion)',
  'Cagbalogo',
  'Calangcawan Norte',
  'Calangcawan Sur',
  'Guinacutan',
  'Mangcawayan',
  'Mangcayo',
  'Manlucugan',
  'Matango',
  'Napilihan',
  'Pinagtigasan',
  'Sabang',
  'Santo Domingo',
  'Singi',
  'Sula',
];

export async function fetchHouseholdBarangays() {
  const barangays = new Map();
  const batchSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('households')
      .select('barangay')
      .not('barangay', 'is', null)
      .order('barangay', { ascending: true })
      .range(from, from + batchSize - 1);

    if (error) throw error;

    (data || []).forEach((row) => {
      const barangay = String(row.barangay || '').trim();
      if (barangay && !barangays.has(barangay.toLowerCase())) {
        barangays.set(barangay.toLowerCase(), barangay);
      }
    });

    if (!data || data.length < batchSize) break;
    from += batchSize;
  }

  return Array.from(barangays.values()).sort((a, b) => a.localeCompare(b));
}

export async function fetchHouseholdPuroks(barangay) {
  const cleanBarangay = String(barangay || '').trim();
  if (!cleanBarangay) return [];

  const puroks = new Map();
  const batchSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('households')
      .select('purok')
      .eq('barangay', cleanBarangay)
      .not('purok', 'is', null)
      .order('purok', { ascending: true })
      .range(from, from + batchSize - 1);

    if (error) throw error;

    (data || []).forEach((row) => {
      const purok = String(row.purok || '').trim();
      if (purok && !puroks.has(purok.toLowerCase())) {
        puroks.set(purok.toLowerCase(), purok);
      }
    });

    if (!data || data.length < batchSize) break;
    from += batchSize;
  }

  return Array.from(puroks.values()).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

/**
 * Server-side paginated & filtered households query
 */
export async function fetchPaginatedHouseholds({
  page = 1,
  pageSize = 25,
  search = '',
  barangay = '',
  purok = '',
  centerId = '',
  assignedLocations = null,
  roomId = '',
  evacueeStatus = '',
  stubStatus = 'All',
  centersList = [],
}) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('households')
    .select(HOUSEHOLD_SUMMARY_SELECT, { count: 'exact' });

  if (Array.isArray(assignedLocations)) {
    const locations = assignedLocations
      .filter((location) => location?.barangay && location?.purok)
      .map((location) => ({
        barangay: String(location.barangay).trim(),
        purok: String(location.purok).trim(),
      }));

    if (locations.length === 0) {
      return { data: [], totalCount: 0, page, pageSize, totalPages: 1 };
    }

    const quoteFilterValue = (value) => `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
    const filters = locations.map(({ barangay: locationBarangay, purok: locationPurok }) => (
      locationPurok.toLowerCase() === 'all'
        ? `barangay.eq.${quoteFilterValue(locationBarangay)}`
        : `and(barangay.eq.${quoteFilterValue(locationBarangay)},purok.eq.${quoteFilterValue(locationPurok)})`
    ));
    query = query.or(filters.join(','));
  }

  const trimmed = search?.trim();
  if (trimmed) {
    const clean = trimmed.replace(/[,()]/g, ' ').trim();
    query = query.or(`head_name.ilike.%${clean}%,household_code.ilike.%${clean}%,barangay.ilike.%${clean}%,purok.ilike.%${clean}%,stub_code.ilike.%${clean}%`);
  }

  if (barangay && barangay !== 'All' && barangay !== 'All Barangays') {
    query = query.eq('barangay', barangay);
  }
  if (purok && purok !== 'All' && purok !== 'All Puroks') {
    query = query.eq('purok', purok);
  }
  if (centerId && centerId !== 'All Centers' && centerId !== 'All') {
    query = query.eq('center_id', centerId);
  }
  if (roomId && roomId !== 'All Rooms' && roomId !== 'All') {
    query = query.eq('room_id', roomId);
  }
  if (evacueeStatus === 'Active') {
    query = query.eq('evacuee_status', 'Active');
  } else if (evacueeStatus === 'Not Active') {
    query = query.neq('evacuee_status', 'Active');
  }
  if (stubStatus === 'Issued') {
    query = query.eq('stub_issued', true);
  } else if (stubStatus === 'Not Issued') {
    query = query.eq('stub_issued', false);
  }

  query = query
    .order('head_name', { ascending: true })
    .order('id', { ascending: true })
    .range(from, to);

  const { data, count, error } = await query;
  if (error) throw error;

  const normalized = (data || [])
    .map((row) => normalizeHousehold(row, centersList))
    .filter(Boolean);

  return {
    data: normalized,
    totalCount: count ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((count ?? 0) / pageSize) || 1,
  };
}

function isAllFilterValue(val) {
  if (!val) return true;
  const s = String(val).trim().toLowerCase();
  return (
    s === 'all' ||
    s === 'all barangays' ||
    s === 'all barangay' ||
    s === 'all puroks' ||
    s === 'all purok' ||
    s === 'all assigned puroks' ||
    s === 'all centers' ||
    s === 'all center'
  );
}

/**
 * Fetches households for batch printing with range/batching
 */
export async function fetchHouseholdsForPrint({
  barangay = '',
  purok = '',
  centerId = '',
  offset = 0,
  limit = 450,
  centersList = [],
}) {
  let query = supabase
    .from('households')
    .select(HOUSEHOLD_SUMMARY_SELECT);

  if (barangay && !isAllFilterValue(barangay)) {
    query = query.eq('barangay', barangay);
  }
  if (purok && !isAllFilterValue(purok)) {
    query = query.eq('purok', purok);
  }
  if (centerId && !isAllFilterValue(centerId)) {
    query = query.eq('center_id', centerId);
  }

  query = query
    .order('barangay', { ascending: true })
    .order('purok', { ascending: true })
    .order('head_name', { ascending: true })
    .range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((row) => normalizeHousehold(row, centersList)).filter(Boolean);
}

/**
 * Gets exact count of households for print filters
 */
export async function countHouseholdsForPrint({
  barangay = '',
  purok = '',
  centerId = '',
}) {
  let query = supabase
    .from('households')
    .select('*', { count: 'exact', head: true });

  if (barangay && !isAllFilterValue(barangay)) {
    query = query.eq('barangay', barangay);
  }
  if (purok && !isAllFilterValue(purok)) {
    query = query.eq('purok', purok);
  }
  if (centerId && !isAllFilterValue(centerId)) {
    query = query.eq('center_id', centerId);
  }

  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

/**
 * Search and filter households directly from local IndexedDB (Dexie)
 */
export async function searchOfflineHouseholds(query = '', { centerId = '', assignedLocations = null, roomId = '', evacueeStatus = '', stubStatus = 'All' } = {}) {
  try {
    let list = (centerId && centerId !== 'All' && centerId !== 'All Centers')
      ? await db.households.where('centerId').equals(centerId).toArray()
      : await db.households.toArray();
    if (Array.isArray(assignedLocations)) {
      if (assignedLocations.length === 0) return [];
      list = list.filter((h) =>
        assignedLocations.some((loc) => {
          const bMatch = String(loc.barangay || '').trim().toLowerCase() === String(h.barangay || '').trim().toLowerCase();
          const pLoc = String(loc.purok || '').trim().toLowerCase();
          const pH = String(h.purok || '').trim().toLowerCase();
          return bMatch && (pLoc === 'all' || pLoc === pH);
        })
      );
    }
    if (roomId && roomId !== 'All Rooms' && roomId !== 'All') {
      list = list.filter((h) => h.roomId === roomId || h.room === roomId);
    }
    if (evacueeStatus === 'Active') {
      list = list.filter((h) => h.evacueeStatus === 'Active');
    } else if (evacueeStatus === 'Not Active') {
      list = list.filter((h) => h.evacueeStatus !== 'Active');
    }
    if (stubStatus === 'Issued') {
      list = list.filter((h) => h.stubIssued);
    } else if (stubStatus === 'Not Issued') {
      list = list.filter((h) => !h.stubIssued);
    }

    const clean = (query || '').trim().toLowerCase();
    if (clean) {
      list = list.filter((h) =>
        (h.headName && h.headName.toLowerCase().includes(clean)) ||
        (h.name && h.name.toLowerCase().includes(clean)) ||
        (h.householdCode && h.householdCode.toLowerCase().includes(clean)) ||
        (h.barangay && h.barangay.toLowerCase().includes(clean)) ||
        (h.purok && h.purok.toLowerCase().includes(clean)) ||
        (h.stubCode && h.stubCode.toLowerCase().includes(clean))
      );
    }

    return list.sort((a, b) => (a.headName || a.name || '').localeCompare(b.headName || b.name || ''));
  } catch (err) {
    console.warn('Could not query offline households:', err);
    return [];
  }
}

/**
 * Fast paginated hook for the Masterlist
 */
export function usePaginatedMasterlist({
  page = 1,
  pageSize = 25,
  search = '',
  barangay = '',
  centerId = '',
  assignedLocations = null,
  roomId = '',
  evacueeStatus = '',
  stubStatus = 'All',
  centersList = [],
  enabled = true,
}) {
  const [data, setData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const reqSequence = useRef(0);

  const loadPage = useCallback(async () => {
    const reqId = ++reqSequence.current;
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    // If offline, instantly query local Dexie database
    if (!isOnline()) {
      try {
        const offlineMatches = await searchOfflineHouseholds(search, {
          centerId,
          assignedLocations: search?.trim() ? null : assignedLocations,
          roomId,
          evacueeStatus,
          stubStatus,
        });
        if (reqId === reqSequence.current) {
          const from = (page - 1) * pageSize;
          setData(offlineMatches.slice(from, from + pageSize));
          setTotalCount(offlineMatches.length);
          setLoading(false);
        }
        return;
      } catch (e) {
        console.warn('Offline search error:', e);
      }
    }

    try {
      if (search?.trim()) {
        const matches = await searchHouseholdsFromDatabase(search, centersList);
        if (reqId === reqSequence.current) {
          const from = (page - 1) * pageSize;
          setData(matches.slice(from, from + pageSize));
          setTotalCount(matches.length);
          setLoading(false);
        }
        return;
      }

      const res = await fetchPaginatedHouseholds({
        page,
        pageSize,
        search,
        barangay,
        centerId,
        assignedLocations,
        roomId,
        evacueeStatus,
        stubStatus,
        centersList,
      });

      if (reqId === reqSequence.current) {
        setData(res.data);
        setTotalCount(res.totalCount);
        setLoading(false);

        // Populate local Dexie in background with newly fetched records
        if (Array.isArray(res.data) && res.data.length > 0) {
          try {
            await db.households.bulkPut(res.data);
          } catch {}
        }
      }
    } catch (err) {
      if (reqId === reqSequence.current) {
        console.warn('Network error in usePaginatedMasterlist, attempting Dexie fallback:', err);
        try {
          const offlineMatches = await searchOfflineHouseholds(search, {
            centerId,
            assignedLocations: search?.trim() ? null : assignedLocations,
            roomId,
            evacueeStatus,
            stubStatus,
          });
          if (offlineMatches.length > 0) {
            const from = (page - 1) * pageSize;
            setData(offlineMatches.slice(from, from + pageSize));
            setTotalCount(offlineMatches.length);
            setLoading(false);
            return;
          }
        } catch {}

        setError(err.message || 'Error loading page');
        setLoading(false);
      }
    }
  }, [page, pageSize, search, barangay, centerId, assignedLocations, roomId, evacueeStatus, stubStatus, centersList, enabled]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) loadPage();
    });
    return () => {
      active = false;
    };
  }, [loadPage]);

  // Realtime subscription for updates
  useEffect(() => {
    if (!enabled) return undefined;
    const schedule = () => {
      loadPage();
    };

    const channel = supabase
      .channel('masterlist-page-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'households' }, schedule)
      .subscribe();

    window.addEventListener(HOUSEHOLDS_CHANGED_EVENT, schedule);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener(HOUSEHOLDS_CHANGED_EVENT, schedule);
    };
  }, [enabled, loadPage]);

  return { data, totalCount, loading, error, refresh: loadPage };
}

/**
 * Dynamically queries Supabase across all households (head name, code, barangay, purok, stub code, member name)
 * Used for dynamic search that finds any record across the entire database in real-time.
 */
export async function searchHouseholdsFromDatabase(query, centersList = [], limit = 1000, centerId = null) {
  const rawTerm = query?.trim();
  if (!rawTerm) return [];

  // Clean characters that interfere with PostgREST URL syntax
  const clean = rawTerm.replace(/[,()]/g, ' ').trim();
  if (!clean) return [];

  const orFilter = `head_name.ilike.%${clean}%,household_code.ilike.%${clean}%,barangay.ilike.%${clean}%,purok.ilike.%${clean}%,stub_code.ilike.%${clean}%`;
  let householdQuery = supabase
    .from('households')
    .select(HOUSEHOLD_JOIN_SELECT)
    .or(orFilter)
    .limit(limit);
  if (centerId) householdQuery = householdQuery.eq('center_id', centerId);
  const { data: hhData, error: hhErr } = await householdQuery;
  if (hhErr) throw hhErr;

  let memberRows = [];
  if (centerId) {
    const { data: centerHouseholds, error: centerHouseholdsError } = await supabase
      .from('households')
      .select('id')
      .eq('center_id', centerId);
    if (centerHouseholdsError) throw centerHouseholdsError;

    const centerHouseholdIds = (centerHouseholds || []).map((household) => household.id);
    for (let index = 0; index < centerHouseholdIds.length && memberRows.length < limit; index += 100) {
      const { data, error } = await supabase
        .from('household_members')
        .select('household_id')
        .ilike('full_name', `%${clean}%`)
        .in('household_id', centerHouseholdIds.slice(index, index + 100))
        .limit(limit - memberRows.length);
      if (error) throw error;
      memberRows.push(...(data || []));
    }
  } else {
    const { data, error } = await supabase
      .from('household_members')
      .select('household_id')
      .ilike('full_name', `%${clean}%`)
      .limit(limit);
    if (error) throw error;
    memberRows = data || [];
  }

  const existingIds = new Set((hhData || []).map((household) => household.id));
  const neededIds = [...new Set((memberRows || []).map((member) => member.household_id))]
    .filter((id) => Boolean(id) && !existingIds.has(id));
  const memberHouseholds = [];

  for (let index = 0; index < neededIds.length; index += 100) {
    const { data, error } = await supabase
      .from('households')
      .select(HOUSEHOLD_JOIN_SELECT)
      .in('id', neededIds.slice(index, index + 100));
    if (error) throw error;
    memberHouseholds.push(...(data || []));
  }

  const unique = new Map();
  [...(hhData || []), ...memberHouseholds].forEach((row) => unique.set(row.id, row));
  return [...unique.values()].map((row) => normalizeHousehold(row, centersList)).filter(Boolean);
}

/**
 * Hook to consume households returned by Supabase with realtime updates.
 * Progressively streams all households in batches and accurately tracks the total count.
 */
export function useHouseholds(centersList = [], { centerId = null, fetchAll = false } = {}) {
  const cacheKey = centerId || (fetchAll ? 'all' : 'first-page');
  const cachedHouseholds = householdRowsCache.get(cacheKey);
  const [households, setHouseholds] = useState(() => (
    cachedHouseholds
      ? cachedHouseholds.rows.map((row) => normalizeHousehold(row, centersList)).filter(Boolean)
      : []
  ));
  const [totalCount, setTotalCount] = useState(cachedHouseholds?.totalCount || 0);
  const [loading, setLoading] = useState(!cachedHouseholds?.rows?.length);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const fetchSequence = useRef(0);

  // Instant render from local Dexie database for offline / low-data usage
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const offlineRows = centerId
          ? await db.households.where('centerId').equals(centerId).toArray()
          : await db.households.toArray();
        if (offlineRows.length > 0 && isMounted) {
          setHouseholds((curr) => (curr.length === 0 ? offlineRows : curr));
          setTotalCount((curr) => (curr === 0 ? offlineRows.length : curr));
          setLoading(false);
        }
      } catch (err) {
        // ignore
      }
    })();
    return () => { isMounted = false; };
  }, [centerId]);

  const fetchHouseholds = useCallback(async (force = false) => {
    const requestId = ++fetchSequence.current;
    if (!isOnline()) {
      try {
        const offlineRows = centerId
          ? await db.households.where('centerId').equals(centerId).toArray()
          : await db.households.toArray();
        if (requestId === fetchSequence.current) {
          setHouseholds(offlineRows);
          setTotalCount(offlineRows.length);
          setLoading(false);
          setIsLoadingMore(false);
          setError(null);
        }
      } catch {
        if (requestId === fetchSequence.current) {
          setLoading(false);
          setIsLoadingMore(false);
        }
      }
      return;
    }

    const cached = householdRowsCache.get(cacheKey);
    if (
      !force &&
      cached?.complete &&
      Date.now() - cached.updatedAt < ADMIN_DATA_CACHE_TTL_MS
    ) {
      setHouseholds(cached.rows.map((row) => normalizeHousehold(row, centersList)).filter(Boolean));
      setTotalCount(cached.totalCount);
      setLoading(false);
      setIsLoadingMore(false);
      setError(null);
      return;
    }

    setLoading(!cached?.rows?.length);
    setIsLoadingMore(Boolean(centerId || fetchAll));
    try {
      // 1. Fetch exact total count first (super fast HEAD count query)
      let countQuery = supabase
        .from('households')
        .select('*', { count: 'exact', head: true });
      if (centerId) countQuery = countQuery.eq('center_id', centerId);
      const { count, error: countErr } = await countQuery;

      if (!countErr && typeof count === 'number') {
        if (requestId === fetchSequence.current) {
          setTotalCount(count);
        }
      }

      // 2. Fetch first chunk (up to 300) for instant render without UI freezing
      const BATCH_SIZE = 300;
      const fetchHouseholdBatch = async (from) => {
        let householdsQuery = supabase
          .from('households')
          .select(HOUSEHOLD_SUMMARY_SELECT)
          .order('created_at', { ascending: false });
        if (centerId) householdsQuery = householdsQuery.eq('center_id', centerId);
        const { data, error } = await householdsQuery.range(from, from + BATCH_SIZE - 1);
        if (error) throw error;
        return data || [];
      };
      const firstChunk = await fetchHouseholdBatch(0);
      const householdRows = [...firstChunk];

      const publishRows = (complete = false) => {
        if (requestId !== fetchSequence.current) return;
        householdRowsCache.set(cacheKey, {
          rows: [...householdRows],
          totalCount: typeof count === 'number' ? count : householdRows.length,
          complete,
          updatedAt: complete ? Date.now() : 0,
        });
        setHouseholds(householdRows.map((row) => normalizeHousehold(row, centersList)).filter(Boolean));
      };

      if (!cached?.rows?.length) publishRows();

      if (centerId || fetchAll) {
        if (typeof count === 'number') {
          const concurrency = 4;
          for (let offset = BATCH_SIZE; offset < count; offset += BATCH_SIZE * concurrency) {
            const offsets = Array.from(
              { length: Math.min(concurrency, Math.ceil((count - offset) / BATCH_SIZE)) },
              (_, index) => offset + index * BATCH_SIZE
            );
            const batches = await Promise.all(offsets.map(fetchHouseholdBatch));
            if (requestId !== fetchSequence.current) return;
            batches.forEach((batch) => householdRows.push(...batch));
            if (!cached?.rows?.length) publishRows();
          }
        } else {
          for (let offset = BATCH_SIZE; ; offset += BATCH_SIZE) {
            if (requestId !== fetchSequence.current) return;
            const batch = await fetchHouseholdBatch(offset);
            householdRows.push(...batch);
            if (!cached?.rows?.length) publishRows();
            if (batch.length < BATCH_SIZE) break;
          }
        }
      }

      if (requestId !== fetchSequence.current) return;

      householdRowsCache.set(cacheKey, {
        rows: householdRows,
        totalCount: typeof count === 'number' ? count : householdRows.length,
        complete: true,
        updatedAt: Date.now(),
      });

      const firstNormalized = householdRows
        .map((row) => normalizeHousehold(row, centersList))
        .filter(Boolean);

      setHouseholds(firstNormalized);
      setTotalCount(typeof count === 'number' ? count : householdRows.length);
      setLoading(false);
      setIsLoadingMore(false);
      setError(null);

      // Async cache in Dexie for offline use
      try {
        db.households.bulkPut(firstNormalized).catch(() => {});
      } catch {}
    } catch (err) {
      if (requestId !== fetchSequence.current) return;
      console.warn('Network issue in fetchHouseholds, checking Dexie cache:', err?.message || err);
      try {
        const offlineRows = centerId
          ? await db.households.where('centerId').equals(centerId).toArray()
          : await db.households.toArray();
        if (offlineRows.length > 0) {
          setHouseholds(offlineRows);
          setTotalCount(offlineRows.length);
          setLoading(false);
          setIsLoadingMore(false);
          return;
        }
      } catch {}
      setError(err?.message || 'Failed to fetch households');
    } finally {
      if (requestId === fetchSequence.current) {
        setLoading(false);
        setIsLoadingMore(false);
      }
    }
  }, [centersList, centerId, fetchAll, cacheKey]);

  useEffect(() => {
    let refreshTimeout;
    const initialFetch = window.setTimeout(fetchHouseholds, 0);
    const scheduleRefresh = () => {
      window.clearTimeout(initialFetch);
      window.clearTimeout(refreshTimeout);
      refreshTimeout = window.setTimeout(() => fetchHouseholds(true), 250);
    };

    const householdChangeConfig = {
      event: '*',
      schema: 'public',
      table: 'households',
    };
    if (centerId) householdChangeConfig.filter = `center_id=eq.${centerId}`;

    const channel = supabase
      .channel('households-live')
      .on('postgres_changes', householdChangeConfig, () => {
        scheduleRefresh();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'household_members' }, () => {
        scheduleRefresh();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'household_profiles' }, () => {
        scheduleRefresh();
      })
      .subscribe();
    householdSyncChannel?.addEventListener('message', scheduleRefresh);

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
    window.addEventListener(HOUSEHOLDS_CHANGED_EVENT, scheduleRefresh);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      fetchSequence.current += 1;
      window.clearTimeout(initialFetch);
      window.clearTimeout(refreshTimeout);
      window.clearInterval(refreshInterval);
      window.removeEventListener('online', refreshWhenOnline);
      window.removeEventListener('focus', refreshWhenOnline);
      window.removeEventListener('pageshow', refreshWhenOnline);
      window.removeEventListener(HOUSEHOLDS_CHANGED_EVENT, scheduleRefresh);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      householdSyncChannel?.removeEventListener('message', scheduleRefresh);
      supabase.removeChannel(channel);
    };
  }, [fetchHouseholds, centerId]);

  const refreshHouseholds = useCallback(() => fetchHouseholds(true), [fetchHouseholds]);

  return {
    households,
    totalCount,
    loading,
    isLoadingMore,
    error,
    refresh: refreshHouseholds,
    setHouseholds,
  };
}

export function useEventRoomPlacements(eventId, { includeMemberAgeDetails = false, centerId = null } = {}) {
  const householdSelect = includeMemberAgeDetails
    ? HOUSEHOLD_DETAIL_SELECT
    : HOUSEHOLD_SUMMARY_SELECT;
  const cacheKey = `${eventId || 'none'}:${centerId || 'all'}:${includeMemberAgeDetails ? 'details' : 'summary'}`;
  const [placementState, setPlacementState] = useState(() => ({
    cacheKey,
    data: roomPlacementsCache.get(cacheKey)?.data || [],
  }));
  const placements = placementState.cacheKey === cacheKey
    ? placementState.data
    : roomPlacementsCache.get(cacheKey)?.data || [];
  const refreshTimeoutRef = useRef(null);
  const fetchSequence = useRef(0);

  const fetchPlacements = useCallback(async (force = false) => {
    const requestId = ++fetchSequence.current;
    if (!eventId || eventId === 'default-active-event') {
      setPlacementState({ cacheKey, data: [] });
      return;
    }

    const cached = roomPlacementsCache.get(cacheKey);
    if (
      !force &&
      cached?.complete &&
      Date.now() - cached.updatedAt < ADMIN_DATA_CACHE_TTL_MS
    ) {
      setPlacementState({ cacheKey, data: cached.data });
      return;
    }

    try {
      const PAGE_SIZE = 300;
      const allPlacements = [];

      for (let offset = 0; ; offset += PAGE_SIZE) {
        if (requestId !== fetchSequence.current) return;
        let placementsQuery = supabase
          .from('room_placements')
          .select(`
            id, household_id, center_id, room_id, event_id, status, check_in_at, check_out_at,
            household:households (
              ${householdSelect}
            )
          `)
          .eq('event_id', eventId);
        if (centerId) placementsQuery = placementsQuery.eq('center_id', centerId);
        const { data, error: placementError } = await placementsQuery
          .order('check_in_at', { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1);

        if (placementError) throw placementError;
        const batch = data || [];
        allPlacements.push(...batch);
        if (!cached?.data?.length) {
          roomPlacementsCache.set(cacheKey, { data: [...allPlacements], complete: false, updatedAt: 0 });
          setPlacementState({ cacheKey, data: [...allPlacements] });
        }
        if (batch.length < PAGE_SIZE) break;
      }

      if (requestId === fetchSequence.current) {
        roomPlacementsCache.set(cacheKey, { data: allPlacements, complete: true, updatedAt: Date.now() });
        setPlacementState({ cacheKey, data: allPlacements });
      }
    } catch (placementError) {
      if (requestId === fetchSequence.current) {
        console.error('Could not load evacuation placements:', placementError);
      }
    }
  }, [eventId, centerId, householdSelect, cacheKey]);

  useEffect(() => {
    const initialFetch = window.setTimeout(fetchPlacements, 0);
    if (!eventId || eventId === 'default-active-event') {
      return () => {
        window.clearTimeout(initialFetch);
        fetchSequence.current += 1;
      };
    }

    const scheduleRefresh = () => {
      window.clearTimeout(initialFetch);
      window.clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = window.setTimeout(() => fetchPlacements(true), 250);
    };

    const placementChangeConfig = {
      event: '*',
      schema: 'public',
      table: 'room_placements',
    };
    if (centerId) placementChangeConfig.filter = `center_id=eq.${centerId}`;

    const channel = supabase
      .channel(`room-placements-${eventId}`)
      .on('postgres_changes', placementChangeConfig, scheduleRefresh)
      .subscribe();
    householdSyncChannel?.addEventListener('message', scheduleRefresh);

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
      fetchSequence.current += 1;
      window.clearTimeout(initialFetch);
      window.clearTimeout(refreshTimeoutRef.current);
      window.clearInterval(refreshInterval);
      window.removeEventListener('online', refreshWhenOnline);
      window.removeEventListener('focus', refreshWhenOnline);
      window.removeEventListener('pageshow', refreshWhenOnline);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      householdSyncChannel?.removeEventListener('message', scheduleRefresh);
      supabase.removeChannel(channel);
    };
  }, [eventId, centerId, fetchPlacements, cacheKey]);

  const refreshPlacements = useCallback(() => fetchPlacements(true), [fetchPlacements]);
  return { placements, refresh: refreshPlacements };
}

/**
 * Register a new household and its members into Supabase
 */
export async function createHousehold(formData, centersList = [], eventId = null) {
  // 1. Resolve center_id
  let centerId = formData.centerId;
  if (!centerId && formData.center) {
    const found = centersList.find(
      (c) =>
        c.id === formData.center ||
        c.displayName === formData.center ||
        c.name === formData.center
    );
    centerId = found ? found.id : null;
  }

  const stubCode = formData.stubCode || `STB-${String(Date.now()).slice(-6)}`;
  const householdCode = formData.householdCode || `HH-${String(Date.now()).slice(-4)}`;

  // Handle Offline Mode directly
  if (!isOnline()) {
    const tempId = `temp-hh-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const localHousehold = {
      id: tempId,
      householdCode,
      headName: formData.head,
      name: formData.head,
      age: Number(formData.age) || 35,
      sex: formData.sex || 'Male',
      occupation: formData.headOccupation || null,
      barangay: formData.barangay || 'Unassigned',
      purok: formData.purok || 'Unassigned',
      evacueeStatus: centerId ? 'Active' : 'Decamped',
      status: centerId ? 'Evacuated' : 'Decamped',
      vulnerabilities: Array.isArray(formData.vulnerabilities) ? formData.vulnerabilities : [],
      centerId,
      roomId: null,
      stubCode,
      stubIssued: Boolean(formData.stubIssued),
      stubIssuedAt: formData.stubIssued ? new Date().toISOString() : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      members: Array.isArray(formData.members) ? formData.members : [],
      isOffline: true,
    };

    try {
      await db.households.put(localHousehold);
      await queuePendingMutation('CREATE_HOUSEHOLD', 'households', {
        ...formData,
        tempId,
        householdCode,
        stubCode,
        centerId,
        roomId: null,
      });
    } catch (e) {
      console.warn('Could not save offline household locally:', e);
    }

    notifyHouseholdChanges();
    return localHousehold;
  }

  try {
    // 2. Resolve room_id
    let roomId = null;
    if (centerId && formData.room && formData.room !== 'Unassigned') {
      const { data: roomData, error: roomLookupError } = await supabase
        .from('rooms')
        .select('id')
        .eq('center_id', centerId)
        .eq('room_name', formData.room)
        .maybeSingle();

      if (roomLookupError) throw roomLookupError;

      if (roomData) {
        roomId = roomData.id;
      } else {
        // Auto-create room if it doesn't exist
        const { data: newRoom, error: roomCreateError } = await supabase
          .from('rooms')
          .insert({ center_id: centerId, room_name: formData.room, capacity_individuals: 30 })
          .select('id')
          .single();
        if (roomCreateError) throw roomCreateError;
        if (newRoom) roomId = newRoom.id;
      }
    }

    // 3. Insert household
    const { data: insertedH, error: hError } = await supabase
      .from('households')
      .insert({
        household_code: householdCode,
        head_name: formData.head,
        head_age: Number(formData.age) || 35,
        head_sex: formData.sex || 'Male',
        head_occupation: formData.headOccupation || null,
        barangay: formData.barangay || 'Unassigned',
        purok: formData.purok || 'Unassigned',
        evacuee_status: centerId ? 'Active' : 'Decamped',
        vulnerabilities: Array.isArray(formData.vulnerabilities) ? formData.vulnerabilities : [],
        center_id: centerId,
        room_id: roomId,
        stub_code: stubCode,
        stub_issued: Boolean(formData.stubIssued),
        stub_issued_at: formData.stubIssued ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (hError) throw hError;

    const { error: profileError } = await supabase.from('household_profiles').upsert(
      householdProfilePayload(insertedH.id, formData),
      { onConflict: 'household_id' }
    );
    if (profileError) throw profileError;

    // 4. Insert members if any
    if (Array.isArray(formData.members) && formData.members.length > 0) {
      const membersWithNames = formData.members
        .filter((m) => m && m.name && m.name.trim())
      const memberRows = membersWithNames.map((m) => ({
          household_id: insertedH.id,
          full_name: m.name.trim(),
          age: ['month', 'day'].some((unit) => String(m.ageUnit || 'Years').toLowerCase().startsWith(unit))
            ? 0
            : Number(m.ageValue ?? m.age) || 0,
          age_value: Number(m.ageValue ?? m.age) || 0,
          age_unit: m.ageUnit || 'Years',
          sex: m.sex || 'Female',
          relationship_to_head: m.relationship || 'MEMBER',
          occupation: m.occupation || null,
          is_household_head: false,
          vulnerabilities: Array.isArray(m.vulnerabilities) ? m.vulnerabilities : [],
        }));

      if (memberRows.length > 0) {
        const { data: insertedMembers, error: mError } = await supabase
          .from('household_members')
          .insert(memberRows)
          .select('id');
        if (mError) throw mError;
        const memberProfiles = (insertedMembers || []).map((member, index) =>
          householdMemberProfilePayload(member.id, membersWithNames[index])
        );
        if (memberProfiles.length > 0) {
          const { error: memberProfileError } = await supabase
            .from('household_member_profiles')
            .upsert(memberProfiles, { onConflict: 'household_member_id' });
          if (memberProfileError) throw memberProfileError;
        }
      }
    }

    // 5. Optionally record initial room_placement & relief stub if assigned to a center
    if (centerId) {
      const activeEventId = eventId && eventId !== 'default-active-event' ? eventId : null;
      const { error: placementError } = await supabase.from('room_placements').insert({
        household_id: insertedH.id,
        center_id: centerId,
        room_id: roomId,
        event_id: activeEventId,
        status: 'Evacuated',
        check_in_at: new Date().toISOString(),
      });
      if (placementError) {
        console.error('Household saved, but its evacuation placement could not be recorded:', placementError);
      }

      const { error: stubError } = await supabase.from('relief_goods_stubs').insert({
        household_id: insertedH.id,
        event_id: activeEventId,
        stub_code: stubCode,
        stub_issued: Boolean(formData.stubIssued),
        stub_issued_at: formData.stubIssued ? new Date().toISOString() : null,
      });
      if (stubError) {
        console.error('Household saved, but its relief stub record could not be created:', stubError);
      }
    }

    // Save to Dexie for instant offline availability
    try {
      await db.households.put({
        id: insertedH.id,
        householdCode: insertedH.household_code,
        headName: insertedH.head_name,
        name: insertedH.head_name,
        age: insertedH.head_age,
        sex: insertedH.head_sex,
        occupation: insertedH.head_occupation,
        barangay: insertedH.barangay,
        purok: insertedH.purok,
        centerId: insertedH.center_id,
        roomId: insertedH.room_id,
        evacueeStatus: insertedH.evacuee_status,
        status: insertedH.evacuee_status === 'Active' ? 'Evacuated' : 'Decamped',
        vulnerabilities: insertedH.vulnerabilities || [],
        stubIssued: Boolean(insertedH.stub_issued),
        stubCode: insertedH.stub_code,
        stubIssuedAt: insertedH.stub_issued_at,
        createdAt: insertedH.created_at,
        updatedAt: insertedH.updated_at || insertedH.created_at,
      });
    } catch {}

    notifyHouseholdChanges();
    return insertedH;
  } catch (onlineError) {
    console.warn('Cloud create failed, saving to local Dexie and queueing mutation:', onlineError);
    const tempId = `temp-hh-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const localHousehold = {
      id: tempId,
      householdCode,
      headName: formData.head,
      name: formData.head,
      age: Number(formData.age) || 35,
      sex: formData.sex || 'Male',
      occupation: formData.headOccupation || null,
      barangay: formData.barangay || 'Unassigned',
      purok: formData.purok || 'Unassigned',
      evacueeStatus: centerId ? 'Active' : 'Decamped',
      status: centerId ? 'Evacuated' : 'Decamped',
      vulnerabilities: Array.isArray(formData.vulnerabilities) ? formData.vulnerabilities : [],
      centerId,
      roomId: null,
      stubCode,
      stubIssued: Boolean(formData.stubIssued),
      stubIssuedAt: formData.stubIssued ? new Date().toISOString() : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      members: Array.isArray(formData.members) ? formData.members : [],
      isOffline: true,
    };

    try {
      await db.households.put(localHousehold);
      await queuePendingMutation('CREATE_HOUSEHOLD', 'households', {
        ...formData,
        tempId,
        householdCode,
        stubCode,
        centerId,
        roomId: null,
      });
    } catch {}

    notifyHouseholdChanges();
    return localHousehold;
  }
}

function householdProfilePayload(householdId, formData) {
  return {
    household_id: householdId,
    monthly_income: Number(formData.monthlyIncome) || 0,
    has_worked_dole: formData.hasWorkedDole ?? null,
    dole_employment_year: Number(formData.doleEmploymentYear) || null,
    has_received_government_assistance: formData.hasReceivedGovernmentAssistance ?? null,
    gov_assistance_availed: Array.isArray(formData.govAssistanceAvailed)
      ? formData.govAssistanceAvailed
      : [],
    government_assistance_year: Number(formData.governmentAssistanceYear) || null,
    has_received_relief_assistance: formData.hasReceivedReliefAssistance ?? null,
    other_income_source: formData.otherIncomeSource || null,
    flood_depth_level: formData.floodDepthLevel || null,
    characteristics_remarks: formData.characteristicsRemarks || null,
    updated_at: new Date().toISOString(),
  };
}

function householdMemberProfilePayload(memberId, formData) {
  return {
    household_member_id: memberId,
    monthly_income: Number(formData.monthlyIncome) || 0,
    has_worked_dole: formData.hasWorkedDole ?? null,
    dole_employment_year: Number(formData.doleEmploymentYear) || null,
    has_received_government_assistance: formData.hasReceivedGovernmentAssistance ?? null,
    gov_assistance_availed: Array.isArray(formData.govAssistanceAvailed)
      ? formData.govAssistanceAvailed
      : [],
    government_assistance_year: Number(formData.governmentAssistanceYear) || null,
    has_received_relief_assistance: formData.hasReceivedReliefAssistance ?? null,
    other_income_source: formData.otherIncomeSource || null,
    flood_depth_level: formData.floodDepthLevel || null,
    characteristics_remarks: formData.characteristicsRemarks || null,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Update an existing household profile in Supabase
 */
export async function updateHousehold(id, formData, centersList = [], { preservePlacement = false } = {}) {
  let centerId = formData.centerId;
  if (!preservePlacement && !centerId && formData.center) {
    const found = centersList.find((c) =>
      c.id === formData.center ||
      c.displayName === formData.center ||
      c.name === formData.center
    );
    centerId = found ? found.id : null;
  }

  const now = new Date().toISOString();

  // Always update local Dexie cache immediately so UI reflects edits offline & online
  try {
    const existing = (await db.households.get(id)) || {};
    const detailEntry = await db.household_details.get(id);
    const base = detailEntry?.data || existing;
    const updatedLocal = {
      ...base,
      id,
      name: formData.head ?? base.name,
      headName: formData.head ?? base.headName,
      age: Number(formData.age) || base.age || 35,
      sex: formData.sex || base.sex || 'Male',
      headOccupation: formData.headOccupation ?? base.headOccupation ?? null,
      barangay: formData.barangay || base.barangay || 'Unassigned',
      purok: formData.purok || base.purok || 'Unassigned',
      vulnerabilities: Array.isArray(formData.vulnerabilities) ? formData.vulnerabilities : (base.vulnerabilities || []),
      members: Array.isArray(formData.members) ? formData.members : (base.members || []),
      ...(!preservePlacement ? {
        centerId: centerId || null,
        center: formData.center || base.center || 'Unassigned Center',
        room: formData.room || base.room || 'Unassigned',
        evacueeStatus: centerId ? 'Active' : (base.evacueeStatus || 'Decamped'),
        status: centerId ? 'Evacuated' : (base.status || 'Decamped'),
      } : {}),
      updatedAt: now,
    };
    await db.households.put(updatedLocal);
    if (detailEntry) {
      await db.household_details.put({ id, data: updatedLocal, updatedAt: Date.now() });
    }
  } catch (e) {
    console.warn('Local Dexie updateHousehold error:', e);
  }

  if (!isOnline()) {
    await queuePendingMutation('UPDATE_HOUSEHOLD', 'households', {
      id,
      formData,
      preservePlacement,
    });
    notifyHouseholdChanges();
    return { id, isOffline: true };
  }

  try {
    let roomId = null;
    if (!preservePlacement && centerId && formData.room && formData.room !== 'Unassigned') {
      const { data: roomData } = await supabase
        .from('rooms')
        .select('id')
        .eq('center_id', centerId)
        .eq('room_name', formData.room)
        .maybeSingle();

      if (roomData) {
        roomId = roomData.id;
      } else {
        const { data: newRoom } = await supabase
          .from('rooms')
          .insert({ center_id: centerId, room_name: formData.room, capacity_individuals: 30 })
          .select('id')
          .single();
        if (newRoom) roomId = newRoom.id;
      }
    }

    const payload = {
      head_name: formData.head,
      head_age: Number(formData.age) || 35,
      head_sex: formData.sex || 'Male',
      head_occupation: formData.headOccupation || null,
      barangay: formData.barangay || 'Unassigned',
      purok: formData.purok || 'Unassigned',
      vulnerabilities: Array.isArray(formData.vulnerabilities) ? formData.vulnerabilities : [],
      updated_at: now,
    };
    if (!preservePlacement) {
      payload.center_id = centerId || null;
      payload.room_id = roomId;
      payload.evacuee_status = centerId ? 'Active' : 'Decamped';
    }

    const { error: hError } = await supabase.from('households').update(payload).eq('id', id);
    if (hError) throw hError;

    const hasProfileFields = [
      'monthlyIncome',
      'hasWorkedDole',
      'doleEmploymentYear',
      'hasReceivedGovernmentAssistance',
      'govAssistanceAvailed',
      'governmentAssistanceYear',
      'hasReceivedReliefAssistance',
      'otherIncomeSource',
      'floodDepthLevel',
      'characteristicsRemarks',
    ].some((field) => Object.prototype.hasOwnProperty.call(formData, field));
    if (hasProfileFields) {
      const { error: profileError } = await supabase.from('household_profiles').upsert(
        householdProfilePayload(id, formData),
        { onConflict: 'household_id' }
      );
      if (profileError) throw profileError;
    }

    // Replace members
    if (Array.isArray(formData.members)) {
      const { error: deleteMembersError } = await supabase
        .from('household_members')
        .delete()
        .eq('household_id', id);
      if (deleteMembersError) throw deleteMembersError;
      const membersWithNames = formData.members
        .filter((m) => m && m.name && m.name.trim())
      const memberRows = membersWithNames.map((m) => ({
          household_id: id,
          full_name: m.name.trim(),
          age: ['month', 'day'].some((unit) => String(m.ageUnit || 'Years').toLowerCase().startsWith(unit))
            ? 0
            : Number(m.ageValue ?? m.age) || 0,
          age_value: Number(m.ageValue ?? m.age) || 0,
          age_unit: m.ageUnit || 'Years',
          sex: m.sex || 'Female',
          relationship_to_head: m.relationship || 'MEMBER',
          occupation: m.occupation || null,
          is_household_head: Boolean(m.isHead),
          vulnerabilities: Array.isArray(m.vulnerabilities) ? m.vulnerabilities : [],
        }));

      if (memberRows.length > 0) {
        const { data: insertedMembers, error: membersError } = await supabase
          .from('household_members')
          .insert(memberRows)
          .select('id');
        if (membersError) throw membersError;
        const memberProfiles = (insertedMembers || []).map((member, index) =>
          householdMemberProfilePayload(member.id, membersWithNames[index])
        );
        if (memberProfiles.length > 0) {
          const { error: memberProfileError } = await supabase
            .from('household_member_profiles')
            .upsert(memberProfiles, { onConflict: 'household_member_id' });
          if (memberProfileError) throw memberProfileError;
        }
      }
    }
    notifyHouseholdChanges();
  } catch (err) {
    console.warn('Cloud updateHousehold failed, queued offline mutation:', err);
    await queuePendingMutation('UPDATE_HOUSEHOLD', 'households', {
      id,
      formData,
      preservePlacement,
    });
    notifyHouseholdChanges();
  }
}

export async function getEventReliefStubRecords(eventId) {
  if (!eventId) return [];

  const PAGE_SIZE = 300;
  const fetchPage = async (offset) => {
    let query = supabase
      .from('relief_goods_stubs')
      .select('household_id, event_id, stub_code, stub_issued, stub_issued_at', { count: 'exact' })
      .eq('event_id', eventId)
      .order('household_id', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    const { data, error, count } = await query;
    if (error) throw error;
    return { rows: data || [], count };
  };

  const firstPage = await fetchPage(0);
  const records = [...firstPage.rows];
  if (typeof firstPage.count === 'number') {
    const concurrency = 4;
    for (let offset = PAGE_SIZE; offset < firstPage.count; offset += PAGE_SIZE * concurrency) {
      const offsets = Array.from(
        { length: Math.min(concurrency, Math.ceil((firstPage.count - offset) / PAGE_SIZE)) },
        (_, index) => offset + index * PAGE_SIZE
      );
      const pages = await Promise.all(offsets.map((pageOffset) => fetchPage(pageOffset)));
      pages.forEach(({ rows }) => records.push(...rows));
    }
    return records;
  }

  for (let offset = PAGE_SIZE; ; offset += PAGE_SIZE) {
    const { rows } = await fetchPage(offset);
    records.push(...rows);
    if (rows.length < PAGE_SIZE) return records;
  }
}

/**
 * Fetch all relief stubs across all events to compute total relief counts per household
 */
export async function getAllReliefStubs() {
  try {
    const PAGE_SIZE = 300;
    const fetchPage = async (offset) => {
      const { data, error, count } = await supabase
        .from('relief_goods_stubs')
        .select('household_id, event_id, stub_code, stub_issued, stub_issued_at', { count: 'exact' })
        .order('household_id', { ascending: true })
        .order('event_id', { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);
      if (error) throw error;
      return { rows: data || [], count };
    };

    const firstPage = await fetchPage(0);
    const records = [...firstPage.rows];
    if (typeof firstPage.count === 'number') {
      const concurrency = 4;
      for (let offset = PAGE_SIZE; offset < firstPage.count; offset += PAGE_SIZE * concurrency) {
        const offsets = Array.from(
          { length: Math.min(concurrency, Math.ceil((firstPage.count - offset) / PAGE_SIZE)) },
          (_, index) => offset + index * PAGE_SIZE
        );
        const pages = await Promise.all(offsets.map((pageOffset) => fetchPage(pageOffset)));
        pages.forEach(({ rows }) => records.push(...rows));
      }
      return records;
    }

    for (let offset = PAGE_SIZE; ; offset += PAGE_SIZE) {
      const { rows } = await fetchPage(offset);
      records.push(...rows);
      if (rows.length < PAGE_SIZE) return records;
    }
  } catch (err) {
    console.warn('getAllReliefStubs error:', err);
    return [];
  }
}

/**
 * Fetch detailed relief assistance history for a specific household across events
 */
export async function getHouseholdReliefHistory(householdId) {
  if (!householdId) return [];
  try {
    const [stubsRes, eventsRes, placementsRes, hhRes] = await Promise.allSettled([
      supabase
        .from('relief_goods_stubs')
        .select('id, household_id, event_id, stub_code, stub_issued, stub_issued_at, stub_issued_by, created_at')
        .eq('household_id', householdId)
        .order('stub_issued_at', { ascending: false }),
      supabase
        .from('evacuation_events')
        .select('id, event_name, event_type, status, declared_at, created_at'),
      supabase
        .from('room_placements')
        .select('event_id, center_id, room_id, center:evacuation_centers(id, name, location), room:rooms(id, room_name)')
        .eq('household_id', householdId),
      supabase
        .from('households')
        .select('id, stub_code, stub_issued, stub_issued_at, center_id, room_id, center:evacuation_centers!households_center_id_fkey(id, name), room:rooms(id, room_name)')
        .eq('id', householdId)
        .maybeSingle(),
    ]);

    const stubs = (stubsRes.status === 'fulfilled' && stubsRes.value.data) ? stubsRes.value.data : [];
    const events = (eventsRes.status === 'fulfilled' && eventsRes.value.data) ? eventsRes.value.data : [];
    const placements = (placementsRes.status === 'fulfilled' && placementsRes.value.data) ? placementsRes.value.data : [];
    const hh = (hhRes.status === 'fulfilled' && hhRes.value.data) ? hhRes.value.data : null;

    const eventsMap = new Map(events.map((ev) => [ev.id, ev]));
    const placementsMap = new Map(placements.map((p) => [p.event_id, p]));

    let items = stubs.map((s) => {
      const ev = eventsMap.get(s.event_id);
      const pl = placementsMap.get(s.event_id);
      return {
        id: s.id,
        stubCode: s.stub_code || '—',
        stubIssued: Boolean(s.stub_issued),
        stubIssuedAt: s.stub_issued_at || s.created_at,
        stubIssuedBy: s.stub_issued_by || 'MSWDO Staff',
        eventId: s.event_id,
        eventName: ev?.event_name || (s.event_id === 'default-active-event' ? 'Active Operation' : 'Disaster Relief Operation'),
        eventType: ev?.event_type || 'Relief Operation',
        centerName: pl?.center?.name || hh?.center?.name || 'Assigned Center',
        roomName: pl?.room?.room_name || hh?.room?.room_name || 'Assigned Room',
      };
    });

    // Fallback for households marked stub_issued in households table before relief_goods_stubs row was created
    if (items.length === 0 && hh && hh.stub_issued && hh.stub_issued_at) {
      items.push({
        id: `hh-legacy-${hh.id}`,
        stubCode: hh.stub_code || '—',
        stubIssued: true,
        stubIssuedAt: hh.stub_issued_at,
        stubIssuedBy: 'MSWDO Staff',
        eventId: null,
        eventName: 'Disaster Relief Operation',
        eventType: 'Relief Operation',
        centerName: hh.center?.name || 'Assigned Center',
        roomName: hh.room?.room_name || 'Assigned Room',
      });
    }

    // Sort ascending by time first to calculate wave numbers chronologically
    items.sort((a, b) => new Date(a.stubIssuedAt || 0) - new Date(b.stubIssuedAt || 0));
    items = items.map((item, idx) => ({
      ...item,
      wave: idx + 1,
      waveLabel: `Relief Pack Wave ${idx + 1}`,
    }));

    // Return descending (most recent pack first)
    return items.reverse();
  } catch (err) {
    console.warn('Error fetching household relief history:', err);
    return [];
  }
}

/**
 * Mark a household stub as issued and persist the event-specific issue record.
 */
export async function issueHouseholdStub(id, eventId = null, options = {}) {
  const issuedAt = new Date().toISOString();

  // 1. Immediately update local Dexie cache so UI updates with 0ms delay
  let localStubCode = `STB-${String(Date.now()).slice(-6)}`;
  try {
    const localHH = await db.households.get(id);
    if (localHH) {
      localStubCode = getHouseholdStubCode(localHH.stubCode, localHH.householdCode, localHH.id);
      await db.households.update(id, {
        stubIssued: true,
        stubCode: localStubCode,
        stubIssuedAt: issuedAt,
        updatedAt: issuedAt,
      });
    }
  } catch (e) {
    console.warn('Local Dexie update error:', e);
  }

  // 2. If offline, queue mutation and return immediately
  if (!isOnline()) {
    await queuePendingMutation('ISSUE_STUB', 'households', {
      householdId: id,
      stubCode: localStubCode,
      issuedAt,
      issuedBy: options.issuedBy || 'MSWDO Staff',
      eventId,
    });
    notifyHouseholdChanges();
    return { id, stub_code: localStubCode, stub_issued: true, issuedAt, isOffline: true };
  }

  // 3. Cloud update with offline fallback
  try {
    const { data: currentHH, error: fetchErr } = await supabase
      .from('households')
      .select('id, household_code, stub_code')
      .eq('id', id)
      .single();

    if (fetchErr) throw fetchErr;

    const stubCode = getHouseholdStubCode(
      currentHH?.stub_code,
      currentHH?.household_code,
      currentHH?.id
    );

    const { data, error } = await supabase
      .from('households')
      .update({
        stub_code: stubCode,
        stub_issued: true,
        stub_issued_at: issuedAt,
        updated_at: issuedAt,
      })
      .eq('id', id)
      .select('id, stub_code')
      .single();

    if (error) throw error;

    // Insert a new record in relief_goods_stubs to record this distribution wave permanently in history
    const stubRecord = {
      household_id: id,
      event_id: eventId || null,
      stub_code: stubCode,
      stub_issued: true,
      stub_issued_at: issuedAt,
      stub_issued_by: options.issuedBy || 'MSWDO Staff',
    };

    const { error: insertError } = await supabase
      .from('relief_goods_stubs')
      .insert(stubRecord);

    if (insertError) {
      console.warn('Could not insert into relief_goods_stubs:', insertError.message);
    }

    notifyHouseholdChanges();
    return { ...data, issuedAt };
  } catch (err) {
    console.warn('Cloud stub issue failed, queued offline mutation:', err);
    await queuePendingMutation('ISSUE_STUB', 'households', {
      householdId: id,
      stubCode: localStubCode,
      issuedAt,
      issuedBy: options.issuedBy || 'MSWDO Staff',
      eventId,
    });
    notifyHouseholdChanges();
    return { id, stub_code: localStubCode, stub_issued: true, issuedAt, isOffline: true };
  }
}

/**
 * Check-in an existing household into an evacuation center & room for a disaster event
 */
export async function checkInHousehold({ householdId, centerId, roomId, roomName = null, eventId = null, stubCode = null }) {
  const { data: existingPlacement, error: existingPlacementError } = await supabase
    .from('room_placements')
    .select('id')
    .eq('household_id', householdId)
    .eq('event_id', eventId)
    .eq('status', 'Evacuated')
    .maybeSingle();

  if (existingPlacementError) throw existingPlacementError;
  if (existingPlacement) throw new Error('This household is already checked into the selected operation.');

  let resolvedRoomId = roomId;
  if (!resolvedRoomId && roomName) {
    const { data: existingRoom, error: roomLookupError } = await supabase
      .from('rooms')
      .select('id')
      .eq('center_id', centerId)
      .eq('room_name', roomName)
      .maybeSingle();

    if (roomLookupError) throw roomLookupError;
    if (existingRoom) {
      resolvedRoomId = existingRoom.id;
    } else {
      const { data: newRoom, error: createRoomError } = await supabase
        .from('rooms')
        .insert({ center_id: centerId, room_name: roomName, capacity_individuals: 30 })
        .select('id')
        .single();

      if (createRoomError) throw createRoomError;
      resolvedRoomId = newRoom.id;
    }
  }

  if (!centerId || !resolvedRoomId) throw new Error('Select an evacuation center and room before checking in.');

  const code = stubCode || `STB-${String(Date.now()).slice(-6)}`;
  const { data: placement, error: placementError } = await supabase
    .from('room_placements')
    .insert({
      household_id: householdId,
      center_id: centerId,
      room_id: resolvedRoomId,
      event_id: eventId,
      status: 'Evacuated',
      check_in_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (placementError) throw placementError;

  const { error: hErr } = await supabase
    .from('households')
    .update({
      center_id: centerId,
      room_id: resolvedRoomId,
      stub_code: code,
      stub_issued: false,
      evacuee_status: 'Active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', householdId);

  if (hErr) {
    const { error: rollbackError } = await supabase
      .from('room_placements')
      .delete()
      .eq('id', placement.id);
    if (rollbackError) console.error('Could not roll back failed check-in placement:', rollbackError);
    throw hErr;
  }

  // 3. Insert or update relief_goods_stubs
  try {
    await supabase.from('relief_goods_stubs').insert({
      household_id: householdId,
      event_id: eventId,
      stub_code: code,
      stub_issued: false,
    });
  } catch (err) {
    console.warn('relief_goods_stubs insert failed:', err);
  }

  notifyHouseholdChanges();
  return { success: true, stubCode: code };
}

/**
 * Decamp / Check-out a household from an evacuation center
 */
/**
 * Transfer an active/evacuated household to a new evacuation center and/or room
 */
export async function transferHouseholdRoom({
  householdId,
  eventId = null,
  centerId,
  centerName = null,
  roomId = null,
  roomName = null,
  householdSnapshot = null,
}) {
  if (!householdId) throw new Error('Household ID is required for transfer.');
  if (!centerId) throw new Error('Target evacuation center is required.');

  const now = new Date().toISOString();

  // 1. Immediately update Dexie locally (households + household_details) so UI responds everywhere
  try {
    const existing = await db.households.get(householdId);
    const detailEntry = await db.household_details.get(householdId);
    const centerRecord = !centerName ? await db.centers.get(centerId) : null;
    const resolvedCenterName = centerName || centerRecord?.displayName || centerRecord?.name || existing?.center || householdSnapshot?.center || 'Assigned Center';
    const resolvedRoomName = roomName || existing?.room || householdSnapshot?.room || 'Assigned Room';
    const resolvedRoomId = roomId || existing?.roomId || null;

    const baseRow = existing || detailEntry?.data || householdSnapshot || { id: householdId };
    const updatedRow = {
      ...baseRow,
      id: householdId,
      centerId,
      center: resolvedCenterName,
      roomId: resolvedRoomId,
      room: resolvedRoomName,
      evacueeStatus: 'Active',
      status: 'Evacuated',
      updatedAt: now,
    };

    await db.households.put(updatedRow);
    if (detailEntry?.data) {
      await db.household_details.put({
        id: householdId,
        data: {
          ...detailEntry.data,
          centerId,
          center: resolvedCenterName,
          roomId: resolvedRoomId,
          room: resolvedRoomName,
          evacueeStatus: 'Active',
          status: 'Evacuated',
          updatedAt: now,
        },
        updatedAt: Date.now(),
      });
    }
  } catch (e) {
    console.warn('Local Dexie transfer update error:', e);
  }

  // 2. If offline, queue mutation
  if (!isOnline()) {
    await queuePendingMutation('TRANSFER_ROOM', 'households', {
      householdId,
      eventId,
      centerId,
      roomId,
      roomName,
    });
    notifyHouseholdChanges();
    return { success: true, centerId, roomId, roomName, isOffline: true };
  }

  // 3. Online flow with offline fallback
  try {
    let resolvedRoomId = roomId;
    if (!resolvedRoomId && roomName) {
      const { data: existingRoom, error: roomLookupError } = await supabase
        .from('rooms')
        .select('id')
        .eq('center_id', centerId)
        .eq('room_name', roomName)
        .maybeSingle();

      if (roomLookupError) throw roomLookupError;
      if (existingRoom) {
        resolvedRoomId = existingRoom.id;
      } else {
        const { data: newRoom, error: createRoomError } = await supabase
          .from('rooms')
          .insert({ center_id: centerId, room_name: roomName, capacity_individuals: 30 })
          .select('id')
          .single();
        if (createRoomError) throw createRoomError;
        resolvedRoomId = newRoom.id;
      }
    }

    if (!resolvedRoomId) throw new Error('Target room is required.');

    const now = new Date().toISOString();

    let placementQuery = supabase
      .from('room_placements')
      .update({
        center_id: centerId,
        room_id: resolvedRoomId,
        status: 'Evacuated',
      })
      .eq('household_id', householdId)
      .eq('status', 'Evacuated');

    if (eventId && eventId !== 'default-active-event') {
      placementQuery = placementQuery.eq('event_id', eventId);
    }

    const { data: updatedPlacements, error: placementError } = await placementQuery.select('id');
    if (placementError) throw placementError;

    if (!updatedPlacements || updatedPlacements.length === 0) {
      const { error: insertPlacementError } = await supabase
        .from('room_placements')
        .insert({
          household_id: householdId,
          center_id: centerId,
          room_id: resolvedRoomId,
          event_id: eventId && eventId !== 'default-active-event' ? eventId : null,
          status: 'Evacuated',
          check_in_at: now,
        });
      if (insertPlacementError) throw insertPlacementError;
    }

    const { error: householdError } = await supabase
      .from('households')
      .update({
        center_id: centerId,
        room_id: resolvedRoomId,
        evacuee_status: 'Active',
        updated_at: now,
      })
      .eq('id', householdId);

    if (householdError) throw householdError;

    notifyHouseholdChanges();
    return { success: true, centerId, roomId: resolvedRoomId };
  } catch (cloudErr) {
    console.warn('Cloud transfer failed, queued offline mutation:', cloudErr);
    await queuePendingMutation('TRANSFER_ROOM', 'households', {
      householdId,
      eventId,
      centerId,
      roomId,
      roomName,
    });
    notifyHouseholdChanges();
    return { success: true, centerId, roomId, isOffline: true };
  }
}

export async function decampHousehold(householdId, eventId = null) {
  let placementUpdate = supabase
    .from('room_placements')
    .update({
      status: 'Decamped',
      check_out_at: new Date().toISOString(),
    })
    .eq('household_id', householdId)
    .eq('status', 'Evacuated');

  if (eventId) placementUpdate = placementUpdate.eq('event_id', eventId);
  const { error: placementError } = await placementUpdate;
  if (placementError) throw placementError;

  const { error: hErr } = await supabase
    .from('households')
    .update({
      evacuee_status: 'Decamped',
      updated_at: new Date().toISOString(),
    })
    .eq('id', householdId);

  if (hErr) throw hErr;

  notifyHouseholdChanges();
  return { success: true };
}

/**
 * Fast search of the household masterlist (for intake and search-before-register)
 */
export async function searchMasterHouseholds(query = '', centersList = []) {
  if (!query || !query.trim()) return [];
  const clean = query.trim();

  try {
    const { data, error } = await supabase
      .from('households')
      .select(HOUSEHOLD_SUMMARY_SELECT)
      .or(`head_name.ilike.%${clean}%,household_code.ilike.%${clean}%,barangay.ilike.%${clean}%`)
      .limit(20);

    if (error) throw error;
    return (data || []).map((row) => normalizeHousehold(row, centersList));
  } catch (err) {
    console.warn('Masterlist search error:', err);
    return [];
  }
}


/**
 * Permanently delete a household and all its related records.
 * Cascades: household_members → household_member_profiles, household_profiles,
 * event_room_placements, relief_stubs (if any).
 */
export async function deleteHousehold(householdId) {
  if (!householdId) throw new Error('No household ID provided.');

  // Delete members (cascade handles member_profiles via FK if set, otherwise manual)
  const { error: membersError } = await supabase
    .from('household_members')
    .delete()
    .eq('household_id', householdId);
  if (membersError) throw membersError;

  // Delete household profile
  const { error: profileError } = await supabase
    .from('household_profiles')
    .delete()
    .eq('household_id', householdId);
  if (profileError) throw profileError;

  // Delete event placements
  const { error: placementError } = await supabase
    .from('event_room_placements')
    .delete()
    .eq('household_id', householdId);
  if (placementError) throw placementError;

  // Delete the household itself
  const { error: householdError } = await supabase
    .from('households')
    .delete()
    .eq('id', householdId);
  if (householdError) throw householdError;

  notifyHouseholdChanges();
}
