"use client";
// Opérations métier : chaque action de l'interface passe par ici, ce qui
// garantit que les statuts, les messages et le journal restent cohérents.
import { distanceKm, position } from "./geo";
import { completude, jourISO, nomComplet, proposerAffectations, type Proposition, type ResultatSelection } from "./logic";
import { fmtDate, fmtHeure, modele, remplir } from "./modeles";
import { docVide } from "./seed";
import { SUPABASE_ACTIF, acteurCourant, uid, useStore } from "./store";
import type { Agence, Affectation, Canal, Candidat, DocumentRow, Evaluation, Message, Statut, TypeDocument } from "./types";

const S = () => useStore.getState();
const maintenant = () => new Date().toISOString();

export function journaliser(action: string, cible: string, forcer?: { acteur: string; role: "parent" | "systeme" | "candidat" }) {
  const a = acteurCourant();
  S().put("journal", { id: uid(), acteur: forcer?.acteur ?? a.nom, role: forcer?.role ?? a.role, action, cible, created_at: maintenant() });
}

/* ---------- Messages ---------- */

// En démo, les messages sont « envoyés » aussitôt puis marqués remis. Avec Supabase,
// ils entrent dans la file d'attente et c'est le serveur qui les envoie réellement.
const STATUT_DEPART: Message["statut"] = SUPABASE_ACTIF ? "file" : "envoye";

function livrer(ids: string[]) {
  if (SUPABASE_ACTIF) return;
  setTimeout(() => {
    const k = new Set(ids);
    const maj = S()
      .db.messages.filter((m) => k.has(m.id) && m.statut === "envoye")
      .map((m): Message => {
        const c = S().db.candidats.find((x) => x.id === m.candidat_id);
        const echec = m.destinataire === "candidat" && !!c?.telephone_invalide;
        return { ...m, statut: echec ? "echec" : "livre" };
      });
    S().put("messages", maj);
  }, 1400);
}

function varsCandidat(c: Candidat): Record<string, string | number> {
  const { db } = S();
  const v: Record<string, string | number> = { prenom: c.prenom, nom: c.nom, pct: c.pourcentage_exetat, annee: db.cohortes.find((k) => k.id === c.cohorte_id)?.annee ?? "", rang: c.rang_attente ?? "", chambre: c.chambre ?? "" };
  v.manquants = completude(c, db.documents).manquants.slice(0, 3).join(", ");
  const conv = db.convocations.find((x) => x.candidat_id === c.id);
  const session = conv && db.sessions_test.find((s) => s.id === conv.session_id);
  if (session) {
    v.date = fmtDate(session.date_heure);
    v.heure = fmtHeure(session.date_heure);
    v.centre = db.centres.find((x) => x.id === session.centre_id)?.nom ?? "";
  }
  const aff = db.affectations.find((x) => x.candidat_id === c.id);
  const ag = aff && db.agences.find((a) => a.id === aff.agence_id);
  if (ag && aff) {
    v.agence = ag.nom;
    v.km = aff.distance_km;
    v.chef = ag.chef_nom;
  }
  return v;
}

export function construireMessage(c: Candidat, modeleId: string, canal: Canal, extra: Record<string, string | number> = {}, texteLibre?: string, campagne?: string): Message {
  const m = modele(modeleId);
  const lien = m.lien === "parent" ? `/p/${c.parent_token}` : m.lien === "inscription" ? `/moi?t=${c.token}` : null;
  const parent = m.destinataire === "parent";
  return {
    id: uid(),
    candidat_id: c.id,
    destinataire: m.destinataire,
    nom_destinataire: parent ? c.parent_nom : nomComplet(c),
    telephone: parent ? c.parent_telephone : c.telephone,
    canal,
    modele: modeleId,
    contenu: remplir(texteLibre ?? m.texte, { ...varsCandidat(c), lien: lien ? `elp-hub.cd${lien}` : "", ...extra }),
    lien,
    statut: STATUT_DEPART,
    campagne: campagne ?? m.nom,
    created_at: maintenant(),
  };
}

