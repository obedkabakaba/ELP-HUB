# Passation : installer ELP Hub chez Ardoise

À coller (ou à donner en lien) au début d'une nouvelle conversation qui a accès au dépôt d'Ardoise (`obedkabakaba/scolaire-saas-backend`) **et** aux dépôts `obedkabakaba/ELP-HUB` et `obedkabakaba/ELP-HUB-BAKEND`, avec le connecteur Supabase actif.

---

## Ce qu'est ELP Hub

Plateforme de suivi de l'Equity Leaders Program d'EquityBCDC (RDC) : cohortes en parallèle, provinces, inscription en deux temps, tests et sélection, autorisation parentale papier déposée en photo, induction, stage, chapitres, import et export Excel.

- **Application** : dépôt `ELP-HUB` (Next.js 16, PWA). Sans variables d'environnement elle tourne en démo, sur des données fictives.
- **Base et fonctions** : dépôt `ELP-HUB-BAKEND` (migrations SQL, Edge Functions Deno, données fictives, tests).

Tout est fusionné dans `main` et testé :
- base : `bash tests/local.sh` donne 51 contrôles OK ;
- application : 26 parcours en mode démo et 10 parcours en mode réel, ce dernier sur une base locale ;
- envoi : 9 contrôles contre une imitation de l'API Resend.

## Décisions déjà prises par Obed

1. **Hébergement** : dans le projet Supabase **ardoise-instagram** (référence `bskbsadlhzduefzubodj`, organisation `kpeviqzktfiluisyeafv`, région eu-west-1), **bien séparé** d'Ardoise.
   - Tout ELP Hub vit dans le schéma `elp` ; rien n'est créé dans `public`.
   - Les fonctions s'appellent `elp-envoyer-message` et `elp-relances`.
   - Les secrets commencent par `ELP_`, sauf `RESEND_API_KEY`, qui est partagé avec Ardoise.
   - Les tâches planifiées commencent par `elp-` et le dossier de stockage s'appelle `elp-pieces`.
   - Le compte gratuit est limité à 2 projets : on n'en crée pas de nouveau.
2. **E-mails** : par Resend, **sous le domaine d'Ardoise**, `myardoise.com`. Le DNS public confirme qu'il est vérifié chez Resend (DKIM `resend._domainkey`, sous-domaine `send.`). L'expéditeur par défaut est `ELP Hub <elp@myardoise.com>`. Pas de SMS ni de WhatsApp pour l'instant.
3. **Pas de nouveau domaine** pour l'essai.

## Ce qu'il reste à faire, dans l'ordre

### 1. Lire comment Ardoise envoie ses e-mails

