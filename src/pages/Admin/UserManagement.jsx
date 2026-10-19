import { useState } from 'react';
import { Plus, Shield, UserCheck, X, MoreVertical, ChevronDown } from 'lucide-react';
import './UserManagement.css';

const INITIAL_USERS = [
  {
    id: 'USR-001',
    initials: 'HM',
    name: 'Ronald Augorio',
    email: 'aaugorio@gmail.com',
    role: 'Head of MSWDO',
    roleType: 'admin',
    assignedCenter: 'All Centers (Command)',
    status: 'Active',
  },
  {
    id: 'USR-002',
    initials: 'ME',
    name: 'Maria Elena Santos',
    email: 'melena@vinzons.gov.ph',
    role: 'Field Coordinator',
    roleType: 'coordinator',
    assignedCenter: 'Vinzons Central Elementary School',
    status: 'Active',
  },
  {
    id: 'USR-003',
    initials: 'CM',
    name: 'Carlos Mendoza',
    email: 'cmendoza@vinzons.gov.ph',
    role: 'Relief Goods Staff',
    roleType: 'staff',
    assignedCenter: 'Vinzons Covered Court',
    status: 'Active',
  },
  {
    id: 'USR-004',
    initials: 'AR',
    name: 'Ana Reyes',
    email: 'areyes@vinzons.gov.ph',
    role: 'Evacuee Monitor',
    roleType: 'staff',
    assignedCenter: 'Calaguas National High School',
    status: 'Active',
  },
];

const ROLES = [
  'All Roles',
  'Head of MSWDO',
  'Field Coordinator',
  'Relief Goods Staff',
  'Evacuee Monitor',
];

const CENTERS = [
  'All Centers',
  'All Centers (Command)',
  'Vinzons Central Elementary School',
  'Vinzons Covered Court',
  'Calaguas National High School',
];

