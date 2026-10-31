// EventContext.jsx
// Provides React context for the selected evacuation event across Admin pages.
// Utilizes evacuationEventService to fetch active event and list of all events.

import React, { createContext, useState, useEffect, useCallback } from 'react';
import { getActiveEvent, getAllEvents, createEvent, concludeEvent } from '../lib/evacuationEventService';

export const EventContext = createContext({
  selectedEvent: null,
  setSelectedEvent: () => {},
  allEvents: [],
  refreshEvents: () => {},
  startNewEvent: async () => {},
  concludeCurrentEvent: async () => {},
});

export const EventProvider = ({ children }) => {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [allEvents, setAllEvents] = useState([]);

  const fetchEvents = useCallback(async () => {
    const active = await getActiveEvent();
    const past = await getAllEvents();
    // Ensure active event is first in list
    const sorted = [active, ...past.filter(e => e.id !== active.id)];
    setAllEvents(sorted);
    setSelectedEvent(active);
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const startNewEvent = async (eventName, eventType = 'Typhoon') => {
    const newEvent = await createEvent({ event_name: eventName, event_type: eventType });
    await fetchEvents();
    setSelectedEvent(newEvent);
    return newEvent;
  };

  const concludeCurrentEvent = async () => {
    if (!selectedEvent) return;
    await concludeEvent(selectedEvent.id);
    await fetchEvents();
  };

  const refreshEvents = async () => {
    await fetchEvents();
  };

  return (
    <EventContext.Provider
      value={{
        selectedEvent,
        setSelectedEvent,
        allEvents,
        refreshEvents,
        startNewEvent,
        concludeCurrentEvent,
      }}
    >
      {children}
    </EventContext.Provider>
  );
};
