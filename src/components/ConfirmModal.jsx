import { AlertTriangle, LogOut, Trash2, X, Check } from 'lucide-react';

export function ConfirmModal({
  isOpen,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger', // 'danger' | 'warning' | 'primary'
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (variant) {
      case 'danger':
        return <Trash2 size={24} color="#dc2626" />;
      case 'warning':
        return <LogOut size={24} color="#d97706" />;
      case 'primary':
      default:
        return <AlertTriangle size={24} color="#15803d" />;
    }
  };

  const getBadgeBg = () => {
    switch (variant) {
      case 'danger':
        return '#fee2e2';
      case 'warning':
        return '#fef3c7';
      case 'primary':
      default:
        return '#dcfce7';
    }
  };

  const getConfirmBtnStyle = () => {
    switch (variant) {
      case 'danger':
        return {
          background: '#dc2626',
          color: '#ffffff',
          border: 'none',
        };
      case 'warning':
        return {
          background: '#15803d',
          color: '#ffffff',
          border: 'none',
        };
      case 'primary':
      default:
        return {
          background: '#15803d',
          color: '#ffffff',
          border: 'none',
        };
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.15s ease',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '18px',
          width: '100%',
          maxWidth: '400px',
          padding: '24px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.2)',
          boxSizing: 'border-box',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '16px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: getBadgeBg(),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {getIcon()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3
              style={{
                fontSize: '1.15rem',
                fontWeight: 800,
                color: '#0f172a',
                margin: '0 0 6px 0',
                lineHeight: 1.25,
              }}
            >
              {title}
            </h3>
            <p
              style={{
                fontSize: '0.88rem',
                color: '#475569',
                margin: 0,
                lineHeight: 1.45,
              }}
            >
              {message}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '6px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '9px 18px',
              borderRadius: '10px',
              border: '1.5px solid #cbd5e1',
              background: '#ffffff',
              color: '#334155',
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
            }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              padding: '9px 20px',
              borderRadius: '10px',
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
              ...getConfirmBtnStyle(),
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