export default function UserManagement() {
  const [users, setUsers] = useState(INITIAL_USERS);
  const [filterRole, setFilterRole] = useState('All Roles');
  const [filterCenter, setFilterCenter] = useState('All Centers');
  const [openFilter, setOpenFilter] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    role: 'Field Coordinator',
    assignedCenter: 'Vinzons Central Elementary School',
  });

  const filtered = users.filter((u) => {
    const matchRole = filterRole === 'All Roles' || u.role === filterRole;
    const matchCenter = filterCenter === 'All Centers' || u.assignedCenter === filterCenter;
    return matchRole && matchCenter;
  });

  const handleAddUser = (e) => {
    e.preventDefault();
    if (!form.name || !form.email) return;

    const initials = form.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    const newUser = {
      id: `USR-00${users.length + 1}`,
      initials: initials || 'US',
      name: form.name,
      email: form.email,
      role: form.role,
      roleType: form.role.includes('Head') ? 'admin' : form.role.includes('Coordinator') ? 'coordinator' : 'staff',
      assignedCenter: form.assignedCenter,
      status: 'Active',
    };

    setUsers([newUser, ...users]);
    setForm({ name: '', email: '', role: 'Field Coordinator', assignedCenter: 'Vinzons Central Elementary School' });
    setIsModalOpen(false);
  };

  return (
    <div className="vin-users-page" onClick={() => openFilter && setOpenFilter(null)}>
      {/* Header */}
      <header className="vin-users-header">
        <div className="vin-users-header-text">
          <span className="vin-users-eyebrow">ADMINISTRATION & ACCESS</span>
          <h1 className="vin-users-title">User Management</h1>
          <p className="vin-users-desc">
            Manage administrative personnel, field coordinators, relief staff, and role assignments.
          </p>
        </div>
        <button
          type="button"
          className="vin-add-user-btn"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus size={18} />
          <span>Add New User</span>
        </button>
      </header>

      {/* Table Card */}
      <div className="vin-users-table-card">
        <div className="vin-users-toolbar">
          <div className="vin-filter-pill-group">
            {/* Role Filter */}
            <div className="vin-filter-pill-wrapper">
              <button
                type="button"
                className={`vin-filter-pill-btn ${filterRole !== 'All Roles' ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenFilter(openFilter === 'role' ? null : 'role');
                }}
              >
                <span>{filterRole === 'All Roles' ? 'All roles' : filterRole}</span>
                <ChevronDown size={13} />
              </button>

              {openFilter === 'role' && (
                <div className="vin-filter-pill-dropdown" onClick={(e) => e.stopPropagation()}>
                  <div className="vin-filter-pill-dropdown-title">User Role</div>
                  {ROLES.map((r) => (
                    <button
                      key={r}
                      type="button"
                      className={`vin-filter-pill-opt ${filterRole === r ? 'active' : ''}`}
                      onClick={() => {
                        setFilterRole(r);
                        setOpenFilter(null);
                      }}
                    >
                      <span>{r}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Center Filter */}
            <div className="vin-filter-pill-wrapper">
              <button
                type="button"
                className={`vin-filter-pill-btn ${filterCenter !== 'All Centers' ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenFilter(openFilter === 'center' ? null : 'center');
                }}
              >
                <span>{filterCenter === 'All Centers' ? 'All centers' : filterCenter.split(' ').slice(0, 2).join(' ')}</span>
                <ChevronDown size={13} />
              </button>

              {openFilter === 'center' && (
                <div className="vin-filter-pill-dropdown" onClick={(e) => e.stopPropagation()}>
                  <div className="vin-filter-pill-dropdown-title">Assigned Center</div>
                  {CENTERS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`vin-filter-pill-opt ${filterCenter === c ? 'active' : ''}`}
                      onClick={() => {
                        setFilterCenter(c);
                        setOpenFilter(null);
                      }}
                    >
                      <span>{c}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Clear Filter */}
            {(filterRole !== 'All Roles' || filterCenter !== 'All Centers') && (
              <button
                type="button"
                className="vin-filter-pill-clear"
                onClick={() => {
                  setFilterRole('All Roles');
                  setFilterCenter('All Centers');
                }}
              >
                Clear <X size={12} />
              </button>
            )}
          </div>
        </div>

        <table className="vin-users-table">
          <thead>
            <tr>
              <th>USER NAME</th>
              <th>EMAIL ADDRESS</th>
              <th>ROLE</th>
              <th>ASSIGNED CENTER</th>
              <th>STATUS</th>
              <th style={{ textAlign: 'right' }}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  No users match the current filter criteria.
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
              <tr key={item.id}>
                <td>
                  <div className="vin-user-avatar-cell">
                    <div className="vin-user-avatar-circle">{item.initials}</div>
                    <span className="vin-user-name-text">{item.name}</span>
                  </div>
                </td>
                <td style={{ color: '#475569' }}>{item.email}</td>
                <td>
                  <span className={`vin-role-badge ${item.roleType}`}>
                    {item.roleType === 'admin' ? <Shield size={13} /> : <UserCheck size={13} />}
                    {item.role}
                  </span>
                </td>
                <td style={{ color: '#334155' }}>{item.assignedCenter}</td>
                <td>
                  <span className="vin-status-tag active">
                    {item.status}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    type="button"
                    className="vin-user-action-btn"
                    onClick={() => alert(`Actions for ${item.name}`)}
                    aria-label="User actions"
                  >
                    <MoreVertical size={16} />
                  </button>
                </td>
              </tr>
            )))}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      {isModalOpen && (
        <div className="vin-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="vin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="vin-modal-head">
              <h2>Add New User</h2>
              <button
                type="button"
                className="vin-modal-close"
                onClick={() => setIsModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddUser}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Maria Santos"
                  className="vin-form-input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>Email Address</label>
                <input
                  type="email"
                  placeholder="msantos@vinzons.gov.ph"
                  className="vin-form-input"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>Role</label>
                <select
                  className="vin-form-select"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="Head of MSWDO">Head of MSWDO (Admin)</option>
                  <option value="Field Coordinator">Field Coordinator</option>
                  <option value="Relief Goods Staff">Relief Goods Staff</option>
                  <option value="Evacuee Monitor">Evacuee Monitor</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '22px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>Assigned Center</label>
                <select
                  className="vin-form-select"
                  value={form.assignedCenter}
                  onChange={(e) => setForm({ ...form, assignedCenter: e.target.value })}
                >
                  <option value="All Centers (Command)">All Centers (Command)</option>
                  <option value="Vinzons Central Elementary School">Vinzons Central Elementary School</option>
                  <option value="Vinzons Covered Court">Vinzons Covered Court</option>
                  <option value="Calaguas National High School">Calaguas National High School</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  className="vin-btn-cancel"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="vin-btn-submit">
                  Save User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
