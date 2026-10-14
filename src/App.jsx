import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './layouts/admin/AdminLayout';
import MobileLayout from './layouts/mobile/MobileLayout';

// Admin Pages
import Dashboard from './pages/Admin/Dashboard';
import EvacuationCenter from './pages/Admin/EvacuationCenter';
import Household from './pages/Admin/Household';
import RoomPlacement from './pages/Admin/RoomPlacement';
import EvacueeMonitoring from './pages/Admin/EvacueeMonitoring';
import ReliefGoodsStubs from './pages/Admin/ReliefGoodsStubs';
import Reports from './pages/Admin/Reports';
import UserManagement from './pages/Admin/UserManagement';
import Settings from './pages/Admin/Settings';
import AdminLogin from './pages/Admin/AdminLogin';

// Mobile Pages
import MobileLogin from './pages/Mobile/MobileLogin';
import MobileDashboard from './pages/Mobile/MobileDashboard';
import MobileHouseholds from './pages/Mobile/MobileHouseholds';
import MobileCenters from './pages/Mobile/MobileCenters';
import MobileMonitor from './pages/Mobile/MobileMonitor';
import MobileProfile from './pages/Mobile/MobileProfile';
import MobileSettings from './pages/Mobile/MobileSettings';
import MobileSyncStatus from './pages/Mobile/MobileSyncStatus';
import MobileReports from './pages/Mobile/MobileReports';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Mobile Authentication */}
        <Route path="/login" element={<MobileLogin />} />

        {/* Admin Authentication */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Default Route redirecting to Mobile Login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/mobile" element={<Navigate to="/mobile/dashboard" replace />} />

        {/* ========================================================
            MOBILE LAYOUT ROUTE:
            Single source of truth for all Mobile views!
            Both Topbar, Hamburger Menu, and Bottom Navigation Bar
            are shared here. Any change automatically updates everywhere!
            ======================================================== */}
        <Route path="/mobile" element={<MobileLayout />}>
          <Route path="dashboard" element={<MobileDashboard />} />
          <Route path="households" element={<MobileHouseholds />} />
          <Route path="centers" element={<MobileCenters />} />
          <Route path="monitor" element={<MobileMonitor />} />

          {/* Hamburger Menu Destinations */}
          <Route path="profile" element={<MobileProfile />} />
          <Route path="settings" element={<MobileSettings />} />
          <Route path="sync-status" element={<MobileSyncStatus />} />
          <Route path="reports" element={<MobileReports />} />
        </Route>

        {/* ========================================================
            ADMIN LAYOUT ROUTE:
            Single source of truth for all Admin views!
            Sidebar panel is shared here.
            ======================================================== */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="evacuation-center" element={<EvacuationCenter />} />
          <Route path="household" element={<Household />} />
          <Route path="room-placement" element={<RoomPlacement />} />
          <Route path="evacuee-monitoring" element={<EvacueeMonitoring />} />
          <Route path="relief-goods-stubs" element={<ReliefGoodsStubs />} />
          <Route path="reports" element={<Reports />} />
          <Route path="user-management" element={<UserManagement />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
