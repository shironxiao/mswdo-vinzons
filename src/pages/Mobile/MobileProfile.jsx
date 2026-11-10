import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ChevronRight, Settings, LogOut } from 'lucide-react';
import { ConfirmModal } from '../../components/ConfirmModal.jsx';
import './MobileCommon.css';
import './MobileSubpages.css';

export default function MobileProfile() {
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  return (
    <div className="vin-mob-page">
      <header className="vin-mob-header">
        <div className="vin-mob-header-info">
          <h1 className="vin-mob-title">Profile</h1>
          <p className="vin-mob-subtitle">Your MSWDO personnel account</p>
        </div>
      </header>

      {/* Profile Card */}
      <div className="vin-mob-profile-card">
        <div className="vin-mob-profile-top">
          <div className="vin-mob-avatar-gold">A</div>
          <div className="vin-mob-profile-title-box">
            <h2 className="vin-mob-profile-name">Augorio Abarca</h2>
            <span className="vin-mob-role-pill">MSWDO Personnel</span>
          </div>
        </div>

        <div className="vin-mob-profile-field">
          <span className="vin-mob-field-label">FULL NAME</span>
          <span className="vin-mob-field-val">
            Augorio Abarca <CheckCircle2 size={16} color="#7c3aed" />
          </span>
        </div>

        <div className="vin-mob-profile-field">
          <span className="vin-mob-field-label">EMAIL</span>
          <span className="vin-mob-field-val">aaugorio@gmail.com</span>
        </div>

        <div className="vin-mob-profile-field">
          <span className="vin-mob-field-label">ROLE</span>
          <span className="vin-mob-field-val">MSWDO Personnel</span>
        </div>
      </div>

      {/* Settings Link */}
      <div
        className="vin-mob-link-row"
        onClick={() => navigate('/mobile/settings')}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#7c3aed' }}>
          <Settings size={18} />
          Settings
        </span>
        <ChevronRight size={18} color="#64748b" />
      </div>

      {/* Logout Button */}
      <button
        type="button"
        className="vin-mob-logout-outline-btn"
        onClick={() => setShowLogoutModal(true)}
      >
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <LogOut size={18} />
          Logout
        </span>
      </button>

      {/* Logout Confirmation Modal */}
      <ConfirmModal
        isOpen={showLogoutModal}
        title="Log Out"
        message="Are you sure you want to log out of your MSWDO Personnel account?"
        confirmLabel="Log Out"
        cancelLabel="Cancel"
        variant="warning"
        onConfirm={() => {
          setShowLogoutModal(false);
          navigate('/login');
        }}
        onCancel={() => setShowLogoutModal(false)}
      />
    </div>
  );
}
