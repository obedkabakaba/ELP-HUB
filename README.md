# ELP Hub

Plateforme de suivi de l'**Equity Leaders Program** d'**EquityBCDC** (programme d'Equity Group Foundation, RDC) : de la liste de l'Exetat jusqu'à la fin du stage en agence EquityBCDC.

> **Maquette de démonstration, non officielle.** Toutes les données sont fictives (200 élèves imaginaires) et aucun vrai SMS n'est envoyé. Aucune donnée réelle ne doit être chargée sans l'accord de la Fondation et du service informatique de la banque.

Le problème traité n'est pas de collecter les informations (les Google Forms le font déjà) mais de les **suivre** : savoir qui a répondu, qui manque, et qui doit faire quoi ensuite.

## Lancer la démo

```bash
npm install
npm run dev        # http://localhost:3000
```

Rien d'autre à configurer : sans variables d'environnement, l'application fonctionne entièrement dans le navigateur. Sur la page d'accueil, choisissez un rôle. Le sélecteur **Scénario** (en haut à droite) replace la cohorte fictive à n'importe laquelle des 7 étapes du programme, et le **Téléphone démo** montre les SMS tels que les reçoivent élèves, parents et chefs d'agence, avec leurs liens.

Déploiement : importer le dépôt dans Vercel (ou tout hébergeur Next.js), sans réglage particulier.

## Ce que fait la plateforme

| Module | Contenu |
| --- | --- |
| 1. Cohortes et import | Import Excel/CSV de la liste Exetat, colonnes reconnues automatiquement, doublons et élèves sous le seuil écartés avant l'invitation par SMS |
| 2. Inscription et dossier | Formulaire mobile en 5 étapes avec sauvegarde automatique, GPS du domicile (ou toucher la carte), pièces photographiées, consentement, score de complétude |
| 3. Suivi des statuts | Tableau filtrable, vue Kanban (glisser-déposer), dossier unique avec parcours, pièces, messages et journal |
| 4. Communication | SMS, WhatsApp, e-mail en masse, modèles, suivi de remise, coût estimé, réponses par SMS (« 1 » pour confirmer) |
| 5. Tests et sélection | Sessions par centre, convocation au centre le plus proche avec QR code, émargement par scan, notes saisies ou importées, simulateur de sélection 50/50 |
| 6. Autorisations | Lien SMS pour le parent, code à usage unique, signature au doigt, PDF vérifiable par QR code |
| 7. Induction | Chambres, programme, présences par QR code, badges imprimables |
| 8. Stage | Affectation optimale aux agences, pointage géolocalisé, évaluation par le chef d'agence, indemnités |
| 9. Tableau de bord | Chiffres en direct, carte, rapport Fondation (Excel et PDF) |

### Les idées qui font la différence

- **Actions du jour.** La plateforme lit les dossiers et dit à l'encadreur quoi faire : relancer 28 invités silencieux, appeler ceux qui n'ont pas réagi à deux relances, convoquer les dossiers complets, remplacer un désistement. Chaque action se règle en un clic.
- **Relances en escalade.** SMS, puis WhatsApp, puis appel : personne n'est relancé deux fois le même jour, et les numéros en échec sont signalés à part.
- **Parité transparente.** Le simulateur montre qui entre et qui sort à cause du quota 50/50, par rapport à un classement aux seules notes.
- **Liste d'attente intelligente.** Un désistement propose aussitôt le premier remplaçant du même sexe.
- **Affectation optimale.** L'algorithme hongrois minimise le trajet total de tous les stagiaires sous contrainte de places, au lieu de servir les premiers de la liste ; l'encadreur ajuste ensuite à la main.
- **Pointage géolocalisé.** Validé à moins de 300 m de l'agence ; sinon le chef d'agence confirme.
- **Documents vérifiables.** Chaque autorisation signée porte un code et une empreinte SHA-256 ; un QR code mène à une page de vérification où les noms sont masqués.
- **Pensé pour la 2G.** Application installable (PWA), lecture et écriture locales d'abord, file d'attente synchronisée au retour du réseau, scan des QR codes hors ligne.
- **Confidentialité dès la conception.** Journal des accès (chaque consultation de dossier est tracée), accès par rôle, aucune donnée bancaire, anonymisation en fin de durée de conservation.

## Rôles

| Rôle | Espace |
| --- | --- |
| Encadreur, admin Fondation | `/tableau` et le menu complet |
| Candidat / ELP (téléphone) | `/moi` (ou `/moi?t=<jeton>` depuis le SMS) |
| Parent ou tuteur (sans compte) | `/p/<jeton>` |
| Responsable de centre | `/scan` |
| Chef d'agence | `/agence` |

## Technique

- **Next.js 16** (App Router), React 19, TypeScript, Tailwind CSS 4.
- **Données** : magasin local (Zustand, persistant) ; synchronisation Supabase optionnelle (`lib/sync.ts`).
- **Carte** : Leaflet et OpenStreetMap, carte de chaleur `leaflet.heat`.
- **QR** : `qrcode` pour générer, `BarcodeDetector` ou `jsqr` pour lire.
- **Excel** : SheetJS. **PDF** : feuilles A4 imprimables depuis le navigateur.

```
app/(staff)/     écrans encadreur et admin
app/moi          espace candidat        app/p/[token]   signature du parent
app/scan         émargement             app/agence      chef d'agence
app/doc          convocation, autorisation, badges, attestation
lib/logic.ts     complétude, sélection 50/50, affectation (algorithme hongrois)
lib/actions.ts   calcul des actions du jour
lib/ops.ts       opérations métier (statuts, messages, journal)
lib/seed.ts      cohorte fictive, étape par étape
```

### Brancher Supabase

1. Créer le projet et appliquer les migrations du dépôt **ELP-HUB-BAKEND**.
2. Copier `.env.example` en `.env.local` et renseigner l'URL et la clé publique.
3. L'accueil devient alors un écran de connexion ; le rôle vient de la table `profils`.

Le mode démonstration a été testé de bout en bout dans un navigateur. Le mode Supabase est écrit et la base est testée de son côté, mais **la liaison entre les deux n'a pas encore été essayée sur un vrai projet Supabase**.

## À vérifier avant un pilote

- La liste et les positions des agences sont des **exemples** : à remplacer par la liste officielle.
- Tarifs des SMS, montant de l'indemnité et programme d'induction sont des valeurs d'exemple.
- Durée de conservation et consentement des mineurs : à valider avec le service juridique (Code du numérique, 2023).
- La marque EquityBCDC (toit du logo officiel et nom de la banque) est affichée de façon provisoire, en attendant le fichier officiel du logo ; elle est utilisée pour la présentation interne du projet ; son usage reste soumis à l'accord de la Fondation.
