// Modèles de messages. Courts : un SMS de 160 caractères coûte un segment.
import type { Canal } from "./types";

export interface Modele {
  id: string;
  nom: string;
  destinataire: "candidat" | "parent" | "agence";
  texte: string;
  lien?: "inscription" | "parent";
}

export const MODELES: Modele[] = [
  { id: "invitation", nom: "Invitation à s'inscrire", destinataire: "candidat", lien: "inscription", texte: "Félicitations {prenom} ! Avec {pct} % à l'Exetat, tu es présélectionné(e) pour l'Equity Leaders Program d'EquityBCDC. Inscris-toi ici : {lien}" },
  { id: "relance_inscription", nom: "Relance : inscription non commencée", destinataire: "candidat", lien: "inscription", texte: "{prenom}, ton inscription ELP t'attend encore. Il te faut 10 minutes : {lien}. Besoin d'aide ? Réponds AIDE." },
  { id: "dossier_incomplet", nom: "Relance : dossier incomplet", destinataire: "candidat", lien: "inscription", texte: "{prenom}, il manque à ton dossier ELP : {manquants}. Complète-le ici : {lien}" },
  { id: "convocation", nom: "Convocation au test", destinataire: "candidat", lien: "inscription", texte: "ELP : {prenom}, tu es convoqué(e) au test le {date} à {heure}, {centre}. Présente ton QR code : {lien}. Réponds 1 pour confirmer." },
  { id: "relance_confirmation", nom: "Relance : présence non confirmée", destinataire: "candidat", texte: "{prenom}, rappel : test ELP le {date} à {heure}, {centre}. Réponds 1 pour confirmer ta présence, 2 si tu as un empêchement." },
  { id: "rattrapage", nom: "Absence au test : rattrapage", destinataire: "candidat", texte: "{prenom}, nous ne t'avons pas vu(e) au test ELP. Une session de rattrapage est possible : réponds 1 pour être rappelé(e) par un encadreur." },
  { id: "selectionne", nom: "Résultat : sélectionné(e)", destinataire: "candidat", lien: "inscription", texte: "Bravo {prenom} ! Tu es sélectionné(e) pour l'ELP {annee}. Ton parent va recevoir un lien pour signer l'autorisation. Suite du programme : {lien}" },
  { id: "attente", nom: "Résultat : liste d'attente", destinataire: "candidat", texte: "{prenom}, tu es sur la liste d'attente ELP (rang {rang}). Nous te prévenons dès qu'une place se libère. Garde ton téléphone allumé." },
  { id: "non_retenu", nom: "Résultat : non retenu(e)", destinataire: "candidat", texte: "{prenom}, merci d'avoir participé à la sélection ELP. Tu n'es pas retenu(e) cette année. Ton parcours reste remarquable, continue !" },
  { id: "promotion", nom: "Place libérée (liste d'attente)", destinataire: "candidat", lien: "inscription", texte: "Bonne nouvelle {prenom} ! Une place s'est libérée : tu es sélectionné(e) pour l'ELP {annee}. Détails : {lien}" },
  { id: "autorisation_parent", nom: "Autorisation parentale à signer", destinataire: "parent", lien: "parent", texte: "EquityBCDC - programme ELP : votre enfant {prenom} {nom} est sélectionné(e). Merci de signer l'autorisation parentale ici : {lien}" },
  { id: "relance_autorisation", nom: "Relance : autorisation non signée", destinataire: "parent", lien: "parent", texte: "Rappel ELP : l'autorisation de {prenom} n'est pas encore signée. Sans elle, {prenom} ne pourra pas participer. 2 minutes suffisent : {lien}" },
  { id: "otp", nom: "Code de signature", destinataire: "parent", texte: "ELP : votre code de signature est {code}. Il est valable 10 minutes. Ne le communiquez à personne." },
  { id: "induction", nom: "Informations induction", destinataire: "candidat", lien: "inscription", texte: "{prenom}, l'induction ELP commence le {date} à {heure}, {centre}. Chambre {chambre}. Prends ta pièce d'identité. Programme : {lien}" },
  { id: "affectation_stagiaire", nom: "Affectation : stagiaire", destinataire: "candidat", lien: "inscription", texte: "{prenom}, ton stage ELP se fera à l'agence {agence} ({km} km de chez toi). Chef d'agence : {chef}. Début le {date} à 8 h." },
  { id: "affectation_chef", nom: "Affectation : chef d'agence", destinataire: "agence", texte: "ELP : {n} stagiaire(s) affecté(s) à votre agence {agence} dès le {date} : {liste}. Détails et évaluations dans ELP Hub." },
  { id: "absence_stage", nom: "Absence en stage", destinataire: "candidat", texte: "{prenom}, tu n'as pas pointé à l'agence {agence} depuis {jours} jours. Tout va bien ? Réponds à ce message ou appelle ton encadreur." },
  { id: "libre", nom: "Message libre", destinataire: "candidat", texte: "" },
];

export const modele = (id: string) => MODELES.find((m) => m.id === id) ?? MODELES[MODELES.length - 1];

export function remplir(texte: string, vars: Record<string, string | number>): string {
  return texte.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : `{${k}}`));
}

/** Nombre de segments SMS (GSM-7 : 160 / 153 ; avec accents hors GSM : 70 / 67). */
export function segments(texte: string): number {
  const gsm = /^[\w\s@£$¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ!"#¤%&'()*+,\-./:;<=>?¡ÄÖÑÜ§¿äöñüà^{}\\[~\]|€]*$/.test(texte);
  const [un, plusieurs] = gsm ? [160, 153] : [70, 67];
  return texte.length <= un ? 1 : Math.ceil(texte.length / plusieurs);
}

export const COUT_USD: Record<Canal, number> = { sms: 0.035, whatsapp: 0.012, email: 0 }; // estimations à confirmer

export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
export const fmtDateCourte = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
export const fmtHeure = (iso: string) => new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }).replace(":", " h ");
export const fmtQuand = (iso: string) => `${fmtDateCourte(iso)} · ${new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
