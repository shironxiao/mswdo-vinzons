import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase.js';

export const FALLBACK_USERS = [
  {
    id: 'USR-001',
    initials: 'HM',
    name: 'Ronald Augorio',
    email: 'aaugorio@gmail.com',
    role: 'Head of MSWDO',
    roleType: 'admin',
    assignedCenter: 'All Centers (Command)',
    assignedCenterId: null,
    status: 'Active',
  },
  {
    id: 'USR-002',
    initials: 'ME',
    name: 'Maria Elena Santos',
    email: 'melena@gmail.com',
    role: 'Field Coordinator',
    roleType: 'personnel',
    assignedCenter: 'LGU EC (Mangcaway)',
    assignedCenterId: null,
    status: 'Active',
  },
  {
    id: 'USR-003',
    initials: 'CM',
    name: 'Carlos Mendoza',
    email: 'cmendoza@gmail.com',
    role: 'Relief Goods Staff',
    roleType: 'personnel',
    assignedCenter: 'PLGU EC (Mat-I)',
    assignedCenterId: null,
    status: 'Active',
  },
];

const LOCAL_STORAGE_KEY = 'vinzons_cached_user_accounts';

export function normalizeUserAccount(row, centersList = []) {
  if (!row) return null;

  let centerName = 'All Centers (Command)';
  if (row.assigned_center_id && Array.isArray(centersList) && centersList.length > 0) {
    const match = centersList.find((c) => c.id === row.assigned_center_id);
    if (match) centerName = match.displayName || match.name || centerName;
  } else if (row.center?.name) {
    centerName = row.center.name;
  }

  const name = row.full_name || 'Staff User';
  const initials = name
    .trim()
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'US';

  // Role display label
  const roleDisplay =
    row.role === 'admin'
      ? 'Head of MSWDO'
      : row.role === 'viewer'
      ? 'Evacuee Monitor'
      : 'Field Coordinator';

  return {
    id: row.id,
    initials,
    name,
    email: row.email,
    phoneNumber: row.phone_number || '',
    role: roleDisplay,
    roleType: row.role || 'personnel',
    assignedCenter: centerName,
    assignedCenterId: row.assigned_center_id || null,
    status: row.status || 'Active',
    createdAt: row.created_at,
  };
}

export function useUserAccounts(centersList = []) {
  const [users, setUsers] = useState(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return FALLBACK_USERS;
  });
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_accounts')
        .select(`
          id,
          email,
          full_name,
          phone_number,
          role,
          assigned_center_id,
          status,
          created_at,
          center:evacuation_centers ( id, name, location )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const normalized = data.map((r) => normalizeUserAccount(r, centersList));
        setUsers(normalized);
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(normalized));
        } catch {
          // ignore
        }
      }
    } catch (err) {
      console.warn('Could not fetch user_accounts from Supabase, using cache/fallback:', err);
    } finally {
      setLoading(false);
    }
  }, [centersList]);

  useEffect(() => {
    fetchUsers();

    const channel = supabase
      .channel('user-accounts-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_accounts' }, () => {
        fetchUsers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchUsers]);

  return { users, setUsers, loading, refresh: fetchUsers };
}

export async function createUserAccount(userData, centersList = []) {
  let centerId = userData.assignedCenterId || null;
  if (!centerId && userData.assignedCenter && userData.assignedCenter !== 'All Centers (Command)') {
    const found = centersList.find(
      (c) =>
        c.id === userData.assignedCenter ||
        c.displayName === userData.assignedCenter ||
        c.name === userData.assignedCenter
    );
    if (found) centerId = found.id;
  }

  const roleValue =
    userData.role?.includes('Head') || userData.roleType === 'admin'
      ? 'admin'
      : userData.role?.includes('Monitor')
      ? 'viewer'
      : 'personnel';

  const password = userData.password || 'MSWDOvinzons2026!';

  // 1. Create Auth account
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: userData.email.trim(),
    password,
  });

  if (authError) throw authError;
  const userId = authData?.user?.id;
  if (!userId) throw new Error('Could not generate user authentication ID.');

  // 2. Insert into user_accounts table
  const { data: profileData, error: profileError } = await supabase
    .from('user_accounts')
    .insert({
      id: userId,
      email: userData.email.trim(),
      full_name: userData.name.trim(),
      phone_number: userData.phoneNumber || null,
      role: roleValue,
      assigned_center_id: centerId,
      status: userData.status || 'Active',
    })
    .select()
    .single();

  if (profileError) throw profileError;
  return profileData;
}

export async function updateUserAccount(id, userData, centersList = []) {
  let centerId = userData.assignedCenterId || null;
  if (!centerId && userData.assignedCenter && userData.assignedCenter !== 'All Centers (Command)') {
    const found = centersList.find(
      (c) =>
        c.id === userData.assignedCenter ||
        c.displayName === userData.assignedCenter ||
        c.name === userData.assignedCenter
    );
    if (found) centerId = found.id;
  }

  const roleValue =
    userData.role?.includes('Head') || userData.roleType === 'admin'
      ? 'admin'
      : userData.role?.includes('Monitor')
      ? 'viewer'
      : 'personnel';

  const { error } = await supabase
    .from('user_accounts')
    .update({
      full_name: userData.name.trim(),
      role: roleValue,
      assigned_center_id: centerId,
      status: userData.status || 'Active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw error;
}

export async function deleteUserAccount(id) {
  const { error } = await supabase.from('user_accounts').delete().eq('id', id);
  if (error) throw error;
}
