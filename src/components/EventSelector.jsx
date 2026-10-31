// EventSelector.jsx
// Dropdown to display current active event, switch to past events (read‑only), and start/conclude events.

import React, { useContext, useState } from 'react';
import { EventContext } from '../../context/EventContext';
import { Menu, Check, X } from 'lucide-react';

export default function EventSelector() {
  const {
    selectedEvent,
    setSelectedEvent,
    allEvents,
    startNewEvent,
    concludeCurrentEvent,
    refreshEvents,
  } = useContext(EventContext);

  const [showMenu, setShowMenu] = useState(false);
  const [newEventName, setNewEventName] = useState('');

  const handleSelect = (event) => {
    setSelectedEvent(event);
    setShowMenu(false);
  };

  const handleStartNew = async () => {
    if (!newEventName.trim()) return;
    await startNewEvent(newEventName.trim());
    setNewEventName('');
    setShowMenu(false);
  };

  const handleConclude = async () => {
    await concludeCurrentEvent();
    await refreshEvents();
    setShowMenu(false);
  };

  return (
    <div className="event-selector" style={{ position: 'relative' }}>
      <button
        type="button"
        className="event-btn"
        onClick={() => setShowMenu(!showMenu)}
        aria-label="Select event"
      >
        {selectedEvent ? (
          <>
            {selectedEvent.status === 'Active' ? '🟢' : '⚪'}{' '}
            {selectedEvent.event_name}
          </>
        ) : (
          'Select Event'
        )}
        <Menu size={16} style={{ marginLeft: 4 }} />
      </button>
      {showMenu && (
        <div className="event-menu" style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          background: '#fff',
          border: '1px solid #ddd',
          zIndex: 1000,
          minWidth: 240,
          padding: '8px',
        }}>
          <div className="event-list" style={{ maxHeight: 200, overflowY: 'auto' }}>
            {allEvents.map((ev) => (
              <div
                key={ev.id}
                onClick={() => handleSelect(ev)}
                style={{
                  padding: '4px 8px',
                  cursor: 'pointer',
                  background:
                    selectedEvent && ev.id === selectedEvent.id ? '#f0f0f0' : 'transparent',
                }}
              >
                {ev.status === 'Active' ? '🟢' : '⚪'} {ev.event_name}
                {ev.status === 'Active' && ( <Check size={12} style={{ float: 'right' }} />)}
              </div>
            ))}
          </div>
          <hr />
          {/* New Event creation */}
          <div style={{ marginTop: 4 }}>
            <input
              type="text"
              placeholder="New event name"
              value={newEventName}
              onChange={(e) => setNewEventName(e.target.value)}
              style={{ width: '100%', padding: '4px' }}
            />
            <button
              type="button"
              onClick={handleStartNew}
              style={{ marginTop: 4, width: '100%' }}
            >
              Start New Event
            </button>
          </div>
          {/* Conclude button, only when active */}
          {selectedEvent && selectedEvent.status === 'Active' && (
            <button
              type="button"
              onClick={handleConclude}
              style={{ marginTop: 4, width: '100%' }}
            >
              Conclude Event
            </button>
          )}
        </div>
      )}
    </div>
  );
}
