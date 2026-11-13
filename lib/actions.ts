"use client";
// « Qui doit faire quoi ensuite ? » — la plateforme lit les dossiers et prépare
// la liste des actions du jour, chacune réglable en un clic.
import { completude, jourISO, joursDepuis, nomComplet } from "./logic";
import { convoquer, envoyer, promouvoirAttente, relancer } from "./ops";
import type { Candidat, DB } from "./types";

export interface ActionDuJour {
  id: string;
  urgence: 1 | 2 | 3; // 1 = aujourd'hui, 2 = cette semaine, 3 = à surveiller
  titre: string;
  detail: string;
  cibles: Candidat[];
  bouton?: string;
  lien?: string; // page où traiter l'action à la main
  executer?: () => string; // renvoie le message de confirmation
}

const pl = (n: number, un: string, plusieurs: string) => `${n} ${n > 1 ? plusieurs : un}`;

export function actionsDuJour(db: DB): ActionDuJour[] {
  const A: ActionDuJour[] = [];
  const c = db.candidats.filter((x) => !x.anonymise);
  const docs = db.documents;
  const dernierMsg = (id: string) => {
    let d: string | null = null;
    for (const m of db.messages) if (m.candidat_id === id && (!d || m.created_at > d)) d = m.created_at;
    return d;
  };
  const calme = (x: Candidat, jours: number) => joursDepuis(dernierMsg(x.id)) >= jours;

  // 1. Désistements → promouvoir la liste d'attente
  const desistes = c.filter((x) => x.statut === "desiste" && !x.note_interne.includes("[Remplacé") && db.notes.some((n) => n.candidat_id === x.id));
  const attente = c.filter((x) => x.statut === "attente");
  if (desistes.length && attente.length)
    A.push({
      id: "promotion",
      urgence: 1,
      titre: `${pl(desistes.length, "désistement", "désistements")} : une place à réattribuer`,
      detail: `${desistes.map(nomComplet).join(", ")}. La plateforme propose le premier de la liste d'attente, du même sexe pour garder la parité.`,
      cibles: desistes,
      bouton: "Promouvoir la liste d'attente",
      executer: () => {
        const noms = desistes.map((d) => promouvoirAttente(d)).filter(Boolean).map((x) => nomComplet(x!));
        return noms.length ? `${noms.join(", ")} : sélectionné(e), SMS envoyé et autorisation demandée au parent.` : "La liste d'attente est vide.";
      },
    });

  // 2. Numéros en échec
  const echecs = c.filter((x) => x.telephone_invalide && !["non_retenu", "desiste", "termine"].includes(x.statut));
  if (echecs.length)
    A.push({ id: "echecs", urgence: 1, titre: `${pl(echecs.length, "numéro ne reçoit", "numéros ne reçoivent")} pas les SMS`, detail: "Messages en échec : joindre l'école ou corriger le numéro dans le dossier.", cibles: echecs, lien: "/candidats?filtre=echec" });

  // 3. Invités silencieux
  const silencieux = c.filter((x) => x.statut === "invite" && !x.telephone_invalide && joursDepuis(x.invite_le) >= 3);
  const aRelancer = silencieux.filter((x) => x.relances < 2 && calme(x, 2));
  const aAppeler = silencieux.filter((x) => x.relances >= 2);
  if (aRelancer.length)
    A.push({
      id: "relance-invites",
      urgence: 2,
      titre: `${pl(aRelancer.length, "invité n'a", "invités n'ont")} pas commencé l'inscription`,
      detail: "Invités depuis 3 jours ou plus, sans réponse. Relance par SMS, puis par WhatsApp à la deuxième tentative.",
      cibles: aRelancer,
      bouton: "Relancer",
      executer: () => `${relancer(aRelancer, "relance_inscription").envoyes} relances envoyées.`,
    });
  if (aAppeler.length)
    A.push({ id: "appels", urgence: 2, titre: `${pl(aAppeler.length, "élève", "élèves")} à appeler`, detail: "Déjà relancés deux fois sans réponse : un appel de l'encadreur est plus efficace qu'un troisième message.", cibles: aAppeler, lien: "/candidats?filtre=appel" });

  // 4. Dossiers incomplets
  const incomplets = c.filter((x) => x.statut === "inscrit" && completude(x, docs).pct < 100);
  const incRelance = incomplets.filter((x) => x.relances < 2 && calme(x, 2));
  if (incRelance.length)
    A.push({
      id: "incomplets",
      urgence: 2,
      titre: `${pl(incRelance.length, "dossier incomplet", "dossiers incomplets")}`,
      detail: "Chaque élève reçoit la liste exacte de ce qui lui manque (GPS, bulletin, pièce d'identité…).",
      cibles: incRelance,
      bouton: "Envoyer les pièces manquantes",
      executer: () => `${relancer(incRelance, "dossier_incomplet").envoyes} messages personnalisés envoyés.`,
    });

  // 5. Pièces à vérifier
  const aVerifier = new Set(docs.filter((d) => d.statut === "recu").map((d) => d.candidat_id));
  const candAVerifier = c.filter((x) => aVerifier.has(x.id) && x.statut === "inscrit");
  if (candAVerifier.length) A.push({ id: "pieces", urgence: 3, titre: `${pl(candAVerifier.length, "dossier a", "dossiers ont")} des pièces à vérifier`, detail: "Photo, bulletin ou pièce d'identité reçus mais pas encore validés.", cibles: candAVerifier, lien: "/candidats?filtre=pieces" });

  // 6. Dossiers complets à convoquer
  const convoques = new Set(db.convocations.map((k) => k.candidat_id));
  const prets = c.filter((x) => x.statut === "inscrit" && completude(x, docs).pct === 100 && !convoques.has(x.id));
  const aVenir = db.sessions_test.filter((s) => s.date_heure > new Date().toISOString());
  if (prets.length && aVenir.length)
    A.push({
      id: "convoquer",
      urgence: 2,
      titre: `${pl(prets.length, "dossier complet", "dossiers complets")} à convoquer`,
      detail: "Chacun est placé dans le centre de test le plus proche de chez lui, selon les places restantes.",
      cibles: prets,
      bouton: "Convoquer",
      executer: () => {
        const r = convoquer(prets);
        return `${r.convoques} convocations envoyées avec QR code${r.sansPlace ? ` — ${r.sansPlace} sans place : ajoutez une session.` : "."}`;
      },
    });
  else if (prets.length >= 10 && !db.sessions_test.length)
    A.push({ id: "sessions", urgence: 3, titre: `${prets.length} dossiers complets attendent une date de test`, detail: "Créez les sessions de test pour pouvoir envoyer les convocations.", cibles: prets, lien: "/tests" });

  // 7. Convoqués sans confirmation
  const sansConf = c.filter((x) => {
    if (x.statut !== "convoque") return false;
    const k = db.convocations.find((y) => y.candidat_id === x.id);
    const s = k && db.sessions_test.find((y) => y.id === k.session_id);
    return !!k && k.confirme == null && k.present == null && !!s && s.date_heure > new Date().toISOString();
  });
  const confRelance = sansConf.filter((x) => calme(x, 1));
  if (confRelance.length)
    A.push({
      id: "confirmations",
      urgence: 2,
      titre: `${pl(confRelance.length, "convoqué n'a", "convoqués n'ont")} pas confirmé sa présence`,
      detail: "Rappel du lieu, de la date et de l'heure ; l'élève confirme en répondant 1 par SMS.",
      cibles: confRelance,
      bouton: "Rappeler",
      executer: () => `${envoyer(confRelance, "relance_confirmation", "sms", { campagne: "Relances automatiques" })} rappels envoyés.`,
    });

  // 8. Absents au test
  const absents = c.filter((x) => x.statut === "convoque" && db.convocations.some((k) => k.candidat_id === x.id && k.present === false));
  const absRelance = absents.filter((x) => !db.messages.some((m) => m.candidat_id === x.id && m.modele === "rattrapage"));
  if (absRelance.length)
    A.push({
      id: "absents",
      urgence: 2,
      titre: `${pl(absRelance.length, "absent", "absents")} au test`,
      detail: "Convoqués mais non émargés. Proposer une session de rattrapage avant de clôturer la sélection.",
      cibles: absRelance,
      bouton: "Proposer un rattrapage",
      executer: () => `${envoyer(absRelance, "rattrapage", "sms")} propositions envoyées.`,
    });

  // 9. Notes manquantes
  const sansNote = c.filter((x) => x.statut === "teste" && !db.notes.some((n) => n.candidat_id === x.id));
  if (sansNote.length) A.push({ id: "notes", urgence: 2, titre: `${pl(sansNote.length, "note manquante", "notes manquantes")}`, detail: "Candidats émargés dont la note n'est pas encore saisie ou importée.", cibles: sansNote, lien: "/tests" });

  // 10. Sélection à faire
  const testes = c.filter((x) => x.statut === "teste");
  if (testes.length >= 20 && !sansNote.length && !c.some((x) => x.statut === "selectionne" || x.statut === "induction" || x.statut === "stage"))
    A.push({ id: "selection", urgence: 1, titre: "Les notes sont prêtes : lancer la sélection", detail: `${testes.length} candidats notés. Simulez le classement avec les quotas 50/50, puis validez.`, cibles: testes, lien: "/tests?onglet=selection" });

  // 11. Autorisations parentales
  const signes = new Set(docs.filter((d) => d.type === "autorisation" && d.statut === "signe").map((d) => d.candidat_id));
  const sansAuto = c.filter((x) => x.statut === "selectionne" && !signes.has(x.id));
  const autoRelance = sansAuto.filter((x) => {
    const d = db.messages.filter((m) => m.candidat_id === x.id && m.destinataire === "parent").map((m) => m.created_at).sort().pop();
    return joursDepuis(d ?? null) >= 1;
  });
  if (autoRelance.length)
    A.push({
      id: "autorisations",
      urgence: 1,
      titre: `${pl(autoRelance.length, "autorisation parentale", "autorisations parentales")} non signée${autoRelance.length > 1 ? "s" : ""}`,
      detail: "Sans signature, l'élève ne peut pas partir en induction. Le parent reçoit à nouveau son lien (WhatsApp).",
      cibles: autoRelance,
      bouton: "Relancer les parents",
      executer: () => `${envoyer(autoRelance, "relance_autorisation", "whatsapp", { campagne: "Relances automatiques" })} parents relancés.`,
    });
  else if (sansAuto.length) A.push({ id: "autorisations-attente", urgence: 3, titre: `${pl(sansAuto.length, "autorisation", "autorisations")} en attente de signature`, detail: "Parents déjà relancés aujourd'hui. Passé 3 jours, prévoyez un appel.", cibles: sansAuto, lien: "/autorisations" });

  // 12. Induction prête
  const elus = c.filter((x) => x.statut === "selectionne");
  if (elus.length && !sansAuto.length) A.push({ id: "induction", urgence: 2, titre: "Toutes les autorisations sont signées", detail: `${elus.length} sélectionnés peuvent partir en induction : attribuez les chambres et lancez la semaine.`, cibles: elus, lien: "/induction" });

  // 13. Affectation à faire
  const affectes = new Set(db.affectations.filter((a) => a.statut === "validee").map((a) => a.candidat_id));
  const sansAgence = c.filter((x) => x.statut === "induction" && !affectes.has(x.id));
  if (sansAgence.length) A.push({ id: "affectation", urgence: 3, titre: `${sansAgence.length} futurs stagiaires sans agence`, detail: "La plateforme calcule l'agence la plus proche de chaque domicile, dans la limite des places.", cibles: sansAgence, lien: "/stage" });

  // 14. Absences en stage
  const auj = jourISO();
  const absStage = c.filter((x) => {
    if (x.statut !== "stage") return false;
    const jours = db.presences.filter((p) => p.candidat_id === x.id && p.contexte === "stage").map((p) => p.jour).sort();
    const dernier = jours[jours.length - 1];
    return !!dernier && dernier < auj && joursDepuis(dernier + "T12:00:00") >= 3;
  });
  if (absStage.length)
    A.push({
      id: "absences-stage",
      urgence: 1,
      titre: `${pl(absStage.length, "stagiaire n'a", "stagiaires n'ont")} pas pointé depuis 3 jours`,
      detail: `${absStage.map(nomComplet).join(", ")}. Prendre des nouvelles avant que l'absence ne devienne un abandon.`,
      cibles: absStage,
      bouton: "Envoyer un message",
      executer: () => `${envoyer(absStage, "absence_stage", "sms", { extra: () => ({ jours: 3 }) })} messages envoyés. Pensez aussi à appeler le chef d'agence.`,
    });

  // 15. Pointages hors zone à confirmer / comptes à ouvrir
  const horsZone = db.presences.filter((p) => p.hors_zone && !p.valide);
  if (horsZone.length) A.push({ id: "hors-zone", urgence: 3, titre: `${pl(horsZone.length, "pointage", "pointages")} hors zone à confirmer`, detail: "Le stagiaire a pointé à plus de 300 m de son agence : le chef d'agence doit confirmer.", cibles: c.filter((x) => horsZone.some((p) => p.candidat_id === x.id)), lien: "/stage" });
  const sansCompte = c.filter((x) => x.statut === "stage" && !x.compte_ouvert);
  if (sansCompte.length) A.push({ id: "comptes", urgence: 3, titre: `${pl(sansCompte.length, "stagiaire", "stagiaires")} sans compte ouvert`, detail: "Le compte doit être ouvert en agence pour verser l'indemnité. La plateforme ne stocke aucune donnée bancaire.", cibles: sansCompte, lien: "/stage" });

  return A.sort((a, b) => a.urgence - b.urgence);
}
