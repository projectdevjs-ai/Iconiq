# ICONIQ — jeu de cartes à collectionner (PWA)

Installable sur iOS et Android (PWA), en local (hors-ligne) ou en ligne (anti-triche serveur).

## Fonctions
- **Booster quotidien** à découper au doigt : la déchirure suit ton tracé, avec étincelles, son et vibration. Série de jours consécutifs avec bonus.
- **7 raretés** : Commune → Peu commune → Rare → Épique → Légendaire → **Mythique** → **Secrète** (0,05 %). Mythiques et Secrètes **numérotées** (#1, #2…).
- **Garanties** : une Épique ou mieux au moins tous les 10 packs, une Légendaire ou mieux tous les 40.
- **Révélation** carte par carte : retournement 3D, montée de tension pour les cartes rares, rayons, flash, secousse, confettis.
- **Cartes holographiques** qui réagissent au doigt **et au gyroscope**, **vue 3D** (rotation, zoom, reflets irisés).
- **Recyclage** des doubles en éclats ✦, **fabrication** de n'importe quelle carte avec ces éclats.
- **Échanges** entre joueurs, **marché** en éclats (5 % de commission), **classement**.
- **Boutique** : gemmes via Stripe. Les packs payés en gemmes ont **les mêmes taux** que les packs gratuits, et **aucune carte n'est réservée au paiement**. Les probabilités sont affichées.
- **Notifications push** (booster prêt, échange reçu, carte vendue, achat confirmé), temps réel.
- **Mode Combat** : écran « Bientôt » prêt pour une prochaine mise à jour.
- Bonus : ondes lumineuses au toucher, compteurs animés, transitions fluides, partage d'une carte en image. Easter egg : touche le logo 7 fois.

## 1. Ajouter tes personnages
1. Mets les images dans `public/cards/` (format **750×1050**, en WebP de préférence).
2. Dans `src/data/catalog.ts`, ajoute chaque personnage et ses versions. Chaque version a une rareté et une image différentes :
   ```ts
   { id: 'jean-l', rarity: 'legendaire', title: 'Le soir du match', image: '/cards/jean-l.webp' }
   ```
   ⚠️ Ne renomme jamais un `id` une fois le jeu en ligne.
3. `npm run seed` régénère `supabase/seed.sql` (le serveur utilise exactement les mêmes taux et cartes).

Les règles (taux, prix, récompenses) se trouvent dans `src/config/game.ts`.

## 2. Lancer en local
```bash
npm install
npm run dev
```
Sans configuration, seul le mode local est disponible. Il utilise une sauvegarde séparée sur l'appareil.

## 3. Mettre en ligne (Supabase + Stripe)
1. Crée un projet sur supabase.com.
2. Dans *SQL Editor*, exécute `supabase/migrations/0001_schema.sql` puis `supabase/seed.sql`.
3. Copie `.env.example` en `.env.local` et remplis l'URL du projet et la clé `anon`.
4. Génère les clés push : `npx web-push generate-vapid-keys`. La publique va dans `VITE_VAPID_PUBLIC_KEY`.
5. Déploie les fonctions avec la CLI Supabase :
   ```bash
   supabase functions deploy create-checkout
   supabase functions deploy stripe-webhook --no-verify-jwt
   supabase functions deploy push-dispatch --no-verify-jwt
   supabase secrets set STRIPE_SECRET_KEY=sk_... STRIPE_WEBHOOK_SECRET=whsec_... APP_URL=https://ton-domaine \
     VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:toi@exemple.com CRON_SECRET=une-longue-chaine
   ```
6. Dans Stripe, crée un webhook vers `https://<projet>.supabase.co/functions/v1/stripe-webhook` avec les événements `checkout.session.completed` et `checkout.session.async_payment_succeeded`.
7. Notifications planifiées : active `pg_cron` et `pg_net`, puis exécute :
   ```sql
   select cron.schedule('push', '*/5 * * * *', $$
     select net.http_post('https://<projet>.supabase.co/functions/v1/push-dispatch',
       headers := '{"x-cron-secret":"une-longue-chaine"}'::jsonb) $$);
   ```
8. `npm run build`, puis héberge le dossier `dist/` (Vercel, Netlify, Cloudflare Pages…). Configure une redirection SPA de toutes les routes vers `/index.html`.

## Anti-triche
- Le client ne peut **rien écrire** en base (RLS sans politique d'écriture).
- Tirages, soldes, échanges et marché passent par des fonctions serveur qui valident tout, avec un aléatoire cryptographique (`pgcrypto`) et des verrous de ligne contre les doubles clics.
- Les gemmes ne sont créditées que par le webhook Stripe signé, une seule fois par paiement.
- Le mode local ne se synchronise jamais avec le compte en ligne.

## iOS
Notifications push et plein écran : il faut ouvrir le site dans Safari, puis *Partager → Sur l'écran d'accueil* (iOS 16.4 ou plus).
