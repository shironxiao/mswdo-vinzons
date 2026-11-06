import { useEffect, useRef, useState } from 'react';
import {
  LogOut,
  MoreHorizontal,
  Settings,
  X,
  User,
  Mail,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import mswdoLogo from '../../assets/mswdo logo.png';
import { DEFAULT_ADMIN_NAV_SECTIONS } from './navConfig';
import { ConfirmModal } from '../../components/ConfirmModal.jsx';
import { supabase } from '../../lib/supabase.js';
import './Sidebar.css';

/**
 * Reusable Sidebar / Side Panel component for MSWDO Operations.
 *
 * @param {Object} props
 * @param {Array} [props.sections] - Custom navigation sections. Defaults to DEFAULT_ADMIN_NAV_SECTIONS.
 * @param {string} [props.activePath] - Optional override for the current active path/route.
 * @param {Function} [props.onNavigate] - Callback invoked when a navigation link is clicked.
 * @param {boolean} [props.mobileOpen] - Controls mobile drawer open state.
 * @param {Function} [props.onCloseMobile] - Callback when closing mobile drawer.
 * @param {Object} [props.user] - User profile details { initials, name, role }.
 * @param {Object} [props.brand] - Brand information { name, subtitle, href }.
 * @param {string} [props.className] - Additional CSS class names.
 */
export default function Sidebar({
  sections = DEFAULT_ADMIN_NAV_SECTIONS,
  activePath,
  onNavigate,
  mobileOpen = false,
  onCloseMobile,
  user = {
    initials: 'HM',
    name: 'Head of MSWDO',
    role: 'Vinzons, Camarines Norte',
  },
  brand = {
    name: 'Vinzons.',
    subtitle: 'MSWDO OPERATIONS',
    href: '/admin/dashboard',
  },
  className = '',
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [popupDialog, setPopupDialog] = useState(null);

  // Admin Account state from localStorage
  const [adminAccount, setAdminAccount] = useState(() => {
    try {
      const saved = localStorage.getItem('mswdo_admin_account');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {
      initials: 'HM',
      name: user.name || 'Head of MSWDO',
      fullName: 'Ronald Augorio',
      role: 'MSWD Officer',
      email: 'aaugorio@gmail.com',
      password: 'password123',
    };
  });

  // Password & Profile editing form state
  const [profileForm, setProfileForm] = useState({
    fullName: adminAccount.fullName || 'Ronald Augorio',
    email: adminAccount.email || 'aaugorio@gmail.com',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const currentPath = activePath || location.pathname || '/admin/dashboard';

  const handleOpenProfileModal = () => {
    setProfileForm({
      fullName: adminAccount.fullName || 'Ronald Augorio',
      email: adminAccount.email || 'aaugorio@gmail.com',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setProfileFeedback(null);
    setShowProfileModal(true);
  };

  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    setProfileFeedback(null);

    // Validate email
    if (!profileForm.email?.trim()) {
      setPopupDialog({
        type: 'error',
        title: 'Validation Error',
        message: 'Admin email address is required.',
      });
      return;
    }

    const activeSavedPassword = adminAccount.password || 'password123';
    if (!profileForm.currentPassword) {
      setPopupDialog({
        type: 'error',
        title: 'Verification Required',
        message: 'Please enter your current password to verify your identity before saving admin information.',
      });
      return;
    }

    if (profileForm.currentPassword !== activeSavedPassword) {
      setPopupDialog({
        type: 'error',
        title: 'Incorrect Current Password',
        message: 'The current password you entered is incorrect. Please check and try again.',
      });
      return;
    }

    const isChangingPassword = Boolean(profileForm.newPassword || profileForm.confirmPassword);

    if (isChangingPassword) {
      if (!profileForm.newPassword) {
        setPopupDialog({
          type: 'error',
          title: 'Validation Error',
          message: 'Please enter a new password.',
        });
        return;
      }

      if (profileForm.newPassword.length < 6) {
        setPopupDialog({
          type: 'error',
          title: 'Validation Error',
          message: 'New password must be at least 6 characters long.',
        });
        return;
      }

      if (profileForm.newPassword !== profileForm.confirmPassword) {
        setPopupDialog({
          type: 'error',
          title: 'Validation Error',
          message: 'New password and confirm password do not match.',
        });
        return;
      }

      if (profileForm.newPassword === profileForm.currentPassword) {
        setPopupDialog({
          type: 'error',
          title: 'Validation Error',
          message: 'New password cannot be the same as your current password.',
        });
        return;
      }
    }

    setIsSavingProfile(true);
    try {
      // If updating password, attempt to sync with Supabase auth session if present
      if (isChangingPassword && profileForm.newPassword) {
        try {
          const { error } = await supabase.auth.updateUser({
            password: profileForm.newPassword,
          });
          if (error) console.warn('Supabase auth notice:', error.message);
        } catch (authErr) {
          console.warn('Supabase auth update fallback:', authErr);
        }
      }

      // Update local storage and component state
      const updatedAccount = {
        ...adminAccount,
        fullName: profileForm.fullName.trim() || adminAccount.fullName,
        email: profileForm.email.trim(),
        ...(isChangingPassword && profileForm.newPassword
          ? { password: profileForm.newPassword }
          : { password: adminAccount.password || 'password123' }),
      };

      setAdminAccount(updatedAccount);
      localStorage.setItem('mswdo_admin_account', JSON.stringify(updatedAccount));

      // Clear password fields and close modal
      setProfileForm((prev) => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
      setShowProfileModal(false);

      // Trigger centered pop-up dialog message
      setPopupDialog({
        type: 'success',
        title: 'Admin Information Updated',
        message: isChangingPassword
          ? 'Administrator credentials & password updated successfully!'
          : 'Administrator information saved successfully!',
      });
    } catch (err) {
      const errorMsg = err?.message || 'Could not update profile information.';
      setPopupDialog({
        type: 'error',
        title: 'Update Failed',
        message: errorMsg,
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleItemClick = (item, e) => {
    if (onNavigate) {
      onNavigate(item, e);
    }
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* Mobile Overlay Backdrop */}
      <div
        className={`vin-sidebar-backdrop ${mobileOpen ? 'active' : ''}`}
        onClick={onCloseMobile}
        aria-hidden="true"
      />

      <aside className={`vin-sidebar ${mobileOpen ? 'mobile-open' : ''} ${className}`}>
        {/* Brand Header */}
        <div className="vin-sidebar-header">
          <Link
            to={brand.href || '/admin/dashboard'}
            className="vin-sidebar-brand"
            onClick={(e) => handleItemClick({ path: brand.href }, e)}
          >
            <div className="vin-sidebar-logo-box">
              <img src={brand.logo || mswdoLogo} alt="MSWDO Logo" className="vin-sidebar-logo" />
            </div>
            <div className="vin-sidebar-brand-text">
              <span className="vin-brand-title">{brand.name}</span>
              <span className="vin-brand-subtitle">{brand.subtitle}</span>
            </div>
          </Link>

          {onCloseMobile && (
            <button
              type="button"
              className="vin-sidebar-close-btn"
              onClick={onCloseMobile}
              aria-label="Close navigation"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Navigation Sections */}
        <nav className="vin-sidebar-nav">
          {sections.map((section) => (
            <div key={section.id} className="vin-nav-group">
              {section.title && (
                <div className="vin-nav-label">{section.title}</div>
              )}
              {section.items.map((item) => {
                const IconComponent = item.icon;
                const isActive =
                  currentPath === item.path ||
                  (item.path !== '/admin/dashboard' && currentPath.startsWith(item.path));

                return (
                  <Link
                    key={item.id}
                    to={item.path}
                    className={`vin-nav-item ${isActive ? 'active' : ''}`}
                    onClick={(e) => handleItemClick(item, e)}
                  >
                    {IconComponent && <IconComponent className="vin-nav-icon" size={19} />}
                    <span className="vin-nav-text">{item.label}</span>
                    {item.badge && <span className="vin-nav-badge">{item.badge}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Bottom User Profile */}
        <div className="vin-sidebar-footer">
          <div
            className="vin-user-card clickable"
            onClick={handleOpenProfileModal}
            role="button"
            tabIndex={0}
            title="Click to view Admin Info & change password"
          >
            <div className="vin-user-avatar">
              {adminAccount.initials || user.initials || 'HM'}
            </div>
            <div className="vin-user-info">
              <span className="vin-user-name">{adminAccount.name || user.name}</span>
              <span className="vin-user-role">{adminAccount.role || user.role}</span>
            </div>
            <button
              type="button"
              className="vin-user-more-btn"
              aria-label="User account actions"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenProfileModal();
              }}
            >
              <MoreHorizontal size={18} />
            </button>
          </div>

          {/* Dedicated Sidebar Logout Button */}
          <button
            type="button"
            className="vin-sidebar-logout-btn"
            onClick={() => setShowLogoutConfirmation(true)}
            title="Sign out of Admin Operations"
          >
            <LogOut size={16} />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* ── Admin Information & Change Password Modal (Center Panel) ── */}
      {showProfileModal && (
        <div className="vin-admin-profile-modal-overlay" onClick={() => setShowProfileModal(false)}>
          <div className="vin-admin-profile-modal" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="vin-admin-profile-header">
              <div className="vin-admin-profile-title-group">
                <h2 className="vin-admin-profile-title">
                  <ShieldCheck size={20} color="#7c3aed" />
                  Admin Account Information
                </h2>
                <p className="vin-admin-profile-subtitle">
                  MSWDO Command and Operations Administrator Credentials
                </p>
              </div>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveProfile} className="vin-admin-profile-body" autoComplete="off">
              {/* User Avatar Card */}
              <div className="vin-admin-profile-card">
                <div className="vin-admin-profile-avatar">
                  {adminAccount.initials || 'HM'}
                </div>
                <div className="vin-admin-profile-info">
                  <span className="vin-admin-profile-name">
                    {profileForm.fullName || adminAccount.name}
                  </span>
                  <span className="vin-admin-profile-role-badge">
                    {adminAccount.role || 'MSWD Officer'} • System Administrator
                  </span>
                </div>
              </div>

              {/* Feedback Alert */}
              {profileFeedback && (
                <div className={`vin-admin-profile-feedback ${profileFeedback.type}`} role="alert">
                  {profileFeedback.type === 'success' ? (
                    <CheckCircle2 size={16} color="#7c3aed" />
                  ) : (
                    <AlertCircle size={16} color="#dc2626" />
                  )}
                  <span>{profileFeedback.message}</span>
                </div>
              )}

              {/* Email Address */}
              <div className="vin-admin-profile-group">
                <label className="vin-admin-profile-label" htmlFor="admin-email">
                  Admin Email Address
                </label>
                <div className="vin-admin-profile-input-wrap">
                  <Mail size={17} color="#7c3aed" />
                  <input
                    id="admin-email"
                    type="email"
                    className="vin-admin-profile-input"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    placeholder="admin@vinzons.gov.ph"
                    required
                  />
                </div>
              </div>

              {/* Full Name */}
              <div className="vin-admin-profile-group">
                <label className="vin-admin-profile-label" htmlFor="admin-fullname">
                  Administrator Name
                </label>
                <div className="vin-admin-profile-input-wrap">
                  <User size={17} color="#7c3aed" />
                  <input
                    id="admin-fullname"
                    type="text"
                    className="vin-admin-profile-input"
                    value={profileForm.fullName}
                    onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                    placeholder="Ronald Augorio"
                  />
                </div>
              </div>

              <div className="vin-admin-profile-divider" />

              {/* Password Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span className="vin-admin-profile-label" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6b21a8' }}>
                  <KeyRound size={15} />
                  Change Password
                </span>

                {/* Current Password for verification */}
                <div className="vin-admin-profile-group">
                  <label className="vin-admin-profile-label" htmlFor="admin-current-password">
                    Current Password <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div className="vin-admin-profile-input-wrap">
                    <Lock size={17} color="#7c3aed" />
                    <input
                      id="admin-current-password"
                      type={showCurrentPassword ? 'text' : 'password'}
                      className="vin-admin-profile-input"
                      value={profileForm.currentPassword}
                      onChange={(e) => setProfileForm({ ...profileForm, currentPassword: e.target.value })}
                      placeholder="Enter current password to verify"
                      autoComplete="off"
                      name="admin-password-verification"
                      required
                    />
                    <button
                      type="button"
                      className="vin-admin-eye-toggle"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                    >
                      {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div className="vin-admin-profile-group">
                  <label className="vin-admin-profile-label" htmlFor="admin-new-password">
                    New Password
                  </label>
                  <div className="vin-admin-profile-input-wrap">
                    <Lock size={17} color="#7c3aed" />
                    <input
                      id="admin-new-password"
                      type={showNewPassword ? 'text' : 'password'}
                      className="vin-admin-profile-input"
                      value={profileForm.newPassword}
                      onChange={(e) => setProfileForm({ ...profileForm, newPassword: e.target.value })}
                      placeholder="Enter new password (min. 6 characters)"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="vin-admin-eye-toggle"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="vin-admin-profile-group">
                  <label className="vin-admin-profile-label" htmlFor="admin-confirm-password">
                    Confirm New Password
                  </label>
                  <div className="vin-admin-profile-input-wrap">
                    <Lock size={17} color="#7c3aed" />
                    <input
                      id="admin-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      className="vin-admin-profile-input"
                      value={profileForm.confirmPassword}
                      onChange={(e) => setProfileForm({ ...profileForm, confirmPassword: e.target.value })}
                      placeholder="Confirm new password"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="vin-admin-eye-toggle"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Modal Footer Buttons */}
              <div className="vin-admin-profile-footer">
                <button
                  type="button"
                  className="vin-btn-cancel"
                  onClick={() => setShowProfileModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="vin-admin-btn-save-profile"
                  disabled={isSavingProfile}
                >
                  {isSavingProfile ? 'Saving Changes…' : 'Save & Update Credentials'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Logout Confirmation Dialog */}
      <ConfirmModal
        isOpen={showLogoutConfirmation}
        title="Sign Out"
        message="Are you sure you want to log out of MSWDO Operations?"
        confirmLabel="Log Out"
        cancelLabel="Cancel"
        variant="warning"
        onConfirm={() => {
          setShowLogoutConfirmation(false);
          navigate('/admin/login');
        }}
        onCancel={() => setShowLogoutConfirmation(false)}
      />

      {/* ── Pop-up Dialog Message (Modal Alert Dialog) ── */}
      {popupDialog && (
        <div className="vin-dialog-overlay" onClick={() => setPopupDialog(null)}>
          <div className="vin-dialog-card" onClick={(e) => e.stopPropagation()}>
            <div className={`vin-dialog-icon-wrap ${popupDialog.type}`}>
              {popupDialog.type === 'error' ? (
                <AlertCircle size={32} />
              ) : (
                <CheckCircle2 size={32} />
              )}
            </div>
            <h3 className="vin-dialog-title">{popupDialog.title}</h3>
            <p className="vin-dialog-message">{popupDialog.message}</p>
            <button
              type="button"
              className={`vin-dialog-btn ${popupDialog.type}`}
              onClick={() => setPopupDialog(null)}
              autoFocus
            >
              OK
            </button>
          </div>
        </div>
      )}
    </>
  );
}
