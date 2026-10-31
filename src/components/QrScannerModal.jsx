import { useState, useEffect, useRef } from 'react';
import { X, QrCode } from 'lucide-react';

export default function QrScannerModal({ onScan, onClose, title = 'Scan Stub QR Code', hint = 'Point camera at printed stub QR code' }) {
  const instanceRef = useRef(null);
  const [manualCode, setManualCode] = useState('');

  useEffect(() => {
    let scanner;
    import('html5-qrcode').then(({ Html5Qrcode }) => {
      scanner = new Html5Qrcode('qr-reader-el');
      instanceRef.current = scanner;
      scanner
        .start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (text) => {
            scanner.stop().catch(() => {});
            onScan(text);
          },
          () => {}
        )
        .catch((err) => console.warn('QR camera error:', err));
    });
    return () => {
      if (instanceRef.current) {
        instanceRef.current.stop().catch(() => {});
      }
    };
  }, [onScan]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualCode.trim()) {
      if (instanceRef.current) {
        instanceRef.current.stop().catch(() => {});
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
        <div id="qr-reader-el" style={{ width: '100%', borderRadius: '12px', overflow: 'hidden' }} />
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
            placeholder="Or enter/paste code (e.g. STB-001001)..."
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
