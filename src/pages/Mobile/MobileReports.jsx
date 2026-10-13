import { useState } from 'react';
import { FileText, Download } from 'lucide-react';
import './MobileCommon.css';
import './MobileSubpages.css';

export default function MobileReports() {
  const [reportType, setReportType] = useState('Household');
  const [center, setCenter] = useState('All Centers');
  const [room, setRoom] = useState('All Rooms');

  const handleGenerate = (e) => {
    e.preventDefault();
    alert(`Generating ${reportType} report for ${center} (UI only)`);
  };

  return (
    <div className="vin-mob-page">
      <header className="vin-mob-header">
        <div className="vin-mob-header-info">
          <h1 className="vin-mob-title">Reports</h1>
          <p className="vin-mob-subtitle">Generate evacuee management reports</p>
        </div>
      </header>

      {/* Report Configuration Card matching Screenshot 2 Reports */}
      <form onSubmit={handleGenerate} className="vin-mob-report-card">
        <div className="vin-mob-report-header">
          <FileText size={20} color="#15803d" />
          <span>Report Configuration</span>
        </div>

        <div className="vin-mob-input-group">
          <label className="vin-mob-input-label">TYPE OF REPORT</label>
          <select
            className="vin-mob-select"
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
          >
            <option value="Household">Household</option>
            <option value="Evacuee Masterlist">Evacuee Masterlist</option>
            <option value="Relief Goods Issuance">Relief Goods Issuance</option>
            <option value="Monitoring Log">Monitoring Log</option>
          </select>
        </div>

        <div className="vin-mob-input-group">
          <label className="vin-mob-input-label">EVACUATION CENTER</label>
          <select
            className="vin-mob-select"
            value={center}
            onChange={(e) => setCenter(e.target.value)}
          >
            <option value="All Centers">All Centers</option>
            <option value="Vinzons Central Elementary School">Vinzons Central Elementary School</option>
            <option value="Vinzons Covered Court">Vinzons Covered Court</option>
            <option value="Calaguas National High School">Calaguas National High School</option>
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="vin-mob-input-group">
            <label className="vin-mob-input-label">DATE FROM</label>
            <input type="date" className="vin-mob-input-date" defaultValue="2026-09-01" />
          </div>
          <div className="vin-mob-input-group">
            <label className="vin-mob-input-label">DATE TO</label>
            <input type="date" className="vin-mob-input-date" defaultValue="2026-09-30" />
          </div>
        </div>

        <div className="vin-mob-input-group">
          <label className="vin-mob-input-label">ROOM</label>
          <select
            className="vin-mob-select"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
          >
            <option value="All Rooms">All Rooms</option>
            <option value="Room A-1">Room A-1</option>
            <option value="Room A-2">Room A-2</option>
            <option value="Room C-1">Room C-1</option>
            <option value="Room C-2">Room C-2</option>
          </select>
        </div>

        <button type="submit" className="vin-mob-generate-btn">
          <Download size={18} />
          <span>Generate Report</span>
        </button>
      </form>
    </div>
  );
}
