import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, CheckCircle2, Wifi, WifiOff, AlertCircle, Database, UploadCloud } from 'lucide-react';
import { syncNow, getSyncStatusSummary } from '../../lib/syncService.js';
import { db, SYNC_QUEUE_EVENT } from '../../lib/offlineDb.js';
import './MobileCommon.css';
import './MobileSubpages.css';

export default function MobileSyncStatus() {
  const [syncState, setSyncState] = useState({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    pendingCount: 0,
    lastSyncTime: null,
    lastError: null,
  });

  const [dbCounts, setDbCounts] = useState({
    households: 0,
    logs: 0,
  });

  const [syncMessage, setSyncMessage] = useState(null);

  // Refresh status summary
  const refreshStatus = useCallback(async () => {
    try {
      const summary = await getSyncStatusSummary();
      setSyncState((prev) => ({
        ...prev,
        isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
        ...summary,
      }));

      const [hhCount, logsCount] = await Promise.all([
        db.households.count().catch(() => 0),
        db.monitoring_logs.count().catch(() => 0),
      ]);
      setDbCounts({ households: hhCount, logs: logsCount });
    } catch (err) {
      console.warn('Could not read sync status:', err);
    }
  }, []);

  useEffect(() => {
    refreshStatus();

    const handleOnline = () => {
      setSyncState((prev) => ({ ...prev, isOnline: true }));
      refreshStatus();
    };
    const handleOffline = () => {
      setSyncState((prev) => ({ ...prev, isOnline: false }));
      refreshStatus();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener(SYNC_QUEUE_EVENT, refreshStatus);
    window.addEventListener('vinzons-sync-state-changed', refreshStatus);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener(SYNC_QUEUE_EVENT, refreshStatus);
      window.removeEventListener('vinzons-sync-state-changed', refreshStatus);
    };
  }, [refreshStatus]);

  const handleSync = async () => {
    setSyncMessage(null);
    setSyncState((prev) => ({ ...prev, isSyncing: true }));

    const res = await syncNow();

    await refreshStatus();
    setSyncState((prev) => ({ ...prev, isSyncing: false }));

    if (res.status === 'success') {
      const flushedCount = res.flushed || 0;
      setSyncMessage({
        type: 'success',
        text: flushedCount > 0
          ? `Uploaded ${flushedCount} pending offline record(s) and synced with cloud!`
          : 'Database is up to date with Supabase cloud.',
      });
      setTimeout(() => setSyncMessage(null), 5000);
    } else if (res.status === 'offline') {
      setSyncMessage({
        type: 'warning',
        text: 'Your phone is currently offline. Offline changes are stored safely on device.',
      });
    } else {
      setSyncMessage({
        type: 'error',
        text: res.error || 'Failed to sync. Please check your connection.',
      });
    }
  };

  const formattedLastSync = syncState.lastSyncTime
    ? new Date(syncState.lastSyncTime).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Not synced yet';

  return (
    <div className="vin-mob-page">
      <header className="vin-mob-header">
        <div className="vin-mob-header-info">
          <h1 className="vin-mob-title">Sync Status</h1>
          <p className="vin-mob-subtitle">Offline mode, local cache & cloud sync</p>
        </div>
      </header>

      {/* Sync Status Card */}
      <div className="vin-mob-settings-card">
        {syncMessage && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 14px',
              borderRadius: '10px',
              backgroundColor:
                syncMessage.type === 'success'
                  ? '#ecfdf5'
                  : syncMessage.type === 'warning'
                    ? '#fffbeb'
                    : '#fef2f2',
              color:
                syncMessage.type === 'success'
                  ? '#047857'
                  : syncMessage.type === 'warning'
                    ? '#b45309'
                    : '#b91c1c',
              fontWeight: 600,
              fontSize: '0.88rem',
              lineHeight: 1.4,
            }}
          >
            {syncMessage.type === 'success' ? (
              <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
            ) : (
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
            )}
            <span>{syncMessage.text}</span>
          </div>
        )}

        {/* Network & Offline Status Item */}
        <div className="vin-mob-toggle-item">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                backgroundColor: syncState.isOnline ? '#e0f2fe' : '#fef3c7',
                color: syncState.isOnline ? '#0284c7' : '#c25e1a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {syncState.isOnline ? <Wifi size={22} /> : <WifiOff size={22} />}
            </div>
            <div className="vin-mob-toggle-info">
              <span className="vin-mob-toggle-title">
                {syncState.isOnline ? 'Network Connected' : 'Offline Mode Active'}
              </span>
              <span className="vin-mob-toggle-sub">Last sync: {formattedLastSync}</span>
            </div>
          </div>

          <span
            style={{
              padding: '4px 10px',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 700,
              backgroundColor: syncState.isOnline ? '#dcfce7' : '#fee2e2',
              color: syncState.isOnline ? '#15803d' : '#b91c1c',
            }}
          >
            {syncState.isOnline ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>

        {/* Local Storage & Pending Queue Summary */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px',
            backgroundColor: '#f8fafc',
            padding: '14px',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.78rem' }}>
              <UploadCloud size={14} />
              <span>Pending Outbox</span>
            </div>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: syncState.pendingCount > 0 ? '#ea580c' : '#0f172a' }}>
              {syncState.pendingCount}
            </span>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              {syncState.pendingCount > 0 ? 'Queued to upload' : 'All synced'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.78rem' }}>
              <Database size={14} />
              <span>Local Offline Cache</span>
            </div>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
              {dbCounts.households}
            </span>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              Households in storage
            </span>
          </div>
        </div>

        {/* Sync Now Button */}
        <button
          type="button"
          className="vin-mob-sync-btn"
          onClick={handleSync}
          disabled={syncState.isSyncing}
        >
          <RefreshCw size={20} className={syncState.isSyncing ? 'animate-spin' : ''} />
          <span>{syncState.isSyncing ? 'Syncing...' : 'Sync Now'}</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', color: '#7c3aed', fontSize: '0.82rem', fontWeight: 600, lineHeight: 1.4 }}>
          <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>
            100% Offline Ready: Even without mobile data or internet, you can register evacuees, check attendance, and issue relief stubs. Changes will queue on this device and upload automatically when connected.
          </span>
        </div>
      </div>
    </div>
  );
}
