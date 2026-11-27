import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { EventProvider } from './context/EventContext.jsx';
import { MobileCenterProvider } from './context/MobileCenterContext.jsx';
import PWAInstallBanner from './components/PWAInstallBanner';

// Layouts (lazy-loaded so Mobile users never parse AdminLayout & vice versa)
const AdminLayout = lazy(() => import('./layouts/admin/AdminLayout'));
const MobileLayout = lazy(() => import('./layouts/mobile/MobileLayout'));

// Admin Pages (lazy-loaded chunks)
const Dashboard = lazy(() => import('./pages/Admin/Dashboard'));
const EvacuationCenter = lazy(() => import('./pages/Admin/EvacuationCenter'));
const BarangayEvacuationAssignments = lazy(() => import('./pages/Admin/BarangayEvacuationAssignments'));
const Household = lazy(() => import('./pages/Admin/Household'));
const RoomPlacement = lazy(() => import('./pages/Admin/RoomPlacement'));
const EvacueeMonitoring = lazy(() => import('./pages/Admin/EvacueeMonitoring'));
const ReliefGoodsStubs = lazy(() => import('./pages/Admin/ReliefGoodsStubs'));
const Reports = lazy(() => import('./pages/Admin/Reports'));
const UserManagement = lazy(() => import('./pages/Admin/UserManagement'));
const Settings = lazy(() => import('./pages/Admin/Settings'));
const AdminLogin = lazy(() => import('./pages/Admin/AdminLogin'));

// Mobile Pages (lazy-loaded chunks)
const MobileLogin = lazy(() => import('./pages/Mobile/MobileLogin'));
const MobileCenterSelect = lazy(() => import('./pages/Mobile/MobileCenterSelect'));
const MobileDashboard = lazy(() => import('./pages/Mobile/MobileDashboard'));
const MobileHouseholds = lazy(() => import('./pages/Mobile/MobileHouseholds'));
const MobileCenters = lazy(() => import('./pages/Mobile/MobileCenters'));
const MobileMonitor = lazy(() => import('./pages/Mobile/MobileMonitor'));
const MobileProfile = lazy(() => import('./pages/Mobile/MobileProfile'));
const MobileSettings = lazy(() => import('./pages/Mobile/MobileSettings'));
const MobileSyncStatus = lazy(() => import('./pages/Mobile/MobileSyncStatus'));
const MobileReports = lazy(() => import('./pages/Mobile/MobileReports'));

function RouteLoader() {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#6b21a8',
        fontWeight: 600,
        fontSize: '0.95rem',
        backgroundColor: '#f8fafc',
      }}
    >
      Loading...
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteLoader />}>
        <Routes>
          {/* Mobile Authentication */}
          <Route path="/login" element={<MobileLogin />} />

          {/* Admin Authentication */}
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Default Route redirecting to Mobile Login */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/mobile" element={<Navigate to="/mobile/dashboard" replace />} />

          {/* Post-login Evacuation Center Selection Screen */}
          <Route
            path="/mobile/select-center"
            element={
              <MobileCenterProvider>
                <MobileCenterSelect />
              </MobileCenterProvider>
            }
          />

          {/* ========================================================
              MOBILE LAYOUT ROUTE:
              Single source of truth for all Mobile views!
              ======================================================== */}
          <Route
            path="/mobile"
            element={
              <MobileCenterProvider>
                <MobileLayout />
              </MobileCenterProvider>
            }
          >
            <Route path="dashboard" element={<MobileDashboard />} />
            <Route path="households" element={<MobileHouseholds />} />
            <Route path="centers" element={<MobileCenters />} />
            <Route path="monitor" element={<MobileMonitor />} />
            <Route path="relief" element={<Navigate to="/mobile/households" replace />} />

            {/* Hamburger Menu Destinations */}
            <Route path="profile" element={<MobileProfile />} />
            <Route path="settings" element={<MobileSettings />} />
            <Route path="sync-status" element={<MobileSyncStatus />} />
            <Route path="reports" element={<MobileReports />} />
          </Route>

          {/* ========================================================
              ADMIN LAYOUT ROUTE:
              Single source of truth for all Admin views!
              ======================================================== */}
          <Route path="/admin" element={<EventProvider><AdminLayout /></EventProvider>}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="evacuation-center" element={<EvacuationCenter />} />
            <Route path="barangay-assignments" element={<BarangayEvacuationAssignments />} />
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
      </Suspense>
      <PWAInstallBanner />
    </BrowserRouter>
  );
}
