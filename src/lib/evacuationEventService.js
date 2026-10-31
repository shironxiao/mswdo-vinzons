import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase.js';

export const FALLBACK_EVENT = {
  id: 'default-active-event',
  event_name: 'Operation Pre-Disaster Readiness 2026',
  event_type: 'Typhoon',
  status: 'Active',
};

/**
 * Fetches the currently active disaster event from Supabase
 */
export async function getActiveEvent() {
  try {
    const { data, error } = await supabase
      .from('evacuation_events')
      .select('*')
      .eq('status', 'Active')
      .order('declared_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('Could not fetch active event from Supabase:', error.message);
      return FALLBACK_EVENT;
    }

    if (data) return data;

    // If table exists but has no active events, return fallback or most recent
    const { data: recent } = await supabase
      .from('evacuation_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return recent || FALLBACK_EVENT;
  } catch (err) {
    console.warn('Error querying evacuation_events:', err);
    return FALLBACK_EVENT;
  }
}

/**
 * Fetches all past and present disaster events
 */
export async function getAllEvents() {
  try {
    const { data, error } = await supabase
      .from('evacuation_events')
      .select('*')
      .order('declared_at', { ascending: false });

    if (error) throw error;
    return data || [FALLBACK_EVENT];
  } catch (err) {
    console.warn('Error querying all events:', err);
    return [FALLBACK_EVENT];
  }
}

/**
 * Declares/creates a new active disaster operation
 */
export async function createEvent({ event_name, event_type = 'Typhoon' }) {
  const { data: activeEvent, error: activeEventError } = await supabase
    .from('evacuation_events')
    .select('id')
    .eq('status', 'Active')
    .limit(1)
    .maybeSingle();

  if (activeEventError) throw activeEventError;
  if (activeEvent) throw new Error('Conclude the current operation before starting another.');

  const { data, error } = await supabase
    .from('evacuation_events')
    .insert({
      event_name,
      event_type,
      status: 'Active',
      declared_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Concludes an active disaster operation
 */
export async function concludeEvent(eventId) {
  const { data, error } = await supabase
    .from('evacuation_events')
    .update({
      status: 'Concluded',
      concluded_at: new Date().toISOString(),
    })
    .eq('id', eventId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * React hook to access and subscribe to the active disaster event
 */
export function useActiveEvent() {
  const [activeEvent, setActiveEvent] = useState(FALLBACK_EVENT);
  const [loading, setLoading] = useState(true);

  const fetchActive = useCallback(async () => {
    setLoading(true);
    const ev = await getActiveEvent();
    setActiveEvent(ev);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchActive();

    const channel = supabase
      .channel('evacuation-events-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'evacuation_events' }, () => {
        fetchActive();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchActive]);

  return { activeEvent, loading, refreshEvent: fetchActive };
}