export function envoyer(cibles: Candidat[], modeleId: string, canal: Canal = "sms", opts: { extra?: (c: Candidat) => Record<string, string | number>; texte?: string; campagne?: string; relance?: boolean } = {}): number {
  if (!cibles.length) return 0;
  const msgs = cibles.map((c) => construireMessage(c, modeleId, canal, opts.extra?.(c), opts.texte, opts.campagne));
  S().put("messages", msgs);
  if (opts.relance) S().put("candidats", cibles.map((c) => ({ ...c, relances: c.relances + 1 })));
  livrer(msgs.map((m) => m.id));
  journaliser(`Envoi de ${msgs.length} message(s) « ${opts.campagne ?? modele(modeleId).nom} » par ${canal.toUpperCase()}`, cibles.length === 1 ? nomComplet(cibles[0]) : `${cibles.length} destinataires`);
  return msgs.length;
}

/** Escalade des relances : 1re par SMS, 2e par WhatsApp, ensuite appel par un encadreur. */
export const canalRelance = (c: Candidat): Canal | "appel" => (c.relances === 0 ? "sms" : c.relances === 1 ? "whatsapp" : "appel");

export function relancer(cibles: Candidat[], modeleId: string): { envoyes: number; aAppeler: number } {
  const parSms = cibles.filter((c) => canalRelance(c) === "sms");
  const parWa = cibles.filter((c) => canalRelance(c) === "whatsapp");
  envoyer(parSms, modeleId, "sms", { relance: true, campagne: "Relances automatiques" });
  envoyer(parWa, modeleId, "whatsapp", { relance: true, campagne: "Relances automatiques" });
  return { envoyes: parSms.length + parWa.length, aAppeler: cibles.length - parSms.length - parWa.length };
}

function sms(a: Agence, modeleId: string, vars: Record<string, string | number>) {
  const m: Message = { id: uid(), candidat_id: null, destinataire: "agence", nom_destinataire: a.chef_nom, telephone: a.chef_telephone, canal: "sms", modele: modeleId, contenu: remplir(modele(modeleId).texte, vars), lien: null, statut: STATUT_DEPART, campagne: modele(modeleId).nom, created_at: maintenant() };
  S().put("messages", m);
  livrer([m.id]);
}

/* ---------- Statuts et dossiers ---------- */

export function changerStatut(c: Candidat, statut: Statut, extra: Partial<Candidat> = {}): Candidat {
  const n = { ...c, ...extra, statut, statut_depuis: maintenant() };
  S().put("candidats", n);
  return n;
}

export function majCandidat(c: Candidat, patch: Partial<Candidat>): Candidat {
  const n = { ...c, ...patch, derniere_activite: maintenant() };
  S().put("candidats", n);
  return n;
}

export function deposerDocument(c: Candidat, type: TypeDocument, nom_fichier: string, apercu: string | null) {
  const ancien = S().db.documents.find((d) => d.candidat_id === c.id && d.type === type);
  S().put("documents", { ...docVide(ancien?.id ?? uid(), c.id, type, "recu", maintenant()), nom_fichier, apercu });
}

export function verifierDocument(d: DocumentRow, valide: boolean, motif = "") {
  S().put("documents", { ...d, statut: valide ? "valide" : "rejete", motif_rejet: motif });
  const c = S().db.candidats.find((x) => x.id === d.candidat_id);
  journaliser(valide ? `Pièce validée (${d.type})` : `Pièce rejetée (${d.type}) : ${motif}`, c ? nomComplet(c) : "");
}

export function finaliserInscription(c: Candidat) {
  const t = maintenant();
  const n = { ...c, statut: c.statut === "invite" ? ("inscrit" as Statut) : c.statut, statut_depuis: c.statut === "invite" ? t : c.statut_depuis, inscrit_le: c.inscrit_le ?? t, consentement_le: c.consentement_le ?? t, derniere_activite: t };
  S().put("candidats", n);
  journaliser("Inscription envoyée par l'élève", nomComplet(c), { acteur: nomComplet(c), role: "candidat" });
}

/* ---------- Tests ---------- */

