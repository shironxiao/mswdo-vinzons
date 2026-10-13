import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ChevronRight, Activity } from 'lucide-react';
import './MobileCommon.css';
import './MobileSubpages.css';

export default function MobileProfile() {
  const navigate = useNavigate();

  const handleLogout = () => {
    if (confirm('Log out from MSWDO Personnel account?')) {
      navigate('/login');
    }
  };

  return (
    <div className="vin-mob-page">
      <header className="vin-mob-header">
        <div className="vin-mob-header-info">
          <h1 className="vin-mob-title">Profile</h1>
          <p className="vin-mob-subtitle">Your MSWDO personnel account</p>
        </div>
      </header>

      {/* Profile Card matching image 2 */}
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
            Augorio Abarca <CheckCircle2 size={16} color="#15803d" />
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

        {/* Link to Evacuee Monitoring */}
        <div
          className="vin-mob-link-row"
          onClick={() => navigate('/mobile/monitor')}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#15803d' }}>
            <Activity size={18} />
            Evacuee Monitoring
          </span>
          <ChevronRight size={18} color="#64748b" />
        </div>

        {/* Red outline Log out button */}
        <button
          type="button"
          className="vin-mob-logout-outline-btn"
          onClick={handleLogout}
        >
          Log out
        </button>
      </div>
    </div>
  );
}
