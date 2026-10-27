import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building, Bell, Shield, Database, CheckCircle2, X } from 'lucide-react';
import { ConfirmModal } from '../../components/ConfirmModal.jsx';
import './Settings.css';

const DEFAULT_SETTINGS = {
  municipality: 'Vinzons',
  province: 'Camarines Norte',
  officeName: 'Municipal Social Welfare and Development Office (MSWDO)',
  officeEmail: 'mswdo.vinzons@gmail.com',
  emergencyHotline: '(054) 446-6000',
  defaultDistributionBatch: '1 Kit per Household',
  enableRealtimeAlerts: true,
  smsNotificationHead: true,
  autoBackupDaily: true,
  retentionPeriod: '90 Days',
};

export default function Settings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleReset = () => {
    setShowResetModal(true);
  };

  const handleConfirmReset = () => {
    setSettings(DEFAULT_SETTINGS);
    setShowResetModal(false);
    showToast('Workspace settings reset to defaults.');
  };

  const handleSave = (e) => {
    e.preventDefault();
    showToast('Workspace settings saved successfully!');
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  return (
    <div className="vin-settings-page">
      {/* Header matching image */}
      <header className="vin-settings-header">
        <div className="vin-settings-header-text">
          <span className="vin-settings-eyebrow">WORKSPACE CONFIGURATION</span>
          <h1 className="vin-settings-title">Settings</h1>
          <p className="vin-settings-desc">
            Keep the workspace identity and daily operating preferences aligned with MSWDO-Vinzons
          </p>
        </div>

        {/* Top Action Buttons from image */}
        <div className="vin-settings-actions">
          <button
            type="button"
            className="vin-btn-reset"
            onClick={handleReset}
          >
            Reset to Defaults
          </button>
          <button
            type="button"
            className="vin-btn-save-changes"
            onClick={handleSave}
          >
            Save Changes
          </button>
        </div>
      </header>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="vin-toast-banner" style={{ margin: '0 0 20px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={18} color="#15803d" />
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            style={{ background: 'none', border: 'none', color: '#166534', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Main Settings Card */}
      <form onSubmit={handleSave} className="vin-settings-card">
        {/* Section 1: Office & Workspace Identity */}
        <section className="vin-settings-section">
          <div className="vin-section-header">
            <Building className="vin-section-icon" size={20} />
            <div>
              <h2 className="vin-section-title">Office & Local Government Identity</h2>
              <p className="vin-section-subtitle">Official details displayed on exported situational reports and relief stubs.</p>
            </div>
          </div>

          <div className="vin-settings-grid">
            <div className="vin-settings-field">
              <label htmlFor="municipality" className="vin-field-label">Municipality</label>
              <input
                id="municipality"
                type="text"
                name="municipality"
                value={settings.municipality}
                onChange={handleChange}
                className="vin-field-input"
              />
            </div>

            <div className="vin-settings-field">
              <label htmlFor="province" className="vin-field-label">Province</label>
              <input
                id="province"
                type="text"
                name="province"
                value={settings.province}
                onChange={handleChange}
                className="vin-field-input"
              />
            </div>

            <div className="vin-settings-field">
              <label htmlFor="officeName" className="vin-field-label">Agency / Office Name</label>
              <input
                id="officeName"
                type="text"
                name="officeName"
                value={settings.officeName}
                onChange={handleChange}
                className="vin-field-input"
              />
            </div>

            <div className="vin-settings-field">
              <label htmlFor="emergencyHotline" className="vin-field-label">Emergency Operations Contact / Hotline</label>
              <input
                id="emergencyHotline"
                type="text"
                name="emergencyHotline"
                value={settings.emergencyHotline}
                onChange={handleChange}
                className="vin-field-input"
              />
            </div>
          </div>
        </section>

        {/* Section 2: Evacuation & Relief Defaults */}
        <section className="vin-settings-section">
          <div className="vin-section-header">
            <Shield className="vin-section-icon" size={20} />
            <div>
              <h2 className="vin-section-title">Evacuation & Relief Goods Policies</h2>
              <p className="vin-section-subtitle">Default calculation rules for room assignments and food pack quotas.</p>
            </div>
          </div>

          <div className="vin-settings-grid">
            <div className="vin-settings-field">
              <label htmlFor="defaultDistributionBatch" className="vin-field-label">Standard Relief Stub Ratio</label>
              <select
                id="defaultDistributionBatch"
                name="defaultDistributionBatch"
                value={settings.defaultDistributionBatch}
                onChange={handleChange}
                className="vin-field-select"
              >
                <option value="1 Kit per Household">1 Kit per Household</option>
                <option value="1 Kit per 4 Individuals">1 Kit per 4 Individuals</option>
                <option value="Individual Ration Pack">Individual Ration Pack</option>
              </select>
            </div>

            <div className="vin-settings-field">
              <label htmlFor="retentionPeriod" className="vin-field-label">Record Retention Period</label>
              <select
                id="retentionPeriod"
                name="retentionPeriod"
                value={settings.retentionPeriod}
                onChange={handleChange}
                className="vin-field-select"
              >
                <option value="30 Days">30 Days</option>
                <option value="90 Days">90 Days (Recommended)</option>
                <option value="1 Year">1 Year</option>
                <option value="Permanent Archive">Permanent Archive</option>
              </select>
            </div>
          </div>
        </section>

        {/* Section 3: Notification & Operational Alerts */}
        <section className="vin-settings-section">
          <div className="vin-section-header">
            <Bell className="vin-section-icon" size={20} />
            <div>
              <h2 className="vin-section-title">Alerts & Field Communication</h2>
              <p className="vin-section-subtitle">Real-time alerts sent to field coordinators during monitoring rounds.</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="vin-toggle-row">
              <div className="vin-toggle-info">
                <span className="vin-toggle-title">Real-time Evacuee Overcapacity Alerts</span>
                <span className="vin-toggle-desc">Notify supervisors when an evacuation room exceeds 100% capacity</span>
              </div>
              <label className="vin-switch">
                <input
                  type="checkbox"
                  name="enableRealtimeAlerts"
                  checked={settings.enableRealtimeAlerts}
                  onChange={handleChange}
                />
                <span className="vin-slider" />
              </label>
            </div>

            <div className="vin-toggle-row">
              <div className="vin-toggle-info">
                <span className="vin-toggle-title">SMS Notifications for Head of MSWDO</span>
                <span className="vin-toggle-desc">Send automated SMS summary when daily monitoring checks are completed</span>
              </div>
              <label className="vin-switch">
                <input
                  type="checkbox"
                  name="smsNotificationHead"
                  checked={settings.smsNotificationHead}
                  onChange={handleChange}
                />
                <span className="vin-slider" />
              </label>
            </div>
          </div>
        </section>

        {/* Section 4: Data Security & Backup */}
        <section className="vin-settings-section">
          <div className="vin-section-header">
            <Database className="vin-section-icon" size={20} />
            <div>
              <h2 className="vin-section-title">Data Protection & Supabase Sync</h2>
              <p className="vin-section-subtitle">Cloud database sync status and local caching policies.</p>
            </div>
          </div>

          <div className="vin-toggle-row">
            <div className="vin-toggle-info">
              <span className="vin-toggle-title">Automatic Daily Cloud Backup</span>
              <span className="vin-toggle-desc">Safely archive household registration files to Supabase cloud storage</span>
            </div>
            <label className="vin-switch">
              <input
                type="checkbox"
                name="autoBackupDaily"
                checked={settings.autoBackupDaily}
                onChange={handleChange}
              />
              <span className="vin-slider" />
            </label>
          </div>
        </section>
      </form>

      {/* Bottom Log-out button exactly as shown in screenshot 2 */}
      <footer className="vin-settings-footer">
        <button
          type="button"
          className="vin-btn-logout"
          onClick={handleLogout}
        >
          Log-out
        </button>
      </footer>

      {/* Custom Logout Confirmation Dialog */}
      <ConfirmModal
        isOpen={showLogoutModal}
        title="Sign Out"
        message="Are you sure you want to log out of MSWDO Operations?"
        confirmLabel="Log Out"
        cancelLabel="Cancel"
        variant="warning"
        onConfirm={() => {
          setShowLogoutModal(false);
          navigate('/admin/login');
        }}
        onCancel={() => setShowLogoutModal(false)}
      />

      {/* Custom Reset Confirmation Dialog */}
      <ConfirmModal
        isOpen={showResetModal}
        title="Reset Configuration"
        message="Reset all workspace configuration settings to MSWDO-Vinzons defaults? This will overwrite your current settings."
        confirmLabel="Reset Defaults"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleConfirmReset}
        onCancel={() => setShowResetModal(false)}
      />
    </div>
  );
}
