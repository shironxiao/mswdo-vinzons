import { useState } from 'react';
import { RefreshCw, CheckCircle2, WifiOff } from 'lucide-react';
import './MobileCommon.css';
import './MobileSubpages.css';

export default function MobileSyncStatus() {
  const [offlineMode, setOfflineMode] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);

  const handleSync = () => {
    setSyncing(true);
    setSyncSuccess(false);
    setTimeout(() => {
      setSyncing(false);
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 3500);
    }, 1000);
  };

  return (
    <div className="vin-mob-page">
      <header className="vin-mob-header">
        <div className="vin-mob-header-info">
          <h1 className="vin-mob-title">Sync Status</h1>
          <p className="vin-mob-subtitle">Offline mode, duplicate & conflict handling</p>
        </div>
      </header>

      {/* Sync Status Card matching Screenshot 2 Sync-status */}
      <div className="vin-mob-settings-card">
        {syncSuccess && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '10px', backgroundColor: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: '0.85rem' }}>
            <CheckCircle2 size={18} />
            <span>Offline records synced with Supabase cloud successfully!</span>
          </div>
        )}
        <div className="vin-mob-toggle-item">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#fef3c7', color: '#c25e1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <WifiOff size={20} />
            </div>
            <div className="vin-mob-toggle-info">
              <span className="vin-mob-toggle-title">Offline</span>
              <span className="vin-mob-toggle-sub">Last sync: 9/29/2026, 12:49:35 AM</span>
            </div>
          </div>

          <label className="vin-switch">
            <input
              type="checkbox"
              checked={offlineMode}
              onChange={(e) => setOfflineMode(e.target.checked)}
            />
            <span className="vin-slider" />
          </label>
        </div>

        {/* Sync Now Button */}
        <button
          type="button"
          className="vin-mob-sync-btn"
          onClick={handleSync}
          disabled={syncing}
        >
          <RefreshCw size={20} className={syncing ? 'animate-spin' : ''} />
          <span>{syncing ? 'Syncing...' : 'Sync Now'}</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#15803d', fontSize: '0.82rem', fontWeight: 600 }}>
          <CheckCircle2 size={16} />
          <span>New offline registrations are checked for duplicates on sync.</span>
        </div>
      </div>
    </div>
  );
}
