import { supabase } from './supabase';

const VAPID = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

function b64ToBytes(b64: string) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export function pushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function isStandalone() {
  return matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
}

export async function enablePush(): Promise<string> {
  if (!pushSupported()) {
    return /iPhone|iPad/.test(navigator.userAgent) && !isStandalone()
      ? 'Sur iPhone : ajoute d’abord ICONIQ à l’écran d’accueil (Partager → Sur l’écran d’accueil).'
      : 'Notifications non supportées sur cet appareil.';
  }
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return 'Notifications refusées.';
  if (!supabase || !VAPID) return 'Notifications locales activées (serveur push non configuré).';
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(VAPID) }));
  const j = sub.toJSON();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 'Connecte-toi pour recevoir les notifications.';
  await supabase.from('push_subscriptions').upsert({ endpoint: j.endpoint, p256dh: j.keys!.p256dh, auth: j.keys!.auth, user_id: user.id });
  return 'Notifications activées ✨';
}

/** Notification locale immédiate (mode local / premier plan). */
export async function localNotify(title: string, body: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const reg = await navigator.serviceWorker?.ready;
  reg?.showNotification(title, { body, icon: '/icons/icon-192.png', badge: '/icons/badge.png' });
}
