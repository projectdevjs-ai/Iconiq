import { memo, useRef, type CSSProperties } from 'react';
import { RARITY } from '../config/game';
import { VARIANT_BY_ID } from '../data/catalog';
import { cardImage } from '../lib/art';
import { useTilt } from '../lib/tilt';

interface Props {
  variantId: string;
  serial?: number | null;
  interactive?: boolean;
  isNew?: boolean;
  count?: number;
  dim?: boolean;
  strength?: number;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
}

export const Card = memo(function Card({ variantId, serial, interactive = true, isNew, count, dim, strength = 16, className = '', style, onClick }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useTilt(ref, interactive && !dim, strength);
  const v = VARIANT_BY_ID[variantId];
  if (!v) return null;
  const r = RARITY[v.rarity];
  return (
    <div
      ref={ref}
      className={`tcg ${dim ? 'dim' : ''} ${className}`}
      data-rank={r.rank}
      style={{ '--rc': r.color, '--rg': r.glow, ...style } as CSSProperties}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      aria-label={`${v.characterName} — ${v.title} (${r.label})`}
    >
      {v.fullCard ? (
        <div className="tcg-inner full">
          <img className="tcg-art" src={cardImage(v)} alt="" loading="lazy" decoding="async" draggable={false} />
          <div className="tcg-shine" />
          <div className="tcg-sparkle" />
          <div className="tcg-glare" />
          {serial != null && <span className="tcg-serial-badge">#{serial}</span>}
        </div>
      ) : (
      <div className="tcg-inner">
        <img className="tcg-art" src={cardImage(v)} alt="" loading="lazy" decoding="async" draggable={false} />
        <div className="tcg-shine" />
        <div className="tcg-sparkle" />
        <div className="tcg-frame" />
        <div className="tcg-glare" />
        <div className="tcg-top">
          <span className="tcg-rarity">{r.label}</span>
          {serial != null && <span className="tcg-serial">#{serial}</span>}
        </div>
        <div className="tcg-bottom">
          <div className="tcg-name">{v.characterName}</div>
          <div className="tcg-title">{v.title}</div>
          <div className="tcg-gems">{Array.from({ length: r.rank + 1 }, (_, i) => <i key={i} />)}</div>
        </div>
      </div>
      )}
      {isNew && <span className="tcg-new">NEW</span>}
      {count != null && count > 1 && <span className="tcg-count">×{count}</span>}
    </div>
  );
});

export function CardBack({ style }: { style?: CSSProperties }) {
  return (
    <div className="tcg" style={style}>
      <div className="tcg-back"><span className="tcg-back-logo">ICONIQ</span></div>
    </div>
  );
}
