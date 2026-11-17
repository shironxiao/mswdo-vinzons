import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  Wifi,
  WifiOff,
  User,
  MapPin,
  ChevronDown,
} from 'lucide-react';
import { MOBILE_NAV_ITEMS } from './mobileNavConfig';
import { ConfirmModal } from '../../components/ConfirmModal.jsx';
import { CenterSelectSheet } from '../../components/CenterSelectSheet.jsx';
import { useMobileCenter } from '../../context/MobileCenterContext.jsx';
import mswoLogo from '../../assets/mswdo logo.png';
import './MobileLayout.css';

export default function MobileLayout({ children }) {
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const {
    centers,
    assignedCenter,
    setAssignedCenter,
    isCenterPickerOpen,
    openCenterPicker,
    closeCenterPicker,
  } = useMobileCenter();

  // Dynamic Online/Offline detector
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean'
      ? navigator.onLine
      : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="vin-mobile-root">
      <div className="vin-mobile-shell">
        {/* Sticky Mobile Topbar */}
        <header className="vin-mobile-topbar">
          <div className="vin-mobile-brand">
            <img src={mswoLogo} alt="MSWDO Logo" className="vin-mobile-brand-logo" />
            <div className="vin-mobile-brand-text">
              <h1 className="vin-mobile-brand-title">MSWDO - Vinzons</h1>
              <button
                type="button"
                className="vin-mobile-topbar-center-pill"
                onClick={openCenterPicker}
                title="Tap to switch evacuation center"
              >
                <MapPin size={11} className="vin-mobile-topbar-center-icon" />
                <span className="vin-mobile-topbar-center-name">
                  {assignedCenter || 'Select Center'}
                </span>
                <ChevronDown size={11} className="vin-mobile-topbar-center-chevron" />
              </button>
            </div>
          </div>

          <div className="vin-mobile-topbar-actions">
            <div className={`vin-mobile-status-pill ${isOnline ? 'online' : 'offline'}`}>
              {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </div>

            <button
              type="button"
              className="vin-mobile-profile-btn"
              onClick={() => navigate('/mobile/profile')}
              aria-label="Go to profile"
            >
              <User size={20} />
            </button>
          </div>
        </header>

        {/* Dynamic Page Viewport */}
        <main className="vin-mobile-content">
          {children || <Outlet />}
        </main>

        {/* Bottom Navigation Bar */}
        <nav className="vin-mobile-bottom-nav">
          {MOBILE_NAV_ITEMS.map((item) => {
            const IconComponent = item.icon;
            return (
              <NavLink
                key={item.id}
                to={item.path}
                className={({ isActive }) =>
                  `vin-mobile-nav-item ${isActive ? 'active' : ''}`
                }
              >
                <IconComponent size={20} />
                <span className="vin-mobile-nav-label">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Custom Logout Confirmation Dialog */}
      <ConfirmModal
        isOpen={showLogoutModal}
        title="Log Out"
        message="Are you sure you want to log out of your MSWDO Personnel account?"
        confirmLabel="Log Out"
        cancelLabel="Cancel"
        variant="warning"
        onConfirm={() => {
          setShowLogoutModal(false);
          navigate('/login');
        }}
        onCancel={() => setShowLogoutModal(false)}
      />

      {/* Global Evacuation Center Bottom Sheet Switcher */}
      {isCenterPickerOpen && (
        <CenterSelectSheet
          selected={assignedCenter}
          centersList={centers}
          onSelect={(centerName) => setAssignedCenter(centerName)}
          onClose={closeCenterPicker}
          showAllOption={true}
          allCentersLabel="All Centers"
          allCentersSub="Show records across all 27 evacuation centers"
        />
      )}
    </div>
  );
}
