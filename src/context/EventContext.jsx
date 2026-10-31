// EventContext.jsx
// Provides React context for the selected evacuation event across Admin pages.
// Utilizes evacuationEventService to fetch active event and list of all events.

import { useState, useEffect, useCallback } from 'react';
import { getActiveEvent, getAllEvents, createEvent, concludeEvent } from '../lib/evacuationEventService';
import { EventContext } from './eventContext.js';

export const EventProvider = ({ children }) => {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [allEvents, setAllEvents] = useState([]);

  const fetchEvents = useCallback(async () => {
    const active = await getActiveEvent();
    const past = await getAllEvents();
    const sorted = [active, ...past.filter((event) => event.id !== active.id)];
    setAllEvents(sorted);
    setSelectedEvent((selected) => sorted.find((event) => event.id === selected?.id) || active);
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

  const isReadOnly = selectedEvent?.status !== 'Active';

  return (
    <EventContext.Provider
      value={{
        selectedEvent,
        setSelectedEvent,
        isReadOnly,
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
