import { useState, useMemo } from 'react';
import { Plus, Shield, UserCheck, X, MoreVertical } from 'lucide-react';
import './UserManagement.css';
import { useEvacuationCenters, isCenterMatch } from '../../lib/evacuationCenters.js';
import { AdminFilterModal, AdminFilterBar } from '../../components/AdminFilterModal.jsx';

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

export default function UserManagement() {
  const { centers } = useEvacuationCenters();
  const [users, setUsers] = useState(INITIAL_USERS);
  const [filterRole, setFilterRole] = useState('All Roles');
  const [filterCenter, setFilterCenter] = useState('All Centers');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Alphabetical centers list from Supabase
  const centerFilterOptions = useMemo(() => {
    return ['All Centers', 'All Centers (Command)', ...centers.map((c) => c.displayName)];
  }, [centers]);

  const [form, setForm] = useState({
    name: '',
    email: '',
    role: 'Field Coordinator',
    assignedCenter: 'All Centers (Command)',
  });

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchRole = filterRole === 'All Roles' || u.role === filterRole;
      const matchCenter =
        filterCenter === 'All Centers' ||
        u.assignedCenter === filterCenter ||
        isCenterMatch(u.assignedCenter, filterCenter, centers);
      return matchRole && matchCenter;
    });
  }, [users, filterRole, filterCenter, centers]);

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
    <div className="vin-users-page">
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
          <AdminFilterBar
            hasActiveFilters={filterRole !== 'All Roles' || filterCenter !== 'All Centers'}
            onOpenFilters={() => setShowFilterModal(true)}
            activeChips={[
              filterCenter !== 'All Centers' && {
                key: 'center',
                label: 'Center',
                value: filterCenter,
                onRemove: () => setFilterCenter('All Centers'),
              },
              filterRole !== 'All Roles' && {
                key: 'role',
                label: 'Role',
                value: filterRole,
                onRemove: () => setFilterRole('All Roles'),
              },
            ]}
          />
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
                  {centers.map((c) => (
                    <option key={c.id || c.displayName} value={c.displayName}>
                      {c.displayName}
                    </option>
                  ))}
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
      {/* ── Mobile-Style Filter Modal (No room filter) ── */}
      <AdminFilterModal
        isOpen={showFilterModal}
        title="Filter Users"
        hideRoom={true}
        statusOptions={ROLES.map((r) => ({ id: r, label: r }))}
        statusValue={filterRole}
        centerValue={filterCenter}
        centersList={centers}
        resultCount={filtered.length}
        onApply={({ status, center }) => {
          setFilterRole(status);
          setFilterCenter(center);
        }}
        onClose={() => setShowFilterModal(false)}
      />
    </div>
  );
}
