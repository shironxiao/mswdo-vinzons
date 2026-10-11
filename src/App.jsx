import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './layouts/admin/AdminLayout';
import Dashboard from './pages/Admin/Dashboard';
import EvacuationCenter from './pages/Admin/EvacuationCenter';

// Simple placeholder page for demoing navigation
function PlaceholderPage({ title }) {
  return (
    <div style={{ padding: '24px', background: '#ffffff', borderRadius: '16px', border: '1px solid #e7ece9' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 8px 0', color: '#0f172a' }}>{title}</h2>
      <p style={{ color: '#64748b', margin: 0 }}>This page is part of MSWDO Operations navigation.</p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Redirect root to Admin Dashboard */}
        <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

        {/* Admin Layout & Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="evacuation-center" element={<EvacuationCenter />} />
          <Route path="household" element={<PlaceholderPage title="Household Management" />} />
          <Route path="room-placement" element={<PlaceholderPage title="Room Placement" />} />
          <Route path="evacuee-monitoring" element={<PlaceholderPage title="Evacuee Monitoring" />} />
          <Route path="relief-goods-stubs" element={<PlaceholderPage title="Relief Goods Stubs" />} />
          <Route path="reports" element={<PlaceholderPage title="Reports" />} />
          <Route path="user-management" element={<PlaceholderPage title="User Management" />} />
          <Route path="settings" element={<PlaceholderPage title="Settings" />} />
        </Route>

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
