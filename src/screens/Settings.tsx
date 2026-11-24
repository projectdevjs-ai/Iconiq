import { useState } from 'react';
import { useOnline } from '../components/OnlineOnly';
import { isMuted, setMuted, setVibration, sfx, vibrationOn } from '../lib/fx';
import { canInstall, promptInstall } from '../lib/install';
import { musicWanted, setMusic } from '../lib/music';
import { enablePush, isStandalone } from '../lib/push';
import { supabase } from '../lib/supabase';
import { enableGyro } from '../lib/tilt';
import { toggleFullscreen } from '../lib/fullscreen';
import { useGame } from '../store/game';

function Toggle({ label, desc, on, onChange }: { label: string; desc?: string; on: boolean; onChange(v: boolean): void }) {
  return (
    <button className="setting" onClick={() => { onChange(!on); }} role="switch" aria-checked={on}>
      <span style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
        <b>{label}</b>
        {desc && <span className="sub" style={{ display: 'block', fontSize: 12 }}>{desc}</span>}
      </span>
      <span className={`switch ${on ? 'on' : ''}`}><i /></span>
    </button>
  );
}

const pref = (k: string, d: boolean) => { try { const v = localStorage.getItem(k); return v == null ? d : v === '1'; } catch { return d; } };
const setPref = (k: string, v: boolean) => { try { localStorage.setItem(k, v ? '1' : '0'); } catch { /* */ } };

export function applyReduceMotion() { document.body.classList.toggle('reduce', pref('iconiq-reduce', false)); }

