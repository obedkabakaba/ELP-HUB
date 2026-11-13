"use client";
// « Qui doit faire quoi ensuite ? » — la plateforme lit les dossiers affichés
// (cohorte et province choisies) et prépare la liste des actions du jour.
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
  const dernier = new Map<string, string>();
  const dernierParent = new Map<string, string>();
  for (const m of db.messages) {
    if (!m.candidat_id) continue;
    if ((dernier.get(m.candidat_id) ?? "") < m.created_at) dernier.set(m.candidat_id, m.created_at);
    if (m.destinataire === "parent" && (dernierParent.get(m.candidat_id) ?? "") < m.created_at) dernierParent.set(m.candidat_id, m.created_at);
  }
  const calme = (x: Candidat, jours: number) => joursDepuis(dernier.get(x.id) ?? null) >= jours || !dernier.has(x.id);
  const comp = new Map(c.map((x) => [x.id, completude(x, docs)]));

  // 1. Départs d'élèves retenus → proposer la liste d'attente
  const autos = new Map(docs.filter((d) => d.type === "autorisation").map((d) => [d.candidat_id, d]));
  const partis = c.filter((x) => (x.statut === "desiste" || x.statut === "exclu") && autos.has(x.id) && !x.note_interne.includes("[Remplacé") && joursDepuis(x.sorti_le) <= 30);
  const aRemplacer = partis.filter((x) => c.some((y) => y.statut === "attente" && y.cohorte_id === x.cohorte_id));
  if (aRemplacer.length)
    A.push({
      id: "promotion",
      urgence: 1,
      titre: `${pl(aRemplacer.length, "départ", "départs")} : une place à réattribuer`,
      detail: `${aRemplacer.map(nomComplet).join(", ")}. La plateforme propose le premier de la liste d'attente de la même cohorte.`,
      cibles: aRemplacer,
      bouton: "Promouvoir la liste d'attente",
      executer: () => {
        const noms = aRemplacer.map((d) => promouvoirAttente(d)).filter(Boolean).map((x) => nomComplet(x!));
        return noms.length ? `${noms.join(", ")} : retenu(e), prévenu(e) par e-mail, autorisation demandée.` : "La liste d'attente est vide.";
      },
    });

  // 2. Adresses en échec
  const echecs = c.filter((x) => x.contact_invalide && ["invite", "inscrit", "convoque", "teste", "selectionne", "induction", "stage"].includes(x.statut));
  if (echecs.length)
    A.push({ id: "echecs", urgence: 1, titre: `${pl(echecs.length, "élève ne reçoit", "élèves ne reçoivent")} pas les e-mails`, detail: "Adresse erronée ou boîte pleine : appeler l'élève ou son école, puis corriger l'adresse dans la fiche.", cibles: echecs, lien: "/candidats?filtre=echec" });

  // 3. Invités silencieux
  const silencieux = c.filter((x) => x.statut === "invite" && !x.contact_invalide && joursDepuis(x.invite_le) >= 3);
  const aRelancer = silencieux.filter((x) => x.relances < 2 && calme(x, 2));
  const aAppeler = silencieux.filter((x) => x.relances >= 2);
  if (aRelancer.length)
    A.push({
      id: "relance-invites",
      urgence: 2,
      titre: `${pl(aRelancer.length, "invité n'a", "invités n'ont")} pas commencé l'inscription`,
      detail: "Invités depuis 3 jours ou plus, sans réponse. Deux relances par e-mail au maximum, ensuite c'est un appel.",
      cibles: aRelancer,
      bouton: "Relancer par e-mail",
      executer: () => `${relancer(aRelancer, "relance_inscription").envoyes} relances envoyées.`,
    });
  if (aAppeler.length)
    A.push({ id: "appels", urgence: 2, titre: `${pl(aAppeler.length, "élève", "élèves")} à appeler`, detail: "Déjà relancés deux fois sans réponse : un appel de l'encadreur est plus efficace qu'un troisième e-mail.", cibles: aAppeler, lien: "/candidats?filtre=appel" });

  // 4. Inscriptions incomplètes (première phase : peu d'informations demandées)
  const incomplets = c.filter((x) => x.statut === "inscrit" && comp.get(x.id)!.pct < 100 && x.relances < 2 && calme(x, 2));
  if (incomplets.length)
    A.push({
      id: "incomplets",
      urgence: 2,
      titre: pl(incomplets.length, "inscription incomplète", "inscriptions incomplètes"),
      detail: "Chaque élève reçoit la liste exacte de ce qui lui manque pour pouvoir être convoqué.",
      cibles: incomplets,
      bouton: "Envoyer ce qui manque",
      executer: () => `${relancer(incomplets, "dossier_incomplet").envoyes} e-mails personnalisés envoyés.`,
    });

  // 5. Inscrits complets à convoquer
  const convoques = new Set(db.convocations.map((k) => k.candidat_id));
  const prets = c.filter((x) => x.statut === "inscrit" && comp.get(x.id)!.pct === 100 && !convoques.has(x.id));
  const now = new Date().toISOString();
  const aVenir = db.sessions_test.filter((s) => s.date_heure > now);
  const convocables = prets.filter((x) => aVenir.some((s) => s.cohorte_id === x.cohorte_id));
  if (convocables.length)
    A.push({
      id: "convoquer",
      urgence: 2,
      titre: `${pl(convocables.length, "inscrit", "inscrits")} à convoquer au test`,
      detail: "Chacun est placé dans le centre de test le plus proche, dans sa province, selon les places restantes.",
      cibles: convocables,
      bouton: "Convoquer",
      executer: () => {
        const r = convoquer(convocables);
        return `${r.convoques} convocations envoyées avec QR code${r.sansPlace ? ` — ${r.sansPlace} sans place : ajoutez une session.` : "."}`;
      },
    });
  else if (prets.length >= 10) A.push({ id: "sessions", urgence: 3, titre: `${prets.length} inscrits attendent une date de test`, detail: "Créez les sessions de test de la cohorte pour pouvoir envoyer les convocations.", cibles: prets, lien: "/tests" });

  // 6. Convoqués sans confirmation
  const sansConf = c.filter((x) => {
    if (x.statut !== "convoque") return false;
    const k = db.convocations.find((y) => y.candidat_id === x.id);
    const s = k && db.sessions_test.find((y) => y.id === k.session_id);
    return !!k && k.confirme == null && k.present == null && !!s && s.date_heure > now && calme(x, 1);
  });
  if (sansConf.length)
    A.push({
      id: "confirmations",
      urgence: 2,
      titre: `${pl(sansConf.length, "convoqué n'a", "convoqués n'ont")} pas confirmé sa présence`,
      detail: "Rappel du lieu, de la date et de l'heure, avec le bouton de confirmation.",
      cibles: sansConf,
      bouton: "Rappeler",
      executer: () => `${envoyer(sansConf, "relance_confirmation", "email", { campagne: "Relances automatiques" })} rappels envoyés.`,
    });

  // 7. Absents au test
  const absents = c.filter((x) => x.statut === "convoque" && db.convocations.some((k) => k.candidat_id === x.id && k.present === false) && !db.messages.some((m) => m.candidat_id === x.id && m.modele === "rattrapage"));
  if (absents.length)
    A.push({
      id: "absents",
      urgence: 2,
      titre: `${pl(absents.length, "absent", "absents")} au test`,
      detail: "Convoqués mais non émargés. Proposer un rattrapage avant de clôturer la sélection.",
      cibles: absents,
      bouton: "Proposer un rattrapage",
      executer: () => `${envoyer(absents, "rattrapage", "email")} propositions envoyées.`,
    });

  // 8. Notes manquantes, puis sélection à faire
  const sansNote = c.filter((x) => x.statut === "teste" && !db.notes.some((n) => n.candidat_id === x.id));
  if (sansNote.length) A.push({ id: "notes", urgence: 2, titre: pl(sansNote.length, "note manquante", "notes manquantes"), detail: "Candidats émargés dont la note n'est pas encore saisie ou importée.", cibles: sansNote, lien: "/tests?onglet=notes" });
  const testes = c.filter((x) => x.statut === "teste");
  if (testes.length >= 10 && !sansNote.length) A.push({ id: "selection", urgence: 1, titre: "Les notes sont prêtes : lancer la sélection", detail: `${testes.length} candidats notés. Réglez le nombre de places et la règle filles / garçons, simulez, puis validez.`, cibles: testes, lien: "/tests?onglet=selection" });

  // 9. Retenus : dossier complet à fournir
  const elus = c.filter((x) => x.statut === "selectionne");
  const dossierIncomplet = elus.filter((x) => comp.get(x.id)!.manquants.some((m) => !m.startsWith("autorisation")) && calme(x, 2));
  if (dossierIncomplet.length)
    A.push({
      id: "dossiers-retenus",
      urgence: 2,
      titre: `${pl(dossierIncomplet.length, "retenu doit", "retenus doivent")} compléter son dossier`,
      detail: "Adresse, position du domicile, pièces : demandés seulement aux élèves retenus, après le test.",
      cibles: dossierIncomplet,
      bouton: "Rappeler ce qui manque",
      executer: () => `${envoyer(dossierIncomplet, "dossier_incomplet", "email", { campagne: "Relances automatiques" })} e-mails personnalisés envoyés.`,
    });

  // 10. Autorisations parentales : à vérifier, à relancer
  const recues = elus.filter((x) => autos.get(x.id)?.statut === "recu");
  if (recues.length) A.push({ id: "autorisations-recues", urgence: 1, titre: `${pl(recues.length, "autorisation signée", "autorisations signées")} à vérifier`, detail: "Le papier signé a été photographié et déposé : vérifiez la signature, puis validez ou refusez.", cibles: recues, lien: "/autorisations" });
  const sansAuto = elus.filter((x) => ["en_attente", "rejete"].includes(autos.get(x.id)?.statut ?? ""));
  const autoRelance = sansAuto.filter((x) => joursDepuis(dernierParent.get(x.id) ?? autos.get(x.id)!.created_at) >= 1 && calme(x, 1));
  if (autoRelance.length)
    A.push({
      id: "autorisations",
      urgence: 1,
      titre: `${pl(autoRelance.length, "autorisation parentale", "autorisations parentales")} pas encore reçue${autoRelance.length > 1 ? "s" : ""}`,
      detail: "À imprimer, signer à la main, puis photographier. Le parent est relancé par e-mail ; sans adresse, c'est l'élève qui est prévenu.",
      cibles: autoRelance,
      bouton: "Relancer",
      executer: () => {
        const avec = autoRelance.filter((x) => x.parent_email);
        const sans = autoRelance.filter((x) => !x.parent_email);
        envoyer(avec, "relance_autorisation", "email", { campagne: "Relances automatiques" });
        envoyer(sans, "dossier_incomplet", "email", { campagne: "Relances automatiques" });
        return `${avec.length} parents et ${sans.length} élèves relancés.`;
      },
    });

  // 11. Induction prête
  if (elus.length && elus.every((x) => autos.get(x.id)?.statut === "valide")) A.push({ id: "induction", urgence: 2, titre: "Toutes les autorisations sont validées", detail: `${elus.length} retenus peuvent partir en induction : attribuez les chambres et lancez la semaine.`, cibles: elus, lien: "/induction" });

  // 12. Affectation à faire
  const affectes = new Set(db.affectations.filter((a) => a.statut === "validee").map((a) => a.candidat_id));
  const sansAgence = c.filter((x) => x.statut === "induction" && !affectes.has(x.id));
  if (sansAgence.length) A.push({ id: "affectation", urgence: 3, titre: `${sansAgence.length} futurs stagiaires sans agence`, detail: "La plateforme calcule l'agence la plus proche de chaque domicile, dans la province de l'élève et la limite des places.", cibles: sansAgence, lien: "/stage" });

  // 13. Absences en stage
  const auj = jourISO();
  const absStage = c.filter((x) => {
    if (x.statut !== "stage") return false;
    const jours = db.presences.filter((p) => p.candidat_id === x.id && p.contexte === "stage").map((p) => p.jour).sort();
    const d = jours[jours.length - 1];
    return !!d && d < auj && joursDepuis(d + "T12:00:00") >= 3 && !db.messages.some((m) => m.candidat_id === x.id && m.modele === "absence_stage" && joursDepuis(m.created_at) < 3);
  });
  if (absStage.length)
    A.push({
      id: "absences-stage",
      urgence: 1,
      titre: `${pl(absStage.length, "stagiaire n'a", "stagiaires n'ont")} pas pointé depuis 3 jours`,
      detail: `${absStage.slice(0, 5).map(nomComplet).join(", ")}${absStage.length > 5 ? "…" : ""}. Prendre des nouvelles avant que l'absence ne devienne un abandon.`,
      cibles: absStage,
      bouton: "Écrire aux stagiaires",
      executer: () => `${envoyer(absStage, "absence_stage", "email", { extra: () => ({ jours: 3 }) })} e-mails envoyés. Pensez aussi à appeler le chef d'agence.`,
    });

  // 14. Pointages hors zone, comptes à ouvrir
  const horsZone = db.presences.filter((p) => p.hors_zone && !p.valide);
  if (horsZone.length) A.push({ id: "hors-zone", urgence: 3, titre: `${pl(horsZone.length, "pointage", "pointages")} hors zone à confirmer`, detail: "Le stagiaire a pointé à plus de 300 m de son agence : le chef d'agence doit confirmer.", cibles: c.filter((x) => horsZone.some((p) => p.candidat_id === x.id)), lien: "/stage" });
  const sansCompte = c.filter((x) => x.statut === "stage" && !x.compte_ouvert);
  if (sansCompte.length) A.push({ id: "comptes", urgence: 3, titre: `${pl(sansCompte.length, "stagiaire", "stagiaires")} sans compte ouvert`, detail: "Le compte doit être ouvert en agence pour verser l'indemnité. La plateforme ne stocke aucune donnée bancaire.", cibles: sansCompte, lien: "/stage" });

  return A.sort((a, b) => a.urgence - b.urgence);
}
