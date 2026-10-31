import { useEffect, useRef, useState } from 'react';
import { LogOut, MoreHorizontal, Settings, X } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import mswdoLogo from '../../assets/mswdo logo.png';
import { DEFAULT_ADMIN_NAV_SECTIONS } from './navConfig';
import { ConfirmModal } from '../../components/ConfirmModal.jsx';
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
  const userMenuRef = useRef(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
  const currentPath = activePath || location.pathname || '/admin/dashboard';

  useEffect(() => {
    if (!isUserMenuOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!userMenuRef.current?.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsUserMenuOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isUserMenuOpen]);

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
          <div className="vin-user-card" ref={userMenuRef}>
            <div className="vin-user-avatar">
              {user.initials || 'HM'}
            </div>
            <div className="vin-user-info">
              <span className="vin-user-name">{user.name}</span>
              <span className="vin-user-role">{user.role}</span>
            </div>
            <button
              type="button"
              className="vin-user-more-btn"
              aria-label="User account actions"
              aria-haspopup="menu"
              aria-expanded={isUserMenuOpen}
              onClick={(e) => {
                e.stopPropagation();
                setIsUserMenuOpen((isOpen) => !isOpen);
              }}
            >
              <MoreHorizontal size={18} />
            </button>
            {isUserMenuOpen && (
              <div className="vin-user-menu" role="menu" aria-label="Account actions">
                <Link
                  to="/admin/settings"
                  className="vin-user-menu-item"
                  role="menuitem"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onCloseMobile?.();
                  }}
                >
                  <Settings size={16} />
                  <span>Settings</span>
                </Link>
                <button
                  type="button"
                  className="vin-user-menu-item danger"
                  role="menuitem"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    setShowLogoutConfirmation(true);
                  }}
                >
                  <LogOut size={16} />
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
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
    </>
  );
}
