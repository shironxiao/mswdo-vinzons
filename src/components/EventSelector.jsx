// EventSelector.jsx
// Dropdown to display current active event, switch to past events (read‑only), and start/conclude events.

import { useContext, useState } from 'react';
import { EventContext } from '../context/eventContext.js';
import { Menu, Check, AlertCircle } from 'lucide-react';

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
  const [actionError, setActionError] = useState('');
  const hasActiveEvent = allEvents.some(
    (event) => event.status === 'Active' && event.id !== 'default-active-event'
  );

  const handleSelect = (event) => {
    setSelectedEvent(event);
    setShowMenu(false);
  };

  const handleStartNew = async () => {
    if (!newEventName.trim()) return;
    setActionError('');
    try {
      await startNewEvent(newEventName.trim());
      setNewEventName('');
      setShowMenu(false);
    } catch (error) {
      setActionError(error.message || 'Could not start the evacuation operation.');
    }
  };

  const handleConclude = async () => {
    if (!window.confirm(`Conclude ${selectedEvent.event_name}?`)) return;
    setActionError('');
    try {
      await concludeCurrentEvent();
      await refreshEvents();
      setShowMenu(false);
    } catch (error) {
      setActionError(error.message || 'Could not conclude the evacuation operation.');
    }
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
            {selectedEvent.status === 'Active' ? '🟢 Active:' : '⚪ Historical:'}{' '}
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
                role="button"
                tabIndex={0}
                onClick={() => handleSelect(ev)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') handleSelect(ev);
                }}
                className="event-option"
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
          {selectedEvent?.status !== 'Active' && (
            <div className="event-readonly-notice">
              Historical event selected — event operations are read-only.
            </div>
          )}
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
              disabled={!newEventName.trim() || hasActiveEvent}
              style={{ marginTop: 4, width: '100%' }}
            >
              Start New Evacuation Operation
            </button>
            {hasActiveEvent && (
              <small className="event-action-hint">Conclude the active operation before starting another.</small>
            )}
          </div>
          {/* Conclude button, only when active */}
          {selectedEvent && selectedEvent.status === 'Active' && selectedEvent.id !== 'default-active-event' && (
            <button
              type="button"
              onClick={handleConclude}
              style={{ marginTop: 4, width: '100%' }}
            >
              Conclude Active Operation
            </button>
          )}
          {actionError && (
            <div className="event-action-error" role="alert">
              <AlertCircle size={14} /> {actionError}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
