import { useState } from 'react';
import './MobileCommon.css';
import './MobileSubpages.css';

export default function MobileSettings() {
  const [notifications, setNotifications] = useState(true);
  const [manualSync, setManualSync] = useState(true);

  return (
    <div className="vin-mob-page">
      <header className="vin-mob-header">
        <div className="vin-mob-header-info">
          <h1 className="vin-mob-title">Settings</h1>
          <p className="vin-mob-subtitle">App preferences</p>
        </div>
      </header>

      {/* Settings Card matching Screenshot 2 Settings */}
      <div className="vin-mob-settings-card">
        <div className="vin-mob-toggle-item">
          <div className="vin-mob-toggle-info">
            <span className="vin-mob-toggle-title">Notifications</span>
            <span className="vin-mob-toggle-sub">Evacuation updates & alerts</span>
          </div>
          <label className="vin-switch">
            <input
              type="checkbox"
              checked={notifications}
              onChange={(e) => setNotifications(e.target.checked)}
            />
            <span className="vin-slider" />
          </label>
        </div>

        <div className="vin-mob-toggle-item">
          <div className="vin-mob-toggle-info">
            <span className="vin-mob-toggle-title">Manual sync</span>
            <span className="vin-mob-toggle-sub">Sync data only when you choose</span>
          </div>
          <label className="vin-switch">
            <input
              type="checkbox"
              checked={manualSync}
              onChange={(e) => setManualSync(e.target.checked)}
            />
            <span className="vin-slider" />
          </label>
        </div>
      </div>

      {/* App Info Box */}
      <div className="vin-mob-settings-card" style={{ marginTop: '4px' }}>
        <span className="vin-mob-field-label">APP</span>
        <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
          MSWDO - Vinzons Evacuee Manager
        </span>
        <span style={{ fontSize: '0.82rem', color: '#64748b' }}>Version 1.0.0</span>
      </div>
    </div>
  );
}
