# Mettre ICONIQ en ligne

Tout est préparé dans le code. Il te reste seulement des clics.

---

## Étape 1 : le site (Vercel), 2 minutes

Après cette étape, le jeu a sa vraie adresse et s'installe sur iPhone et Android en plein écran (mode local).

1. Va sur **vercel.com**, puis **Sign Up → Continue with GitHub**.
2. Clique sur **Add New… → Project**.
3. À côté de **Iconiq**, clique sur **Import**. Si le dépôt n'apparaît pas, clique sur « Adjust GitHub App Permissions » et autorise-le.
4. Ne change aucun réglage et clique sur **Deploy**.
5. Une minute plus tard, tu as une adresse du type `iconiq-xxx.vercel.app`.

**Installer sur iPhone :** ouvre l'adresse dans **Safari**, touche **Partager**, puis **Sur l'écran d'accueil**. Le jeu s'ouvre en plein écran comme une vraie app.

**Installer sur Android :** ouvre l'adresse dans Chrome, puis **⋮ → Installer l'application**.

Chaque fois que je modifie le jeu, Vercel le met à jour tout seul.

---

## Étape 2 : le mode en ligne (Supabase), 5 minutes

Cette étape débloque les comptes, la sauvegarde sur serveur, l'anti-triche, les échanges, le marché, les classements et le fil d'activité.

1. Va sur **supabase.com**, puis **Start your project → Continue with GitHub**.
2. Clique sur **New project**. Nom : `iconiq`. Choisis un mot de passe et la région **West EU (Paris)**, puis **Create**.
3. Quand le projet est prêt : menu de gauche **SQL Editor → New query**.
4. Ouvre le fichier **`supabase/setup.sql`** sur GitHub, clique sur l'icône « Copy raw file », colle tout dans l'éditeur, puis clique sur **Run**.
5. Menu **Project Settings → API**. Copie :
   - **Project URL**
   - la clé **anon public**
6. Retourne sur Vercel : ton projet → **Settings → Environment Variables**. Ajoute :
   - `VITE_SUPABASE_URL` = la Project URL
   - `VITE_SUPABASE_ANON_KEY` = la clé anon public
7. Sur Vercel, onglet **Deployments**, les **⋯** du dernier déploiement, puis **Redeploy**.

Le bouton « Jouer en ligne » est maintenant actif. Pour ne pas avoir à confirmer d'e-mail pendant les tests : Supabase → **Authentication → Sign In / Providers → Email**, décoche **Confirm email**.

> Tu peux aussi m'envoyer la Project URL et la clé **anon public** : ces deux valeurs sont publiques par nature. Je les intègre dans le projet. **Ne m'envoie jamais** la clé `service_role` ni ton mot de passe.

---

## Étape 3, plus tard : notifications push et paiements (Stripe)

On s'en occupera quand l'app sera finie, comme convenu.

---

## Jeu sur invitation

- La version publiée est **sur invitation uniquement**, sans mode local.
- **Le tout premier compte créé devient administrateur** : crée le tien en premier, tout de suite après avoir installé la base.
- Pour inviter quelqu'un : **Profil → 🎟️ Inviter des joueurs**. Choisis une durée (24 h, 3 jours, 7 jours), puis partage le lien.
- Chaque lien ne sert **qu'une fois**. La personne crée son compte avec, et le lien devient inutilisable pour tout le monde. Elle continue ensuite à jouer en se connectant avec son e-mail et son mot de passe.
- Tu peux annuler un lien pas encore utilisé et voir qui a utilisé chaque lien.
