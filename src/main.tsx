import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/global.css';

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);

if ('serviceWorker' in navigator && import.meta.env.PROD && !import.meta.env.VITE_EMBED) {
  addEventListener('load', async () => {
    const reg = await navigator.serviceWorker.register('/sw.js', { type: 'module' });
    // vérifie les mises à jour à chaque retour sur l'app, et recharge dès qu'une nouvelle version est prête
    const check = () => reg.update().catch(() => {});
    document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && check());
    setInterval(check, 30 * 60 * 1000);
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloaded) { reloaded = true; location.reload(); } });
  });
}
