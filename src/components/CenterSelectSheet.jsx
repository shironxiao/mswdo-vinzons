import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { getRoomsForCenter } from '../lib/evacuationCenters.js';

/* ── Shared category list ── */
export const HOUSEHOLD_CATEGORIES = [
  { value: 'None',               label: 'None',                        sub: 'No special classification' },
  { value: 'Senior Citizen',     label: 'Senior Citizen',              sub: '60 years old and above' },
  { value: 'PWD',                label: 'PWD (Person with Disability)', sub: 'Person with physical or mental disability' },
  { value: 'Pregnant/Lactating', label: 'Pregnant / Lactating',        sub: 'Currently pregnant or breastfeeding' },
  { value: 'Solo Parent',        label: 'Solo Parent',                  sub: 'Raising child/children alone' },
  { value: 'Infant/Child',       label: 'Infant / Child',              sub: 'Age 0–12 years old' },
  { value: 'Lactating Mother',   label: 'Lactating Mother',            sub: 'Breastfeeding mother' },
  { value: 'Indigenous People',  label: 'Indigenous People (IP)',       sub: 'Indigenous cultural community member' },
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
   Category Selection Bottom Sheet
   ────────────────────────────────────────────── */
export function CategorySelectSheet({
  selected,
  onSelect,
  onClose,
  title = 'Special Category',
}) {
  const [tempSelected, setTempSelected] = useState(selected || 'None');
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

  const handleConfirm = () => {
    onSelect(tempSelected);
    onClose();
  };

  return (
    <div className="vin-center-picker-overlay" onClick={onClose}>
      <div className="vin-center-picker-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Drag handle */}
        <div className="vin-center-picker-handle" />

        {/* Header subtitle */}
        <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600, padding: '0 4px', marginBottom: 2 }}>
          {title}
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

        {/* Category List */}
        <div className="vin-center-picker-list">
          {filteredCategories.map((cat) => {
            const isSelected = tempSelected === cat.value;
            return (
              <div
                key={cat.value}
                className={`vin-center-picker-item ${isSelected ? 'selected' : ''}`}
                onClick={() => setTempSelected(cat.value)}
              >
                <div className="vin-center-picker-radio">
                  <div className="vin-center-picker-radio-dot" />
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

        {/* Select Button */}
        <button
          type="button"
          className="vin-center-picker-submit"
          onClick={handleConfirm}
        >
          Select category
        </button>
      </div>
    </div>
  );
}
