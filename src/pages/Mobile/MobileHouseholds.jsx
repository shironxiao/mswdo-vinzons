import { useState } from 'react';
import { Search, Plus, User, Edit, X, Trash2 } from 'lucide-react';
import './MobileCommon.css';
import './MobileSubpages.css';

const INITIAL_HOUSEHOLDS = [
  { id: 1, name: 'Antonio Magno', age: 45, sex: 'Male', category: 'None', center: 'Vinzons Central Elementary School', room: 'C-1', familyCount: 4, members: [{ name: 'Luz Magno', age: 58, sex: 'Female', category: 'None' }] },
  { id: 2, name: 'Rosa Santos', age: 40, sex: 'Female', category: 'None', center: 'Vinzons Central Elementary School', room: 'A-2', familyCount: 4, members: [] },
  { id: 3, name: 'Patricia Cruz', age: 35, sex: 'Female', category: 'None', center: 'Vinzons Central Elementary School', room: 'C-2', familyCount: 3, members: [] },
  { id: 4, name: 'Juan Dela Cruz', age: 50, sex: 'Male', category: 'None', center: 'Vinzons Central Elementary School', room: 'A-1', familyCount: 5, members: [] },
];

export default function MobileHouseholds() {
  const [households, setHouseholds] = useState(INITIAL_HOUSEHOLDS);
  const [search, setSearch] = useState('');
  const [selectedHousehold, setSelectedHousehold] = useState(null); // for Household Details view
  const [modalMode, setModalMode] = useState(null); // 'register' | 'edit' | null
  const [activeForm, setActiveForm] = useState({
    head: '',
    age: '',
    sex: 'Male',
    center: 'Vinzons Central Elementary School',
    room: 'A-1',
    category: 'None',
    members: [{ name: 'Luz Magno', age: 58, sex: 'Female', category: 'None' }],
  });

  const filtered = households.filter((h) =>
    h.name.toLowerCase().includes(search.toLowerCase())
  );

  const openRegister = () => {
    setActiveForm({
      head: '',
      age: '',
      sex: 'Male',
      center: 'Vinzons Central Elementary School',
      room: 'A-1',
      category: 'None',
      members: [{ name: '', age: '', sex: 'Female', category: 'None' }],
    });
    setModalMode('register');
  };

  const openEdit = (item, e) => {
    e.stopPropagation();
    setActiveForm({
      id: item.id,
      head: item.name,
      age: item.age || 45,
      sex: item.sex || 'Male',
      center: item.center || 'Vinzons Central Elementary School',
      room: item.room || 'A-1',
      category: item.category || 'None',
      members: item.members || [],
    });
    setModalMode('edit');
  };

  const handleSaveHousehold = (e) => {
    e.preventDefault();
    if (!activeForm.head) return;

    if (modalMode === 'register') {
      const newH = {
        id: Date.now(),
        name: activeForm.head,
        age: Number(activeForm.age) || 30,
        sex: activeForm.sex,
        center: activeForm.center,
        room: activeForm.room,
        category: activeForm.category,
        familyCount: 1 + activeForm.members.length,
        members: activeForm.members,
      };
      setHouseholds([newH, ...households]);
    } else if (modalMode === 'edit') {
      setHouseholds((prev) =>
        prev.map((h) =>
          h.id === activeForm.id
            ? {
                ...h,
                name: activeForm.head,
                age: Number(activeForm.age) || h.age,
                sex: activeForm.sex,
                center: activeForm.center,
                room: activeForm.room,
                category: activeForm.category,
                familyCount: 1 + activeForm.members.length,
                members: activeForm.members,
              }
            : h
        )
      );
    }
    setModalMode(null);
  };

  const addMember = () => {
    setActiveForm((prev) => ({
      ...prev,
      members: [...prev.members, { name: '', age: '', sex: 'Female', category: 'None' }],
    }));
  };

  const removeMember = (index) => {
    setActiveForm((prev) => ({
      ...prev,
      members: prev.members.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="vin-mob-page">
      {/* Header */}
      <header className="vin-mob-header">
        <div className="vin-mob-header-info">
          <h1 className="vin-mob-title">Households</h1>
          <p className="vin-mob-subtitle">Registered evacuation families</p>
        </div>
        <button
          type="button"
          className="vin-mob-register-btn"
          onClick={openRegister}
        >
          <Plus size={16} />
          <span>Register</span>
        </button>
      </header>

      {/* Search Input */}
      <div className="vin-mob-search-wrapper">
        <Search size={18} className="vin-mob-search-icon" />
        <input
          type="text"
          placeholder="Search households..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="vin-mob-search-input"
        />
      </div>

      {/* Household List matching Screenshot 2/3 */}
      <div className="vin-mob-list">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="vin-mob-card-item"
            onClick={() => setSelectedHousehold(item)}
            style={{ cursor: 'pointer' }}
          >
            <div className="vin-mob-item-left">
              <div className="vin-mob-avatar-circle">
                <User size={22} />
              </div>
              <div className="vin-mob-item-details">
                <span className="vin-mob-item-name">{item.name}</span>
                <span className="vin-mob-item-sub">
                  Number of Family: {item.familyCount} • Room: {item.room}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="vin-mob-edit-btn"
              onClick={(e) => openEdit(item, e)}
              aria-label={`Edit ${item.name}`}
            >
              <Edit size={20} />
            </button>
          </div>
        ))}
      </div>

      {/* ========================================================
          REGISTER & EDIT HOUSEHOLD MODAL (Matching Screenshot 3)
          ======================================================== */}
      {modalMode && (
        <div className="vin-mob-sheet-overlay" onClick={() => setModalMode(null)}>
          <div className="vin-mob-sheet-content" onClick={(e) => e.stopPropagation()}>
            <div className="vin-mob-sheet-header">
              <h2 className="vin-mob-sheet-title">
                {modalMode === 'register' ? 'Register Household' : 'Edit Household'}
              </h2>
              <button
                type="button"
                className="vin-mob-sheet-close"
                onClick={() => setModalMode(null)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveHousehold} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="vin-mob-input-group">
                <label className="vin-mob-input-label">HOUSEHOLD HEAD</label>
                <input
                  type="text"
                  placeholder="Antonio Magno"
                  className="vin-mob-select"
                  value={activeForm.head}
                  onChange={(e) => setActiveForm({ ...activeForm, head: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="vin-mob-input-group">
                  <label className="vin-mob-input-label">AGE</label>
                  <input
                    type="number"
                    placeholder="45"
                    className="vin-mob-select"
                    value={activeForm.age}
                    onChange={(e) => setActiveForm({ ...activeForm, age: e.target.value })}
                  />
                </div>
                <div className="vin-mob-input-group">
                  <label className="vin-mob-input-label">SEX</label>
                  <select
                    className="vin-mob-select"
                    value={activeForm.sex}
                    onChange={(e) => setActiveForm({ ...activeForm, sex: e.target.value })}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '12px' }}>
                <div className="vin-mob-input-group">
                  <label className="vin-mob-input-label">EVACUATION CENTER</label>
                  <select
                    className="vin-mob-select"
                    value={activeForm.center}
                    onChange={(e) => setActiveForm({ ...activeForm, center: e.target.value })}
                  >
                    <option value="Vinzons Central Elementary School">Vinzons Central Elem</option>
                    <option value="Vinzons Covered Court">Vinzons Covered Court</option>
                    <option value="Calaguas National High School">Calaguas National HS</option>
                  </select>
                </div>
                <div className="vin-mob-input-group">
                  <label className="vin-mob-input-label">ROOM NUMBER</label>
                  <input
                    type="text"
                    placeholder="C-1"
                    className="vin-mob-select"
                    value={activeForm.room}
                    onChange={(e) => setActiveForm({ ...activeForm, room: e.target.value })}
                  />
                </div>
              </div>

              <div className="vin-mob-input-group">
                <label className="vin-mob-input-label">CATEGORY</label>
                <select
                  className="vin-mob-select"
                  value={activeForm.category}
                  onChange={(e) => setActiveForm({ ...activeForm, category: e.target.value })}
                >
                  <option value="None">None</option>
                  <option value="Senior">Senior Citizen</option>
                  <option value="PWD">PWD</option>
                  <option value="Pregnant/Lactating">Pregnant / Lactating</option>
                </select>
              </div>

              {/* Family Members list matching Screenshot 3 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                <span className="vin-mob-input-label" style={{ fontSize: '0.82rem' }}>FAMILY MEMBERS</span>
                <button
                  type="button"
                  className="vin-mob-add-member-btn"
                  onClick={addMember}
                >
                  <Plus size={14} />
                  <span>Add Member</span>
                </button>
              </div>

              {activeForm.members.map((m, idx) => (
                <div key={idx} className="vin-mob-member-box">
                  <div className="vin-mob-member-top">
                    <input
                      type="text"
                      placeholder="Member Name"
                      className="vin-mob-select"
                      value={m.name}
                      onChange={(e) => {
                        const updated = [...activeForm.members];
                        updated[idx].name = e.target.value;
                        setActiveForm({ ...activeForm, members: updated });
                      }}
                      style={{ padding: '8px 12px' }}
                    />
                    <button
                      type="button"
                      onClick={() => removeMember(idx)}
                      style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '6px' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    <input
                      type="number"
                      placeholder="Age"
                      className="vin-mob-select"
                      value={m.age}
                      onChange={(e) => {
                        const updated = [...activeForm.members];
                        updated[idx].age = e.target.value;
                        setActiveForm({ ...activeForm, members: updated });
                      }}
                      style={{ padding: '8px' }}
                    />
                    <select
                      className="vin-mob-select"
                      value={m.sex}
                      onChange={(e) => {
                        const updated = [...activeForm.members];
                        updated[idx].sex = e.target.value;
                        setActiveForm({ ...activeForm, members: updated });
                      }}
                      style={{ padding: '8px' }}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                    <select
                      className="vin-mob-select"
                      value={m.category}
                      onChange={(e) => {
                        const updated = [...activeForm.members];
                        updated[idx].category = e.target.value;
                        setActiveForm({ ...activeForm, members: updated });
                      }}
                      style={{ padding: '8px' }}
                    >
                      <option value="None">None</option>
                      <option value="Senior">Senior</option>
                      <option value="PWD">PWD</option>
                    </select>
                  </div>
                </div>
              ))}

              <button type="submit" className="vin-mob-sheet-submit-btn">
                Save Household
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          HOUSEHOLD DETAILS VIEW MODAL (Matching Screenshot 4)
          ======================================================== */}
      {selectedHousehold && (
        <div className="vin-mob-sheet-overlay" onClick={() => setSelectedHousehold(null)}>
          <div className="vin-mob-sheet-content" onClick={(e) => e.stopPropagation()}>
            <div className="vin-mob-sheet-header">
              <h2 className="vin-mob-sheet-title">Household Details</h2>
              <button
                type="button"
                className="vin-mob-sheet-close"
                onClick={() => setSelectedHousehold(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="vin-mob-profile-card" style={{ padding: '16px' }}>
              <div className="vin-mob-profile-top">
                <div className="vin-mob-avatar-circle" style={{ width: '46px', height: '46px' }}>
                  <User size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>{selectedHousehold.name}</h3>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Household Head</span>
                </div>
                <span className="vin-mob-badge-recorded" style={{ marginLeft: 'auto', fontSize: '0.72rem' }}>
                  Registered
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '6px' }}>
                <div>
                  <span className="vin-mob-field-label">AGE</span>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{selectedHousehold.age || 45}</div>
                </div>
                <div>
                  <span className="vin-mob-field-label">SEX</span>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{selectedHousehold.sex || 'Male'}</div>
                </div>
                <div>
                  <span className="vin-mob-field-label">ROOM ALLOCATION</span>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>Room {selectedHousehold.room}</div>
                </div>
                <div>
                  <span className="vin-mob-field-label">SPECIAL CATEGORY</span>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{selectedHousehold.category || 'None'}</div>
                </div>
              </div>
            </div>

            {/* Relief Stub info from image 4 */}
            <div className="vin-mob-profile-card" style={{ padding: '16px' }}>
              <span className="vin-mob-input-label">RELIEF STUB</span>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 700 }}>Relief Stub No.</span>
                <span className="vin-mob-role-pill">Marked Issued</span>
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                RG-10245
              </div>
            </div>

            {/* Monitoring status */}
            <div className="vin-mob-profile-card" style={{ padding: '16px' }}>
              <span className="vin-mob-input-label">MONITORING</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '6px' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>LAST MONITORING</span>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>9/17/2026, 8:57:47 PM</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>INTERVAL</span>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>Every 2-3 hours</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
