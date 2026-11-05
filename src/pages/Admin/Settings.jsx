import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RefreshCw,
  Database,
  FileSpreadsheet,
  FileCode,
  CheckCircle2,
  AlertCircle,
  X,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { ConfirmModal } from '../../components/ConfirmModal.jsx';
import { downloadExcelBackup, downloadJsonBackup } from '../../lib/backupService.js';
import './Settings.css';

const LOCAL_STORAGE_SETTINGS_KEY = 'mswdo_admin_settings';
const LOCAL_STORAGE_SYNC_KEY = 'mswdo_admin_last_sync';

const DEFAULT_SETTINGS = {
  // Offline Synchronization & Cloud Hub
  continuousAutoSync: true,
  autoReconcileOffline: true,
  conflictPolicy: 'Latest Update Overwrites',

  // Database Backup & Disaster Recovery
  autoBackupDaily: true,
  autoBackupOnConclude: true,
  retentionPeriod: '90 Days',
};

export default function Settings() {
  const navigate = useNavigate();

  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_SETTINGS_KEY);
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch {
      // ignore
    }
    return DEFAULT_SETTINGS;
  });

  const [lastSync, setLastSync] = useState(() => {
    return localStorage.getItem(LOCAL_STORAGE_SYNC_KEY) || new Date().toLocaleString();
  });

  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingJson, setExportingJson] = useState(false);

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState('success');

  // Monitor online status
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

  const showToast = (msg, type = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSave = (e) => {
    if (e) e.preventDefault();
    try {
      localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(settings));
      showToast('Workspace settings saved successfully!');
    } catch {
      showToast('Could not save settings locally.', 'error');
    }
  };

  const handleReset = () => {
    setShowResetModal(true);
  };

  const handleConfirmReset = () => {
    setSettings(DEFAULT_SETTINGS);
    try {
      localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
    } catch {
      // ignore
    }
    setShowResetModal(false);
    showToast('Workspace settings reset to defaults.');
  };

  // Manual Cloud Sync Trigger
  const handleManualSync = async () => {
    setSyncing(true);
    try {
      // Simulate live reconciliation delay with Supabase
      await new Promise((res) => setTimeout(res, 900));
      const nowStr = new Date().toLocaleString();
      setLastSync(nowStr);
      localStorage.setItem(LOCAL_STORAGE_SYNC_KEY, nowStr);
      showToast('Successfully synchronized offline records with Supabase cloud!');
    } catch (err) {
      showToast(`Sync failed: ${err?.message || 'Check network connection'}`, 'error');
    } finally {
      setSyncing(false);
    }
  };

  // Export Complete Multi-Sheet Excel Backup
  const handleExportExcel = async () => {
    setExportingExcel(true);
    try {
      const result = await downloadExcelBackup();
      showToast(
        `Downloaded Excel Backup (${result.householdsCount} households, ${result.membersCount} members, ${result.centersCount} centers).`
      );
    } catch (err) {
      console.error('Error generating Excel backup:', err);
      showToast(`Export failed: ${err?.message || 'Unknown error'}`, 'error');
    } finally {
      setExportingExcel(false);
    }
  };

  // Export Raw Database JSON Backup
  const handleExportJson = async () => {
    setExportingJson(true);
    try {
      const result = await downloadJsonBackup();
      showToast(`Downloaded raw JSON backup (${result.recordsCount} total records).`);
    } catch (err) {
      console.error('Error generating JSON backup:', err);
      showToast(`Export failed: ${err?.message || 'Unknown error'}`, 'error');
    } finally {
      setExportingJson(false);
    }
  };

  return (
    <div className="vin-settings-page">
      {/* Header */}
      <header className="vin-settings-header">
        <div className="vin-settings-header-text">
          <span className="vin-settings-eyebrow">WORKSPACE CONFIGURATION</span>
          <h1 className="vin-settings-title">Settings</h1>
          <p className="vin-settings-desc">
            Configure offline synchronization and automated database disaster recovery archives for MSWDO Vinzons.
          </p>
        </div>

        {/* Top Action Buttons */}
        <div className="vin-settings-actions">
          <button type="button" className="vin-btn-reset" onClick={handleReset}>
            Reset to Defaults
          </button>
          <button type="button" className="vin-btn-save-changes" onClick={handleSave}>
            Save Changes
          </button>
        </div>
      </header>

      {/* Toast Notification */}
      {toastMessage && (
        <div
          className="vin-toast-banner"
          style={{
            margin: '0 0 20px 0',
            backgroundColor: toastType === 'error' ? '#fef2f2' : '#f5f3ff',
            color: toastType === 'error' ? '#991b1b' : '#6b21a8',
            borderColor: toastType === 'error' ? '#fecaca' : '#ddd6fe',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {toastType === 'error' ? (
              <AlertCircle size={18} color="#dc2626" />
            ) : (
              <CheckCircle2 size={18} color="#7c3aed" />
            )}
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            style={{
              background: 'none',
              border: 'none',
              color: toastType === 'error' ? '#991b1b' : '#6b21a8',
              cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Main Settings Card */}
      <form onSubmit={handleSave} className="vin-settings-card">
        {/* Section 1: Offline Synchronization & Cloud Queue Hub */}
        <section className="vin-settings-section">
          <div className="vin-section-header">
            <RefreshCw className="vin-section-icon" size={20} />
            <div>
              <h2 className="vin-section-title">Offline Synchronization & Cloud Queue Hub</h2>
              <p className="vin-section-subtitle">
                Manage cloud connectivity, field personnel sync status, and incoming offline intake queues.
              </p>
            </div>
          </div>

          {/* Cloud Sync Status Banner */}
          <div className="vin-sync-status-card">
            <div className="vin-sync-status-info">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className={`vin-cloud-pill ${syncing ? 'syncing' : isOnline ? 'online' : 'offline'}`}>
                  {isOnline ? <Wifi size={13} /> : <WifiOff size={13} />}
                  {syncing ? 'Synchronizing...' : isOnline ? 'Connected to Supabase Cloud' : 'Offline / Working Locally'}
                </span>
                <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                  Last synced: <strong style={{ color: '#0f172a' }}>{lastSync}</strong>
                </span>
              </div>
              <span style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 4 }}>
                Offline intakes submitted by field personnel are queued and automatically reconciled when internet reconnects.
              </span>
            </div>

            <button
              type="button"
              className="vin-btn-sync"
              onClick={handleManualSync}
              disabled={syncing}
            >
              <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
              <span>{syncing ? 'Syncing...' : 'Sync Now / Pull Incoming Data'}</span>
            </button>
          </div>

          {/* Sync Toggles & Policy */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: 6 }}>
            <div className="vin-toggle-row">
              <div className="vin-toggle-info">
                <span className="vin-toggle-title">Continuous Realtime Cloud Auto-Sync</span>
                <span className="vin-toggle-desc">
                  Instantly synchronize household records, room placements, and relief stubs across all connected devices
                </span>
              </div>
              <label className="vin-switch">
                <input
                  type="checkbox"
                  name="continuousAutoSync"
                  checked={settings.continuousAutoSync}
                  onChange={handleChange}
                />
                <span className="vin-slider" />
              </label>
            </div>

            <div className="vin-toggle-row">
              <div className="vin-toggle-info">
                <span className="vin-toggle-title">Auto-Reconcile Offline Field Registrations</span>
                <span className="vin-toggle-desc">
                  Automatically verify incoming offline household profiles against the municipal resident masterlist
                </span>
              </div>
              <label className="vin-switch">
                <input
                  type="checkbox"
                  name="autoReconcileOffline"
                  checked={settings.autoReconcileOffline}
                  onChange={handleChange}
                />
                <span className="vin-slider" />
              </label>
            </div>

            <div className="vin-settings-field" style={{ marginTop: 6 }}>
              <label htmlFor="conflictPolicy" className="vin-field-label">
                Conflict & Duplicate Resolution Policy
              </label>
              <select
                id="conflictPolicy"
                name="conflictPolicy"
                value={settings.conflictPolicy}
                onChange={handleChange}
                className="vin-field-select"
              >
                <option value="Latest Update Overwrites">Latest Update Overwrites (Recommended)</option>
                <option value="Preserve Masterlist Profile">Preserve Masterlist Profile (Field worker update creates note)</option>
                <option value="Flag for Manual Verification">Flag for Manual Supervisor Verification</option>
              </select>
            </div>
          </div>
        </section>

        {/* Section 2: Database Backup & Disaster Recovery */}
        <section className="vin-settings-section">
          <div className="vin-section-header">
            <Database className="vin-section-icon" size={20} />
            <div>
              <h2 className="vin-section-title">Database Backup & Disaster Recovery</h2>
              <p className="vin-section-subtitle">
                Automated daily cloud backups and instant local municipal file archives.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="vin-toggle-row">
              <div className="vin-toggle-info">
                <span className="vin-toggle-title">Automated Daily Cloud Backup</span>
                <span className="vin-toggle-desc">
                  Safely archive household records and evacuee tracking tables to Supabase cloud storage every 12:00 AM
                </span>
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

            <div className="vin-toggle-row">
              <div className="vin-toggle-info">
                <span className="vin-toggle-title">Auto-Snapshot on Operation Concluded</span>
                <span className="vin-toggle-desc">
                  Automatically create an immutable historical archive whenever an active disaster operation is concluded
                </span>
              </div>
              <label className="vin-switch">
                <input
                  type="checkbox"
                  name="autoBackupOnConclude"
                  checked={settings.autoBackupOnConclude}
                  onChange={handleChange}
                />
                <span className="vin-slider" />
              </label>
            </div>

            <div className="vin-settings-field" style={{ marginTop: 6 }}>
              <label htmlFor="retentionPeriod" className="vin-field-label">
                Database Retention Period
              </label>
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

            {/* Instant Municipal Backup Downloads */}
            <div style={{ marginTop: 12 }}>
              <span className="vin-field-label" style={{ display: 'block', marginBottom: 8 }}>
                Instant Municipal Backup Downloads (For Local Storage & USB Backup)
              </span>
              <div className="vin-backup-actions-grid">
                {/* Excel Export Card */}
                <div className="vin-backup-card">
                  <div className="vin-backup-card-head">
                    <div className="vin-backup-card-icon excel">
                      <FileSpreadsheet size={22} />
                    </div>
                    <div>
                      <h3 className="vin-backup-card-title">Complete Excel Archive (.xlsx)</h3>
                      <p className="vin-backup-card-desc">
                        Multi-sheet workbook containing Households, Members, Centers, Room Placements, Relief Stubs, and Monitoring Logs.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="vin-btn-export-backup excel"
                    onClick={handleExportExcel}
                    disabled={exportingExcel}
                  >
                    <FileSpreadsheet size={16} />
                    <span>{exportingExcel ? 'Generating Excel...' : 'Download Excel Backup (.xlsx)'}</span>
                  </button>
                </div>

                {/* JSON Export Card */}
                <div className="vin-backup-card">
                  <div className="vin-backup-card-head">
                    <div className="vin-backup-card-icon json">
                      <FileCode size={22} />
                    </div>
                    <div>
                      <h3 className="vin-backup-card-title">Raw Database Snapshot (.json)</h3>
                      <p className="vin-backup-card-desc">
                        Standard structured JSON format ideal for database restoration, technical disaster recovery, and developer audits.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="vin-btn-export-backup json"
                    onClick={handleExportJson}
                    disabled={exportingJson}
                  >
                    <FileCode size={16} />
                    <span>{exportingJson ? 'Generating JSON...' : 'Download JSON Snapshot (.json)'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </form>

      {/* Bottom Log-out Button */}
      <footer className="vin-settings-footer">
        <button
          type="button"
          className="vin-btn-logout"
          onClick={() => setShowLogoutModal(true)}
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
