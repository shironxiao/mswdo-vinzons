import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './AdminLogin.css';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('password123');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Directly navigate to Admin Dashboard
    navigate('/admin/dashboard');
  };

  const handleSwitchToMobile = () => {
    navigate('/login');
  };

  return (
    <div className="vin-admin-login-wrapper">
      <div className="vin-admin-login-container">
        {/* Left Visual / Logo Placeholder */}
        <div className="vin-admin-login-visual">
          <div className="vin-image-placeholder-box">
            <div className="vin-placeholder-circle" />
            <div className="vin-placeholder-hill" />
          </div>
        </div>

        {/* Right Dark Green Admin Card */}
        <div className="vin-admin-card-box">
          <h1 className="vin-admin-card-title">MSWDO - Vinzons</h1>

          <form className="vin-admin-form" onSubmit={handleSubmit}>
            {/* Username */}
            <div className="vin-admin-field-group">
              <label htmlFor="admin-username" className="vin-admin-label">
                Username
              </label>
              <div className="vin-admin-input-wrapper">
                <input
                  id="admin-username"
                  type="text"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="vin-admin-input"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="vin-admin-field-group">
              <label htmlFor="admin-password" className="vin-admin-label">
                Password
              </label>
              <div className="vin-admin-input-wrapper">
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
            <div className="vin-admin-submit-wrapper">
              <button
                type="submit"
                className="vin-admin-submit-btn"
                onClick={handleSubmit}
              >
                Log in
              </button>
            </div>
          </form>

          {/* Switch to Mobile link */}
          <div className="vin-admin-switch-box">
            <button
              type="button"
              className="vin-admin-switch-btn"
              onClick={handleSwitchToMobile}
            >
              Switch to Mobile Web Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
