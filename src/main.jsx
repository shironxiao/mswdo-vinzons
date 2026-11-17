import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'

// Automatically register service worker and activate updates immediately
registerSW({ immediate: true })

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
