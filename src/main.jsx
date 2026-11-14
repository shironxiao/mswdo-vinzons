import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

const splash = document.getElementById('pwa-splash-screen');

if (splash && !document.documentElement.classList.contains('skip-app-splash')) {
  const dismissSplash = () => {
    splash.classList.add('pwa-splash-fade-out');
    window.setTimeout(() => splash.remove(), 400);
  };

  // Allow the loading animation to smoothly cycle before revealing login
  window.setTimeout(dismissSplash, 1300);
} else {
  splash?.remove();
}
