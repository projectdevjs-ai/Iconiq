import { motion } from 'framer-motion';
import { Card } from '../components/Card';
import { VARIANTS } from '../data/catalog';

export function Battle() {
  const showcase = [VARIANTS.find((v) => v.rarity === 'legendaire'), VARIANTS.find((v) => v.rarity === 'mythique')].filter(Boolean);
  return (
    <div className="wrap" style={{ textAlign: 'center' }}>
      <div style={{ position: 'relative', height: 'min(80vw, 360px)', marginTop: 10 }}>
        {showcase.map((v, i) => (
          <motion.div key={v!.id} style={{ position: 'absolute', top: 20, width: 'min(38vw, 170px)', left: i ? '52%' : 'auto', right: i ? 'auto' : '52%', filter: 'grayscale(.7) brightness(.5) blur(1px)' }}
            animate={{ x: i ? [30, 0, 30] : [-30, 0, -30], rotate: i ? [10, 4, 10] : [-10, -4, -10] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}>
            <Card variantId={v!.id} interactive={false} />
          </motion.div>
        ))}
        <motion.div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 80, filter: 'drop-shadow(0 0 30px #ff3d6e)' }}
          animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 1.2, repeat: Infinity }}>⚔️</motion.div>
      </div>
      <span className="pill" style={{ color: 'var(--gold)', marginTop: 10 }}>🔒 BIENTÔT</span>
      <h1 className="h1" style={{ marginTop: 14 }}>Mode Combat</h1>
      <p className="sub" style={{ maxWidth: 420, margin: '0 auto' }}>
        Affronte tes amis avec tes cartes. Disponible dans une prochaine mise à jour. Commence dès maintenant à construire ta collection !
      </p>
    </div>
  );
}
