import { useState, useMemo } from 'react';
import { MapPin, Plus, X, ChevronLeft, ChevronRight, Search, Building } from 'lucide-react';
import './EvacuationCenter.css';
import './AdminFeatures.css';
import { useEvacuationCenters } from '../../lib/evacuationCenters.js';
import { supabase } from '../../lib/supabase.js';
import { AdminFilterModal, AdminFilterBar } from '../../components/AdminFilterModal.jsx';

export default function EvacuationCenter() {
  const { centers: dbCenters, loading, refetch } = useEvacuationCenters();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All Status');
  const [filterRoom, setFilterRoom] = useState('All Rooms');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    total_rooms: '2',
    capacity: '50',
  });

  const getCode = (name = '') => {
    return name
      .replace(/[^a-zA-Z\s]/g, '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 3)
      .map((w) => w[0].toUpperCase())
      .join('');
  };

  const getCenterStatus = (center) => {
    const totalCap = center.capacity || (center.total_rooms * 25);
    const totalOcc = (center.rooms || []).reduce((sum, r) => sum + (r.occupied || 0), 0);
    if (totalOcc === 0) return 'Empty';
    if (totalOcc >= totalCap) return 'Occupied';
    return 'Available';
  };

  /* Filter and dynamic alphabetical sorting */
  const filtered = useMemo(() => {
    return (dbCenters || [])
      .filter((center) => {
        const q = search.trim().toLowerCase();
        const matchSearch =
          !q ||
          (center.name && center.name.toLowerCase().includes(q)) ||
          (center.displayName && center.displayName.toLowerCase().includes(q)) ||
          (center.location && center.location.toLowerCase().includes(q));

        const status = getCenterStatus(center);
        const matchStatus =
          filterStatus === 'All Status' ||
          (filterStatus === 'Available' && status === 'Available') ||
          (filterStatus === 'Occupied' && status === 'Occupied') ||
          (filterStatus === 'Empty' && status === 'Empty');

        let matchRoom = true;
        if (filterRoom === '1 Room') {
          matchRoom = Number(center.total_rooms) === 1;
        } else if (filterRoom === '2-5 Rooms') {
          matchRoom = Number(center.total_rooms) >= 2 && Number(center.total_rooms) <= 5;
        } else if (filterRoom === '6+ Rooms') {
          matchRoom = Number(center.total_rooms) >= 6;
        }

        return matchSearch && matchStatus && matchRoom;
      })
      .sort((a, b) =>
        (a.displayName || a.name || '').localeCompare(
          b.displayName || b.name || '',
          undefined,
          { sensitivity: 'base', numeric: true }
        )
      );
  }, [dbCenters, search, filterStatus, filterRoom]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedCenters = filtered.slice(startIndex, startIndex + pageSize);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddCenter = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const roomCount = Math.max(1, Number(formData.total_rooms) || 1);
    const capacityNum = Number(formData.capacity) || roomCount * 25;

    try {
      const { error } = await supabase.from('evacuation_centers').insert({
        name: formData.name.trim(),
        location: (formData.location || 'Vinzons, Camarines Norte').trim(),
        total_rooms: roomCount,
        capacity: capacityNum,
      });

      if (error) {
        console.error('Error inserting center into Supabase:', error.message);
      }
      if (refetch) await refetch();
    } catch (err) {
      console.warn('Network error adding center:', err);
    }

    setFormData({ name: '', location: '', total_rooms: '2', capacity: '50' });
    setIsModalOpen(false);
    setCurrentPage(1);
  };

  return (
    <div className="vin-evac-page" onClick={() => openFilter && setOpenFilter(null)}>
      {/* Header section */}
      <header className="vin-evac-header">
        <div className="vin-evac-header-text">
          <span className="vin-evac-eyebrow">OPERATION REGISTRY</span>
          <h1 className="vin-evac-title">Evacuation Centers</h1>
          <p className="vin-evac-desc">
            Alphabetical directory of official evacuation centers and capacity in Vinzons
          </p>
        </div>

        <button
          type="button"
          className="vin-add-center-btn"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus size={18} strokeWidth={2.5} />
          <span>Add Center</span>
        </button>
      </header>

      {/* Filter and Search Toolbar */}
      <div className="vin-feature-toolbar" style={{ marginTop: -8 }}>
        <div className="vin-feature-search-wrapper" style={{ flex: 1, maxWidth: 360 }}>
          <Search size={16} className="vin-feature-search-icon" />
          <input
            type="text"
            className="vin-feature-search-input"
            placeholder="Search by center name or location..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
          {search && (
            <button
              type="button"
              className="vin-feature-search-clear"
              onClick={() => {
                setSearch('');
                setCurrentPage(1);
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <AdminFilterBar
          hasActiveFilters={filterStatus !== 'All Status' || filterRoom !== 'All Rooms'}
          onOpenFilters={() => setShowFilterModal(true)}
          activeChips={[
            filterStatus !== 'All Status' && {
              key: 'status',
              label: 'Status',
              value: filterStatus,
              onRemove: () => {
                setFilterStatus('All Status');
                setCurrentPage(1);
              },
            },
            filterRoom !== 'All Rooms' && {
              key: 'room',
              label: 'Room',
              value: filterRoom,
              onRemove: () => {
                setFilterRoom('All Rooms');
                setCurrentPage(1);
              },
            },
          ]}
        />
      </div>

      {/* Grid of Evacuation Center Cards */}
      <div className="vin-centers-grid">
        {paginatedCenters.map((center) => {
          const status = getCenterStatus(center);
          const totalCap = center.capacity || (center.total_rooms * 25);
          const totalOcc = (center.rooms || []).reduce((sum, r) => sum + (r.occupied || 0), 0);

          let badgeCls = 'available';
          if (status === 'Occupied') badgeCls = 'occupied';
          else if (status === 'Empty') badgeCls = 'empty';

          return (
            <div key={center.id} className="vin-center-card">
              {/* Top Badges */}
              <div className="vin-card-badges">
                <span className="vin-code-badge">{getCode(center.displayName || center.name)}</span>
                <span className={`vin-active-pill ${badgeCls}`}>
                  <span className="vin-active-dot" />
                  {status}
                </span>
              </div>

              {/* Name & Location */}
              <h2 className="vin-center-name">{center.displayName || center.name}</h2>
              <div className="vin-center-location">
                <MapPin size={14} className="vin-loc-icon" />
                <span>{center.location}</span>
              </div>

              {/* Statistics */}
              <div className="vin-center-stats">
                <div className="vin-stat-block">
                  <span className="vin-stat-number">{center.total_rooms}</span>
                  <span className="vin-stat-label">Total Rooms</span>
                </div>
                <div className="vin-stat-block">
                  <span className="vin-stat-number">{totalCap}</span>
                  <span className="vin-stat-label">Capacity</span>
                </div>
                <div className="vin-stat-block">
                  <span className="vin-stat-number">{totalOcc}</span>
                  <span className="vin-stat-label">Occupants</span>
                </div>
              </div>

              {/* View Details Button */}
              <button
                type="button"
                className="vin-view-btn"
                onClick={() => alert(`Center: ${center.displayName || center.name}\nLocation: ${center.location}\nRooms: ${center.total_rooms}\nCapacity: ${totalCap} persons`)}
              >
                View center details &gt;
              </button>
            </div>
          );
        })}

        {paginatedCenters.length === 0 && (
          <div style={{ gridColumn: '1 / -1', padding: '48px 24px', textAlign: 'center', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', color: '#64748b' }}>
            No evacuation centers match the current search or filters.
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {filtered.length > 0 && (
        <div className="vin-admin-pagination">
          <span className="vin-pagination-info">
            Showing <strong>{startIndex + 1}</strong>–<strong>{Math.min(startIndex + pageSize, filtered.length)}</strong> of <strong>{filtered.length}</strong> evacuation centers
          </span>

          <div className="vin-pagination-btns">
            <button
              type="button"
              className="vin-page-nav-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
              <span>Previous</span>
            </button>

            <div className="vin-page-numbers">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  className={`vin-page-num-btn ${pageNum === currentPage ? 'active' : ''}`}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="vin-page-nav-btn"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Next page"
            >
              <span>Next</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Add Center Modal (Direct Supabase Sync) */}
      {isModalOpen && (
        <div className="vin-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="vin-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="vin-modal-header">
              <h2 className="vin-modal-title">Add Evacuation Center</h2>
              <button
                type="button"
                className="vin-modal-close"
                onClick={() => setIsModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddCenter}>
              <div className="vin-form-group">
                <label className="vin-form-label">Center Name</label>
                <input
                  type="text"
                  name="name"
                  placeholder="e.g. Vinzons Sports Complex"
                  className="vin-form-input"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="vin-form-group">
                <label className="vin-form-label">Location / Barangay</label>
                <input
                  type="text"
                  name="location"
                  placeholder="e.g. Brgy. Sto. Domingo, Vinzons"
                  className="vin-form-input"
                  value={formData.location}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="vin-form-group">
                  <label className="vin-form-label">Number of Rooms</label>
                  <input
                    type="number"
                    min="1"
                    name="total_rooms"
                    placeholder="2"
                    className="vin-form-input"
                    value={formData.total_rooms}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="vin-form-group">
                  <label className="vin-form-label">Total Capacity (Persons)</label>
                  <input
                    type="number"
                    min="1"
                    name="capacity"
                    placeholder="50"
                    className="vin-form-input"
                    value={formData.capacity}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="vin-modal-actions">
                <button
                  type="button"
                  className="vin-btn-cancel"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="vin-btn-submit">
                  Save to Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ── Mobile-Style Filter Modal ── */}
      <AdminFilterModal
        isOpen={showFilterModal}
        title="Filter Centers"
        hideCenter={true}
        statusOptions={[
          { id: 'All Status', label: 'All Status' },
          { id: 'Available', label: 'Available' },
          { id: 'Occupied', label: 'Occupied' },
          { id: 'Empty', label: 'Empty' },
        ]}
        roomOptions={[
          { id: 'All Rooms', label: 'All Rooms' },
          { id: '1 Room', label: '1 Room' },
          { id: '2-5 Rooms', label: '2-5 Rooms' },
          { id: '6+ Rooms', label: '6+ Rooms' },
        ]}
        statusValue={filterStatus}
        roomValue={filterRoom}
        resultCount={filtered.length}
        onApply={({ status, room }) => {
          setFilterStatus(status);
          setFilterRoom(room);
          setCurrentPage(1);
        }}
        onClose={() => setShowFilterModal(false)}
      />
    </div>
  );
}
