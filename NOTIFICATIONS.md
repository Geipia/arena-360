# Activer les notifications (10 minutes, une seule fois)

Les notifications sont envoyées par un petit robot qui tourne dans ton Supabase : chaque minute, il regarde les matchs des équipes et championnats suivis et prévient les gens (coup d'envoi, buts, résultat).

Tu as besoin du fichier **CLES-NOTIFICATIONS-PRIVEES.txt** (dans le dossier `claude`, à côté de `sport-app`, **pas** sur GitHub). Garde-le pour toi.

## 1. Créer le robot (Edge Function)

1. Ouvre ton projet sur **supabase.com** → menu de gauche **Edge Functions**.
2. Clique sur **Deploy a new function** → **Via Editor**.
3. Nom de la fonction : Supabase lui donne un nom (chez nous : `smart-endpoint`). Si le nom est différent, remplace-le dans l'adresse du robot dans `supabase-push.sql`.
4. Efface le code d'exemple, puis colle **tout** le contenu du fichier `supabase/functions/arena-push/index.ts` (dans `sport-app`).
5. Clique sur **Deploy function**. Attends le message de succès.

## 2. Donner les clés au robot (Secrets)

1. Toujours dans **Edge Functions**, ouvre **Secrets** (ou « Manage secrets »).
2. Ajoute ces 3 secrets, en copiant les valeurs depuis `CLES-NOTIFICATIONS-PRIVEES.txt` :
   - `VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
   - `VAPID_SUBJECT`
3. Clique sur **Save**.

## 3. Lancer la minuterie (SQL)

1. Menu **SQL Editor** → **New query**.
2. Colle tout le contenu de `supabase-push.sql` → **Run**.
3. Le script crée les tables des abonnements et lance le robot **chaque minute**.

## 4. Vérifier que ça tourne

- **Integrations → Cron** (ou **Database → Cron Jobs**) : la tâche `arena-push` doit apparaître, avec une exécution chaque minute.
- **Edge Functions → arena-push → Logs** : chaque minute, une réponse du style `{"ok":true,"subs":1,...}`.
- Sur ton téléphone (Android dans Chrome, ou iPhone **depuis l'appli installée**) : va dans **Foot → 🔔 Mes notifications** → **Activer les notifications** → **Envoyer une notification de test**.
- Suis une équipe qui joue bientôt : tu recevras le coup d'envoi, les buts et le résultat.

## Bon à savoir

- **iPhone** : les notifications ne marchent que dans l'appli **ajoutée à l'écran d'accueil** (règle d'Apple, iOS 16.4 ou plus récent).
- Les alertes arrivent en général **moins de 2 minutes** après le but (le robot passe chaque minute, ESPN met parfois une minute à mettre le score à jour).
- Le plan gratuit de Supabase suffit : 1 passage par minute = environ 43 000 par mois (la limite est de 500 000).
- Aucune donnée personnelle : on enregistre seulement l'adresse technique de l'appareil (fournie par le navigateur) et ce qu'il suit.
