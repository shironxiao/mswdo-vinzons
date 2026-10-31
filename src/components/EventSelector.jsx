// EventSelector.jsx
// Dropdown to display current active event, switch to past events (read‑only), and start/conclude events.

import { useContext, useEffect, useState } from 'react';
import { EventContext } from '../context/eventContext.js';
import { Menu, Check, AlertCircle, X, CalendarDays, History, ChevronDown } from 'lucide-react';

const DISASTER_TYPES = [
  'Typhoon',
  'Flood',
  'Earthquake',
  'Fire',
  'Landslide',
  'Volcanic Eruption',
  'Tsunami',
  'Storm Surge',
  'Drought',
  'Armed Conflict',
  'Pandemic',
  'Other',
];

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
  const [newEventType, setNewEventType] = useState('Typhoon');
  const [showHistory, setShowHistory] = useState(false);
  const [actionError, setActionError] = useState('');
  useEffect(() => {
    if (!showMenu) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setShowMenu(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showMenu]);

  const hasActiveEvent = allEvents.some(
    (event) => event.status === 'Active' && event.id !== 'default-active-event'
  );
  const activeEvents = allEvents.filter((event) => event.status === 'Active');
  const historicalEvents = allEvents.filter((event) => event.status !== 'Active');

  const handleSelect = (event) => {
    setSelectedEvent(event);
    setShowMenu(false);
  };

  const handleStartNew = async () => {
    if (!newEventName.trim()) return;
    setActionError('');
    try {
      await startNewEvent(newEventName.trim(), newEventType);
      setNewEventName('');
      setNewEventType('Typhoon');
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
    <div className="event-selector">
      <button
        type="button"
        className="event-btn"
        onClick={() => setShowMenu(!showMenu)}
        aria-label="Select event"
        aria-haspopup="dialog"
        aria-expanded={showMenu}
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
        <div className="event-modal-backdrop" onClick={() => setShowMenu(false)}>
          <section
            className="event-menu"
            role="dialog"
            aria-modal="true"
            aria-labelledby="event-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="event-modal-header">
              <div className="event-modal-title-wrap">
                <span className="event-modal-icon"><CalendarDays size={20} /></span>
                <div>
                  <h2 id="event-modal-title">Evacuation Operations</h2>
                  <p>Select an operation to view its records.</p>
                </div>
              </div>
              <button
                type="button"
                className="event-modal-close"
                onClick={() => setShowMenu(false)}
                aria-label="Close event selector"
              >
                <X size={20} />
              </button>
            </header>

            <div className="event-modal-body">
              <div className="event-modal-section-heading">
                <span>Current operation</span>
                <span className="event-count">{activeEvents.length}</span>
              </div>
              <div className="event-list">
                {activeEvents.length > 0 ? activeEvents.map((ev) => {
                  const isSelected = selectedEvent?.id === ev.id;
                  return (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => handleSelect(ev)}
                      className={`event-option ${isSelected ? 'selected' : ''}`}
                    >
                      <span className={`event-status-indicator ${ev.status === 'Active' ? 'active' : 'historical'}`} />
                      <span className="event-option-details">
                        <span className="event-option-name">{ev.event_name}</span>
                        <span className="event-option-meta">
                          {ev.event_type || 'Disaster'} · Active operation
                          {ev.declared_at && ` · ${new Date(ev.declared_at).toLocaleDateString()}`}
                        </span>
                      </span>
                      {isSelected && <Check size={18} className="event-option-check" />}
                    </button>
                  );
                }) : (
                  <p className="event-empty-state">No active operation. Start a new operation below.</p>
                )}
              </div>

              <button
                type="button"
                className="event-history-toggle"
                onClick={() => setShowHistory((visible) => !visible)}
                aria-expanded={showHistory}
                aria-controls="event-history-list"
              >
                <span><History size={16} /> View event history <span className="event-count">{historicalEvents.length}</span></span>
                <ChevronDown size={17} className={showHistory ? 'expanded' : ''} />
              </button>
              {showHistory && (
                <div className="event-history-content" id="event-history-list">
                  {historicalEvents.length > 0 ? (
                    <div className="event-list">
                      {historicalEvents.map((ev) => {
                        const isSelected = selectedEvent?.id === ev.id;
                        const eventStatus = ev.status === 'Archived'
                          ? 'Archived'
                          : ev.status === 'Concluded' ? 'Concluded' : 'Historical';
                        return (
                          <button
                            key={ev.id}
                            type="button"
                            onClick={() => handleSelect(ev)}
                            className={`event-option ${isSelected ? 'selected' : ''}`}
                          >
                            <span className="event-status-indicator historical" />
                            <span className="event-option-details">
                              <span className="event-option-name">{ev.event_name}</span>
                              <span className="event-option-meta">
                                {ev.event_type || 'Disaster'} · {eventStatus}
                                {ev.declared_at && ` · Started ${new Date(ev.declared_at).toLocaleDateString()}`}
                                {ev.concluded_at && ` · Ended ${new Date(ev.concluded_at).toLocaleDateString()}`}
                              </span>
                            </span>
                            {isSelected && <Check size={18} className="event-option-check" />}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="event-empty-state">No past operations in the event history.</p>
                  )}
                </div>
              )}

              {selectedEvent?.status !== 'Active' && (
                <div className="event-readonly-notice">
                  <AlertCircle size={17} />
                  <span>Historical event selected — event operations are read-only.</span>
                </div>
              )}

              <div className="event-create-section">
                <div className="event-modal-section-heading">
                  <span>Start a new operation</span>
                </div>
                <input
                  type="text"
                  placeholder="Enter operation name"
                  value={newEventName}
                  onChange={(e) => setNewEventName(e.target.value)}
                  aria-label="New event name"
                  maxLength={150}
                />
                <select
                  value={newEventType}
                  onChange={(e) => setNewEventType(e.target.value)}
                  aria-label="Disaster type"
                >
                  {DISASTER_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
                <button
                  type="button"
                  className="event-primary-action"
                  onClick={handleStartNew}
                  disabled={!newEventName.trim() || hasActiveEvent}
                >
                  Start New Evacuation Operation
                </button>
                {hasActiveEvent && (
                  <small className="event-action-hint">Conclude the active operation before starting another.</small>
                )}
              </div>

              {selectedEvent && selectedEvent.status === 'Active' && selectedEvent.id !== 'default-active-event' && (
                <button
                  type="button"
                  className="event-conclude-action"
                  onClick={handleConclude}
                >
                  Conclude Active Operation
                </button>
              )}

              {actionError && (
                <div className="event-action-error" role="alert">
                  <AlertCircle size={16} /> {actionError}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
