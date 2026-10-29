import { useState } from 'react';
import { User, Lock, Eye, EyeOff, Smartphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import mswdoLogo from '../../assets/mswdo logo.png';
import './AdminLogin.css';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('password123');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Navigate directly to Admin Dashboard
    navigate('/admin/dashboard');
  };

  const handleSwitchToMobile = () => {
    navigate('/login');
  };

  return (
    <div className="vin-admin-login-wrapper">
      <div className="vin-admin-login-card">
        {/* Top Header */}
        <header className="vin-admin-login-header">
          <div className="vin-admin-login-logo-wrap">
            <img
              src={mswdoLogo}
              alt="MSWDO Vinzons Logo"
              className="vin-admin-login-logo"
            />
          </div>
          <p className="vin-admin-system-subtitle">Evacuee Management System</p>
          <h1 className="vin-admin-system-title">MSWDO - Vinzons</h1>
          <span className="vin-admin-badge">Admin Portal</span>
        </header>

        {/* Login Form */}
        <div className="vin-admin-login-body">
          <form className="vin-admin-login-form" onSubmit={handleSubmit}>
            {/* Username Field */}
            <div className="vin-admin-field-group">
              <label htmlFor="admin-username" className="vin-admin-field-label">
                ADMIN USERNAME / EMAIL
              </label>
              <div className="vin-admin-input-wrapper">
                <span className="vin-admin-field-icon">
                  <User size={19} />
                </span>
                <input
                  id="admin-username"
                  name="username"
                  type="text"
                  placeholder="Enter admin username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  className="vin-admin-input"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="vin-admin-field-group">
              <label htmlFor="admin-password" className="vin-admin-field-label">
                PASSWORD
              </label>
              <div className="vin-admin-input-wrapper">
                <span className="vin-admin-field-icon">
                  <Lock size={19} />
                </span>
                <input
                  id="admin-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="vin-admin-input"
                  required
                />
                <button
                  type="button"
                  className="vin-admin-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button type="submit" className="vin-admin-submit-btn">
              Sign In as Admin
            </button>
          </form>

          {/* Switch to Mobile link */}
          <div className="vin-admin-switch-box">
            <button
              type="button"
              className="vin-admin-switch-link"
              onClick={handleSwitchToMobile}
            >
              <Smartphone size={17} />
              <span>Switch to Mobile Web Login</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
