import {
  Home,
  Users,
  Building,
  Package,
  ArrowUpRight,
  Gift,
  CheckCircle2,
  Truck,
  MapPin,
} from 'lucide-react';
import './Dashboard.css';

export default function Dashboard() {
  return (
    <div className="vin-dashboard">
      {/* Header section */}
      <header className="vin-dash-header">
        <span className="vin-dash-date">WEDNESDAY, SEPTEMBER 18, 2024</span>
        <h1 className="vin-dash-title">MSWDO-Vinzons</h1>
        <p className="vin-dash-desc">
          A clear view of evacuation operations across Vinzons, ready for your next decision.
        </p>
      </header>

      {/* 4 Key Metric Cards */}
      <section className="vin-metrics-grid">
        {/* Card 1: Active centers */}
        <div className="vin-metric-card">
          <div className="vin-metric-top">
            <div className="vin-metric-icon-box icon-box-green">
              <Home size={19} />
            </div>
            <ArrowUpRight className="vin-metric-arrow" size={17} />
          </div>
          <div className="vin-metric-value">3</div>
          <div className="vin-metric-label">Active centers</div>
          <div className="vin-metric-divider" />
          <div className="vin-metric-footer">All reporting</div>
        </div>

        {/* Card 2: Individual evacuees */}
        <div className="vin-metric-card">
          <div className="vin-metric-top">
            <div className="vin-metric-icon-box icon-box-amber">
              <Users size={19} />
            </div>
            <ArrowUpRight className="vin-metric-arrow" size={17} />
          </div>
          <div className="vin-metric-value">564</div>
          <div className="vin-metric-label">Individual evacuees</div>
          <div className="vin-metric-divider" />
          <div className="vin-metric-footer">+18 this week</div>
        </div>

        {/* Card 3: Occupied rooms */}
        <div className="vin-metric-card">
          <div className="vin-metric-top">
            <div className="vin-metric-icon-box icon-box-blue">
              <Building size={19} />
            </div>
            <ArrowUpRight className="vin-metric-arrow" size={17} />
          </div>
          <div className="vin-metric-value">41 / 52</div>
          <div className="vin-metric-label">Occupied rooms</div>
          <div className="vin-metric-divider" />
          <div className="vin-metric-footer">79% occupancy</div>
        </div>

        {/* Card 4: Stabs issued */}
        <div className="vin-metric-card">
          <div className="vin-metric-top">
            <div className="vin-metric-icon-box icon-box-orange">
              <Package size={19} />
            </div>
            <ArrowUpRight className="vin-metric-arrow" size={17} />
          </div>
          <div className="vin-metric-value">618</div>
          <div className="vin-metric-label">Stabs issued</div>
          <div className="vin-metric-divider" />
          <div className="vin-metric-footer">98% distributed</div>
        </div>
      </section>

      {/* Bottom Grid: Evacuee Monitoring & Recent Operations */}
      <section className="vin-dash-bottom-grid">
        {/* Left: Evacuee Monitoring */}
        <div className="vin-card">
          <div className="vin-card-header">
            <div>
              <span className="vin-card-eyebrow">DAILY CHECKS</span>
              <h2 className="vin-card-title">Evacuee monitoring</h2>
            </div>
            <a href="#monitoring" className="vin-card-link">
              Open monitoring <ArrowUpRight size={14} />
            </a>
          </div>

          <div className="vin-table-list">
            {/* Center 1: VCES */}
            <div className="vin-table-row">
              <div className="vin-row-left">
                <div className="vin-badge-code">VCES</div>
                <div className="vin-row-info">
                  <div className="vin-row-name">Vinzons Central Elementary School</div>
                  <div className="vin-row-sub">364 people checked • Poblacion, Vinzons</div>
                </div>
              </div>
              <div className="vin-row-right">
                <span className="vin-status-pill complete">Complete</span>
                <span className="vin-row-time">08:30 AM</span>
              </div>
            </div>

            {/* Center 2: VCC */}
            <div className="vin-table-row">
              <div className="vin-row-left">
                <div className="vin-badge-code">VCC</div>
                <div className="vin-row-info">
                  <div className="vin-row-name">Vinzons Covered Court</div>
                  <div className="vin-row-sub">171 people checked • Barangay II, Vinzons</div>
                </div>
              </div>
              <div className="vin-row-right">
                <span className="vin-status-pill complete">Complete</span>
                <span className="vin-row-time">08:30 AM</span>
              </div>
            </div>

            {/* Center 3: CNHS */}
            <div className="vin-table-row">
              <div className="vin-row-left">
                <div className="vin-badge-code">CNHS</div>
                <div className="vin-row-info">
                  <div className="vin-row-name">Calaguas National High School</div>
                  <div className="vin-row-sub">129 people checked • Calaguas, Vinzons</div>
                </div>
              </div>
              <div className="vin-row-right">
                <span className="vin-status-pill complete">Complete</span>
                <span className="vin-row-time">08:30 AM</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Recent operations */}
        <div className="vin-card">
          <div className="vin-card-header">
            <div>
              <span className="vin-card-eyebrow">ACTIVITY LOG</span>
              <h2 className="vin-card-title">Recent operations</h2>
            </div>
          </div>

          <div className="vin-activity-list">
            {/* Activity 1 */}
            <div className="vin-activity-item">
              <div className="vin-activity-icon icon-box-amber">
                <Gift size={18} />
              </div>
              <div className="vin-activity-details">
                <div className="vin-activity-title">Stab batch issued</div>
                <div className="vin-activity-sub">Vinzons Central Elementary School • VCES...</div>
              </div>
            </div>

            {/* Activity 2 */}
            <div className="vin-activity-item">
              <div className="vin-activity-icon icon-box-green">
                <CheckCircle2 size={18} />
              </div>
              <div className="vin-activity-details">
                <div className="vin-activity-title">Monitoring round completed</div>
                <div className="vin-activity-sub">Vinzons Covered Court • Round 2 Checks</div>
              </div>
            </div>

            {/* Activity 3 */}
            <div className="vin-activity-item">
              <div className="vin-activity-icon icon-box-blue">
                <Truck size={18} />
              </div>
              <div className="vin-activity-details">
                <div className="vin-activity-title">Household transferred</div>
                <div className="vin-activity-sub">H2 moved to VCES, Room 4</div>
              </div>
            </div>

            {/* Activity 4 */}
            <div className="vin-activity-item">
              <div className="vin-activity-icon icon-box-orange">
                <MapPin size={18} />
              </div>
              <div className="vin-activity-details">
                <div className="vin-activity-title">New room placement</div>
                <div className="vin-activity-sub">Room 2 marked for follow-up list</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
