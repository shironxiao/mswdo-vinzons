import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Building,
  MapPin,
  Check,
  ChevronRight,
  ShieldCheck,
  Users,
  Layers,
  X,
} from 'lucide-react';
import { useMobileCenter } from '../../context/MobileCenterContext.jsx';
import mswdoLogo from '../../assets/mswdo logo.png';
import './MobileCenterSelect.css';

export default function MobileCenterSelect() {
  const navigate = useNavigate();
  const {
    centers,
    assignedCenter,
    assignedCenterId,
    setAssignedCenter,
  } = useMobileCenter();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVal, setSelectedVal] = useState(assignedCenter || '');
  const [selectedId, setSelectedId] = useState(assignedCenterId || '');

  // Filter centers dynamically based on search
  const filteredCenters = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return centers;
    return centers.filter((c) => {
      const name = (c.displayName || c.name || '').toLowerCase();
      const loc = (c.location || '').toLowerCase();
      return name.includes(q) || loc.includes(q);
    });
  }, [centers, searchQuery]);

  const handleSelect = (c) => {
    const name = c.displayName || c.name;
    setSelectedVal(name);
    setSelectedId(c.id || '');
  };

  const handleSelectAll = () => {
    setSelectedVal('All Centers');
    setSelectedId('');
  };

  const handleConfirm = () => {
    if (!selectedVal) return;
    setAssignedCenter(selectedVal, selectedId);
    navigate('/mobile/dashboard');
  };

  return (
    <div className="vin-mob-center-select-page">
      {/* Top Banner Header */}
      <header className="vin-mob-center-select-header">
        <div className="vin-mob-center-select-brand">
          <img
            src={mswdoLogo}
            alt="MSWDO Vinzons"
            className="vin-mob-center-select-logo"
          />
          <div>
            <span className="vin-mob-center-select-badge">
              <ShieldCheck size={12} /> MSWDO Field Deployment
            </span>
            <h1 className="vin-mob-center-select-title">Select Center to Handle</h1>
          </div>
        </div>
        <p className="vin-mob-center-select-desc">
          Choose the evacuation center you are assigned to. Your dashboard, recent activities, and monitoring will be prioritized for this center to keep the mobile view fast and prevent crashes.
        </p>

        {/* Search Input */}
        <div className="vin-mob-center-select-search-wrap">
          <Search size={18} className="vin-mob-center-select-search-icon" />
          <input
            type="text"
            className="vin-mob-center-select-search-input"
            placeholder={`Search among ${centers.length} evacuation centers...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="vin-mob-center-select-clear-btn"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </header>

      {/* Centers List Container */}
      <div className="vin-mob-center-select-list">
        {/* All Centers Option */}
        {(!searchQuery || 'all centers'.includes(searchQuery.toLowerCase())) && (
          <div
            className={`vin-mob-center-card ${selectedVal === 'All Centers' ? 'active' : ''}`}
            onClick={handleSelectAll}
            role="button"
            tabIndex={0}
          >
            <div className="vin-mob-center-card-radio">
              {selectedVal === 'All Centers' ? (
                <div className="vin-mob-center-card-radio-checked">
                  <Check size={14} />
                </div>
              ) : (
                <div className="vin-mob-center-card-radio-empty" />
              )}
            </div>

            <div className="vin-mob-center-card-body">
              <div className="vin-mob-center-card-title-row">
                <span className="vin-mob-center-card-name">All Evacuation Centers</span>
                <span className="vin-mob-center-card-tag all">Overview Mode</span>
              </div>
              <p className="vin-mob-center-card-location">
                View combined town-wide data across all 27 evacuation centers (recommended for supervisors).
              </p>
            </div>
          </div>
        )}

        {/* 27 Centers */}
        {filteredCenters.map((c) => {
          const name = c.displayName || c.name;
          const isSelected = selectedVal === name || (selectedId && c.id === selectedId);
          const roomCount = c.rooms?.length || c.total_rooms || 1;
          const cap = c.capacity || (roomCount * 25);

          return (
            <div
              key={c.id || name}
              className={`vin-mob-center-card ${isSelected ? 'active' : ''}`}
              onClick={() => handleSelect(c)}
              role="button"
              tabIndex={0}
            >
              <div className="vin-mob-center-card-radio">
                {isSelected ? (
                  <div className="vin-mob-center-card-radio-checked">
                    <Check size={14} />
                  </div>
                ) : (
                  <div className="vin-mob-center-card-radio-empty" />
                )}
              </div>

              <div className="vin-mob-center-card-body">
                <div className="vin-mob-center-card-title-row">
                  <span className="vin-mob-center-card-name">{name}</span>
                </div>

                <div className="vin-mob-center-card-location">
                  <MapPin size={13} className="vin-mob-center-loc-icon" />
                  <span>{c.location || 'Vinzons, Camarines Norte'}</span>
                </div>

                <div className="vin-mob-center-card-pills">
                  <span className="vin-mob-center-pill-item">
                    <Layers size={12} />
                    {roomCount} {roomCount === 1 ? 'Room' : 'Rooms'}
                  </span>
                  <span className="vin-mob-center-pill-item">
                    <Users size={12} />
                    Cap: {cap} pers.
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {filteredCenters.length === 0 && searchQuery && (
          <div className="vin-mob-center-select-empty">
            <Building size={32} className="vin-mob-center-select-empty-icon" />
            <p className="vin-mob-center-select-empty-text">
              No evacuation centers match &ldquo;{searchQuery}&rdquo;.
            </p>
          </div>
        )}
      </div>

      {/* Sticky Bottom Confirmation Action */}
      <footer className="vin-mob-center-select-footer">
        <div className="vin-mob-center-select-footer-info">
          <span className="vin-mob-center-select-footer-label">Selected Station:</span>
          <span className="vin-mob-center-select-footer-value">
            {selectedVal || 'None chosen yet'}
          </span>
        </div>

        <button
          type="button"
          disabled={!selectedVal}
          className={`vin-mob-center-confirm-btn ${!selectedVal ? 'disabled' : ''}`}
          onClick={handleConfirm}
        >
          <span>Proceed to Dashboard</span>
          <ChevronRight size={18} />
        </button>
      </footer>
    </div>
  );
}
