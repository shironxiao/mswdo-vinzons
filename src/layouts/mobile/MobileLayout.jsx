import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  Menu,
  X,
  WifiOff,
  User,
  FileText,
  RefreshCw,
  Settings,
  LogOut,
} from 'lucide-react';
import { MOBILE_NAV_ITEMS } from './mobileNavConfig';
import './MobileLayout.css';

export default function MobileLayout({ children }) {
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isOffline = true; // UI indicator matching screenshot

  const handleLogout = () => {
    if (confirm('Are you sure you want to log out?')) {
      navigate('/login');
    }
  };

  const handleNavigateMenu = (path) => {
    setDrawerOpen(false);
    navigate(path);
  };

  return (
    <div className="vin-mobile-root">
      <div className="vin-mobile-shell">
        {/* Sticky Mobile Topbar */}
        <header className="vin-mobile-topbar">
          <h1 className="vin-mobile-brand-title">MSWDO - Vinzons</h1>

          <div className="vin-mobile-topbar-actions">
            <div className={`vin-mobile-status-pill ${isOffline ? 'offline' : 'online'}`}>
              <WifiOff size={14} />
              <span>Offline</span>
            </div>

            <button
              type="button"
              className="vin-mobile-hamburger-btn"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open mobile menu"
            >
              <Menu size={24} />
            </button>
          </div>
        </header>

        {/* Slide-out Menu Drawer matching Screenshot 1 */}
        {drawerOpen && (
          <div
            className="vin-mobile-drawer-overlay"
            onClick={() => setDrawerOpen(false)}
          >
            <div
              className="vin-mobile-drawer"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drawer Header */}
              <div className="vin-drawer-header">
                <h2 className="vin-drawer-title">Menu</h2>
                <button
                  type="button"
                  className="vin-drawer-close-btn"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close menu"
                >
                  <X size={22} />
                </button>
              </div>

              {/* Drawer Links matching Image: Profile, Reports, Sync status, Settings */}
              <nav className="vin-drawer-nav">
                <button
                  type="button"
                  className="vin-drawer-link"
                  onClick={() => handleNavigateMenu('/mobile/profile')}
                >
                  <User size={22} color="#15803d" />
                  <span>Profile</span>
                </button>

                <button
                  type="button"
                  className="vin-drawer-link"
                  onClick={() => handleNavigateMenu('/mobile/reports')}
                >
                  <FileText size={22} color="#15803d" />
                  <span>Reports</span>
                </button>

                <button
                  type="button"
                  className="vin-drawer-link"
                  onClick={() => handleNavigateMenu('/mobile/sync-status')}
                >
                  <RefreshCw size={22} color="#15803d" />
                  <span>Sync status</span>
                </button>

                <button
                  type="button"
                  className="vin-drawer-link"
                  onClick={() => handleNavigateMenu('/mobile/settings')}
                >
                  <Settings size={22} color="#15803d" />
                  <span>Settings</span>
                </button>
              </nav>

              {/* Red-Bordered White Logout Pill Button matching Screenshot 1 */}
              <button
                type="button"
                className="vin-drawer-logout-btn"
                onClick={handleLogout}
              >
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        )}

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
    </div>
  );
}
