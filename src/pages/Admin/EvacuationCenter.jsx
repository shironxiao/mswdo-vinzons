import { useState, useMemo, useContext } from 'react';
import {
  MapPin, Plus, X, ChevronLeft, ChevronRight,
  Building, Edit3, DoorOpen, CheckCircle2, Save, Info,
} from 'lucide-react';
import './EvacuationCenter.css';
import './AdminFeatures.css';
import { useEvacuationCenters, updateEvacuationCenter } from '../../lib/evacuationCenters.js';
import { supabase } from '../../lib/supabase.js';
import { AdminFilterModal, AdminFilterBar } from '../../components/AdminFilterModal.jsx';
import { useEventRoomPlacements, useHouseholds } from '../../lib/householdService.js';
import { createRoom, updateRoomCapacity, useRooms } from '../../lib/roomService.js';
import { EventContext } from '../../context/eventContext.js';
import AdminSearchInput from '../../components/AdminSearchInput.jsx';

export default function EvacuationCenter() {
  const { selectedEvent } = useContext(EventContext);
  const { centers: dbCenters, refetch } = useEvacuationCenters();
  const { households } = useHouseholds(dbCenters);
  const { rooms: databaseRooms, refresh: refreshRooms } = useRooms(dbCenters);
  const { placements } = useEventRoomPlacements(selectedEvent?.id);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All Status');
  const [filterRoom, setFilterRoom] = useState('All Rooms');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  const [selectedCenter, setSelectedCenter] = useState(null);
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

  const centers = useMemo(() => {
    const activePlacements = placements.filter((placement) =>
      placement.event_id === selectedEvent?.id && placement.status === 'Evacuated'
    );

    return dbCenters.map((center) => {
      const rooms = (center.rooms || []).map((room) => {
        const databaseRoom = databaseRooms.find((item) =>
          item.centerId === center.id &&
          (item.roomName === room.id || item.roomName === room.name)
        );
        const occupied = databaseRoom
          ? activePlacements
              .filter((placement) => placement.room_id === databaseRoom.id)
              .reduce((sum, placement) => {
                const household = households.find((item) => item.id === placement.household_id);
                return sum + (household?.familyCount || 1);
              }, 0)
          : 0;
        return {
          ...room,
          databaseRoomId: databaseRoom?.id,
          capacity: databaseRoom?.capacity || room.capacity,
          occupied,
        };
      });
      return {
        ...center,
        capacity: rooms.reduce((sum, room) => sum + (Number(room.capacity) || 0), 0),
        rooms,
      };
    });
  }, [dbCenters, databaseRooms, households, placements, selectedEvent?.id]);

  /* Filter and dynamic alphabetical sorting */
  const filtered = useMemo(() => {
    return centers
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
  }, [centers, search, filterStatus, filterRoom]);

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
    <div className="vin-evac-page">
      {/* Header section */}
      <header className="vin-evac-header">
        <div className="vin-evac-header-text">
          <span className="vin-evac-eyebrow">OPERATION REGISTRY</span>
          <h1 className="vin-evac-title">Evacuation Centers</h1>
          <p className="vin-evac-desc">
            Live room capacity based on active placements for {selectedEvent?.event_name || 'the selected operation'}.
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
        <AdminSearchInput
          placeholder="Search by center name or location..."
          value={search}
          onChange={(value) => {
            setSearch(value);
            setCurrentPage(1);
          }}
        />

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
                onClick={() => setSelectedCenter(center)}
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

      {/* ── Center Details & Room Renaming Pop-up Modal ── */}
      {selectedCenter && (
        <CenterDetailsModal
          center={selectedCenter}
          databaseRooms={databaseRooms}
          centersList={dbCenters}
          onClose={() => setSelectedCenter(null)}
          onSaveSuccess={async () => {
            if (refetch) await refetch();
            await refreshRooms();
          }}
        />
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────
   Center Details & Room Management Modal
   ────────────────────────────────────────────── */
function CenterDetailsModal({ center, databaseRooms, centersList, onClose, onSaveSuccess }) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'edit'
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [form, setForm] = useState({
    name: center.displayName || center.name || '',
    location: center.location || '',
    total_rooms: String(center.total_rooms || (center.rooms || []).length || 1),
  });

  const [roomCapacities, setRoomCapacities] = useState(() => {
    const map = {};
    (center.rooms || []).forEach((room) => {
      map[room.id] = String(room.capacity || 25);
    });
    return map;
  });

  const [roomNames, setRoomNames] = useState(() => {
    const map = {};
    (center.rooms || []).forEach((r) => {
      map[r.id] = r.name || r.id;
    });
    return map;
  });

  const roomCountNum = Math.max(1, Number(form.total_rooms) || 1);
  const currentRoomIds = Array.from({ length: roomCountNum }, (_, i) => `Room ${i + 1}`);

  const getRoomCapacity = (roomId, index) => (
    Number(roomCapacities[roomId]) || center.rooms?.[index]?.capacity || 25
  );
  const totalCap = currentRoomIds.reduce(
    (sum, roomId, index) => sum + getRoomCapacity(roomId, index),
    0
  );
  const totalOcc = (center.rooms || []).reduce((sum, r) => sum + (r.occupied || 0), 0);
  const availableSlots = Math.max(0, totalCap - totalOcc);
  const occPct = totalCap > 0 ? Math.min(100, Math.round((totalOcc / totalCap) * 100)) : 0;

  const handleRoomNameChange = (roomId, newName) => {
    setRoomNames((prev) => ({
      ...prev,
      [roomId]: newName,
    }));
  };

  const handleRoomCapacityChange = (roomId, value) => {
    setRoomCapacities((prev) => ({
      ...prev,
      [roomId]: value,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setIsSaving(true);
    setErrorMsg('');

    try {
      await Promise.all(currentRoomIds.map(async (roomId, index) => {
        const capacity = Number(roomCapacities[roomId] ?? getRoomCapacity(roomId, index));
        if (!Number.isInteger(capacity) || capacity < 1) {
          throw new Error(`Enter a valid capacity for ${roomId}.`);
        }

        const room = center.rooms?.[index];
        const databaseRoom = databaseRooms.find((item) => (
          item.id === room?.databaseRoomId ||
          (
            item.centerId === center.id &&
            (item.roomName === roomId || item.roomName === roomNames[roomId])
          )
        ));

        if (databaseRoom) {
          await updateRoomCapacity(databaseRoom.id, capacity);
        } else {
          await createRoom({
            centerId: center.id,
            roomName: roomId,
            capacity,
          }, centersList);
        }
      }));

      await updateEvacuationCenter(center.id, {
        name: form.name,
        location: form.location,
        total_rooms: roomCountNum,
        capacity: totalCap,
        room_names: roomNames,
        room_capacities: Object.fromEntries(currentRoomIds.map((roomId, index) => [
          roomId,
          getRoomCapacity(roomId, index),
        ])),
      });

      setSaveSuccess(true);
      if (onSaveSuccess) {
        await onSaveSuccess();
      }
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      console.error('Failed to update center:', err);
      setErrorMsg('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="vin-modal-overlay" onClick={onClose}>
      <div className="vin-center-details-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="vin-center-details-header">
          <div>
            <span className="vin-center-modal-eyebrow">FACILITY DETAILS &amp; ROOM MANAGEMENT</span>
            <h2 className="vin-center-modal-name">
              <Building size={20} color="#7c3aed" />
              <span>{center.displayName || center.name}</span>
            </h2>
            <div className="vin-center-modal-location">
              <MapPin size={14} color="#64748b" />
              <span>{center.location}</span>
            </div>
          </div>
          <button type="button" className="vin-modal-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="vin-center-modal-tabs">
          <button
            type="button"
            className={`vin-center-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <Info size={16} />
            <span>Center Overview</span>
          </button>
          <button
            type="button"
            className={`vin-center-tab-btn ${activeTab === 'edit' ? 'active' : ''}`}
            onClick={() => setActiveTab('edit')}
          >
            <Edit3 size={16} />
            <span>Edit Center &amp; Rooms</span>
          </button>
        </div>

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div className="vin-center-modal-body">
            {/* Stats Grid */}
            <div className="vin-center-stats-grid">
              <div className="vin-center-stat-box">
                <span className="vin-center-stat-val">{center.total_rooms}</span>
                <span className="vin-center-stat-lbl">Total Rooms</span>
              </div>
              <div className="vin-center-stat-box">
                <span className="vin-center-stat-val">{totalCap}</span>
                <span className="vin-center-stat-lbl">Max Capacity</span>
              </div>
              <div className="vin-center-stat-box">
                <span className="vin-center-stat-val" style={{ color: '#6b21a8' }}>{totalOcc}</span>
                <span className="vin-center-stat-lbl">Current Occupants</span>
              </div>
              <div className="vin-center-stat-box">
                <span className="vin-center-stat-val" style={{ color: availableSlots > 0 ? '#2563eb' : '#dc2626' }}>
                  {availableSlots}
                </span>
                <span className="vin-center-stat-lbl">Slots Available</span>
              </div>
            </div>

            {/* Occupancy Bar */}
            <div className="vin-occupancy-card">
              <div className="vin-occupancy-head">
                <span className="vin-occupancy-title">Occupancy Status</span>
                <span className="vin-occupancy-pct">{occPct}% Filled ({totalOcc} / {totalCap} persons)</span>
              </div>
              <div className="vin-occupancy-track">
                <div
                  className="vin-occupancy-fill"
                  style={{
                    width: `${occPct}%`,
                    backgroundColor: occPct >= 100 ? '#dc2626' : occPct >= 75 ? '#eab308' : '#7c3aed',
                  }}
                />
              </div>
            </div>

            {/* Designated Rooms List */}
            <div className="vin-rooms-list-card">
              <div className="vin-rooms-list-head">
                <h3 className="vin-rooms-list-title">
                  <DoorOpen size={18} color="#7c3aed" />
                  <span>Designated Rooms &amp; Capacities ({currentRoomIds.length})</span>
                </h3>
              </div>

              <div className="vin-rooms-grid">
                {(center.rooms || []).map((room, idx) => {
                  const rName = roomNames[room.id] || room.name || room.id;
                  const isFull = (room.occupied || 0) >= (room.capacity || 25);
                  return (
                    <div key={room.id || idx} className="vin-room-card-item">
                      <div className="vin-room-card-top">
                        <span className="vin-room-key-tag">{room.id}</span>
                        <span className={`vin-status-tag ${isFull ? 'pending' : 'active'}`} style={{ margin: 0 }}>
                          {isFull ? 'Full' : 'Available'}
                        </span>
                      </div>
                      <div className="vin-room-display-name">
                        {rName !== room.id ? rName : room.id}
                      </div>
                      <div className="vin-room-meta-info">
                        <span>Capacity: <strong>{room.capacity || 25}</strong></span>
                        <span>Occupants: <strong>{room.occupied || 0}</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Edit Center & Rooms */}
        {activeTab === 'edit' && (
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div className="vin-center-modal-body">
              {errorMsg && (
                <div style={{ padding: '10px 14px', background: '#fee2e2', color: '#b91c1c', borderRadius: 8, fontSize: '0.85rem' }}>
                  {errorMsg}
                </div>
              )}
              {saveSuccess && (
                <div style={{ padding: '10px 14px', background: '#f3e8ff', color: '#6b21a8', borderRadius: 8, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle2 size={16} />
                  <span>Center and room details updated successfully!</span>
                </div>
              )}

              {/* General Info Fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
                <div className="vin-form-group" style={{ margin: 0 }}>
                  <label className="vin-form-label">Center Name</label>
                  <input
                    type="text"
                    className="vin-form-input"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Vinzons Central Elementary School"
                    required
                  />
                </div>

                <div className="vin-form-group" style={{ margin: 0 }}>
                  <label className="vin-form-label">Location / Barangay</label>
                  <input
                    type="text"
                    className="vin-form-input"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="e.g. Brgy. Poblacion I, Vinzons"
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="vin-form-group" style={{ margin: 0 }}>
                    <label className="vin-form-label">Total Rooms</label>
                    <input
                      type="number"
                      className="vin-form-input"
                      value={form.total_rooms}
                      readOnly
                      aria-describedby="room-count-hint"
                    />
                    <small id="room-count-hint" className="vin-room-count-hint">
                      Use Add Room below to increase the room count.
                    </small>
                  </div>
                  <div className="vin-form-group" style={{ margin: 0 }}>
                    <label className="vin-form-label">Total Capacity (Persons)</label>
                    <div className="vin-form-input vin-capacity-total" aria-live="polite">
                      {totalCap}
                    </div>
                  </div>
                </div>
              </div>

              {/* Room Names and Capacity List */}
              <div className="vin-renaming-box">
                <div className="vin-room-editor-header">
                  <div className="vin-renaming-header">
                    <h4 className="vin-renaming-title">
                      <DoorOpen size={16} color="#7c3aed" />
                      <span>Room Names &amp; Capacities</span>
                    </h4>
                    <p className="vin-renaming-desc">
                      Set each room&apos;s designation and maximum number of persons. Total capacity is calculated from these values.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="vin-add-room-btn"
                    onClick={() => {
                      const nextRoomNumber = roomCountNum + 1;
                      const roomId = `Room ${nextRoomNumber}`;
                      setForm((prev) => ({ ...prev, total_rooms: String(nextRoomNumber) }));
                      setRoomNames((prev) => ({ ...prev, [roomId]: roomId }));
                      setRoomCapacities((prev) => ({ ...prev, [roomId]: '25' }));
                    }}
                    disabled={isSaving}
                  >
                    <Plus size={16} />
                    <span>Add Room</span>
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {currentRoomIds.map((roomId, idx) => {
                    const currentOcc = center.rooms?.[idx]?.occupied || 0;
                    return (
                      <div key={roomId} className="vin-room-rename-row">
                        <div className="vin-room-badge-col">
                          <DoorOpen size={14} color="#64748b" />
                          <span>{roomId}</span>
                        </div>
                        <input
                          type="text"
                          className="vin-room-rename-input"
                          placeholder={`Custom name for ${roomId}...`}
                          value={roomNames[roomId] !== undefined ? roomNames[roomId] : roomId}
                          onChange={(e) => handleRoomNameChange(roomId, e.target.value)}
                        />
                        <label className="vin-room-capacity-col">
                          <span>Capacity</span>
                          <input
                            type="number"
                            min="1"
                            className="vin-room-capacity-input"
                            value={roomCapacities[roomId] ?? String(getRoomCapacity(roomId, idx))}
                            onChange={(e) => handleRoomCapacityChange(roomId, e.target.value)}
                            required
                          />
                        </label>
                        <div className="vin-room-occ-col">
                          {currentOcc} occupied
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Form Actions */}
            <div className="vin-center-modal-footer">
              <button
                type="button"
                className="vin-btn-cancel"
                onClick={onClose}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="vin-btn-submit"
                disabled={isSaving}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Save size={16} />
                <span>{isSaving ? 'Saving Changes...' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Footer for Overview tab */}
        {activeTab === 'overview' && (
          <div className="vin-center-modal-footer">
            <button type="button" className="vin-btn-cancel" onClick={onClose}>
              Close
            </button>
            <button
              type="button"
              className="vin-btn-switch-edit"
              onClick={() => setActiveTab('edit')}
            >
              <Edit3 size={15} />
              <span>Edit Center &amp; Rooms</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
