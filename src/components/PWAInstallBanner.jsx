import { useState, useEffect } from 'react';
import { Download, X, Share, Smartphone } from 'lucide-react';

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [lang, setLang] = useState('fil'); // 'fil' or 'en'

  useEffect(() => {
    // 1. Check if already installed / running in standalone mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://');

    if (isStandalone) {
      return; // Already installed, do not show banner
    }

    // 2. Check if user already dismissed in this session
    const dismissed = sessionStorage.getItem('pwa_banner_dismissed');
    if (dismissed === 'true') {
      return;
    }

    // 3. Android / Chromium PWA prompt listener
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 4. iOS Safari Detection
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    const isSafari =
      /safari/.test(userAgent) &&
      !/chrome|crios|fxios|edgios|android/.test(userAgent);

    if (isIOSDevice && isSafari) {
      setIsIOS(true);
      // Show iOS banner after 3 seconds on iOS devices
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 3000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }

    // App installed event
    const handleAppInstalled = () => {
      setIsVisible(false);
      setDeferredPrompt(null);
      sessionStorage.setItem('pwa_banner_dismissed', 'true');
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }

    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem('pwa_banner_dismissed', 'true');
  };

  if (!isVisible) return null;

  return (
    <div
      role="region"
      aria-label="App Installation Prompt"
      style={{
        position: 'fixed',
        bottom: '16px',
        left: '16px',
        right: '16px',
        margin: '0 auto',
        maxWidth: '480px',
        zIndex: 99998,
        backgroundColor: '#4c1d95',
        backgroundImage: 'linear-gradient(135deg, #4c1d95 0%, #581c87 60%, #3b0764 100%)',
        color: '#ffffff',
        borderRadius: '16px',
        padding: '16px 18px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.45), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
        border: '1px solid rgba(216, 180, 254, 0.25)',
        animation: 'slideUpBanner 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
        <img
          src="/mswdo-logo.png"
          alt="MSWDO Logo"
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            backgroundColor: '#ffffff',
            padding: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            flexShrink: 0,
            objectFit: 'contain'
          }}
        />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <h4
              style={{
                margin: 0,
                fontSize: '15px',
                fontWeight: 700,
                color: '#ffffff',
                letterSpacing: '-0.01em',
                lineHeight: 1.2
              }}
            >
              MSWDO Vinzons App
            </h4>
            
            {/* Bilingual toggle pill */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setLang(lang === 'fil' ? 'en' : 'fil')}
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  color: '#e9d5ff',
                  borderRadius: '12px',
                  padding: '2px 8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textTransform: 'uppercase'
                }}
                title={lang === 'fil' ? 'Switch to English' : 'Lumipat sa Filipino'}
              >
                {lang === 'fil' ? 'EN' : 'FIL'}
              </button>

              <button
                type="button"
                onClick={handleDismiss}
                aria-label="Dismiss banner"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#c4b5fd',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '6px'
                }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <p
            style={{
              margin: '6px 0 12px 0',
              fontSize: '12.5px',
              color: '#e9d5ff',
              lineHeight: 1.4
            }}
          >
            {lang === 'fil'
              ? 'I-install sa cellphone para sa mabilis at offline-ready na access sa Evacuee Management System.'
              : 'Install on your device for fast, offline-ready access to the Evacuee Management System.'}
          </p>

          {showIOSInstructions ? (
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.12)',
                borderRadius: '8px',
                padding: '10px 12px',
                fontSize: '12px',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '4px'
              }}
            >
              <Share size={16} style={{ flexShrink: 0, color: '#facc15' }} />
              <span>
                {lang === 'fil'
                  ? 'Pindutin ang Share button sa Safari, pagkatapos ay piliin ang "Add to Home Screen".'
                  : 'Tap the Share icon below in Safari, then choose "Add to Home Screen".'}
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={handleInstallClick}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  backgroundColor: '#facc15',
                  color: '#3b0764',
                  fontWeight: 700,
                  fontSize: '13px',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 14px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                  transition: 'opacity 0.2s'
                }}
              >
                {isIOS ? <Smartphone size={16} /> : <Download size={16} />}
                {lang === 'fil' ? 'I-install ang App' : 'Install App'}
              </button>

              <button
                type="button"
                onClick={handleDismiss}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  fontWeight: 600,
                  fontSize: '12.5px',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  cursor: 'pointer'
                }}
              >
                {lang === 'fil' ? 'Mamaya' : 'Later'}
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideUpBanner {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
