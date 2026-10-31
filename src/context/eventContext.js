import { createContext } from 'react';

export const EventContext = createContext({
  selectedEvent: null,
  setSelectedEvent: () => {},
  isReadOnly: true,
  allEvents: [],
  refreshEvents: () => {},
  startNewEvent: async () => {},
  concludeCurrentEvent: async () => {},
});
