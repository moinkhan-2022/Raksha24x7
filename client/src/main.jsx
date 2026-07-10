import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { AdminAuthProvider } from './context/AdminAuthContext';
import { NotificationProvider } from './context/NotificationContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AdminAuthProvider>
          <NotificationProvider>
            <App />
          </NotificationProvider>
        </AdminAuthProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

window.addEventListener('load', () => {
  const splash = document.getElementById('raksha-startup-splash');
  if (splash) {
    splash.classList.add('raksha-splash-hidden');
    window.setTimeout(() => splash.remove(), 350);
  }

  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    let refreshing = false;

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing || sessionStorage.getItem('raksha_sw_update_confirmed') !== '1') return;
      refreshing = true;
      sessionStorage.removeItem('raksha_sw_update_confirmed');
      window.location.reload();
    });

    navigator.serviceWorker.register('/sw.js', { scope: '/' }).then((registration) => {
      const notifyUpdate = () => {
        if (registration.waiting) {
          window.dispatchEvent(new CustomEvent('raksha:pwa-update', { detail: { registration } }));
        }
      };

      notifyUpdate();

      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) notifyUpdate();
        });
      });

      window.addEventListener('online', () => {
        registration.sync?.register?.('raksha-background-refresh').catch(() => undefined);
        registration.active?.postMessage({ type: 'RAKSHA_REFRESH_CACHES' });
        registration.update().catch(() => undefined);
      });
    }).catch(() => {
      window.dispatchEvent(new CustomEvent('raksha:pwa-error', { detail: { message: 'Service worker registration failed.' } }));
    });
  }
});
