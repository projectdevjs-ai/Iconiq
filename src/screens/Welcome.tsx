import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { checkInvite, clearInvite, inviteOnly, readInvite, type InviteStatus } from '../lib/invite';
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
  const [invite] = useState(() => readInvite());
  const [inv, setInv] = useState<InviteStatus | null>(null);
  const locked = inviteOnly();
  useEffect(() => {
    if (!locked) return;
    checkInvite(invite).then((st) => {
      setInv(st);
      if (st === 'valid' || st === 'first') { setSignup(true); setStep('auth'); }
    });
  }, [locked, invite]);

  const submit = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { error } = signup
        ? await supabase.auth.signUp({ email, password, options: { data: { username, invite } } })
        : await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const { data } = await supabase.auth.getSession();
      if (signup) clearInvite();
      if (!data.session) { toast('📧 Vérifie ta boîte mail pour confirmer ton compte, puis connecte-toi.', 'success'); setSignup(false); return; }
      await start('online');
    } catch (e) {
      sfx.error();
      const m = (e as Error).message;
      toast(m === 'Invalid login credentials' ? 'Email ou mot de passe incorrect'
        : /database error|INVITATION/i.test(m) ? 'Invitation invalide, expirée ou déjà utilisée.'
        : /already registered/i.test(m) ? 'Cet e-mail a déjà un compte : connecte-toi.' : m, 'error');
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
        {locked && step === 'intro' ? (
          <>
            <div className="glass" style={{ padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 30 }}>🔒</div>
              <b>Jeu sur invitation uniquement</b>
              <p className="sub" style={{ fontSize: 13, marginTop: 6 }}>
                {inv === 'used' ? 'Ce lien a déjà été utilisé. S’il est à toi, connecte-toi avec ton e-mail.'
                  : inv === 'expired' ? 'Ce lien a expiré. Demande un nouveau lien à la personne qui t’a invité.'
                  : inv === 'revoked' ? 'Ce lien a été annulé.'
                  : invite && inv === 'unknown' ? 'Ce lien n’est pas valide.'
                  : 'Il te faut un lien d’invitation pour créer un compte.'}
              </p>
            </div>
            <button className="btn block" onClick={() => { sfx.tap(); setSignup(false); setStep('auth'); }}>J’ai déjà un compte · Se connecter</button>
          </>
        ) : step === 'intro' ? (
          <>            {!import.meta.env.VITE_EMBED && <button className="btn block" disabled={!onlineAvailable} onClick={() => { sfx.tap(); setStep('auth'); }}>🌐 Jouer en ligne</button>}
            {!onlineAvailable && !import.meta.env.VITE_EMBED && <p className="sub" style={{ fontSize: 12, textAlign: 'center' }}>Serveur non configuré (voir README).</p>}
            <button className="btn ghost block" onClick={() => { sfx.tap(); toggleFullscreen(); start('local'); }}>{import.meta.env.VITE_EMBED ? '▶ Jouer (version de test)' : '📱 Jouer en local (hors-ligne)'}</button>
            <p className="sub" style={{ fontSize: 11, textAlign: 'center' }}>{import.meta.env.VITE_EMBED ? 'Version de test. Ta progression est sauvegardée sur cet appareil.' : 'Le mode local a sa propre sauvegarde, séparée du compte en ligne.'}</p>
          </>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'grid', gap: 10 }}>
            {signup && <input className="field" placeholder="Pseudo (3-20 caractères)" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />}
            <input className="field" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            <input className="field" type="password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={signup ? 'new-password' : 'current-password'} onKeyDown={(e) => e.key === 'Enter' && submit()} />
            <button className="btn block" disabled={loading || !email || password.length < 6} onClick={submit}>{loading ? '…' : signup ? 'Créer mon compte' : 'Se connecter'}</button>
            {signup && invite && <p className="sub" style={{ fontSize: 12, textAlign: 'center' }}>🎟️ Invitation valide : elle sera liée à ton compte et ne pourra plus servir à personne.</p>}
            {(!locked || inv === 'valid' || inv === 'first') && <button className="btn ghost block" onClick={() => setSignup(!signup)}>{signup ? 'J’ai déjà un compte' : 'Créer un compte'}</button>}
            {inv === 'first' && signup && <p className="sub" style={{ fontSize: 12, textAlign: 'center' }}>👑 Premier compte : il sera administrateur et pourra inviter les joueurs.</p>}
            <button className="sub" style={{ marginTop: 4 }} onClick={() => setStep('intro')}>← Retour</button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
