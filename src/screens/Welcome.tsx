import { motion } from 'framer-motion';
import { useState } from 'react';
import { Card } from '../components/Card';
import { GAME } from '../config/game';
import { VARIANTS } from '../data/catalog';
import { sfx } from '../lib/fx';
import { toggleFullscreen } from '../lib/fullscreen';
import { onlineAvailable, supabase } from '../lib/supabase';
import { useGame } from '../store/game';

const FAN = ['commune', 'epique', 'secrete', 'legendaire', 'rare'].map((r) => VARIANTS.find((v) => v.rarity === r)!).filter(Boolean);

export function Welcome() {
  const start = useGame((s) => s.start);
  const toast = useGame((s) => s.toast);
  const [step, setStep] = useState<'intro' | 'auth'>('intro');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [signup, setSignup] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { error } = signup
        ? await supabase.auth.signUp({ email, password, options: { data: { username } } })
        : await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const { data } = await supabase.auth.getSession();
      if (!data.session) { toast('📧 Vérifie ta boîte mail pour confirmer ton compte.', 'success'); return; }
      await start('online');
    } catch (e) {
      sfx.error();
      toast((e as Error).message === 'Invalid login credentials' ? 'Email ou mot de passe incorrect' : (e as Error).message, 'error');
    } finally { setLoading(false); }
  };

  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 'calc(var(--safe-top) + 24px)', paddingBottom: 'calc(var(--safe-bottom) + 24px)' }}>
      <div style={{ position: 'relative', width: '100%', maxWidth: 520, height: 'min(70vw, 300px)' }}>
        {FAN.map((v, i) => {
          const off = i - (FAN.length - 1) / 2;
          return (
            <motion.div key={v.id} style={{ position: 'absolute', left: '50%', top: 10, width: 'min(32vw, 150px)', marginLeft: 'calc(min(32vw,150px) / -2)', transformOrigin: '50% 140%', zIndex: 10 - Math.abs(off) }}
              initial={{ y: 200, opacity: 0, rotate: 0 }} animate={{ y: Math.abs(off) * 10, opacity: 1, rotate: off * 12 }} transition={{ delay: 0.15 + i * 0.07, type: 'spring', stiffness: 120, damping: 14 }}>
              <Card variantId={v.id} serial={v.rarity === 'secrete' ? 1 : null} />
            </motion.div>
          );
        })}
      </div>
      <motion.div className="logo" style={{ fontSize: 'clamp(44px, 14vw, 76px)', marginTop: 8 }} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }}>ICONIQ</motion.div>
      <p className="sub" style={{ textAlign: 'center', maxWidth: 320, marginTop: 6 }}>{GAME.tagline}</p>

      <div style={{ width: '100%', maxWidth: 380, marginTop: 28, display: 'grid', gap: 10 }}>
        {step === 'intro' ? (
          <>
            {!import.meta.env.VITE_EMBED && <button className="btn block" disabled={!onlineAvailable} onClick={() => { sfx.tap(); setStep('auth'); }}>🌐 Jouer en ligne</button>}
            {!onlineAvailable && !import.meta.env.VITE_EMBED && <p className="sub" style={{ fontSize: 12, textAlign: 'center' }}>Serveur non configuré (voir README).</p>}
            <button className="btn ghost block" onClick={() => { sfx.tap(); toggleFullscreen(); start('local'); }}>{import.meta.env.VITE_EMBED ? '▶ Jouer (version de test)' : '📱 Jouer en local (hors-ligne)'}</button>
            <p className="sub" style={{ fontSize: 11, textAlign: 'center' }}>{import.meta.env.VITE_EMBED ? 'Version de test avec des personnages d’exemple. Progression sauvegardée sur cet appareil.' : 'Le mode local a sa propre sauvegarde, séparée du compte en ligne.'}</p>
          </>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'grid', gap: 10 }}>
            {signup && <input className="field" placeholder="Pseudo (3-20 caractères)" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />}
            <input className="field" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            <input className="field" type="password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={signup ? 'new-password' : 'current-password'} onKeyDown={(e) => e.key === 'Enter' && submit()} />
            <button className="btn block" disabled={loading || !email || password.length < 6} onClick={submit}>{loading ? '…' : signup ? 'Créer mon compte' : 'Se connecter'}</button>
            <button className="btn ghost block" onClick={() => setSignup(!signup)}>{signup ? 'J’ai déjà un compte' : 'Créer un compte'}</button>
            <button className="sub" style={{ marginTop: 4 }} onClick={() => setStep('intro')}>← Retour</button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
