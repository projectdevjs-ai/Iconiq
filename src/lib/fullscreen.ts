/** Plein écran (navigateurs qui le permettent). Sur iPhone : installer l'app. */
export function isFullscreen() {
  const d = document as any;
  return !!(d.fullscreenElement || d.webkitFullscreenElement);
}
export async function toggleFullscreen(): Promise<boolean> {
  const d = document as any;
  const el = document.documentElement as any;
  try {
    if (isFullscreen()) { await (d.exitFullscreen?.() ?? d.webkitExitFullscreen?.()); return true; }
    const req = el.requestFullscreen ?? el.webkitRequestFullscreen;
    if (!req) return false;
    await req.call(el, { navigationUI: 'hide' });
    try { await (screen.orientation as any)?.lock?.('portrait'); } catch { /* */ }
    return true;
  } catch { return false; }
}
