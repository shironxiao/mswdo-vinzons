import { useState, useEffect, useRef } from 'react';
import { X, QrCode, AlertCircle } from 'lucide-react';

export default function QrScannerModal({
  onScan,
  onClose,
  title = 'Scan Stub QR Code',
  hint = 'Point camera at printed stub or household QR code'
}) {
  const instanceRef = useRef(null);
  const isStoppingRef = useRef(false);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const [manualCode, setManualCode] = useState('');
  const [cameraError, setCameraError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    let scanner = null;

    const stopScanner = async (inst) => {
      if (!inst) return;
      try {
        // State 2 is SCANNING in Html5QrcodeScannerState
        if (typeof inst.getState === 'function' && inst.getState() === 2) {
          await inst.stop();
        }
      } catch (err) {
        // Silently catch camera stop race errors
      }
    };

    import('html5-qrcode')
      .then(({ Html5Qrcode }) => {
        if (!isMounted) return;
        const container = document.getElementById('qr-reader-el');
        if (!container) return;

        scanner = new Html5Qrcode('qr-reader-el');
        instanceRef.current = scanner;

        return scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          async (text) => {
            if (isStoppingRef.current) return;
            isStoppingRef.current = true;

            // Safely stop the camera feed before triggering parent modal state changes
            await stopScanner(scanner);

            if (isMounted && onScanRef.current) {
              onScanRef.current(text);
            }
          },
          () => {} // Frame-by-frame miss (normal)
        );
      })
      .catch((err) => {
        console.warn('QR camera error:', err);
        if (isMounted) {
          setCameraError(err.message || 'Unable to access camera. Please allow camera permissions or enter code manually.');
        }
      });

    return () => {
      isMounted = false;
      isStoppingRef.current = true;
      if (instanceRef.current) {
        stopScanner(instanceRef.current);
        instanceRef.current = null;
      }
    };
  }, []); // Run ONCE on mount so stream is never recreated repeatedly

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualCode.trim()) {
      isStoppingRef.current = true;
      if (instanceRef.current) {
        try {
          if (typeof instanceRef.current.getState === 'function' && instanceRef.current.getState() === 2) {
            instanceRef.current.stop().catch(() => {});
          }
        } catch (_) {}
      }
      onScan(manualCode.trim());
    }
  };

  return (
    <div className="vin-hh-qr-overlay" onClick={onClose} style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px'
    }}>
      <div className="vin-hh-qr-box" onClick={(e) => e.stopPropagation()} style={{
        background: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '420px',
        padding: '20px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
      }}>
        <div className="vin-hh-qr-header" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px'
        }}>
          <span className="vin-hh-qr-title" style={{
            fontSize: '1rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#1e293b'
          }}>
            <QrCode size={18} color="#7c3aed" /> {title}
          </span>
          <button type="button" className="vin-mob-sheet-close" onClick={onClose} style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px'
          }}>
            <X size={18} />
          </button>
        </div>

        {cameraError ? (
          <div style={{
            padding: '16px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '12px',
            color: '#991b1b',
            fontSize: '0.84rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px'
          }}>
            <AlertCircle size={20} color="#dc2626" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong>Camera Unavailable:</strong>
              <div style={{ marginTop: 4 }}>{cameraError}</div>
              <div style={{ marginTop: 6, fontSize: '0.78rem', color: '#b91c1c' }}>
                You can still verify by typing or pasting the code below.
              </div>
            </div>
          </div>
        ) : (
          <div id="qr-reader-el" style={{ width: '100%', minHeight: 220, borderRadius: '12px', overflow: 'hidden', background: '#0f172a' }} />
        )}

        <p className="vin-hh-qr-hint" style={{
          fontSize: '0.8rem',
          color: '#64748b',
          textAlign: 'center',
          marginTop: '10px'
        }}>{hint}</p>
        
        {/* Manual code input alternative */}
        <form onSubmit={handleManualSubmit} style={{ marginTop: 12, borderTop: '1px solid #e2e8f0', paddingTop: 12, display: 'flex', gap: 6 }}>
          <input
            type="text"
            placeholder="Or enter code (e.g. HH-CLN-0001, STB-001001)..."
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            style={{
              flex: 1,
              border: '1.5px solid #cbd5e1',
              borderRadius: 8,
              padding: '8px 10px',
              fontSize: '0.84rem',
              color: '#0f172a',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            className="vin-mob-row-btn assign"
            style={{ padding: '0 12px', whiteSpace: 'nowrap' }}
          >
            Submit
          </button>
        </form>
      </div>
    </div>
  );
}
