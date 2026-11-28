import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Bell,
  BellOff,
  RefreshCw,
  CheckCircle2,
  Wifi,
  Cloud,
  Send,
  X,
  Info,
  Download,
  Trash2,
  Database,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useMobileCenter } from '../../context/MobileCenterContext.jsx';
import { supabase } from '../../lib/supabase.js';
import { isOnline } from '../../lib/offlineDb.js';
import {
  downloadCenterOfflinePack,
  getCenterOfflinePacks,
  removeCenterOfflinePack,
  clearAllOfflineData,
  syncNow,
  getSyncStatusSummary,
} from '../../lib/syncService.js';
import { ConfirmModal } from '../../components/ConfirmModal.jsx';
import './MobileCommon.css';
import './MobileSubpages.css';

export default function MobileSettings() {
  // Notifications setting with localStorage persistence
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('mswdo_notifications');
    return saved !== null ? saved === 'true' : true;
  });

  // Manual sync setting with localStorage persistence
  const [manualSync, setManualSync] = useState(() => {
    const saved = localStorage.getItem('mswdo_manual_sync');
    return saved !== null ? saved === 'true' : true;
  });

  // Last sync timestamp
  const [lastSyncTime, setLastSyncTime] = useState(() => {
    return localStorage.getItem('mswdo_last_sync') || new Date().toLocaleString();
  });

  const { centers, assignedCenterId, assignedCenterObj } = useMobileCenter();
  const activeCenterId = assignedCenterObj?.id || assignedCenterId || '';

  const orderedCenters = useMemo(() => {
    if (!Array.isArray(centers) || centers.length === 0) return [];
    if (!activeCenterId) return centers;
    const assigned = centers.find((c) => c.id === activeCenterId);
    const others = centers.filter((c) => c.id !== activeCenterId);
    return assigned ? [assigned, ...others] : centers;
  }, [centers, activeCenterId]);

  // Syncing state
  const [isSyncing, setIsSyncing] = useState(false);

  // Per-center offline pack state
  const [offlinePacks, setOfflinePacks] = useState({});
  const [downloadingCenterId, setDownloadingCenterId] = useState('');
  const [downloadProgress, setDownloadProgress] = useState({ percent: 0, label: '' });
  const [showAllCenters, setShowAllCenters] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'center', center } | { type: 'all' }

  // Cloud household counts per center (for "not downloaded yet" cards)
  const [centerCounts, setCenterCounts] = useState({});

  // In-app alert / toast feedback
  const [feedback, setFeedback] = useState(null);

  const loadOfflinePacks = useCallback(async () => {
    const [packs, summary] = await Promise.all([
      getCenterOfflinePacks(),
      getSyncStatusSummary(),
    ]);
    setOfflinePacks(packs);
    if (summary?.lastSyncTime) {
      const formatted = new Date(summary.lastSyncTime).toLocaleString();
      setLastSyncTime(formatted);
      localStorage.setItem('mswdo_last_sync', formatted);
    }
  }, []);

  useEffect(() => {
    loadOfflinePacks();
  }, [loadOfflinePacks]);

  // Load cloud household counts for undownloaded centers (online only)
  const loadCenterCounts = useCallback(async (packs = {}, centersArr = []) => {
    try {
      if (!isOnline() || !Array.isArray(centersArr) || centersArr.length === 0) return;
      const undownloaded = centersArr.filter((c) => c && c.id && !packs?.[c.id]);
      if (!undownloaded.length) return;
      const results = await Promise.allSettled(
        undownloaded.map(async (center) => {
          try {
            const { count, error } = await supabase
              .from('households')
              .select('id', { count: 'exact', head: true })
              .eq('center_id', center.id);
            return { id: center.id, count: error ? null : (count ?? 0) };
          } catch {
            return { id: center.id, count: null };
          }
        })
      );
      setCenterCounts((prev) => {
        const next = { ...prev };
        results.forEach((r) => {
          if (r.status === 'fulfilled' && r.value && r.value.count !== null) {
            next[r.value.id] = r.value.count;
          }
        });
        // For already-downloaded centers, use the pack's householdCount
        centersArr.forEach((c) => {
          if (c?.id && packs?.[c.id]) next[c.id] = packs[c.id].householdCount;
        });
        return next;
      });
    } catch (err) {
      console.warn('Failed to fetch center counts:', err);
    }
  }, []);

  useEffect(() => {
    if (orderedCenters && orderedCenters.length > 0) {
      loadCenterCounts(offlinePacks, orderedCenters);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderedCenters?.length, Object.keys(offlinePacks || {}).join(',')]);

  const showFeedback = (type, title, message) => {
    setFeedback({ type, title, message });
    setTimeout(() => {
      setFeedback(null);
    }, 4000);
  };

  // Toggle notification preference
  const handleToggleNotifications = async (e) => {
    const isChecked = e.target.checked;
    setNotifications(isChecked);
    localStorage.setItem('mswdo_notifications', String(isChecked));

    if (isChecked) {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'default') {
          const perm = await Notification.requestPermission();
          if (perm === 'granted') {
            showFeedback('success', 'Notifications Enabled', 'Browser push notifications active for evacuation alerts.');
          } else {
            showFeedback('info', 'In-App Alerts Active', 'Browser notifications blocked, falling back to in-app banners.');
          }
          return;
        }
      }
      showFeedback('success', 'Notifications Active', 'You will receive operational alerts and relief updates.');
    } else {
      showFeedback('info', 'Notifications Muted', 'Evacuation alerts and updates are currently silenced.');
    }
  };

  // Send test notification
  const handleSendTestNotification = () => {
    if (!notifications) {
      showFeedback('info', 'Notifications Disabled', 'Please enable the Notifications toggle above to receive alerts.');
      return;
    }

    const title = 'MSWDO-Vinzons Alert';
    const body = 'Emergency test: Evacuation Center capacity update at Vinzons Central ES.';

    // Browser native notification if permission granted
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
        });
      } catch (err) {
        console.warn('Native notification error:', err);
      }
    }

    // In-app visual alert
    showFeedback('success', title, body);
  };

  // Toggle manual sync
  const handleToggleManualSync = (e) => {
    const isChecked = e.target.checked;
    setManualSync(isChecked);
    localStorage.setItem('mswdo_manual_sync', String(isChecked));

    if (isChecked) {
      showFeedback('info', 'Manual Sync Mode', 'Data will sync only when you tap the "Sync Now" button.');
    } else {
      showFeedback('success', 'Auto-Sync Mode', 'Data will continuously synchronize with cloud storage in the background.');
    }
  };

  // Trigger manual sync now
  const handleTriggerManualSync = async () => {
    setIsSyncing(true);

    try {
      const res = await syncNow({ centerId: activeCenterId || null });
      const now = new Date().toLocaleString();
      if (res.status === 'success') {
        setLastSyncTime(now);
        localStorage.setItem('mswdo_last_sync', now);
        showFeedback(
          'success',
          'Sync Complete',
          res.flushed > 0
            ? `Uploaded ${res.flushed} offline record(s) and synced with cloud at ${now}.`
            : `Database is up to date with Supabase cloud at ${now}.`
        );
      } else if (res.status === 'offline') {
        showFeedback('info', 'Device Offline', res.message);
      } else {
        showFeedback('info', 'Sync Issue', res.error || 'Could not reach cloud. Changes remain saved locally.');
      }
    } catch (err) {
      console.warn('Manual sync error:', err);
      showFeedback('info', 'Offline Mode', 'Local database kept intact. Cloud changes will sync when online.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDownloadCenter = async (center) => {
    if (!center?.id || downloadingCenterId) return;
    setDownloadingCenterId(center.id);
    setDownloadProgress({ percent: 0, label: 'Starting download...' });

    try {
      const pack = await downloadCenterOfflinePack(center.id, centers, (prog) => {
        setDownloadProgress(prog);
      });
      await loadOfflinePacks();
      // Re-fetch counts so downloaded center count updates too
      await loadCenterCounts(await getCenterOfflinePacks(), orderedCenters);
      showFeedback(
        'success',
        'Offline Data Ready',
        `Downloaded ${pack.householdCount} household(s) for ${pack.centerName}. You can now work offline.`
      );
    } catch (err) {
      showFeedback(
        'info',
        'Download Failed',
        err?.message || 'Could not download center data. Check your internet connection.'
      );
    } finally {
      setDownloadingCenterId('');
      setDownloadProgress({ percent: 0, label: '' });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || downloadingCenterId) return;
    const target = deleteTarget;
    setDeleteTarget(null);

    try {
      if (target.type === 'all') {
        await clearAllOfflineData();
        await loadOfflinePacks();
        showFeedback(
          'info',
          'All Offline Data Deleted',
          'Cleared all downloaded center data from this device.'
        );
      } else if (target.type === 'center' && target.center?.id) {
        await removeCenterOfflinePack(target.center.id);
        await loadOfflinePacks();
        showFeedback(
          'info',
          'Offline Data Deleted',
          `Deleted downloaded data for ${target.center.displayName || target.center.name}.`
        );
      }
    } catch (err) {
      showFeedback('info', 'Cannot Delete Data', err?.message || 'Please sync pending changes first.');
    }
  };

  return (
    <div className="vin-mob-page">
      <header className="vin-mob-header">
        <div className="vin-mob-header-info">
          <h1 className="vin-mob-title">Settings</h1>
          <p className="vin-mob-subtitle">App preferences & synchronization</p>
        </div>
      </header>

      {/* Floating feedback alert */}
      {feedback && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            padding: '12px 14px',
            borderRadius: '14px',
            backgroundColor: feedback.type === 'success' ? '#f3e8ff' : '#e0f2fe',
            border: `1.5px solid ${feedback.type === 'success' ? '#ddd6fe' : '#7dd3fc'}`,
            color: feedback.type === 'success' ? '#6b21a8' : '#0369a1',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 size={20} color="#7c3aed" style={{ marginTop: '2px', flexShrink: 0 }} />
          ) : (
            <Info size={20} color="#0284c7" style={{ marginTop: '2px', flexShrink: 0 }} />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontWeight: 800, fontSize: '0.88rem' }}>{feedback.title}</span>
            <span style={{ display: 'block', fontSize: '0.8rem', opacity: 0.9 }}>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 2 }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── Section 1: Notifications Setting ── */}
      <div className="vin-mob-settings-card">
        <div className="vin-mob-toggle-item">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                backgroundColor: notifications ? '#f3e8ff' : '#f1f5f9',
                color: notifications ? '#7c3aed' : '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {notifications ? <Bell size={20} /> : <BellOff size={20} />}
            </div>
            <div className="vin-mob-toggle-info">
              <span className="vin-mob-toggle-title">Notifications</span>
              <span className="vin-mob-toggle-sub">Evacuation updates & emergency alerts</span>
            </div>
          </div>
          <label className="vin-switch">
            <input
              type="checkbox"
              checked={notifications}
              onChange={handleToggleNotifications}
            />
            <span className="vin-slider" />
          </label>
        </div>

        {/* Notification details & test button */}
        <div
          style={{
            padding: '12px 14px',
            borderRadius: '12px',
            backgroundColor: '#f8faf9',
            border: '1px solid #eef2f0',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>Status:</span>
            <span
              style={{
                fontSize: '0.76rem',
                fontWeight: 750,
                color: notifications ? '#7c3aed' : '#64748b',
                backgroundColor: notifications ? '#f3e8ff' : '#f1f5f9',
                padding: '2px 8px',
                borderRadius: '6px',
              }}
            >
              {notifications ? 'Active & Listening' : 'Muted'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleSendTestNotification}
            disabled={!notifications}
            style={{
              padding: '9px 14px',
              borderRadius: '9px',
              border: '1.5px solid #7c3aed',
              background: '#ffffff',
              color: notifications ? '#7c3aed' : '#94a3b8',
              borderColor: notifications ? '#7c3aed' : '#cbd5e1',
              fontSize: '0.84rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: notifications ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s ease',
            }}
          >
            <Send size={14} />
            <span>Send Test Notification</span>
          </button>
        </div>
      </div>

      {/* ── Section 2: Manual Sync Setting ── */}
      <div className="vin-mob-settings-card">
        <div className="vin-mob-toggle-item">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                backgroundColor: manualSync ? '#e0f2fe' : '#f1f5f9',
                color: manualSync ? '#0284c7' : '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Cloud size={20} />
            </div>
            <div className="vin-mob-toggle-info">
              <span className="vin-mob-toggle-title">Manual Sync</span>
              <span className="vin-mob-toggle-sub">Sync data on-demand to save data</span>
            </div>
          </div>
          <label className="vin-switch">
            <input
              type="checkbox"
              checked={manualSync}
              onChange={handleToggleManualSync}
            />
            <span className="vin-slider" />
          </label>
        </div>

        {/* Sync Controls & Last Sync Time */}
        <div
          style={{
            padding: '14px',
            borderRadius: '12px',
            backgroundColor: '#f8faf9',
            border: '1px solid #eef2f0',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Last sync:</span>
            <span style={{ fontSize: '0.78rem', color: '#0f172a', fontWeight: 700 }}>{lastSyncTime}</span>
          </div>

          <button
            type="button"
            className="vin-mob-sync-btn"
            onClick={handleTriggerManualSync}
            disabled={isSyncing}
            style={{
              padding: '12px',
              fontSize: '0.92rem',
              backgroundColor: isSyncing ? '#581c87' : '#7c3aed',
            }}
          >
            <RefreshCw size={17} className={isSyncing ? 'animate-spin' : ''} />
            <span>{isSyncing ? 'Syncing with Supabase...' : 'Sync Now'}</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#7c3aed', fontSize: '0.78rem', fontWeight: 600 }}>
            <CheckCircle2 size={15} />
            <span>Offline changes automatically reconcile on sync.</span>
          </div>
        </div>
      </div>

      {/* ── Section 3: Per-Center Offline Data Download ── */}
      <div className="vin-mob-settings-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              backgroundColor: '#f3e8ff',
              color: '#7c3aed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Database size={20} />
          </div>
          <div className="vin-mob-toggle-info">
            <span className="vin-mob-toggle-title">Offline Center Data</span>
            <span className="vin-mob-toggle-sub">
              Download a center&apos;s households &amp; rooms before going offline
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
          {(showAllCenters ? orderedCenters : orderedCenters.slice(0, activeCenterId ? 1 : 3)).map((center) => {
            const pack = offlinePacks[center.id];
            const isDownloadingThis = downloadingCenterId === center.id;
            const isAssigned = center.id === activeCenterId;
            const centerTitle = center.displayName || center.name;

            return (
              <div
                key={center.id}
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  backgroundColor: isAssigned ? '#faf5ff' : '#f8faf9',
                  border: `1px solid ${isAssigned ? '#e9d5ff' : '#eef2f0'}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  contentVisibility: 'auto',
                  containIntrinsicSize: '78px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a' }}>
                        {centerTitle}
                      </span>
                      {isAssigned && (
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '2px 7px',
                            borderRadius: '9999px',
                            backgroundColor: '#7c3aed',
                            color: '#ffffff',
                          }}
                        >
                          Assigned
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.76rem', color: pack ? '#15803d' : '#64748b', fontWeight: pack ? 600 : 400 }}>
                      {pack
                        ? `Ready Offline • ${pack.householdCount || 0} households${pack.downloadedAt ? ` (${new Date(pack.downloadedAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })})` : ''}`
                        : centerCounts[center.id] !== undefined
                          ? `Not downloaded yet — ${centerCounts[center.id]} household${centerCounts[center.id] !== 1 ? 's' : ''} available`
                          : 'Not downloaded yet'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    {pack && !isDownloadingThis && (
                      <button
                        type="button"
                        onClick={() => setDeleteTarget({ type: 'center', center })}
                        disabled={Boolean(downloadingCenterId)}
                        title="Delete downloaded data"
                        style={{
                          padding: '7px 10px',
                          borderRadius: '8px',
                          border: '1px solid #fecaca',
                          backgroundColor: '#fef2f2',
                          color: '#dc2626',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Trash2 size={13} />
                        <span>Delete</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDownloadCenter(center)}
                      disabled={Boolean(downloadingCenterId)}
                      style={{
                        padding: '7px 12px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: isDownloadingThis ? '#581c87' : '#7c3aed',
                        color: '#ffffff',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: downloadingCenterId ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        opacity: downloadingCenterId && !isDownloadingThis ? 0.5 : 1,
                      }}
                    >
                      <Download size={14} />
                      <span>{isDownloadingThis ? `${downloadProgress.percent}%` : (pack ? 'Update' : (centerCounts[center.id] !== undefined ? `Download (${centerCounts[center.id]})` : 'Download'))}</span>
                    </button>
                  </div>
                </div>

                {isDownloadingThis && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div
                      style={{
                        width: '100%',
                        height: '6px',
                        borderRadius: '9999px',
                        backgroundColor: '#e9d5ff',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${downloadProgress.percent}%`,
                          height: '100%',
                          backgroundColor: '#7c3aed',
                          transition: 'width 0.15s ease',
                        }}
                      />
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#6b21a8', fontWeight: 600 }}>
                      {downloadProgress.label}
                    </span>
                  </div>
                )}
              </div>
            );
          })}

          {orderedCenters.length > (activeCenterId ? 1 : 3) && (
            <button
              type="button"
              onClick={() => setShowAllCenters((prev) => !prev)}
              style={{
                padding: '9px 12px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              {showAllCenters ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              <span>
                {showAllCenters
                  ? 'Show Fewer Centers'
                  : `Show All Centers (${orderedCenters.length - (activeCenterId ? 1 : 3)} more)`}
              </span>
            </button>
          )}

          {Object.keys(offlinePacks).length > 0 && (
            <button
              type="button"
              onClick={() => setDeleteTarget({ type: 'all' })}
              disabled={Boolean(downloadingCenterId)}
              style={{
                padding: '9px 12px',
                borderRadius: '10px',
                border: '1px solid #fecaca',
                backgroundColor: '#fef2f2',
                color: '#dc2626',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: downloadingCenterId ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <Trash2 size={15} />
              <span>Delete All Downloaded Data</span>
            </button>
          )}
        </div>
      </div>

      {/* App Info Box */}
      <div className="vin-mob-settings-card" style={{ marginTop: '2px' }}>
        <span className="vin-mob-field-label">APPLICATION INFO</span>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', display: 'block' }}>
              MSWDO - Vinzons Evacuee Manager
            </span>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>PWA Version 1.0.0 (Production)</span>
          </div>
          <div
            style={{
              padding: '4px 10px',
              borderRadius: '9999px',
              backgroundColor: '#f3e8ff',
              color: '#7c3aed',
              fontSize: '0.74rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Wifi size={12} /> Live
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title={deleteTarget?.type === 'all' ? 'Delete All Offline Data?' : 'Delete Center Offline Data?'}
        message={
          deleteTarget?.type === 'all'
            ? 'This will delete all downloaded center households, details, and logs stored offline on this device.'
            : `This will delete the downloaded offline households and logs for ${deleteTarget?.center?.displayName || deleteTarget?.center?.name || 'this center'}. You can re-download it anytime while online.`
        }
        confirmLabel="Delete Data"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
