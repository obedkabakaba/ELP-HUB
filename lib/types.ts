// Modèle de données ELP Hub — les noms de champs sont identiques aux colonnes
// PostgreSQL du dépôt ELP-HUB-BAKEND, pour que la synchronisation soit directe.

export type Statut =
  | "invite"
  | "inscrit"
  | "convoque"
  | "teste"
  | "selectionne"
  | "attente"
  | "induction"
  | "stage"
  | "termine"
  | "non_retenu"
  | "desiste"
  | "exclu";

export type Role = "admin" | "encadreur" | "centre" | "agence" | "candidat";
export type Sexe = "F" | "M";
export type Canal = "email" | "sms" | "whatsapp";
/** Canaux ouverts pour l'instant : on démarre par l'e-mail seul. SMS et WhatsApp viendront ensuite. */
export const CANAUX_ACTIFS: Canal[] = ["email"];

export interface Cohorte {
  id: string;
  nom: string;
  annee: number;
  seuil_exetat: number;
  places: number;
  taille_attente: number;
  /** Part des places réservée aux filles, en %. null = pas de quota, classement aux seules notes. */
  quota_filles: number | null;
  statut: "active" | "archivee";
  created_at: string;
}

export interface Candidat {
  id: string;
  cohorte_id: string;
  code: string; // ex. ELP27-0042 — c'est aussi le contenu du QR code
  nom: string;
  postnom: string;
  prenom: string;
  sexe: Sexe;
  date_naissance: string | null;
  telephone: string;
  email: string | null;
  ecole: string;
  section: string;
  pourcentage_exetat: number;
  province: string;
  commune: string;
  adresse: string;
  lat: number | null;
  lng: number | null;
  universite: string;
  chapitre_id: string | null;
  statut: Statut;
  statut_depuis: string;
  parent_nom: string;
  parent_lien: string;
  parent_telephone: string;
  parent_email: string;
  parent_token: string;
  token: string; // lien personnel d'inscription
  allergies: string;
  urgence_nom: string;
  urgence_telephone: string;
  consentement_le: string | null;
  invite_le: string | null;
  inscrit_le: string | null;
  derniere_activite: string | null;
  relances: number;
  contact_invalide: boolean; // les e-mails ne lui parviennent pas
  motif_sortie: string; // pourquoi il a quitté le programme (exclusion, désistement)
  sorti_le: string | null;
  chambre: string | null;
  compte_ouvert: boolean; // simple indicateur : aucune donnée bancaire n'est stockée
  note_interne: string;
  anonymise: boolean;
  rang_attente: number | null;
}

export type TypeDocument = "photo" | "bulletin" | "identite" | "autorisation";

export interface DocumentRow {
  id: string;
  candidat_id: string;
  type: TypeDocument;
  /** Autorisation : en_attente (à imprimer et signer) → recu (photo déposée) → valide ou rejete. */
  statut: "recu" | "valide" | "rejete" | "en_attente";
  nom_fichier: string;
  apercu: string | null; // image réduite (data URL) — en production : chemin Supabase Storage
  motif_rejet: string;
  depose_par: string; // « élève », « parent » ou nom de l'encadreur
  code_verification: string; // imprimé sur l'autorisation pour la rattacher au bon dossier
  valide_le: string | null;
  created_at: string;
}

export interface Centre {
  id: string;
  nom: string;
  type: "test" | "hotel";
  province: string;
  commune: string;
  adresse: string;
  lat: number;
  lng: number;
  capacite: number;
}

export interface SessionTest {
  id: string;
  cohorte_id: string;
  centre_id: string;
  date_heure: string;
  capacite: number;
}

export interface Convocation {
  id: string;
  candidat_id: string;
  session_id: string;
  confirme: boolean | null;
  present: boolean | null;
  emarge_le: string | null;
}

export interface Note {
  id: string;
  candidat_id: string;
  ecrit: number; // sur 60
  entretien: number; // sur 40
  total: number; // sur 100
}

export interface Agence {
  id: string;
  nom: string;
  province: string;
  commune: string;
  adresse: string;
  lat: number;
  lng: number;
  capacite: number;
  chef_nom: string;
  chef_email: string;
  chef_telephone: string;
  position_verifiee: boolean;
}

export interface Evaluation {
  ponctualite: number;
  initiative: number;
  equipe: number;
  apprentissage: number;
  service: number;
  commentaire: string;
}

export interface Affectation {
  id: string;
  candidat_id: string;
  agence_id: string;
  distance_km: number;
  statut: "proposee" | "validee";
  manuelle: boolean;
  valide_le: string | null;
  evaluation: Evaluation | null;
  evalue_le: string | null;
  indemnite_payee: boolean;
  /** Agences précédentes, quand le stagiaire a changé d'agence en cours de stage. */
  historique: { agence_id: string; jusqu_au: string; motif: string }[];
}

/** Regroupement d'ELP par université ou par lieu, créé librement par les encadreurs. */
export interface Chapitre {
  id: string;
  nom: string;
  type: "universite" | "lieu" | "autre";
  province: string;
  description: string;
  created_at: string;
}

