import { useGame } from '../store/game';
import type { OnlineFeatures } from '../engine/types';

export function useOnline(): OnlineFeatures | null {
  const b = useGame((s) => s.backend);
  return b?.mode === 'online' ? (b as unknown as OnlineFeatures) : null;
}

export function OnlineOnly({ what }: { what: string }) {
  return (
    <div className="empty">
      <div className="big">🌐</div>
      <p><b>{what}</b> nécessite le mode en ligne.</p>
      <p className="sub">Le mode local est une sauvegarde séparée sur ton appareil : pas d'échange possible, sinon la triche serait trop facile.</p>
    </div>
  );
}