export function creerSessions(dateJour: string) {
  const { db } = S();
  const cohorte = db.cohortes.find((c) => c.statut === "active") ?? db.cohortes[0];
  const rows = db.centres
    .filter((c) => c.type === "test")
    .flatMap((centre) => [8, 13].map((h) => ({ id: uid(), cohorte_id: cohorte.id, centre_id: centre.id, date_heure: new Date(`${dateJour}T${String(h).padStart(2, "0")}:30:00`).toISOString(), capacite: Math.floor(centre.capacite / 2) })));
  S().put("sessions_test", rows);
  journaliser(`Création de ${rows.length} sessions de test`, fmtDate(rows[0].date_heure));
}

/** Convoque chaque candidat à la session la plus proche de chez lui qui a encore de la place. */
export function convoquer(cibles: Candidat[]): { convoques: number; sansPlace: number } {
  const { db } = S();
  const pris: Record<string, number> = {};
  for (const k of db.convocations) pris[k.session_id] = (pris[k.session_id] ?? 0) + 1;
  const ok: Candidat[] = [];
  const convs = [];
  for (const c of cibles) {
    const p = position(c);
    const session = db.sessions_test
      .filter((s) => (pris[s.id] ?? 0) < s.capacite)
      .map((s) => {
        const ct = db.centres.find((x) => x.id === s.centre_id)!;
        return { s, d: p ? distanceKm(p[0], p[1], ct.lat, ct.lng) : 0 };
      })
      .sort((a, b) => a.d - b.d || a.s.date_heure.localeCompare(b.s.date_heure))[0]?.s;
    if (!session) continue;
    pris[session.id] = (pris[session.id] ?? 0) + 1;
    convs.push({ id: uid(), candidat_id: c.id, session_id: session.id, confirme: null, present: null, emarge_le: null });
    ok.push({ ...c, statut: "convoque", statut_depuis: maintenant() });
  }
  S().put("convocations", convs);
  S().put("candidats", ok);
  envoyer(ok, "convocation", "sms", { campagne: "Convocations au test" });
  return { convoques: ok.length, sansPlace: cibles.length - ok.length };
}

export interface ResultatScan {
  ok: boolean;
  titre: string;
  detail: string;
  candidat?: Candidat;
}

/** Émargement par QR code (ou saisie du code) — fonctionne sans réseau. */
export function emarger(code: string, contexte: "test" | "induction", methode: "qr" | "manuel" = "qr"): ResultatScan {
  const { db } = S();
  const propre = code.trim().toUpperCase().replace(/^ELP:/, "");
  const c = db.candidats.find((x) => x.code === propre);
  if (!c) return { ok: false, titre: "Code inconnu", detail: `Aucun candidat ne correspond à « ${code.trim().slice(0, 24)} ».` };
  const jour = jourISO();
  if (db.presences.some((p) => p.candidat_id === c.id && p.contexte === contexte && p.jour === jour))
    return { ok: false, titre: "Déjà enregistré", detail: `${nomComplet(c)} a déjà été scanné aujourd'hui.`, candidat: c };
  if (contexte === "test") {
    const conv = db.convocations.find((x) => x.candidat_id === c.id);
    if (!conv) return { ok: false, titre: "Non convoqué", detail: `${nomComplet(c)} n'a pas de convocation.`, candidat: c };
    S().put("convocations", { ...conv, present: true, emarge_le: maintenant() });
    if (c.statut === "convoque") changerStatut(c, "teste");
  } else if (c.statut !== "induction" && c.statut !== "selectionne") {
    return { ok: false, titre: "Pas sur la liste", detail: `${nomComplet(c)} ne fait pas partie de l'induction.`, candidat: c };
  }
  S().put("presences", { id: uid(), candidat_id: c.id, contexte, jour, horodatage: maintenant(), methode, hors_zone: false, valide: true });
  return { ok: true, titre: "Présence enregistrée", detail: `${nomComplet(c)} · ${c.code}`, candidat: c };
}

export function saisirNote(candidat_id: string, ecrit: number, entretien: number) {
  const ancien = S().db.notes.find((n) => n.candidat_id === candidat_id);
  S().put("notes", { id: ancien?.id ?? uid(), candidat_id, ecrit, entretien, total: ecrit + entretien });
}

/* ---------- Sélection ---------- */

function demanderAutorisations(elus: Candidat[]) {
  const { db } = S();
  const nouveaux = elus.filter((c) => !db.documents.some((d) => d.candidat_id === c.id && d.type === "autorisation"));
  S().put("documents", nouveaux.map((c) => docVide(uid(), c.id, "autorisation", "en_attente", maintenant())));
  envoyer(nouveaux.filter((c) => c.parent_telephone), "autorisation_parent", "sms", { campagne: "Autorisations parentales" });
}

