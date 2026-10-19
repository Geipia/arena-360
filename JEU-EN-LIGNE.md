# Mettre « Je parie » en ligne (10 minutes, gratuit)

Tant que ce n'est pas fait, le jeu marche en **mode local** : plusieurs joueurs peuvent créer leur équipe sur ce PC.
Une fois le serveur créé, tous ceux qui ont l'appli Arena partagent le même classement.

## 1. Créer le serveur

1. Va sur <https://supabase.com> et clique sur **Start your project**. Crée un compte (gratuit).
2. Clique sur **New project** :
   - Name : `arena`
   - Database password : invente un mot de passe et garde-le pour toi ;
   - Region : **West EU (Paris)** ou **Central EU (Frankfurt)** ;
   - Plan : **Free**.
3. Attends 1 à 2 minutes que le projet soit prêt.

## 2. Créer la table du jeu

1. Dans le menu de gauche, ouvre **SQL Editor**, puis **New query**.
2. Ouvre le fichier `supabase-setup.sql` (dans ce dossier), copie tout et colle-le dans l'éditeur.
3. Clique sur **Run**. Le message « Success. No rows returned » doit s'afficher.
   Le script crée les deux jeux : Cyclisme 2027 (table `entries`) et Football 2026-27 (table `foot_entries`).
   Si tu l'avais déjà lancé avant l'ajout du jeu foot, relance-le simplement : il ne supprime rien.

## 3. Simplifier l'inscription

Dans **Authentication → Sign In / Providers → Email**, désactive **Confirm email**, puis clique sur **Save**.
Les joueurs pourront s'inscrire directement, sans attendre d'e-mail de confirmation.
(Si tu le laisses activé, chaque joueur devra cliquer sur un lien reçu par e-mail avant de se connecter.)

## 4. Brancher l'appli

1. Ouvre **Project Settings → API** (ou **Data API**).
2. Copie **Project URL** et la clé **anon public**. Cette clé peut être partagée sans risque : les règles de sécurité du script empêchent quiconque de modifier l'équipe d'un autre joueur.
3. Ouvre `config.js` et colle-les :

```js
supabaseUrl: "https://xxxxxxxx.supabase.co",
supabaseAnonKey: "eyJhbGciOi...",
```

4. Recharge Arena. Dans l'onglet « Je parie », tu dois voir **🌐 Classement en ligne**.

## 5. Donner l'appli aux autres joueurs

Chaque joueur a besoin du dossier `sport-app` **avec ton `config.js` rempli**. Deux possibilités :

- **Copier le dossier** (clé USB, Google Drive, WhatsApp en .zip). Le joueur le lance avec :
  `python -m http.server 8780 --directory sport-app`, puis ouvre <http://localhost:8780>.
- **Le mettre sur un site gratuit** (GitHub Pages, Netlify…). Tout le monde ouvre alors la même adresse, sans rien installer. Je peux t'aider à le faire.

## Bon à savoir

- Les dates (fin des inscriptions le 19 janvier 2027, fenêtres de transferts) sont dans `config.js` **et** dans `supabase-setup.sql`. Si tu les changes, change-les aux deux endroits, puis relance le script SQL.
- Les résultats 2027 sont lus automatiquement sur Wikipédia (pages « 2027 UCI World Tour », « 2027 UCI ProSeries », « 2027 UCI Europe Tour », Mondiaux et championnats d'Europe). Chaque appli recalcule les points toutes les 3 heures, ou tout de suite avec le bouton **Mettre à jour** du classement.
- Le projet gratuit de Supabase se met en pause après une semaine sans aucune visite. Il suffit de cliquer sur **Restore** dans le tableau de bord de Supabase.
