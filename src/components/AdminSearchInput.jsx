import { Search, X } from 'lucide-react';

export default function AdminSearchInput({ value, onChange, placeholder, style }) {
  return (
    <div className="vin-feature-search-wrapper" style={{ flex: 1, maxWidth: 360, ...style }}>
      <Search size={16} className="vin-feature-search-icon" />
      <input
        type="text"
        className="vin-feature-search-input"
        placeholder={placeholder}
        aria-label={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {value && (
        <button
          type="button"
          className="vin-feature-search-clear"
          onClick={() => onChange('')}
          aria-label="Clear search"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