export function validerSelection(res: ResultatSelection) {
  const { db } = S();
  const par = new Map(db.candidats.map((c) => [c.id, c]));
  const t = maintenant();
  const elus = res.selectionnes.map((id) => ({ ...par.get(id)!, statut: "selectionne" as Statut, statut_depuis: t, rang_attente: null }));
  const attente = res.attente.map((id, i) => ({ ...par.get(id)!, statut: "attente" as Statut, statut_depuis: t, rang_attente: i + 1 }));
  const non = res.nonRetenus.map((id) => ({ ...par.get(id)!, statut: "non_retenu" as Statut, statut_depuis: t, rang_attente: null }));
  S().put("candidats", [...elus, ...attente, ...non]);
  envoyer(elus, "selectionne", "sms", { campagne: "Résultats de la sélection" });
  envoyer(attente, "attente", "sms", { campagne: "Résultats de la sélection" });
  envoyer(non, "non_retenu", "sms", { campagne: "Résultats de la sélection" });
  demanderAutorisations(elus);
  journaliser(`Sélection validée : ${res.filles} filles et ${res.garcons} garçons, ${attente.length} en liste d'attente`, "Cohorte");
}

/** Remplace un désistement par le premier de la liste d'attente, du même sexe pour garder la parité. */
export function promouvoirAttente(desiste: Candidat): Candidat | null {
  const { db } = S();
  const file = db.candidats.filter((c) => c.statut === "attente" && c.cohorte_id === desiste.cohorte_id).sort((a, b) => (a.rang_attente ?? 99) - (b.rang_attente ?? 99));
  const elu = file.find((c) => c.sexe === desiste.sexe) ?? file[0];
  if (!elu) return null;
  const n = changerStatut(elu, "selectionne", { rang_attente: null });
  S().put("candidats", { ...desiste, note_interne: `${desiste.note_interne} [Remplacé(e) par ${nomComplet(elu)}]`.trim() });
  envoyer([n], "promotion", "sms");
  demanderAutorisations([n]);
  journaliser(`Promotion depuis la liste d'attente (remplace ${nomComplet(desiste)})`, nomComplet(elu));
  return n;
}

/* ---------- Autorisation parentale ---------- */

export function envoyerOtp(c: Candidat): string {
  const doc = S().db.documents.find((d) => d.candidat_id === c.id && d.type === "autorisation") ?? docVide(uid(), c.id, "autorisation", "en_attente", maintenant());
  const code = String(Math.floor(100000 + Math.random() * 900000));
  S().put("documents", { ...doc, otp: code, otp_expire_le: new Date(Date.now() + 600000).toISOString() });
  const m = construireMessage(c, "otp", "sms", { code });
  S().put("messages", m);
  livrer([m.id]);
  return code;
}

export async function signerAutorisation(c: Candidat, code: string, signature: string): Promise<string | null> {
  const doc = S().db.documents.find((d) => d.candidat_id === c.id && d.type === "autorisation");
  if (!doc || !doc.otp || doc.otp !== code.trim()) return "Code incorrect. Vérifiez le SMS reçu.";
  if (doc.otp_expire_le && doc.otp_expire_le < maintenant()) return "Ce code a expiré. Demandez-en un nouveau.";
  const signe_le = maintenant();
  const octets = new TextEncoder().encode(`${c.id}|${c.parent_nom}|${signe_le}|${signature}`);
  const empreinte = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", octets)), (b) => b.toString(16).padStart(2, "0")).join("");
  S().put("documents", { ...doc, statut: "signe", signe_par: c.parent_nom, signe_le, signature, empreinte, code_verification: `EGF-${empreinte.slice(0, 4).toUpperCase()}-${empreinte.slice(4, 8).toUpperCase()}`, otp: null, otp_expire_le: null });
  journaliser("Autorisation parentale signée en ligne (code SMS vérifié)", nomComplet(c), { acteur: c.parent_nom, role: "parent" });
  return null;
}

/* ---------- Induction ---------- */

