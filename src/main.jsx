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
    }, 450);
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
  // Let the user appreciate the clean zoom-in animation before fading out smoothly
  setTimeout(dismissSplash, 950);
}
