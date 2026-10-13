import { Home, Building, Ticket, Activity, MapPin, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './MobileCommon.css';

export default function MobileDashboard() {
  const navigate = useNavigate();

  return (
    <div className="vin-mob-page">
      {/* Header */}
      <header className="vin-mob-header">
        <div className="vin-mob-header-info">
          <h1 className="vin-mob-title">Dashboard</h1>
          <p className="vin-mob-subtitle">MSWDO Vinzons evacuee management overview</p>
        </div>
      </header>

      {/* 2x2 Metric Cards Grid matching Screenshot 1 */}
      <div className="vin-mob-metrics-grid">
        {/* Card 1: Households */}
        <div
          className="vin-mob-metric-card"
          onClick={() => navigate('/mobile/households')}
          style={{ cursor: 'pointer' }}
        >
          <div className="vin-mob-icon-box green">
            <Home size={22} />
          </div>
          <div className="vin-mob-metric-val">6</div>
          <div className="vin-mob-metric-lbl">Households</div>
        </div>

        {/* Card 2: Centers */}
        <div
          className="vin-mob-metric-card"
          onClick={() => navigate('/mobile/centers')}
          style={{ cursor: 'pointer' }}
        >
          <div className="vin-mob-icon-box blue">
            <Building size={22} />
          </div>
          <div className="vin-mob-metric-val">10</div>
          <div className="vin-mob-metric-lbl">Centers</div>
        </div>

        {/* Card 3: Stubs Recorded */}
        <div
          className="vin-mob-metric-card"
          onClick={() => navigate('/mobile/relief')}
          style={{ cursor: 'pointer' }}
        >
          <div className="vin-mob-icon-box yellow">
            <Ticket size={22} />
          </div>
          <div className="vin-mob-metric-val">4</div>
          <div className="vin-mob-metric-lbl">Stubs Recorded</div>
        </div>

        {/* Card 4: Recorded Activity */}
        <div
          className="vin-mob-metric-card"
          onClick={() => navigate('/mobile/monitor')}
          style={{ cursor: 'pointer' }}
        >
          <div className="vin-mob-icon-box mint">
            <Activity size={22} />
          </div>
          <div className="vin-mob-metric-val">4</div>
          <div className="vin-mob-metric-lbl">Recorded</div>
        </div>
      </div>

      {/* Quick Access Section */}
      <h2 className="vin-mob-section-title">Quick Access</h2>

      <div
        className="vin-mob-quick-card"
        onClick={() => navigate('/mobile/centers')}
      >
        <div className="vin-mob-quick-left">
          <div className="vin-mob-quick-icon">
            <MapPin size={22} />
          </div>
          <div className="vin-mob-quick-info">
            <span className="vin-mob-quick-title">Gymnasium Site A</span>
            <span className="vin-mob-quick-sub">Sample data • 120 evacuees</span>
          </div>
        </div>
        <ChevronRight size={18} className="vin-mob-quick-arrow" />
      </div>
    </div>
  );
}
