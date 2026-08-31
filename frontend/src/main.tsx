// Suppress external third-party Chrome extension noise in developer console
if (typeof window !== 'undefined') {
  const origError = console.error;
  console.error = (...args: any[]) => {
    const msg = args[0] ? String(args[0]) : '';
    if (
      msg.includes('chrome-extension://') ||
      msg.includes('couponCollection') ||
      msg.includes('widget sdk') ||
      msg.includes('[BHK]')
    ) {
      return;
    }
    origError.apply(console, args);
  };

  window.addEventListener('error', (event) => {
    const src = event.filename || '';
    if (src.startsWith('chrome-extension://') || src.includes('couponCollection')) {
      event.preventDefault();
      event.stopPropagation();
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason ? String(event.reason) : '';
    if (reason.includes('chrome-extension://') || reason.includes('couponCollection')) {
      event.preventDefault();
      event.stopPropagation();
    }
  });
}

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
