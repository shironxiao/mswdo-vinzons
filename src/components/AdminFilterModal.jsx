import { useState } from 'react';
import { Search, X, SlidersHorizontal, ChevronDown, Building, DoorOpen } from 'lucide-react';
import { getRoomsForCenter } from '../lib/evacuationCenters.js';

/* ──────────────────────────────────────────────
   Center Selection Modal (Mobile Style for Admin)
   ────────────────────────────────────────────── */
export function CenterSelectModal({ selected, centersList = [], onSelect, onClose }) {
  const [tempSelected, setTempSelected] = useState(selected || 'All Centers');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCenters = centersList
    .filter((c) => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      return (
        (c.displayName && c.displayName.toLowerCase().includes(q)) ||
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.location && c.location.toLowerCase().includes(q))
      );
    })
    .sort((a, b) =>
      (a.displayName || a.name || '').localeCompare(
        b.displayName || b.name || '',
        undefined,
        { sensitivity: 'base', numeric: true }
      )
    );

  const handleConfirm = () => {
    onSelect(tempSelected);
    onClose();
  };

  return (
    <div className="vin-center-picker-overlay" onClick={onClose}>
      <div className="vin-center-picker-sheet vin-admin-picker-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="vin-picker-modal-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Building size={18} color="#7c3aed" />
            <h3 className="vin-picker-modal-title">Select Evacuation Center</h3>
          </div>
          <button type="button" className="vin-picker-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="vin-center-picker-search-box">
          <Search size={16} className="vin-center-picker-search-icon" />
          <input
            type="text"
            className="vin-center-picker-search-input"
            placeholder={`Search ${centersList.length} centers...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
          {searchQuery && (
            <button
              type="button"
              className="vin-center-picker-clear-btn"
              onClick={() => setSearchQuery('')}
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Center List */}
        <div className="vin-center-picker-list">
          {/* All Centers Option */}
          {(!searchQuery || 'all centers'.includes(searchQuery.toLowerCase())) && (
            <div
              className={`vin-center-picker-item ${tempSelected === 'All Centers' ? 'selected' : ''}`}
              onClick={() => setTempSelected('All Centers')}
            >
              <div className="vin-center-picker-radio">
                <div className="vin-center-picker-radio-dot" />
              </div>
              <div className="vin-center-picker-info">
                <span className="vin-center-picker-name">All centers</span>
                <span className="vin-center-picker-loc">Show records across all evacuation centers</span>
              </div>
            </div>
          )}

          {filteredCenters.map((c) => {
            const centerVal = c.displayName || c.name;
            const isSelected = tempSelected === centerVal || tempSelected === c.name;
            return (
              <div
                key={c.id || centerVal}
                className={`vin-center-picker-item ${isSelected ? 'selected' : ''}`}
                onClick={() => setTempSelected(centerVal)}
              >
                <div className="vin-center-picker-radio">
                  <div className="vin-center-picker-radio-dot" />
                </div>
                <div className="vin-center-picker-info">
                  <span className="vin-center-picker-name">{centerVal}</span>
                  <span className="vin-center-picker-loc">{c.location}</span>
                </div>
              </div>
            );
          })}

          {filteredCenters.length === 0 && searchQuery && (
            <div className="vin-center-picker-empty">
              No evacuation centers found matching &ldquo;{searchQuery}&rdquo;
            </div>
          )}
        </div>

        {/* Select Button */}
        <button
          type="button"
          className="vin-center-picker-submit"
          onClick={handleConfirm}
        >
          Select Center
        </button>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Room Selection Modal (Mobile Style for Admin)
   ────────────────────────────────────────────── */
export function RoomSelectModal({ selected, centerName, centersList = [], onSelect, onClose }) {
  const [tempSelected, setTempSelected] = useState(selected || 'All Rooms');
  const [searchQuery, setSearchQuery] = useState('');

  const roomNames = getRoomsForCenter(centerName, centersList);
  const roomsList = roomNames
    .filter((r) => r !== 'All Rooms')
    .map((r) => ({
      id: r,
      name: r,
      description:
        centerName && centerName !== 'All Centers'
          ? `Designated room at ${centerName}`
          : 'Evacuation room',
    }));

  const filteredRooms = roomsList.filter((r) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q);
  });

  const handleConfirm = () => {
    onSelect(tempSelected);
    onClose();
  };

  return (
    <div className="vin-center-picker-overlay" onClick={onClose}>
      <div className="vin-center-picker-sheet vin-admin-picker-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="vin-picker-modal-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <DoorOpen size={18} color="#7c3aed" />
            <div>
              <h3 className="vin-picker-modal-title">Select Room</h3>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                {centerName && centerName !== 'All Centers' ? centerName : 'All Centers'}
              </span>
            </div>
          </div>
          <button type="button" className="vin-picker-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="vin-center-picker-search-box">
          <Search size={16} className="vin-center-picker-search-icon" />
          <input
            type="text"
            className="vin-center-picker-search-input"
            placeholder={`Search ${roomsList.length} rooms...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
          {searchQuery && (
            <button
              type="button"
              className="vin-center-picker-clear-btn"
              onClick={() => setSearchQuery('')}
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Room List */}
        <div className="vin-center-picker-list">
          {(!searchQuery || 'all rooms'.includes(searchQuery.toLowerCase())) && (
            <div
              className={`vin-center-picker-item ${tempSelected === 'All Rooms' ? 'selected' : ''}`}
              onClick={() => setTempSelected('All Rooms')}
            >
              <div className="vin-center-picker-radio">
                <div className="vin-center-picker-radio-dot" />
              </div>
              <div className="vin-center-picker-info">
                <span className="vin-center-picker-name">All rooms</span>
                <span className="vin-center-picker-loc">Show records across all designated rooms</span>
              </div>
            </div>
          )}

          {filteredRooms.map((r) => {
            const isSelected = tempSelected === r.id;
            return (
              <div
                key={r.id}
                className={`vin-center-picker-item ${isSelected ? 'selected' : ''}`}
                onClick={() => setTempSelected(r.id)}
              >
                <div className="vin-center-picker-radio">
                  <div className="vin-center-picker-radio-dot" />
                </div>
                <div className="vin-center-picker-info">
                  <span className="vin-center-picker-name">{r.name}</span>
                  <span className="vin-center-picker-loc">{r.description}</span>
                </div>
              </div>
            );
          })}

          {filteredRooms.length === 0 && searchQuery && (
            <div className="vin-center-picker-empty">
              No rooms found matching &ldquo;{searchQuery}&rdquo;
            </div>
          )}
        </div>

        {/* Select Button */}
        <button
          type="button"
          className="vin-center-picker-submit"
          onClick={handleConfirm}
        >
          Select Room
        </button>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Main Admin Filter Modal (Mobile Style)
   ────────────────────────────────────────────── */
export function AdminFilterModal({
  isOpen,
  title = 'Filters',
  statusOptions = [],
  statusValue,
  centerValue,
  roomValue,
  centersList = [],
  hideRoom = false,
  hideCenter = false,
  roomOptions = null, // optional static room options like in EvacuationCenter
  resultCount,
  onApply,
  onClose,
}) {
  const [draftStatus, setDraftStatus] = useState(statusValue || (statusOptions[0]?.id || 'All'));
  const [draftCenter, setDraftCenter] = useState(centerValue || 'All Centers');
  const [draftRoom, setDraftRoom] = useState(roomValue || 'All Rooms');

  const [showCenterPicker, setShowCenterPicker] = useState(false);
  const [showRoomPicker, setShowRoomPicker] = useState(false);

  if (!isOpen) return null;

  const defaultStatus = statusOptions[0]?.id || 'All';

  const handleReset = () => {
    setDraftStatus(defaultStatus);
    setDraftCenter('All Centers');
    setDraftRoom('All Rooms');
  };

  const handleApply = () => {
    onApply({
      status: draftStatus,
      center: draftCenter,
      room: draftRoom,
    });
    onClose();
  };

  return (
    <div className="vin-center-picker-overlay" onClick={onClose}>
      <div className="vin-hh-filter-sheet vin-admin-filter-sheet-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="vin-hh-filter-sheet-header">
          <span className="vin-hh-filter-sheet-title">{title}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button type="button" className="vin-hh-filter-sheet-reset" onClick={handleReset}>
              Reset
            </button>
            <button type="button" className="vin-picker-close-btn" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Status Pills */}
        {statusOptions.length > 0 && (
          <div className="vin-hh-filter-section">
            <div className="vin-hh-filter-section-label">Status</div>
            <div className="vin-hh-filter-pills-row">
              {statusOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`vin-hh-filter-pill ${draftStatus === opt.id ? 'active' : ''}`}
                  onClick={() => setDraftStatus(opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Center Picker Field */}
        {!hideCenter && (
          <div className="vin-hh-filter-section">
            <div className="vin-hh-filter-section-label">Evacuation Center</div>
            <div
              className="vin-hh-filter-select-wrap vin-hh-filter-tap-field"
              onClick={() => setShowCenterPicker(true)}
              role="button"
              tabIndex={0}
            >
              <div className="vin-hh-filter-select-display-txt">
                {draftCenter}
              </div>
              <ChevronDown size={16} className="vin-hh-filter-select-icon" />
            </div>
          </div>
        )}

        {/* Room Picker Field */}
        {!hideRoom && (
          <div className="vin-hh-filter-section">
            <div className="vin-hh-filter-section-label">Room / Designated Space</div>
            {roomOptions ? (
              /* If static room pills/options provided (e.g. 1 Room, 2-5 Rooms, 6+ Rooms) */
              <div className="vin-hh-filter-pills-row">
                {roomOptions.map((opt) => (
                  <button
                    key={opt.id || opt}
                    type="button"
                    className={`vin-hh-filter-pill ${draftRoom === (opt.id || opt) ? 'active' : ''}`}
                    onClick={() => setDraftRoom(opt.id || opt)}
                  >
                    {opt.label || opt}
                  </button>
                ))}
              </div>
            ) : (
              /* Dynamic room picker modal */
              <div
                className="vin-hh-filter-select-wrap vin-hh-filter-tap-field"
                onClick={() => setShowRoomPicker(true)}
                role="button"
                tabIndex={0}
              >
                <div className="vin-hh-filter-select-display-txt">
                  {draftRoom}
                </div>
                <ChevronDown size={16} className="vin-hh-filter-select-icon" />
              </div>
            )}
          </div>
        )}

        {/* Show Results Button */}
        <button type="button" className="vin-hh-filter-sheet-apply" onClick={handleApply}>
          {resultCount !== undefined
            ? `Show ${resultCount} result${resultCount !== 1 ? 's' : ''}`
            : 'Apply Filters'}
        </button>
      </div>

      {/* Pop-up Modal for selecting Center */}
      {showCenterPicker && (
        <CenterSelectModal
          selected={draftCenter}
          centersList={centersList}
          onSelect={(c) => {
            setDraftCenter(c);
            setShowCenterPicker(false);
          }}
          onClose={() => setShowCenterPicker(false)}
        />
      )}

      {/* Pop-up Modal for selecting Room */}
      {showRoomPicker && (
        <RoomSelectModal
          selected={draftRoom}
          centerName={draftCenter}
          centersList={centersList}
          onSelect={(r) => {
            setDraftRoom(r);
            setShowRoomPicker(false);
          }}
          onClose={() => setShowRoomPicker(false)}
        />
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────
   Filter Bar with Filters Trigger Button & Active Chips
   ────────────────────────────────────────────── */
export function AdminFilterBar({
  hasActiveFilters = false,
  onOpenFilters,
  activeChips = [],
  children,
}) {
  const activeCount = activeChips.filter((c) => c && c.value).length;

  return (
    <div className="vin-admin-unified-filter-bar">
      {/* Main Filters Button (Exact mobile design) */}
      <button
        type="button"
        className={`vin-hh-filters-trigger ${hasActiveFilters || activeCount > 0 ? 'active' : ''}`}
        onClick={onOpenFilters}
      >
        <SlidersHorizontal size={14} className="vin-hh-filters-trigger-icon" />
        <span>Filters</span>
        {activeCount > 0 && (
          <span className="vin-hh-filters-trigger-badge">{activeCount}</span>
        )}
      </button>

      {/* Active Filter Chips */}
      {activeChips.map(
        (chip) =>
          chip &&
          chip.value && (
            <button
              key={chip.key || chip.label}
              type="button"
              className="vin-hh-active-chip"
              onClick={chip.onRemove}
              title={`Remove ${chip.label} filter`}
            >
              <span>{chip.value}</span>
              <X size={13} className="vin-hh-chip-close" />
            </button>
          )
      )}

      {children && <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>{children}</div>}
    </div>
  );
}