export interface Presence {
  id: string;
  candidat_id: string;
  contexte: "test" | "induction" | "stage";
  jour: string; // AAAA-MM-JJ
  horodatage: string;
  methode: "qr" | "manuel" | "gps";
  hors_zone: boolean;
  valide: boolean;
}

export interface Message {
  id: string;
  candidat_id: string | null;
  destinataire: "candidat" | "parent" | "agence";
  nom_destinataire: string;
  contact: string; // adresse e-mail (ou numéro, quand les SMS seront ouverts)
  canal: Canal;
  modele: string;
  objet: string;
  contenu: string;
  lien: string | null;
  statut: "file" | "envoye" | "livre" | "lu" | "echec";
  campagne: string;
  created_at: string;
}

export interface Journal {
  id: string;
  acteur: string;
  role: Role | "parent" | "systeme";
  action: string;
  cible: string;
  created_at: string;
}

export interface DB {
  cohortes: Cohorte[];
  candidats: Candidat[];
  documents: DocumentRow[];
  centres: Centre[];
  sessions_test: SessionTest[];
  convocations: Convocation[];
  notes: Note[];
  agences: Agence[];
  affectations: Affectation[];
  chapitres: Chapitre[];
  presences: Presence[];
  messages: Message[];
  journal: Journal[];
}

export type Table = keyof DB;
export const TABLES: Table[] = [
  "cohortes",
  "centres",
  "agences",
  "chapitres",
  "candidats",
  "documents",
  "sessions_test",
  "convocations",
  "notes",
  "affectations",
  "presences",
  "messages",
  "journal",
];

export const STATUTS: { id: Statut; label: string; court: string; couleur: string; etape: number }[] = [
  { id: "invite", label: "Invité", court: "Invités", couleur: "#64748b", etape: 1 },
  { id: "inscrit", label: "Inscrit", court: "Inscrits", couleur: "#2563eb", etape: 2 },
  { id: "convoque", label: "Convoqué", court: "Convoqués", couleur: "#7c3aed", etape: 3 },
  { id: "teste", label: "Test passé", court: "Test passé", couleur: "#0891b2", etape: 4 },
  { id: "selectionne", label: "Sélectionné", court: "Sélectionnés", couleur: "#059669", etape: 5 },
  { id: "attente", label: "Liste d'attente", court: "Attente", couleur: "#d97706", etape: 5 },
  { id: "induction", label: "Induction", court: "Induction", couleur: "#ea580c", etape: 6 },
  { id: "stage", label: "En stage", court: "Stage", couleur: "#a32a29", etape: 7 },
  { id: "termine", label: "Terminé", court: "Terminés", couleur: "#166534", etape: 8 },
  { id: "non_retenu", label: "Non retenu", court: "Non retenus", couleur: "#a8a29e", etape: 5 },
  { id: "desiste", label: "Désisté", court: "Désistés", couleur: "#e11d48", etape: 0 },
  { id: "exclu", label: "Retiré du programme", court: "Retirés", couleur: "#78716c", etape: 0 },
];
/** Sortis du parcours : on ne les compte plus, mais leur trace reste consultable. */
export const SORTIS: Statut[] = ["non_retenu", "desiste", "exclu"];
export const estSorti = (s: Statut) => SORTIS.includes(s);
export const statutInfo = (s: Statut) => STATUTS.find((x) => x.id === s)!;

export const ETAPES = [
  { n: 1, titre: "Présélection Exetat", detail: "Import de la liste des 80 % et plus, invitations envoyées" },
  { n: 2, titre: "Inscriptions", detail: "Les élèves remplissent leur dossier" },
  { n: 3, titre: "Convocations", detail: "Lieu, date et heure du test envoyés" },
  { n: 4, titre: "Tests", detail: "Émargement par QR code et notes importées" },
  { n: 5, titre: "Sélection", detail: "Classement validé, dossiers à compléter et autorisations à signer" },
  { n: 6, titre: "Induction", detail: "Semaine de formation à l'hôtel" },
  { n: 7, titre: "Stage", detail: "Deux mois dans les agences EquityBCDC" },
  { n: 8, titre: "Terminé", detail: "Stage achevé, les ELP rejoignent leur chapitre" },
];

export const ROLES: { id: Role; label: string; acteur: string; accueil: string; description: string }[] = [
  { id: "encadreur", label: "Encadreur", acteur: "Mme Nadine K. (encadreure)", accueil: "/tableau", description: "Suit les dossiers, relance, convoque, affecte." },
  { id: "admin", label: "Admin Fondation", acteur: "Admin national EGF", accueil: "/tableau", description: "Vue nationale, rapports, journal des accès." },
  { id: "candidat", label: "Candidat / ELP", acteur: "Candidat", accueil: "/moi", description: "Inscription, convocation, dossier, pointage, sur téléphone." },
  { id: "centre", label: "Centre de test", acteur: "Responsable de centre", accueil: "/scan", description: "Scanne les QR codes à l'entrée." },
  { id: "agence", label: "Chef d'agence", acteur: "Chef d'agence", accueil: "/agence", description: "Voit ses stagiaires et les évalue." },
];
