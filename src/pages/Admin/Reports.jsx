import { useState } from 'react';
import { Calendar, FileText, Users, Package } from 'lucide-react';
import './Reports.css';

const REPORTS_LIST = [
  {
    id: 'daily-situation',
    title: 'Daily situation report',
    description: 'Centers, occupancy, presence, and relief activity for the current day.',
    formats: ['PDF', 'CSV'],
    lastGenerated: 'Generated just now',
    icon: FileText,
  },
  {
    id: 'household-masterlist',
    title: 'Household masterlist',
    description: 'Registered households, member counts, and current room placement.',
    formats: ['PDF', 'XLSX'],
    lastGenerated: '2 days ago',
    icon: Users,
  },
  {
    id: 'relief-goods-issuance',
    title: 'Relief-goods issuance',
    description: 'Stub batches, quantities issued, and duplicate-claim checks.',
    formats: ['PDF', 'CSV'],
    lastGenerated: '3 days ago',
    icon: Package,
  },
];

export default function Reports() {
  const [activeFilter, setActiveFilter] = useState('all');

  const handleDownload = (report) => {
    alert(`Downloading ${report.title} (${report.formats.join(', ')})`);
  };

  return (
    <div className="vin-reports-page">
      {/* Header */}
      <header className="vin-reports-header">
        <span className="vin-reports-eyebrow">RECORDS & EXPORT</span>
        <h1 className="vin-reports-title">Reports</h1>
        <p className="vin-reports-desc">
          Create a concise operational view for internal briefings, coordination, and daily documentation.
        </p>
      </header>

      {/* 4 Metrics summary boxes */}
      <section className="vin-reports-metrics-grid">
        <div className="vin-rep-metric-card card-green">
          <span className="vin-rep-metric-number">14</span>
          <span className="vin-rep-metric-label">Evacuation Center Active</span>
        </div>

        <div className="vin-rep-metric-card card-yellow">
          <span className="vin-rep-metric-number">300</span>
          <span className="vin-rep-metric-label">Household on Records</span>
        </div>

        <div className="vin-rep-metric-card card-yellow">
          <span className="vin-rep-metric-number">300</span>
          <span className="vin-rep-metric-label">Evacuee Present</span>
        </div>

        <div className="vin-rep-metric-card card-green">
          <span className="vin-rep-metric-number">300</span>
          <span className="vin-rep-metric-label">Relief Stub Issued</span>
        </div>
      </section>

      {/* Filter toolbar */}
      <div className="vin-reports-filters">
        <span className="vin-filter-label">FILTER REPORTS</span>
        <button
          type="button"
          className={`vin-filter-pill-btn ${activeFilter === 'all' ? 'active' : ''}`}
          onClick={() => setActiveFilter('all')}
        >
          All centers
        </button>
        <button
          type="button"
          className={`vin-filter-pill-btn ${activeFilter === 'date' ? 'active' : ''}`}
          onClick={() => setActiveFilter('date')}
        >
          <Calendar size={16} />
          <span>Date</span>
        </button>
        <button
          type="button"
          className={`vin-filter-pill-btn ${activeFilter === 'type' ? 'active' : ''}`}
          onClick={() => setActiveFilter('type')}
        >
          <span>Document type</span>
        </button>
      </div>

      {/* Table section */}
      <div className="vin-reports-table-card">
        <table className="vin-reports-table">
          <thead>
            <tr>
              <th>REPORT</th>
              <th>DESCRIPTION</th>
              <th>FORMAT</th>
              <th>LAST GENERATED</th>
              <th style={{ textAlign: 'right' }}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {REPORTS_LIST.map((item) => {
              const IconComp = item.icon;
              return (
                <tr key={item.id}>
                  <td>
                    <div className="vin-rep-title-cell">
                      <div className="vin-rep-icon-badge">
                        <IconComp size={18} />
                      </div>
                      <span className="vin-rep-name">{item.title}</span>
                    </div>
                  </td>
                  <td>
                    <span className="vin-rep-desc">{item.description}</span>
                  </td>
                  <td>
                    <div className="vin-rep-formats">
                      {item.formats.map((fmt) => (
                        <span key={fmt} className="vin-format-tag">
                          {fmt}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <span className="vin-rep-time">{item.lastGenerated}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      className="vin-download-btn"
                      onClick={() => handleDownload(item)}
                    >
                      Download
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
