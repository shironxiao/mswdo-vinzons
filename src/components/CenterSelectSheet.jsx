import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { getRoomsForCenter } from '../lib/evacuationCenters.js';

/* ── Shared category list (7 official DSWD/MSWDO vulnerability categories) ── */
export const HOUSEHOLD_CATEGORIES = [
  { value: 'PREGNANT',                label: 'Pregnant',                  sub: 'Currently pregnant' },
  { value: 'LACTATING MOTHERS',       label: 'Lactating Mothers',         sub: 'Currently breastfeeding' },
  { value: 'CHILD HEADED FAMILY',     label: 'Child Headed Family',       sub: 'Family headed by a minor' },
  { value: 'SOLO PARENT',             label: 'Solo Parent',               sub: 'Raising children alone' },
  { value: 'PERSONS W/ DISABILITY',   label: 'Persons w/ Disability',     sub: 'Physical or mental disability' },
  { value: 'SENIOR CITIZEN',          label: 'Senior Citizen',            sub: '60 years old and above' },
  { value: 'INDIGENOUS PEOPLE (IPs)', label: 'Indigenous People (IPs)',   sub: 'Indigenous cultural community member' },
];

/* ──────────────────────────────────────────────
   Center Selection Bottom Sheet (White Theme)
   ────────────────────────────────────────────── */
