import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Smooth single splash dismissal for mobile PWA
const dismissSplash = () => {
  const splash = document.getElementById('pwa-splash-screen');
  if (splash) {
    try {
      sessionStorage.setItem('mswdo_pwa_splash_shown', 'true');
    } catch (e) {}
    splash.classList.add('pwa-splash-fade-out');
    setTimeout(() => {
      splash.remove();
    }, 400);
  }
};

// Check if splash was already shown this session
const alreadyShown = (() => {
  try {
    return Boolean(sessionStorage.getItem('mswdo_pwa_splash_shown'));
  } catch (e) {
    return false;
  }
})();

if (alreadyShown) {
  dismissSplash();
} else {
  // Allow loading animation to complete its smooth cycle then dismiss
  setTimeout(dismissSplash, 350);
}
