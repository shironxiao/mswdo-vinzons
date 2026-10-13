import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './layouts/admin/AdminLayout';
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
import MobileLogin from './pages/Mobile/MobileLogin';

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

        {/* Admin Layout: Single source of truth for the Sidebar panel!
            Every route inside automatically renders AdminLayout with the exact same Sidebar.
            Any modification in layouts/admin/Sidebar or AdminLayout immediately updates across ALL these pages! */}
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
