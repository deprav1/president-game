import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initAnalytics, track, EVENTS } from './lib/analytics.js'

if (window.Telegram?.WebApp) {
  window.Telegram.WebApp.ready();
  window.Telegram.WebApp.expand();
}

// Аналитика: собрать контекст до рендера и ловить необработанные ошибки.
initAnalytics();
window.addEventListener('error', (e) => {
  track(EVENTS.ERROR, { message: String(e?.message || e), source: 'onerror' });
});
window.addEventListener('unhandledrejection', (e) => {
  track(EVENTS.ERROR, { message: String(e?.reason?.message || e?.reason || e), source: 'unhandledrejection' });
});
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
