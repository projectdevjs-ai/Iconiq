#!/data/data/com.termux/files/usr/bin/bash
# ════════════════════════════════════════════════════════════════
#  ICONIQ : mise en ligne automatique depuis Termux (Android)
#  1) Vercel : le site (obligatoire)
#  2) Supabase : le mode en ligne (optionnel, demande un jeton)
# ════════════════════════════════════════════════════════════════
set -e
say() { printf '\n\033[1;35m▶ %s\033[0m\n' "$1"; }
json() { node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const o=JSON.parse(s);console.log(eval('o'+process.argv[1])??'')})" "$1"; }

say "Installation des outils (node, git)…"
pkg update -y >/dev/null 2>&1 || true
pkg install -y nodejs-lts git >/dev/null 2>&1 || pkg install -y nodejs git

cd "$HOME"
if [ ! -d iconiq ]; then
  say "Téléchargement du jeu depuis GitHub…"
  if ! git clone --depth 1 https://github.com/projectdevjs-ai/Iconiq.git iconiq; then
    say "Dépôt privé : connexion GitHub nécessaire"
    pkg install -y gh
    gh auth login --web -h github.com
    gh repo clone projectdevjs-ai/Iconiq iconiq -- --depth 1
  fi
else
  say "Mise à jour du jeu…"
  git -C iconiq pull --ff-only || true
fi
cd iconiq

VC="npx --yes vercel@latest"
say "Connexion à Vercel (un lien va s'ouvrir, choisis « Continue with GitHub »)"
$VC whoami >/dev/null 2>&1 || $VC login
$VC link --yes --project iconiq

# ─── Supabase (optionnel) ─────────────────────────────────────
printf '\nConfigurer aussi le mode en ligne (Supabase) ? [o/N] '
read -r WANT
if [ "$WANT" = "o" ] || [ "$WANT" = "O" ]; then
  echo
  echo "1. Crée un compte sur https://supabase.com (Continue with GitHub)"
  echo "2. Ouvre https://supabase.com/dashboard/account/tokens"
  echo "3. « Generate new token », nomme-le iconiq, copie-le"
  printf '\nColle le jeton (sbp_…) puis Entrée : '
  read -r SBP
  API=https://api.supabase.com/v1
  H=(-H "Authorization: Bearer $SBP" -H "Content-Type: application/json")

  ORG=$(curl -fsS "${H[@]}" $API/organizations | json '[0].id')
  [ -z "$ORG" ] && { echo "Aucune organisation Supabase trouvée : ouvre une fois le tableau de bord supabase.com puis relance."; exit 1; }
  PASS=$(node -e "console.log(require('crypto').randomBytes(18).toString('base64url'))")

  REF=$(curl -fsS "${H[@]}" $API/projects | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const p=JSON.parse(s).find(x=>x.name==='iconiq');console.log(p?p.id:'')})")
  if [ -z "$REF" ]; then
    say "Création du projet Supabase « iconiq » (Paris)…"
    REF=$(curl -fsS "${H[@]}" -X POST $API/projects \
      -d "{\"name\":\"iconiq\",\"organization_id\":\"$ORG\",\"db_pass\":\"$PASS\",\"region\":\"eu-west-3\"}" | json '.id')
    echo "Mot de passe de la base (garde-le) : $PASS"
  fi
  say "Attente du démarrage de la base (2 à 4 minutes)…"
  for i in $(seq 1 60); do
    ST=$(curl -fsS "${H[@]}" $API/projects/$REF | json '.status')
    [ "$ST" = "ACTIVE_HEALTHY" ] && break
    printf '.'; sleep 10
  done; echo

  say "Installation du schéma, des règles anti-triche et des cartes…"
  node -e "process.stdout.write(JSON.stringify({query:require('fs').readFileSync('supabase/setup.sql','utf8')}))" > /tmp/iconiq-q.json 2>/dev/null \
    || node -e "process.stdout.write(JSON.stringify({query:require('fs').readFileSync('supabase/setup.sql','utf8')}))" > "$PREFIX/tmp/iconiq-q.json"
  Q=/tmp/iconiq-q.json; [ -f "$Q" ] || Q="$PREFIX/tmp/iconiq-q.json"
  curl -fsS "${H[@]}" -X POST $API/projects/$REF/database/query --data-binary @"$Q" >/dev/null \
    && echo "Base installée ✔" || echo "⚠️ Échec de l'installation SQL (peut-être déjà installée)."

  # pas de confirmation d'e-mail pour démarrer plus vite
  curl -fsS "${H[@]}" -X PATCH $API/projects/$REF/config/auth -d '{"mailer_autoconfirm":true}' >/dev/null || true

  ANON=$(curl -fsS "${H[@]}" "$API/projects/$REF/api-keys" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const k=JSON.parse(s).find(x=>x.name==='anon');console.log(k?k.api_key:'')})")
  URL="https://$REF.supabase.co"

  say "Branchement de Supabase dans Vercel…"
  for E in production preview; do
    $VC env rm VITE_SUPABASE_URL $E --yes >/dev/null 2>&1 || true
    $VC env rm VITE_SUPABASE_ANON_KEY $E --yes >/dev/null 2>&1 || true
    printf '%s' "$URL"  | $VC env add VITE_SUPABASE_URL $E >/dev/null
    printf '%s' "$ANON" | $VC env add VITE_SUPABASE_ANON_KEY $E >/dev/null
  done
fi

say "Publication du jeu sur Vercel (1 à 2 minutes)…"
OUT=$($VC deploy --prod --yes 2>&1 | tee /dev/stderr | grep -Eo 'https://[a-z0-9.-]+\.vercel\.app' | tail -1)
$VC git connect --yes >/dev/null 2>&1 || true   # mises à jour automatiques à chaque push GitHub

say "C'EST EN LIGNE 🎉"
echo "Adresse : ${OUT:-voir ci-dessus}"
echo "iPhone  : ouvre-la dans Safari → Partager → « Sur l'écran d'accueil »"
echo "Android : ouvre-la dans Chrome → ⋮ → « Installer l'application »"
