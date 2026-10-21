import { useState } from 'react';
import { MapPin, Plus, X, ChevronLeft, ChevronRight } from 'lucide-react';
import './EvacuationCenter.css';

const INITIAL_CENTERS = [
  {
    id: 1,
    code: 'VCES',
    name: 'Vinzons Central Elementary School',
    location: 'Poblacion, Vinzons',
    households: 86,
    peopleRegistered: 264,
    status: 'Active',
  },
  {
    id: 2,
    code: 'VG',
    name: 'Vinzons Gymnasium',
    location: 'Brgy. San Jose, Vinzons',
    households: 42,
    peopleRegistered: 120,
    status: 'Active',
  },
  {
    id: 3,
    code: 'CNHS',
    name: 'Calaguas National High School',
    location: 'Calaguas, Vinzons',
    households: 38,
    peopleRegistered: 129,
    status: 'Active',
  },
  {
    id: 4,
    code: 'VCC',
    name: 'Vinzons Covered Court',
    location: 'Poblacion, Vinzons',
    households: 31,
    peopleRegistered: 100,
    status: 'Active',
  },
  {
    id: 5,
    code: 'MEC',
    name: 'Municipal Evacuation Center',
    location: 'Brgy. Sto. Domingo, Vinzons',
    households: 25,
    peopleRegistered: 80,
    status: 'Active',
  },
  {
    id: 6,
    code: 'SDBH',
    name: 'Sto. Domingo Barangay Hall',
    location: 'Brgy. Sto. Domingo, Vinzons',
    households: 0,
    peopleRegistered: 0,
    status: 'Available',
  },
  {
    id: 7,
    code: 'MES',
    name: 'Matango Elementary School',
    location: 'Brgy. Matango, Vinzons',
    households: 18,
    peopleRegistered: 54,
    status: 'Active',
  },
  {
    id: 8,
    code: 'ANHS',
    name: 'Aguit-it National High School',
    location: 'Brgy. Aguit-it, Vinzons',
    households: 14,
    peopleRegistered: 48,
    status: 'Active',
  },
  {
    id: 9,
    code: 'BES',
    name: 'Banocboc Elementary School',
    location: 'Brgy. Banocboc, Vinzons',
    households: 0,
    peopleRegistered: 0,
    status: 'Available',
  },
  {
    id: 10,
    code: 'MBH',
    name: 'Mangcayo Barangay Hall',
    location: 'Brgy. Mangcayo, Vinzons',
    households: 9,
    peopleRegistered: 28,
    status: 'Active',
  },
  {
    id: 11,
    code: 'SES',
    name: 'Sabang Elementary School',
    location: 'Brgy. Sabang, Vinzons',
    households: 0,
    peopleRegistered: 0,
    status: 'Available',
  },
  {
    id: 12,
    code: 'PHS',
    name: 'Pinagtigasan High School',
    location: 'Brgy. Pinagtigasan, Vinzons',
    households: 0,
    peopleRegistered: 0,
    status: 'Available',
  },
];

export default function EvacuationCenter() {
  const [centers, setCenters] = useState(INITIAL_CENTERS);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    location: '',
    households: '',
    peopleRegistered: '',
  });

  const totalPages = Math.ceil(centers.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedCenters = centers.slice(startIndex, startIndex + pageSize);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddCenter = (e) => {
    e.preventDefault();
    if (!formData.name) return;

    const newCenter = {
      id: Date.now(),
      code: formData.code.toUpperCase() || 'EC',
      name: formData.name,
      location: formData.location || 'Vinzons',
      households: Number(formData.households) || 0,
      peopleRegistered: Number(formData.peopleRegistered) || 0,
      status: 'Active',
    };

    setCenters((prev) => [newCenter, ...prev]);
    setCurrentPage(1);
    setFormData({ code: '', name: '', location: '', households: '', peopleRegistered: '' });
    setIsModalOpen(false);
  };

  return (
    <div className="vin-evac-page">
      {/* Header section */}
      <header className="vin-evac-header">
        <div className="vin-evac-header-text">
          <span className="vin-evac-eyebrow">OPERATION REGISTRY</span>
          <h1 className="vin-evac-title">Evacuation Centers</h1>
          <p className="vin-evac-desc">
            View the active evacuation centers and the households they support in Vinzons
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

      {/* Grid of Evacuation Center Cards */}
      <div className="vin-centers-grid">
        {paginatedCenters.map((center) => (
          <div key={center.id} className="vin-center-card">
            {/* Top Badges */}
            <div className="vin-card-badges">
              <span className="vin-code-badge">{center.code}</span>
              <span className="vin-active-pill">
                <span className="vin-active-dot" />
                {center.status}
              </span>
            </div>

            {/* Name & Location */}
            <h2 className="vin-center-name">{center.name}</h2>
            <div className="vin-center-location">
              <MapPin size={14} className="vin-loc-icon" />
              <span>{center.location}</span>
            </div>

            {/* Statistics */}
            <div className="vin-center-stats">
              <div className="vin-stat-block">
                <span className="vin-stat-number">{center.households}</span>
                <span className="vin-stat-label">Households</span>
              </div>
              <div className="vin-stat-block">
                <span className="vin-stat-number">{center.peopleRegistered}</span>
                <span className="vin-stat-label">People Registered</span>
              </div>
            </div>

            {/* View Details Button */}
            <button
              type="button"
              className="vin-view-btn"
              onClick={() => alert(`Center Details: ${center.name}`)}
            >
              View center details &gt;
            </button>
          </div>
        ))}
      </div>

      {/* Pagination Controls */}
      {centers.length > 0 && (
        <div className="vin-admin-pagination">
          <span className="vin-pagination-info">
            Showing <strong>{startIndex + 1}</strong>–<strong>{Math.min(startIndex + pageSize, centers.length)}</strong> of <strong>{centers.length}</strong> evacuation centers
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

      {/* Add Center Modal (UI Only) */}
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
                <label className="vin-form-label">Center Code (e.g. VCES, VCC)</label>
                <input
                  type="text"
                  name="code"
                  placeholder="VCES"
                  className="vin-form-input"
                  value={formData.code}
                  onChange={handleInputChange}
                />
              </div>

              <div className="vin-form-group">
                <label className="vin-form-label">Center Name</label>
                <input
                  type="text"
                  name="name"
                  placeholder="Vinzons Central Elementary School"
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
                  placeholder="Poblacion, Vinzons"
                  className="vin-form-input"
                  value={formData.location}
                  onChange={handleInputChange}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="vin-form-group">
                  <label className="vin-form-label">Initial Households</label>
                  <input
                    type="number"
                    name="households"
                    placeholder="86"
                    className="vin-form-input"
                    value={formData.households}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="vin-form-group">
                  <label className="vin-form-label">People Registered</label>
                  <input
                    type="number"
                    name="peopleRegistered"
                    placeholder="264"
                    className="vin-form-input"
                    value={formData.peopleRegistered}
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
                  Save Center
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