export function CenterSelectSheet({
  selected,
  centersList = [],
  onSelect,
  onClose,
  allCentersSub = 'Show records from all evacuation centers',
  showAllOption = true,
}) {
  const initialSelected =
    !showAllOption && (!selected || selected === 'All Centers')
      ? (centersList[0]?.displayName || centersList[0]?.name || '')
      : (selected || 'All Centers');
  const [tempSelected, setTempSelected] = useState(initialSelected);
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
      <div className="vin-center-picker-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Drag handle */}
        <div className="vin-center-picker-handle" />

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
              aria-label="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Center List */}
        <div className="vin-center-picker-list">
          {/* All Centers Option */}
          {showAllOption && (!searchQuery || 'all centers'.includes(searchQuery.toLowerCase())) && (
            <div
              className={`vin-center-picker-item ${tempSelected === 'All Centers' ? 'selected' : ''}`}
              onClick={() => setTempSelected('All Centers')}
            >
              <div className="vin-center-picker-radio">
                <div className="vin-center-picker-radio-dot" />
              </div>
              <div className="vin-center-picker-info">
                <span className="vin-center-picker-name">All centers</span>
                <span className="vin-center-picker-loc">{allCentersSub}</span>
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
          Select center
        </button>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Room Selection Bottom Sheet (White Theme)
   ────────────────────────────────────────────── */
export function RoomSelectSheet({
  selected,
  centerName,
  centersList = [],
  onSelect,
  onClose,
  allRoomsSub = 'Show records from all rooms',
  showAllOption = true,
  includeUnassigned = false,
}) {
  const roomNames = getRoomsForCenter(centerName, centersList);
  const baseRooms = roomNames
    .filter((r) => r !== 'All Rooms')
    .map((r) => ({
      id: r,
      name: r,
      description:
        centerName && centerName !== 'All Centers'
          ? `Designated room at ${centerName}`
          : 'Evacuation room',
    }));

  const roomsList = includeUnassigned
    ? [
        ...baseRooms,
        {
          id: 'Unassigned',
          name: 'Unassigned',
          description: 'Not yet assigned to a specific room',
        },
      ]
    : baseRooms;

  const initialSelected =
    !showAllOption && (!selected || selected === 'All Rooms')
      ? (roomsList[0]?.id || 'Room 1')
      : (selected || 'All Rooms');

  const [tempSelected, setTempSelected] = useState(initialSelected);
  const [searchQuery, setSearchQuery] = useState('');

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
      <div className="vin-center-picker-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Drag handle */}
        <div className="vin-center-picker-handle" />

        {/* Header subtitle showing center context */}
        <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600, padding: '0 4px' }}>
          {centerName && centerName !== 'All Centers' ? `Rooms at ${centerName}` : 'All evacuation rooms'}
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
              aria-label="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Room List */}
        <div className="vin-center-picker-list">
          {/* All Rooms Option */}
          {showAllOption && (!searchQuery || 'all rooms'.includes(searchQuery.toLowerCase())) && (
            <div
              className={`vin-center-picker-item ${tempSelected === 'All Rooms' ? 'selected' : ''}`}
              onClick={() => setTempSelected('All Rooms')}
            >
              <div className="vin-center-picker-radio">
                <div className="vin-center-picker-radio-dot" />
              </div>
              <div className="vin-center-picker-info">
                <span className="vin-center-picker-name">All rooms</span>
                <span className="vin-center-picker-loc">{allRoomsSub}</span>
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
          Select room
        </button>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Category Selection Bottom Sheet (Multi-select)
   ────────────────────────────────────────────── */
export function CategorySelectSheet({
  selected,
  onSelect,
  onClose,
  title = 'Vulnerability Categories',
}) {
  const normalizeSelected = (val) => {
    if (Array.isArray(val)) return val;
    if (!val || val === 'None' || val === '') return [];
    return [val];
  };

  const [tempSelected, setTempSelected] = useState(() => normalizeSelected(selected));
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCategories = HOUSEHOLD_CATEGORIES.filter((cat) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      cat.label.toLowerCase().includes(q) ||
      cat.value.toLowerCase().includes(q) ||
      cat.sub.toLowerCase().includes(q)
    );
  });

  const toggleCategory = (value) => {
    setTempSelected((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const handleConfirm = () => {
    onSelect(tempSelected);
    onClose();
  };

  const handleClearAll = () => setTempSelected([]);

  return (
    <div className="vin-center-picker-overlay" onClick={onClose}>
      <div className="vin-center-picker-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Drag handle */}
        <div className="vin-center-picker-handle" />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px', marginBottom: 6 }}>
          <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
            {title}
          </div>
          {tempSelected.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              style={{ fontSize: '0.75rem', color: '#7c3aed', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: '2px 6px' }}
            >
              Clear all
            </button>
          )}
        </div>

        {/* Search Bar */}
        <div className="vin-center-picker-search-box">
          <Search size={16} className="vin-center-picker-search-icon" />
          <input
            type="text"
            className="vin-center-picker-search-input"
            placeholder={`Search ${HOUSEHOLD_CATEGORIES.length} categories...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
          {searchQuery && (
            <button
              type="button"
              className="vin-center-picker-clear-btn"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Category List — multi-select checkboxes */}
        <div className="vin-center-picker-list">
          {filteredCategories.map((cat) => {
            const isSelected = tempSelected.includes(cat.value);
            return (
              <div
                key={cat.value}
                className={`vin-center-picker-item ${isSelected ? 'selected' : ''}`}
                onClick={() => toggleCategory(cat.value)}
              >
                {/* Checkbox visual */}
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 5,
                    border: isSelected ? '2px solid #7c3aed' : '2px solid #cbd5e1',
                    background: isSelected ? '#7c3aed' : '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'background 0.15s, border-color 0.15s',
                  }}
                >
                  {isSelected && (
                    <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
                      <path d="M1 4L4.5 7.5L11 1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <div className="vin-center-picker-info">
                  <span className="vin-center-picker-name">{cat.label}</span>
                  <span className="vin-center-picker-loc">{cat.sub}</span>
                </div>
              </div>
            );
          })}

          {filteredCategories.length === 0 && searchQuery && (
            <div className="vin-center-picker-empty">
              No categories found matching &ldquo;{searchQuery}&rdquo;
            </div>
          )}
        </div>

        {/* Apply Button */}
        <button
          type="button"
          className="vin-center-picker-submit"
          onClick={handleConfirm}
        >
          {tempSelected.length > 0
            ? `Apply (${tempSelected.length} selected)`
            : 'Apply — None Selected'}
        </button>
      </div>
    </div>
  );
}
