# ELP Hub

Plateforme de suivi de l'**Equity Leaders Program** d'**EquityBCDC** (programme d'Equity Group Foundation, RDC) : de la liste de l'Exetat jusqu'à la fin du stage en agence, puis les chapitres.

> **Maquette de démonstration, non officielle.** Toutes les données sont fictives et aucun vrai e-mail n'est envoyé. Aucune donnée réelle ne doit être chargée sans l'accord de la Fondation et du service informatique de la banque.

Le problème traité n'est pas de collecter les informations (les Google Forms le font déjà) mais de les **suivre** : savoir qui a répondu, qui manque, et qui doit faire quoi ensuite, pour toutes les cohortes et toutes les provinces à la fois.

## Lancer la démo

```bash
npm install
npm run dev        # http://localhost:3000
```

Rien d'autre à configurer : sans variables d'environnement, l'application fonctionne entièrement dans le navigateur, sur trois cohortes fictives (2025 terminée, 2026 en stage, 2027 en cours) réparties sur quatre provinces. Sur la page d'accueil, choisissez un rôle. Le sélecteur **Scénario** replace la cohorte 2027 à n'importe laquelle des 8 étapes, la **Boîte mail démo** montre les e-mails tels que les reçoivent élèves, parents et chefs d'agence, et le bouton lune / soleil passe en **mode sombre**.

## Ce que fait la plateforme

| Module | Contenu |
| --- | --- |
| Cohortes | Toutes les cohortes restent ouvertes et suivies en parallèle (vue « pivot » de leur avancement). Places, liste d'attente, seuil Exetat et règle filles / garçons réglables par cohorte |
| Provinces | Chaque écran se filtre par cohorte et par province ; convocations et affectations restent dans la province de l'élève |
| Inscription en deux temps | Peu d'informations à l'inscription ; adresse, position, pièces et autorisation ne sont demandées qu'aux élèves retenus après le test |
| Suivi | Tableau filtrable, Kanban, fiche de l'ELP qui s'ouvre au clic sur un nom, dossier complet |
| Sortie du programme | Retrait (motif obligatoire) ou désistement : rien n'est effacé, le dossier sort des listes actives et peut être réintégré. Les non-retenus laissent aussi leur trace |
| Communication | E-mail pour commencer (SMS et WhatsApp prévus), modèles, suivi de remise et d'ouverture, relances : deux e-mails puis un appel |
| Tests et sélection | Sessions par centre, QR code, émargement, notes, simulateur de sélection (places et quota ajustables, ou sans quota) |
| Autorisation parentale | Document pré-rempli à imprimer, signé à la main, photographié et déposé par le parent ou l'élève ; l'encadreur vérifie, puis valide ou refuse |
| Induction, stage | Chambres, présences, badges ; affectation optimale par province, changement d'agence avec historique, évaluation, indemnités, clôture |
| Chapitres | Regroupements d'ELP par université ou par lieu, créés librement par les encadreurs, toutes cohortes confondues |
| Import et export | Classeur Excel complet, CSV, sauvegarde JSON ; import de la liste Exetat, des notes, des agences et de mises à jour de dossiers |
| Rapports, carte, confidentialité | Rapport Fondation (Excel, PDF), carte centrée sur la province, journal des accès, anonymisation |

## Rôles

| Rôle | Espace |
| --- | --- |
| Encadreur, admin Fondation | `/tableau` et le menu complet |
| Candidat / ELP (téléphone) | `/moi` (ou `/moi?t=<jeton>` depuis l'e-mail) |
| Parent ou tuteur (sans compte) | `/p/<jeton>` : imprimer, signer, déposer la photo |
| Responsable de centre | `/scan` |
| Chef d'agence | `/agence` |

## Technique

- **Next.js 16** (App Router), React 19, TypeScript, Tailwind CSS 4, thème clair et sombre.
- **Données** : magasin local (Zustand, persistant), filtré par cohorte et province ; synchronisation Supabase optionnelle (`lib/sync.ts`).
- **Carte** : Leaflet et OpenStreetMap. **QR** : `qrcode`, `BarcodeDetector` ou `jsqr`. **Excel** : SheetJS. **PDF** : feuilles A4 imprimables.

```
app/(staff)/     écrans encadreur et admin (cohortes, chapitres, échanges…)
app/moi          espace candidat        app/p/[token]   autorisation du parent
app/scan         émargement             app/agence      chef d'agence
app/doc          convocation, autorisation, badges, attestation
components/FicheELP.tsx  fiche ouverte au clic, retrait et réintégration
lib/logic.ts     complétude en deux temps, sélection avec quota, affectation (algorithme hongrois)
lib/actions.ts   calcul des actions du jour
lib/ops.ts       opérations métier (statuts, e-mails, journal)
lib/exports.ts   exports Excel
lib/seed.ts      trois cohortes fictives
```

### Brancher Supabase

1. Appliquer les migrations du dépôt **ELP-HUB-BAKEND** sur un projet Supabase.
2. Copier `.env.example` en `.env.local` et renseigner l'URL et la clé publique.
3. L'accueil devient un écran de connexion ; le rôle vient de la table `profils`.

Le mode démonstration est testé de bout en bout dans un navigateur, et la base est testée de son côté, mais **la liaison entre les deux n'a pas encore été essayée sur un vrai projet Supabase**.

## À vérifier avant un pilote

- La liste et les positions des agences sont des **exemples** : à remplacer par la liste officielle (import Excel possible).
- Montant de l'indemnité et programme d'induction sont des valeurs d'exemple.
- Les e-mails partiront par Resend depuis le domaine déjà vérifié d'Ardoise (voir ELP-HUB-BAKEND).
- Durée de conservation et consentement des mineurs : à valider avec le service juridique (Code du numérique, 2023).
- Le logo EquityBCDC vient de l'icône publique de l'application de la banque ; son usage reste soumis à l'accord d'EquityBCDC et de la Fondation.
