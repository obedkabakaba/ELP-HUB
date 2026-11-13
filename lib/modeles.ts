// Modèles de messages. On démarre par l'e-mail ; les mêmes textes, courts,
// pourront partir par SMS ou WhatsApp quand ces canaux seront ouverts.
import type { Canal } from "./types";

export interface Modele {
  id: string;
  nom: string;
  destinataire: "candidat" | "parent" | "agence";
  objet: string;
  texte: string;
  lien?: "inscription" | "parent";
}

export const MODELES: Modele[] = [
  { id: "invitation", nom: "Invitation à s'inscrire", destinataire: "candidat", lien: "inscription", objet: "Tu es présélectionné(e) pour le programme ELP d'EquityBCDC", texte: "Félicitations {prenom} ! Avec {pct} % à l'Exetat, tu es présélectionné(e) pour l'Equity Leaders Program d'EquityBCDC. L'inscription prend 5 minutes : {lien}" },
  { id: "relance_inscription", nom: "Relance : inscription non commencée", destinataire: "candidat", lien: "inscription", objet: "Ton inscription ELP t'attend encore", texte: "{prenom}, ton inscription au programme ELP n'est pas encore commencée. Il te faut 5 minutes : {lien}. Besoin d'aide ? Réponds simplement à cet e-mail." },
  { id: "dossier_incomplet", nom: "Relance : informations manquantes", destinataire: "candidat", lien: "inscription", objet: "Il manque des informations à ton dossier ELP", texte: "{prenom}, il manque à ton dossier ELP : {manquants}. Complète-le ici : {lien}" },
  { id: "convocation", nom: "Convocation au test", destinataire: "candidat", lien: "inscription", objet: "Convocation au test ELP du {date}", texte: "{prenom}, tu es convoqué(e) au test ELP le {date} à {heure}, {centre}. Ton QR code d'entrée et le bouton pour confirmer ta présence sont ici : {lien}" },
  { id: "relance_confirmation", nom: "Relance : présence non confirmée", destinataire: "candidat", lien: "inscription", objet: "Confirme ta présence au test ELP", texte: "{prenom}, rappel : test ELP le {date} à {heure}, {centre}. Confirme ta présence ou signale un empêchement ici : {lien}" },
  { id: "rattrapage", nom: "Absence au test : rattrapage", destinataire: "candidat", objet: "Nous ne t'avons pas vu(e) au test ELP", texte: "{prenom}, nous ne t'avons pas vu(e) au test ELP. Une session de rattrapage est possible : réponds à cet e-mail pour être rappelé(e) par un encadreur." },
  { id: "selectionne", nom: "Résultat : retenu(e)", destinataire: "candidat", lien: "inscription", objet: "Bravo, tu es retenu(e) pour l'ELP {annee}", texte: "Bravo {prenom} ! Tu es retenu(e) pour l'ELP {annee}. Deux choses à faire maintenant : compléter ton dossier (adresse, pièces) et faire signer l'autorisation parentale. Tout est ici : {lien}" },
  { id: "attente", nom: "Résultat : liste d'attente", destinataire: "candidat", objet: "Tu es sur la liste d'attente ELP", texte: "{prenom}, tu es sur la liste d'attente ELP (rang {rang}). Nous te prévenons dès qu'une place se libère." },
  { id: "non_retenu", nom: "Résultat : non retenu(e)", destinataire: "candidat", objet: "Résultat de la sélection ELP", texte: "{prenom}, merci d'avoir participé à la sélection ELP. Tu n'es pas retenu(e) cette année. Ton parcours reste remarquable, continue !" },
  { id: "promotion", nom: "Place libérée (liste d'attente)", destinataire: "candidat", lien: "inscription", objet: "Une place s'est libérée : tu es retenu(e) !", texte: "Bonne nouvelle {prenom} ! Une place s'est libérée : tu es retenu(e) pour l'ELP {annee}. Complète ton dossier ici : {lien}" },
  { id: "autorisation_parent", nom: "Autorisation parentale à signer", destinataire: "parent", lien: "parent", objet: "Autorisation parentale pour {prenom} {nom} (programme ELP)", texte: "Bonjour, votre enfant {prenom} {nom} est retenu(e) pour le programme ELP d'EquityBCDC. Merci d'imprimer l'autorisation parentale, de la signer, puis d'en envoyer la photo depuis cette page : {lien}" },
  { id: "relance_autorisation", nom: "Relance : autorisation non reçue", destinataire: "parent", lien: "parent", objet: "Rappel : autorisation parentale de {prenom}", texte: "Rappel : nous n'avons pas encore reçu l'autorisation signée de {prenom}. Sans elle, {prenom} ne pourra pas participer. Imprimez, signez, puis envoyez la photo ici : {lien}" },
  { id: "autorisation_rejetee", nom: "Autorisation à refaire", destinataire: "candidat", lien: "inscription", objet: "Ton autorisation parentale est à renvoyer", texte: "{prenom}, l'autorisation parentale envoyée n'a pas pu être acceptée ({motif}). Merci d'en renvoyer une photo nette ici : {lien}" },
  { id: "induction", nom: "Informations induction", destinataire: "candidat", lien: "inscription", objet: "Induction ELP : rendez-vous le {date}", texte: "{prenom}, l'induction ELP commence le {date} à {heure}, {centre}. Chambre {chambre}. Prends ta pièce d'identité. Programme : {lien}" },
  { id: "affectation_stagiaire", nom: "Affectation : stagiaire", destinataire: "candidat", lien: "inscription", objet: "Ton agence de stage : {agence}", texte: "{prenom}, ton stage ELP se fera à l'agence {agence} ({km} km de chez toi). Chef d'agence : {chef}. Début le {date} à 8 h." },
  { id: "affectation_chef", nom: "Affectation : chef d'agence", destinataire: "agence", objet: "Stagiaires ELP affectés à votre agence", texte: "Bonjour, {n} stagiaire(s) ELP sont affecté(s) à votre agence {agence} à partir du {date} : {liste}. Détails et évaluations dans ELP Hub." },
  { id: "changement_agence", nom: "Changement d'agence", destinataire: "candidat", lien: "inscription", objet: "Changement d'agence de stage", texte: "{prenom}, ton stage se poursuit à l'agence {agence} à partir du {date}. Chef d'agence : {chef}." },
  { id: "absence_stage", nom: "Absence en stage", destinataire: "candidat", objet: "Tout va bien ?", texte: "{prenom}, tu n'as pas pointé à l'agence {agence} depuis {jours} jours. Tout va bien ? Réponds à cet e-mail ou appelle ton encadreur." },
  { id: "libre", nom: "Message libre", destinataire: "candidat", objet: "Programme ELP", texte: "" },
];

export const modele = (id: string) => MODELES.find((m) => m.id === id) ?? MODELES[MODELES.length - 1];

export function remplir(texte: string, vars: Record<string, string | number>): string {
  return texte.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : `{${k}}`));
}

/** Nombre de segments SMS (pour le jour où les SMS seront ouverts). */
export function segments(texte: string): number {
  const gsm = /^[\w\s@£$¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ!"#¤%&'()*+,\-./:;<=>?¡ÄÖÑÜ§¿äöñüà^{}\\[~\]|€]*$/.test(texte);
  const [un, plusieurs] = gsm ? [160, 153] : [70, 67];
  return texte.length <= un ? 1 : Math.ceil(texte.length / plusieurs);
}

export const COUT_USD: Record<Canal, number> = { email: 0, sms: 0.035, whatsapp: 0.012 }; // estimations à confirmer
export const NOM_CANAL: Record<Canal, string> = { email: "E-mail", sms: "SMS", whatsapp: "WhatsApp" };

export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
export const fmtDateCourte = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
export const fmtHeure = (iso: string) => new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }).replace(":", " h ");
export const fmtQuand = (iso: string) => `${fmtDateCourte(iso)} · ${new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
