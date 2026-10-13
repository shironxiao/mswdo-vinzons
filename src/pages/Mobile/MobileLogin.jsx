import { useState } from 'react';
import { User, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './MobileLogin.css';

export default function MobileLogin() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: 'aaugorio@gmail.com',
    password: 'password1234',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Navigate to Mobile Dashboard on click
    navigate('/mobile/dashboard');
  };

  const handleSwitchToAdmin = () => {
    navigate('/admin/login');
  };

  return (
    <div className="vin-mobile-login-wrapper">
      <div className="vin-mobile-login-card">
        {/* Top Header */}
        <header className="vin-mobile-login-header">
          <p className="vin-mobile-system-subtitle">Evacuee Management System</p>
          <h1 className="vin-mobile-system-title">MSWDO - Vinzons</h1>
        </header>

        {/* Login Form */}
        <div className="vin-mobile-login-body">
          <form className="vin-mobile-login-form" onSubmit={handleSubmit}>
            {/* Email / Username Field */}
            <div className="vin-mobile-field-group">
              <label htmlFor="username" className="vin-mobile-field-label">
                EMAIL/USERNAME
              </label>
              <div className="vin-mobile-input-wrapper">
                <span className="vin-mobile-field-icon">
                  <User size={19} />
                </span>
                <input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="Enter email or username"
                  value={formData.username}
                  onChange={handleChange}
                  className="vin-mobile-input"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="vin-mobile-field-group">
              <label htmlFor="password" className="vin-mobile-field-label">
                PASSWORD
              </label>
              <div className="vin-mobile-input-wrapper">
                <span className="vin-mobile-field-icon">
                  <Lock size={19} />
                </span>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={formData.password}
                  onChange={handleChange}
                  className="vin-mobile-input"
                  required
                />
                <button
                  type="button"
                  className="vin-mobile-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </div>

            {/* Sign In Button */}
            <button type="submit" className="vin-mobile-submit-btn">
              Sign In
            </button>
          </form>

          {/* Switch to Admin Link Button */}
          <div className="vin-mobile-switch-box">
            <button
              type="button"
              className="vin-mobile-switch-link"
              onClick={handleSwitchToAdmin}
            >
              <ShieldCheck size={17} />
              <span>Switch to Admin</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