export function attribuerChambres(): number {
  const { db } = S();
  const liste = db.candidats.filter((c) => c.statut === "selectionne" || c.statut === "induction");
  const maj: Candidat[] = [];
  for (const s of ["F", "M"] as const)
    liste
      .filter((c) => c.sexe === s)
      .sort((a, b) => a.commune.localeCompare(b.commune))
      .forEach((c, i) => maj.push({ ...c, chambre: `${s === "F" ? 2 : 3}${String(Math.floor(i / 2) + 1).padStart(2, "0")}` }));
  S().put("candidats", maj);
  journaliser(`Chambres attribuées à ${maj.length} participants (2 par chambre, filles et garçons à des étages séparés)`, "Induction");
  return maj.length;
}

export function demarrerInduction(dateISO: string): { partis: number; bloques: number } {
  const { db } = S();
  const signes = new Set(db.documents.filter((d) => d.type === "autorisation" && d.statut === "signe").map((d) => d.candidat_id));
  const elus = db.candidats.filter((c) => c.statut === "selectionne");
  const prets = elus.filter((c) => signes.has(c.id)).map((c) => ({ ...c, statut: "induction" as Statut, statut_depuis: maintenant() }));
  S().put("candidats", prets);
  const hotel = db.centres.find((c) => c.type === "hotel");
  envoyer(prets, "induction", "sms", { extra: () => ({ date: fmtDate(dateISO), heure: fmtHeure(dateISO), centre: hotel?.nom ?? "" }) });
  return { partis: prets.length, bloques: elus.length - prets.length };
}

/* ---------- Stage ---------- */

export function calculerPropositions(): Proposition[] {
  const { db } = S();
  const dejaAffectes = new Set(db.affectations.filter((a) => a.statut === "validee").map((a) => a.candidat_id));
  const occupees: Record<string, number> = {};
  for (const a of db.affectations) if (a.statut === "validee") occupees[a.agence_id] = (occupees[a.agence_id] ?? 0) + 1;
  const stagiaires = db.candidats.filter((c) => (c.statut === "induction" || c.statut === "stage") && !dejaAffectes.has(c.id));
  return proposerAffectations(stagiaires, db.agences, occupees);
}

export function enregistrerPropositions(props: Proposition[]) {
  const { db } = S();
  S().del("affectations", db.affectations.filter((a) => a.statut === "proposee").map((a) => a.id));
  S().put("affectations", props.filter((p) => p.agence_id).map((p): Affectation => ({ id: uid(), candidat_id: p.candidat_id, agence_id: p.agence_id!, distance_km: p.distance_km, statut: "proposee", manuelle: false, valide_le: null, evaluation: null, evalue_le: null, indemnite_payee: false })));
}

export function deplacerAffectation(a: Affectation, agence: Agence) {
  const c = S().db.candidats.find((x) => x.id === a.candidat_id)!;
  const p = position(c);
  S().put("affectations", { ...a, agence_id: agence.id, manuelle: true, distance_km: p ? Math.round(distanceKm(p[0], p[1], agence.lat, agence.lng) * 10) / 10 : 0 });
}

export function validerAffectations(debutISO: string): number {
  const { db } = S();
  const props = db.affectations.filter((a) => a.statut === "proposee");
  S().put("affectations", props.map((a) => ({ ...a, statut: "validee" as const, valide_le: maintenant() })));
  const stagiaires = props.map((a) => db.candidats.find((c) => c.id === a.candidat_id)!).map((c) => ({ ...c, statut: "stage" as Statut, statut_depuis: maintenant() }));
  S().put("candidats", stagiaires);
  envoyer(stagiaires, "affectation_stagiaire", "sms", { extra: () => ({ date: fmtDate(debutISO) }), campagne: "Affectations de stage" });
  for (const ag of db.agences) {
    const siens = props.filter((a) => a.agence_id === ag.id).map((a) => db.candidats.find((c) => c.id === a.candidat_id)!);
    if (siens.length) sms(ag, "affectation_chef", { n: siens.length, agence: ag.nom, date: fmtDate(debutISO), liste: siens.map((c) => `${c.prenom} ${c.nom}`).join(", ") });
  }
  journaliser(`Affectations validées : ${props.length} stagiaires`, "Stage");
  return props.length;
}

