import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Search, Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import './AdminLayout.css';

/**
 * Reusable AdminLayout with sidebar navigation and responsive topbar.
 *
 * Can be used as a router layout route (`<Route element={<AdminLayout />} />`)
 * or as a page wrapper component (`<AdminLayout>{children}</AdminLayout>`).
 *
 * @param {Object} props
 * @param {React.ReactNode} [props.children] - Page content when used as a component wrapper.
 * @param {Object} [props.sidebarProps] - Custom props forwarded to the Sidebar component.
 * @param {string} [props.searchPlaceholder="Search records"] - Placeholder text for top search bar.
 * @param {Function} [props.onSearch] - Search handler callback (e.g., query => ...).
 * @param {React.ReactNode} [props.topbarLeft] - Optional custom node on top left.
 * @param {React.ReactNode} [props.topbarRight] - Optional custom node next to search.
 * @param {string} [props.className] - Additional class names.
 */
export default function AdminLayout({
  children,
  sidebarProps = {},
  searchPlaceholder = 'Search records',
  onSearch,
  topbarLeft,
  topbarRight,
  className = '',
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (onSearch) {
      onSearch(query);
    }
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter' && onSearch) {
      onSearch(searchQuery);
    }
  };

  return (
    <div className={`vin-admin-layout ${className}`}>
      {/* Reusable Side Panel */}
      <Sidebar
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        {...sidebarProps}
      />

      {/* Main Content Area */}
      <div className="vin-admin-main">
        {/* Topbar with Search */}
        <header className="vin-admin-topbar">
          <div className="vin-admin-topbar-left">
            <button
              type="button"
              className="vin-mobile-menu-btn"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu size={20} />
            </button>
            {topbarLeft}
          </div>

          <div className="vin-admin-topbar-right">
            <div className="vin-search-container">
              <Search className="vin-search-icon" size={16} />
              <input
                type="text"
                className="vin-search-input"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={handleSearchKeyDown}
                aria-label={searchPlaceholder}
              />
            </div>
            {topbarRight}
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="vin-admin-content">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
}
