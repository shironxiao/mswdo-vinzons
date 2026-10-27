import { useState, useMemo } from 'react';
import { Plus, Shield, UserCheck, X, Edit2, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import './UserManagement.css';
import { useEvacuationCenters, isCenterMatch } from '../../lib/evacuationCenters.js';
import { AdminFilterModal, AdminFilterBar } from '../../components/AdminFilterModal.jsx';
import { ConfirmModal } from '../../components/ConfirmModal.jsx';

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
  
  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Form states
  const [form, setForm] = useState({
    name: '',
    email: '',
    role: 'Field Coordinator',
    assignedCenter: 'All Centers (Command)',
  });
  const [addErrors, setAddErrors] = useState({});

  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    role: 'Field Coordinator',
    assignedCenter: 'All Centers (Command)',
    status: 'Active',
  });
  const [editErrors, setEditErrors] = useState({});

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const validateForm = (data) => {
    const errors = {};
    if (!data.name || data.name.trim().length < 2) {
      errors.name = 'Full name is required (at least 2 characters).';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!data.email || !emailRegex.test(data.email.trim())) {
      errors.email = 'Please enter a valid email address (e.g., name@domain.com).';
    }
    return errors;
  };

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
    const errs = validateForm(form);
    if (Object.keys(errs).length > 0) {
      setAddErrors(errs);
      return;
    }

    const initials = form.name
      .trim()
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    const newUser = {
      id: `USR-00${users.length + 1}`,
      initials: initials || 'US',
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role,
      roleType: form.role.includes('Head') ? 'admin' : form.role.includes('Coordinator') ? 'coordinator' : 'staff',
      assignedCenter: form.assignedCenter,
      status: 'Active',
    };

    setUsers([newUser, ...users]);
    setForm({ name: '', email: '', role: 'Field Coordinator', assignedCenter: 'All Centers (Command)' });
    setAddErrors({});
    setIsModalOpen(false);
    showToast(`User "${newUser.name}" added successfully.`);
  };

  const handleStartEdit = (user) => {
    setEditingUser(user);
    setEditForm({
      name: user.name,
      email: user.email,
      role: user.role,
      assignedCenter: user.assignedCenter,
      status: user.status || 'Active',
    });
    setEditErrors({});
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    const errs = validateForm(editForm);
    if (Object.keys(errs).length > 0) {
      setEditErrors(errs);
      return;
    }

    const initials = editForm.name
      .trim()
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    setUsers(
      users.map((u) =>
        u.id === editingUser.id
          ? {
              ...u,
              name: editForm.name.trim(),
              email: editForm.email.trim(),
              role: editForm.role,
              roleType: editForm.role.includes('Head') ? 'admin' : editForm.role.includes('Coordinator') ? 'coordinator' : 'staff',
              assignedCenter: editForm.assignedCenter,
              status: editForm.status,
              initials: initials || u.initials,
            }
          : u
      )
    );

    setEditingUser(null);
    showToast(`User "${editForm.name}" updated successfully.`);
  };

  const handleConfirmDelete = () => {
    if (!deletingUser) return;
    setUsers(users.filter((u) => u.id !== deletingUser.id));
    showToast(`User "${deletingUser.name}" has been deleted.`);
    setDeletingUser(null);
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
          onClick={() => {
            setAddErrors({});
            setIsModalOpen(true);
          }}
        >
          <Plus size={18} />
          <span>Add New User</span>
        </button>
      </header>

      {/* Success Notification Banner */}
      {toastMessage && (
        <div className="vin-toast-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={18} color="#15803d" />
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            style={{ background: 'none', border: 'none', color: '#166534', cursor: 'pointer', padding: 2 }}
          >
            <X size={16} />
          </button>
        </div>
      )}

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
                    <span className={`vin-status-tag ${item.status.toLowerCase() === 'active' ? 'active' : 'inactive'}`}>
                      {item.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                      <button
                        type="button"
                        className="vin-user-row-btn edit"
                        onClick={() => handleStartEdit(item)}
                        title={`Edit ${item.name}`}
                        aria-label="Edit user"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        type="button"
                        className="vin-user-row-btn delete"
                        onClick={() => setDeletingUser(item)}
                        title={`Delete ${item.name}`}
                        aria-label="Delete user"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── ADD USER MODAL (With Form Validation) ── */}
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '14px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Maria Santos"
                  className="vin-form-input"
                  style={addErrors.name ? { borderColor: '#dc2626' } : {}}
                  value={form.name}
                  onChange={(e) => {
                    setForm({ ...form, name: e.target.value });
                    if (addErrors.name) setAddErrors({ ...addErrors, name: null });
                  }}
                />
                {addErrors.name && <span className="vin-form-error">{addErrors.name}</span>}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '14px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>Email Address *</label>
                <input
                  type="email"
                  placeholder="msantos@vinzons.gov.ph"
                  className="vin-form-input"
                  style={addErrors.email ? { borderColor: '#dc2626' } : {}}
                  value={form.email}
                  onChange={(e) => {
                    setForm({ ...form, email: e.target.value });
                    if (addErrors.email) setAddErrors({ ...addErrors, email: null });
                  }}
                />
                {addErrors.email && <span className="vin-form-error">{addErrors.email}</span>}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
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

      {/* ── EDIT USER MODAL (With Form Validation) ── */}
      {editingUser && (
        <div className="vin-modal-overlay" onClick={() => setEditingUser(null)}>
          <div className="vin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="vin-modal-head">
              <h2>Edit User Details</h2>
              <button
                type="button"
                className="vin-modal-close"
                onClick={() => setEditingUser(null)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '14px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>Full Name *</label>
                <input
                  type="text"
                  className="vin-form-input"
                  style={editErrors.name ? { borderColor: '#dc2626' } : {}}
                  value={editForm.name}
                  onChange={(e) => {
                    setEditForm({ ...editForm, name: e.target.value });
                    if (editErrors.name) setEditErrors({ ...editErrors, name: null });
                  }}
                />
                {editErrors.name && <span className="vin-form-error">{editErrors.name}</span>}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '14px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>Email Address *</label>
                <input
                  type="email"
                  className="vin-form-input"
                  style={editErrors.email ? { borderColor: '#dc2626' } : {}}
                  value={editForm.email}
                  onChange={(e) => {
                    setEditForm({ ...editForm, email: e.target.value });
                    if (editErrors.email) setEditErrors({ ...editErrors, email: null });
                  }}
                />
                {editErrors.email && <span className="vin-form-error">{editErrors.email}</span>}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>Role</label>
                <select
                  className="vin-form-select"
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                >
                  <option value="Head of MSWDO">Head of MSWDO (Admin)</option>
                  <option value="Field Coordinator">Field Coordinator</option>
                  <option value="Relief Goods Staff">Relief Goods Staff</option>
                  <option value="Evacuee Monitor">Evacuee Monitor</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>Assigned Center</label>
                <select
                  className="vin-form-select"
                  value={editForm.assignedCenter}
                  onChange={(e) => setEditForm({ ...editForm, assignedCenter: e.target.value })}
                >
                  <option value="All Centers (Command)">All Centers (Command)</option>
                  {centers.map((c) => (
                    <option key={c.id || c.displayName} value={c.displayName}>
                      {c.displayName}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '22px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>Account Status</label>
                <select
                  className="vin-form-select"
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  className="vin-btn-cancel"
                  onClick={() => setEditingUser(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="vin-btn-submit">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE USER CONFIRMATION MODAL (No native confirm popup) ── */}
      <ConfirmModal
        isOpen={Boolean(deletingUser)}
        title="Delete User"
        message={
          deletingUser
            ? `Are you sure you want to delete user "${deletingUser.name}" (${deletingUser.email})? This user will permanently lose access to the system.`
            : ''
        }
        confirmLabel="Delete User"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingUser(null)}
      />

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