export const RAYON_POINTAGE_M = 300;

/** Pointage du stagiaire : accepté s'il se trouve à moins de 300 m de son agence. */
export function pointer(c: Candidat, lat: number | null, lng: number | null): { ok: boolean; message: string } {
  const { db } = S();
  const aff = db.affectations.find((a) => a.candidat_id === c.id && a.statut === "validee");
  const ag = aff && db.agences.find((a) => a.id === aff.agence_id);
  if (!ag) return { ok: false, message: "Aucune agence ne t'est encore affectée." };
  const jour = jourISO();
  if (db.presences.some((p) => p.candidat_id === c.id && p.contexte === "stage" && p.jour === jour)) return { ok: false, message: "Tu as déjà pointé aujourd'hui." };
  const metres = lat != null && lng != null ? Math.round(distanceKm(lat, lng, ag.lat, ag.lng) * 1000) : null;
  const hors = metres == null || metres > RAYON_POINTAGE_M;
  S().put("presences", { id: uid(), candidat_id: c.id, contexte: "stage", jour, horodatage: maintenant(), methode: "gps", hors_zone: hors, valide: !hors });
  return hors
    ? { ok: true, message: metres == null ? "Pointage enregistré sans position : ton chef d'agence devra le confirmer." : `Tu es à ${metres >= 1000 ? (metres / 1000).toFixed(1) + " km" : metres + " m"} de l'agence : ton chef d'agence devra confirmer ce pointage.` }
    : { ok: true, message: `Pointage validé à ${metres} m de l'agence ${ag.nom}. Bonne journée !` };
}

export function evaluer(a: Affectation, evaluation: Evaluation) {
  S().put("affectations", { ...a, evaluation, evalue_le: maintenant() });
  const c = S().db.candidats.find((x) => x.id === a.candidat_id);
  journaliser("Évaluation de stage enregistrée", c ? nomComplet(c) : "");
}

/* ---------- Confidentialité ---------- */

/** Efface les données personnelles des dossiers qui n'ont plus de raison d'être conservés. */
export function anonymiser(cibles: Candidat[]): number {
  const { db } = S();
  const ids = new Set(cibles.map((c) => c.id));
  S().put("candidats", cibles.map((c, i): Candidat => ({ ...c, nom: "Anonymisé", postnom: "", prenom: `Dossier ${i + 1}`, telephone: "", email: null, adresse: "", lat: null, lng: null, date_naissance: null, parent_nom: "", parent_telephone: "", parent_lien: "", allergies: "", urgence_nom: "", urgence_telephone: "", note_interne: "", anonymise: true })));
  S().del("documents", db.documents.filter((d) => ids.has(d.candidat_id)).map((d) => d.id));
  S().del("messages", db.messages.filter((m) => m.candidat_id && ids.has(m.candidat_id)).map((m) => m.id));
  journaliser(`Anonymisation de ${cibles.length} dossiers (fin de la durée de conservation)`, "Confidentialité");
  return cibles.length;
}

export async function miniature(fichier: File): Promise<string | null> {
  if (!fichier.type.startsWith("image/")) return null;
  const img = await createImageBitmap(fichier);
  const k = Math.min(1, 420 / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * k);
  canvas.height = Math.round(img.height * k);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.6);
}

/* ---------- Réponses par SMS (pour les téléphones sans internet) ---------- */

/** L'élève répond 1 ou 2 à sa convocation par simple SMS. */
export function repondreSms(c: Candidat, texte: string) {
  S().put("messages", { id: uid(), candidat_id: c.id, destinataire: "candidat", nom_destinataire: nomComplet(c), telephone: c.telephone, canal: "sms", modele: "reponse", contenu: texte, lien: null, statut: "lu", campagne: "Réponses reçues", created_at: maintenant() });
  const conv = S().db.convocations.find((k) => k.candidat_id === c.id);
  if (conv && (texte.trim() === "1" || texte.trim() === "2")) {
    S().put("convocations", { ...conv, confirme: texte.trim() === "1" });
    journaliser(texte.trim() === "1" ? "Présence au test confirmée par SMS" : "Empêchement signalé par SMS", nomComplet(c), { acteur: nomComplet(c), role: "systeme" });
  }
}