Dans `scolaire-saas-backend`, regarder `utils/email.utils.js`, `.env.example`, `env.example` et `NOTIFICATIONS.md` :
- confirmer l'adresse d'expéditeur utilisée (domaine `myardoise.com`, ou un sous-domaine) ;
- trouver où vit la clé Resend (variable d'environnement, sur Render ou Vercel).

Si l'expéditeur d'Ardoise diffère de `elp@myardoise.com`, régler `ELP_EMAIL_FROM` sur le même domaine. ELP Hub garde une adresse à lui, par exemple `elp@…`.

### 2. Réactiver le projet Supabase

`ardoise-instagram` est en pause (INACTIVE). Le restaurer avec l'outil Supabase `restore_project`, puis attendre `ACTIVE_HEALTHY`.

Avant toute migration, lister les schémas et les tables existants (`list_tables`) et vérifier qu'il n'y a pas déjà un schéma `elp`.

### 3. Appliquer les migrations, dans l'ordre

Fichiers dans `ELP-HUB-BAKEND/supabase/migrations/`, à passer chacun avec `apply_migration` :
1. `20261113000001_schema.sql` : schéma `elp`, PostGIS et pgcrypto dans `extensions`, tables
2. `20261113000002_securite.sql` : RLS, vues réduites, garde-fous
3. `20261113000003_fonctions.sql` : triggers, `agences_proches`, relances, anonymisation, bucket `elp-pieces`
4. `20261114000004_cohortes_provinces_email.sql` : cohortes, provinces, chapitres, e-mail, autorisation papier
5. `20261115000005_acces_eleve_par_lien.sql` : espace élève par lien personnel

Facultatif, pour une démo en ligne : `supabase/seed.sql`, qui contient 400 élèves fictifs dans `elp`. Il fait environ 1,6 Mo ; le passer en plusieurs morceaux si l'outil SQL refuse.

Ensuite :
- lancer `get_advisors` (security) et corriger ce qui concerne le schéma `elp` ;
- **ne rien toucher dans `public`**.

### 4. Exposer le schéma `elp` à l'API

Dashboard → Project Settings → Data API → *Exposed schemas* → ajouter `elp`. C'est un réglage du tableau de bord ; s'il n'y a pas d'outil pour le faire, le demander à Obed.

### 5. Secrets et fonctions

Secrets du projet, posés dans le tableau de bord, jamais dans le chat :

| Secret | Valeur |
| --- | --- |
| `RESEND_API_KEY` | la clé Resend d'Ardoise, si elle n'est pas déjà dans ce projet |
| `ELP_EMAIL_FROM` | `ELP Hub <elp@myardoise.com>` (ou l'adresse confirmée à l'étape 1) |
| `ELP_EMAIL_REPONSE` | la boîte où les encadreurs liront les réponses (myardoise.com n'a pas de MX) |
| `ELP_APP_URL` | l'adresse de l'application une fois en ligne (étape 7) |
| `ELP_CRON_SECRET` | une longue chaîne aléatoire |

Déployer les fonctions depuis `supabase/functions/`, avec le dossier partagé `_elp/envoi.ts`, sans vérification JWT :
- `elp-envoyer-message`
- `elp-relances`

### 6. Tâches planifiées

1. Activer `pg_cron` et `pg_net`.
2. Exécuter `supabase/planification.sql` en remplaçant `<ref>` par `bskbsadlhzduefzubodj` et `<secret>` par la valeur de `ELP_CRON_SECRET`.
3. Vérifier que les noms de tâches (`elp-file-emails`, `elp-relances-matin`) ne gênent pas celles d'Ardoise.

### 7. Mettre l'application en ligne

Déployer le dépôt `ELP-HUB` (Vercel, comme Ardoise, ou Render) avec :
- `NEXT_PUBLIC_SUPABASE_URL=https://bskbsadlhzduefzubodj.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` : la clé publique du projet (`get_publishable_keys`)

Si possible, utiliser un sous-domaine d'Ardoise (par exemple `elp.myardoise.com`), sinon l'adresse fournie par l'hébergeur. Reporter cette adresse dans `ELP_APP_URL`.

### 8. Premiers comptes et test réel

1. Créer le compte d'Obed dans Authentication.
2. Ajouter sa ligne : `insert into elp.profils (id, nom, role) values ('<uuid du compte>', 'Obed', 'admin');`
3. Se connecter sur l'application, créer une cohorte et importer 2 ou 3 élèves de test avec de **vraies adresses e-mail d'Obed**.
4. Vérifier que l'invitation arrive bien depuis `elp@myardoise.com`.
5. Ouvrir le lien reçu, faire l'inscription, puis tester le lien du parent.

**Aucune donnée réelle d'élève** sans l'accord de la Fondation et de l'informatique d'EquityBCDC.

## Points d'attention

- Les comptes d'Ardoise et d'ELP Hub partagent `auth.users` dans ce projet, mais un compte sans ligne dans `elp.profils` ne voit rien d'ELP Hub. C'est la RLS du schéma `elp` qui l'assure.
- Le seuil de pointage en stage (300 m) se fie à la position envoyée par le téléphone. Le chef d'agence confirme les pointages hors zone.
- Les photos (pièces, autorisations) sont pour l'instant stockées réduites dans `elp.documents.apercu`. Le bucket `elp-pieces` existe pour passer au stockage de fichiers plus tard.
- La liste des agences EquityBCDC, l'indemnité et le programme d'induction sont des exemples. La liste réelle s'importe en Excel depuis la page « Import et export ».