export function Settings() {
  const profile = useGame((s) => s.profile)!;
  const backend = useGame((s) => s.backend)!;
  const toast = useGame((s) => s.toast);
  const go = useGame((s) => s.go);
  const signOut = useGame((s) => s.signOut);
  const setProfile = useGame((s) => s.setProfile);
  const resetLocal = useGame((s) => s.resetLocal);
  const api = useOnline();
  const [sound, setSound] = useState(!isMuted());
  const [music, setMus] = useState(musicWanted());
  const [vibe, setVibe] = useState(vibrationOn());
  const [reduce, setReduce] = useState(pref('iconiq-reduce', false));
  const [name, setName] = useState(profile.username);
  const [pw, setPw] = useState('');
  const [danger, setDanger] = useState<'' | 'reset' | 'delete'>('');
  const [confirm, setConfirm] = useState('');
  const online = backend.mode === 'online';

  const saveName = async () => {
    try { setProfile(await backend.setUsername(name)); sfx.coin(); toast('Pseudo mis à jour', 'success'); }
    catch (e) { sfx.error(); toast((e as Error).message, 'error'); }
  };
  const savePw = async () => {
    const { error } = await supabase!.auth.updateUser({ password: pw });
    if (error) { sfx.error(); toast(error.message, 'error'); } else { setPw(''); toast('Mot de passe changé ✔', 'success'); }
  };
  const logout = async () => { if (online) await supabase?.auth.signOut(); signOut(); go('home'); };
  const del = async () => {
    try { await api!.deleteAccount(); signOut(); go('home'); toast('Compte supprimé. À bientôt 👋', 'success'); }
    catch (e) { sfx.error(); toast((e as Error).message, 'error'); }
  };

  return (
    <div className="wrap">
      <button className="sub" onClick={() => go('profile')}>← Profil</button>
      <h1 className="h1" style={{ marginTop: 6 }}>Réglages</h1>

      <h2 className="h2">👤 Compte</h2>
      <div className="glass settings-group">
        <label className="sub" htmlFor="s-name" style={{ fontSize: 12 }}>Pseudo</label>
        <div className="row">
          <input id="s-name" className="field" value={name} maxLength={20} onChange={(e) => setName(e.target.value)} style={{ height: 44 }} />
          <button className="btn sm" onClick={saveName} disabled={name === profile.username}>OK</button>
        </div>
        {online && <>
          <label className="sub" htmlFor="s-pw" style={{ fontSize: 12, marginTop: 6 }}>Nouveau mot de passe</label>
          <div className="row">
            <input id="s-pw" className="field" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="6 caractères minimum" style={{ height: 44 }} />
            <button className="btn sm" onClick={savePw} disabled={pw.length < 6}>OK</button>
          </div>
        </>}
      </div>

      <h2 className="h2">🔊 Son & sensations</h2>
      <div className="glass settings-group">
        <Toggle label="Effets sonores" on={sound} onChange={(v) => { setMuted(!v); setSound(v); if (v) sfx.coin(); }} />
        <Toggle label="Musique d’ambiance" on={music} onChange={(v) => { setMusic(v); setMus(v); }} />
        <Toggle label="Vibrations" desc="Android uniquement (iPhone ne le permet pas aux sites)" on={vibe} onChange={(v) => { setVibration(v); setVibe(v); if (v) sfx.tap(); }} />
      </div>

      <h2 className="h2">✨ Affichage</h2>
      <div className="glass settings-group">
        <Toggle label="Réduire les animations" desc="Moins d’effets, plus économe en batterie" on={reduce} onChange={(v) => { setPref('iconiq-reduce', v); setReduce(v); applyReduceMotion(); }} />
        <button className="setting" onClick={async () => toast((await enableGyro()) ? '📱 Bouge ton téléphone : les cartes brillent !' : 'Gyroscope indisponible')}><b style={{ flex: 1, textAlign: 'left' }}>Effet holo au gyroscope</b><span className="sub">Activer ›</span></button>
        <button className="setting" onClick={async () => { if (!(await toggleFullscreen())) toast(/iPhone|iPad/.test(navigator.userAgent) ? 'Sur iPhone : Partager → « Sur l’écran d’accueil », puis ouvre ICONIQ depuis l’icône : il sera en plein écran.' : 'Plein écran indisponible ici.'); }}><b style={{ flex: 1, textAlign: 'left' }}>Plein écran</b><span className="sub">›</span></button>
        <button className="setting" onClick={() => { try { localStorage.removeItem('iconiq-intro'); } catch { /* */ } location.reload(); }}><b style={{ flex: 1, textAlign: 'left' }}>Revoir l’introduction</b><span className="sub">›</span></button>
      </div>

      <h2 className="h2">🔔 Notifications</h2>
      <div className="glass settings-group">
        <button className="setting" onClick={async () => toast(await enablePush())}><b style={{ flex: 1, textAlign: 'left' }}>Activer les notifications</b><span className="sub">›</span></button>
        <p className="sub" style={{ fontSize: 12 }}>Booster prêt, demandes d’amis, échanges, ventes.{!isStandalone() && /iPhone|iPad/.test(navigator.userAgent) ? ' Sur iPhone : installe d’abord l’app (Partager → Sur l’écran d’accueil).' : ''}</p>
        {canInstall() && <button className="btn block" onClick={promptInstall}>📲 Installer l’application</button>}
      </div>

      <h2 className="h2">⚠️ Zone sensible</h2>
      <div className="glass settings-group">
        <button className="btn ghost block" onClick={logout}>{online ? 'Se déconnecter' : 'Quitter le mode local'}</button>
        {!online && (danger === 'reset' ? (
          <div className="danger-box">
            <b>Effacer toute ta progression locale ?</b>
            <div className="row"><button className="btn ghost sm" style={{ flex: 1 }} onClick={() => setDanger('')}>Annuler</button>
              <button className="btn danger sm" style={{ flex: 1 }} onClick={async () => { await resetLocal(); setDanger(''); toast('Progression réinitialisée', 'success'); go('home'); }}>Tout effacer</button></div>
          </div>
        ) : <button className="btn ghost block" style={{ color: 'var(--danger)' }} onClick={() => setDanger('reset')}>🗑️ Réinitialiser ma progression</button>)}
        {online && (danger === 'delete' ? (
          <div className="danger-box">
            <b>Supprimer définitivement ton compte ?</b>
            <p className="sub" style={{ fontSize: 13 }}>Toutes tes cartes, éclats, gemmes, amis et échanges seront effacés. C’est irréversible. Écris <b>SUPPRIMER</b> pour confirmer.</p>
            <input className="field" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="SUPPRIMER" style={{ height: 44 }} />
            <div className="row"><button className="btn ghost sm" style={{ flex: 1 }} onClick={() => { setDanger(''); setConfirm(''); }}>Annuler</button>
              <button className="btn danger sm" style={{ flex: 1 }} disabled={confirm !== 'SUPPRIMER'} onClick={del}>Supprimer</button></div>
          </div>
        ) : <button className="btn ghost block" style={{ color: 'var(--danger)' }} onClick={() => setDanger('delete')}>Supprimer mon compte</button>)}
      </div>
      <p className="sub" style={{ textAlign: 'center', fontSize: 11, marginTop: 24 }}>ICONIQ · {online ? 'Sauvegarde serveur automatique' : 'Sauvegarde locale automatique'}</p>
    </div>
  );
}
