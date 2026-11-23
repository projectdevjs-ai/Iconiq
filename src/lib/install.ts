let deferred: any = null;
const subs = new Set<() => void>();
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; subs.forEach((f) => f()); });
export const canInstall = () => !!deferred;
export const onInstallChange = (f: () => void) => { subs.add(f); return () => subs.delete(f); };
export async function promptInstall() {
  if (!deferred) return false;
  deferred.prompt();
  const r = await deferred.userChoice;
  deferred = null;
  subs.forEach((f) => f());
  return r.outcome === 'accepted';
}
