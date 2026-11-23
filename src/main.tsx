import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/global.css';

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);

if ('serviceWorker' in navigator && import.meta.env.PROD && !import.meta.env.VITE_EMBED) {
  addEventListener('load', () => navigator.serviceWorker.register('/sw.js', { type: 'module' }));
}
