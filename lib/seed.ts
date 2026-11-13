// Données 100 % fictives : 200 élèves imaginaires, générés de façon déterministe.
// Aucune donnée réelle n'est utilisée tant que la Fondation et l'informatique
// de la banque n'ont pas donné leur accord.
import { COMMUNES, distanceKm } from "./geo";
import { completude, jourISO, proposerAffectations, simulerSelection } from "./logic";
import { MODELES, fmtDate, fmtHeure, remplir } from "./modeles";
import type { Agence, Candidat, Centre, DB, DocumentRow, Message, Sexe, TypeDocument } from "./types";

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PRENOMS_F = ["Grâce", "Divine", "Merveille", "Esther", "Ruth", "Sarah", "Naomie", "Gloria", "Plamedie", "Dorcas", "Rachel", "Bénédicte", "Christelle", "Prisca", "Exaucée", "Déborah", "Mireille", "Ornella", "Jemima", "Keren", "Laetitia", "Béni", "Francine", "Josiane", "Nadège"];
const PRENOMS_M = ["Jonathan", "Daniel", "Samuel", "Emmanuel", "Josué", "Patrick", "Christian", "Glody", "Exaucé", "Héritier", "Trésor", "Dieu-Merci", "Junior", "Kevin", "Moïse", "David", "Élie", "Gédéon", "Fiston", "Cédric", "Arnold", "Bienvenu", "Chadrack", "Japhet", "Ézéchiel"];
const NOMS = ["Kabongo", "Mbuyi", "Ilunga", "Mukendi", "Kalala", "Tshibangu", "Ngoy", "Mutombo", "Kasongo", "Lukusa", "Nzuzi", "Makiese", "Luzolo", "Matondo", "Mbala", "Nsimba", "Lutete", "Kiala", "Mavungu", "Bofunda", "Lokwa", "Bolamba", "Mwamba", "Kayembe", "Banza", "Kazadi", "Mulumba", "Ntumba", "Kabeya", "Bukasa", "Mpiana", "Lumbala", "Mbombo", "Diakiese", "Mayele", "Nkanga", "Mosengo", "Ekofo", "Lisasi", "Tshimanga"];
const ECOLES_T = ["Collège", "Lycée", "Institut", "Complexe scolaire"];
const ECOLES_N = ["Lumière", "Les Pionniers", "Espoir", "Excellence", "Sainte-Trinité", "La Colombe", "Avenir", "Mont-Sinaï", "Bondeko", "Elikya", "Bosembo", "Mwinda"];
const SECTIONS = ["Scientifique (Math-Physique)", "Scientifique (Biochimie)", "Commerciale et Gestion", "Littéraire", "Pédagogie générale", "Technique (Électricité)"];
const LIENS = ["Mère", "Père", "Oncle", "Tante", "Tuteur", "Grande sœur"];
const AVENUES = ["av. de la Paix", "av. Kasa-Vubu", "av. des Écoles", "av. Lumumba", "av. Kikwit", "rue Luozi", "av. de l'Université", "av. Bobozo", "rue Mbanza-Ngungu", "av. Sendwe"];

const AGENCES_BASE: [string, string, string, number, number, number, string][] = [
  ["Gombe — Siège", "Gombe", "Boulevard du 30 Juin", -4.3033, 15.307, 4, "Mme Clarisse Mbemba"],
  ["Gombe — Royal", "Gombe", "Rond-point Royal", -4.3085, 15.289, 3, "M. Serge Ilunga"],
  ["Kinshasa — Commerce", "Kinshasa", "Avenue du Commerce", -4.3105, 15.3125, 3, "M. Alain Mputu"],
  ["Kintambo — Magasin", "Kintambo", "Rond-point Kintambo Magasin", -4.329, 15.272, 3, "Mme Sylvie Kanku"],
  ["Ngaliema — UPN", "Ngaliema", "Route de Matadi, UPN", -4.404, 15.256, 3, "M. Didier Nsumbu"],
  ["Ngaliema — Ma Campagne", "Ngaliema", "Avenue de l'École", -4.356, 15.248, 2, "Mme Odette Lema"],
  ["Bandalungwa", "Bandalungwa", "Avenue Kasa-Vubu", -4.344, 15.283, 3, "M. Roger Mabiala"],
  ["Kasa-Vubu — Victoire", "Kasa-Vubu", "Rond-point Victoire", -4.338, 15.313, 3, "Mme Aline Tshiala"],
  ["Limete — 7e Rue", "Limete", "Boulevard Lumumba, 7e Rue", -4.348, 15.342, 4, "M. Fabrice Kitoko"],
  ["Limete — Kingabwa", "Limete", "Route des Poids Lourds", -4.335, 15.355, 2, "Mme Rose Mbuyamba"],
  ["Lemba — Super", "Lemba", "Super Lemba", -4.39, 15.332, 3, "M. Guy Kalonji"],
  ["Matete", "Matete", "Avenue Kikwit", -4.387, 15.36, 3, "Mme Chantal Ngalula"],
  ["Ndjili — Quartier 7", "Ndjili", "Boulevard Lumumba, Q7", -4.4, 15.38, 3, "M. Blaise Nzita"],
  ["Masina — Sans Fil", "Masina", "Boulevard Lumumba, Sans Fil", -4.383, 15.395, 4, "Mme Julie Mafuta"],
  ["Kimbanseke", "Kimbanseke", "Avenue Mokali", -4.415, 15.405, 3, "M. Pascal Lubaki"],
  ["Mont-Ngafula", "Mont-Ngafula", "Route de Matadi, Cité Verte", -4.435, 15.28, 2, "Mme Irène Kiese"],
];

const CENTRES_BASE: [string, "test" | "hotel", string, string, number, number, number][] = [
  ["Centre de test Gombe", "test", "Gombe", "Salle polyvalente, av. de la Justice", -4.3065, 15.297, 60],
  ["Centre de test Limete", "test", "Limete", "Salle paroissiale, 12e Rue", -4.356, 15.347, 60],
  ["Centre de test Masina", "test", "Masina", "Complexe scolaire, Quartier 3", -4.388, 15.402, 60],
  ["Centre de test Ngaliema", "test", "Ngaliema", "Amphithéâtre, route de Matadi", -4.372, 15.25, 60],
  ["Hôtel de l'induction", "hotel", "Gombe", "Avenue Batetela (lieu fictif)", -4.3, 15.312, 60],
];

export function buildDemo(etape: number, graine = 2027): DB {
  const rnd = mulberry32(graine);
  const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
  const hex = (n: number) => Array.from({ length: n }, () => Math.floor(rnd() * 16).toString(16)).join("");
  const uid = () => `${hex(8)}-${hex(4)}-4${hex(3)}-a${hex(3)}-${hex(12)}`;
  const jeton = () => Array.from({ length: 10 }, () => "abcdefghjkmnpqrstuvwxyz23456789"[Math.floor(rnd() * 31)]).join("");
  const gauss = () => (rnd() + rnd() + rnd() + rnd() - 2) / 0.58;
  const tel = () => `+243 ${pick(["81", "82", "84", "85", "89", "97", "99"])}${Math.floor(rnd() * 10)} ${String(Math.floor(rnd() * 1000)).padStart(3, "0")} ${String(Math.floor(rnd() * 1000)).padStart(3, "0")}`;
  const now = Date.now();
  const ilYA = (jours: number) => new Date(now - jours * 86400000).toISOString();
  const dans = (jours: number, heure = 8, minute = 30) => {
    const d = new Date(now + jours * 86400000);
    d.setHours(heure, minute, 0, 0);
    return d.toISOString();
  };

  const E = Math.min(7, Math.max(1, etape));
  const tInvite = [0.08, 6, 14, 24, 30, 40, 62][E - 1];
  const tTest = [0, 0, -3, 2, 8, 18, 40][E - 1]; // jours écoulés depuis le test (négatif = à venir)
  const tSelection = [0, 0, 0, 0, 3, 13, 35][E - 1];
  const tInduction = [0, 0, 0, 0, -5, 2, 24][E - 1]; // depuis le 1er jour d'induction
  const tStage = 14;

  const cohorteId = uid();
  const db: DB = {
    cohortes: [{ id: cohorteId, nom: "ELP 2027 — Kinshasa (démo)", annee: 2027, seuil_exetat: 80, places: 40, taille_attente: 10, statut: "active", created_at: ilYA(tInvite + 1) }],
    candidats: [],
    documents: [],
    centres: CENTRES_BASE.map(([nom, type, commune, adresse, lat, lng, capacite]): Centre => ({ id: uid(), nom, type, commune, adresse, lat, lng, capacite })),
    sessions_test: [],
    convocations: [],
    notes: [],
    agences: AGENCES_BASE.map(([nom, commune, adresse, lat, lng, capacite, chef_nom]): Agence => ({ id: uid(), nom, commune, adresse, lat, lng, capacite, chef_nom, chef_telephone: tel(), position_verifiee: false })),
    affectations: [],
    presences: [],
    messages: [],
    journal: [],
  };

  const sms = (c: Candidat, modeleId: string, vars: Record<string, string | number>, quand: string, canal: Message["canal"] = "sms", campagne = "") => {
    const m = MODELES.find((x) => x.id === modeleId)!;
    const lien = m.lien === "parent" ? `/p/${c.parent_token}` : m.lien === "inscription" ? `/moi?t=${c.token}` : null;
    const parent = m.destinataire === "parent";
    const echec = !parent && c.telephone_invalide;
    db.messages.push({
      id: uid(),
      candidat_id: c.id,
      destinataire: m.destinataire,
      nom_destinataire: parent ? c.parent_nom : `${c.prenom} ${c.nom}`,
      telephone: parent ? c.parent_telephone : c.telephone,
      canal,
      modele: modeleId,
      contenu: remplir(m.texte, { prenom: c.prenom, nom: c.nom, pct: c.pourcentage_exetat, annee: 2027, lien: lien ? `elp-hub.cd${lien}` : "", ...vars }),
      lien,
      statut: echec ? "echec" : canal === "whatsapp" && rnd() < 0.7 ? "lu" : "livre",
      campagne: campagne || m.nom,
      created_at: quand,
    });
  };
  const journal = (acteur: string, role: DB["journal"][number]["role"], action: string, cible: string, quand: string) =>
    db.journal.push({ id: uid(), acteur, role, action, cible, created_at: quand });

  /* ----- 1. Liste Exetat importée ----- */
  const totalPoids = COMMUNES.reduce((s, c) => s + c.poids, 0);
  const profil: Record<string, number> = {};
  for (let i = 0; i < 200; i++) {
    const sexe: Sexe = i % 2 === 0 ? "F" : "M";
    let r = rnd() * totalPoids;
    const com = COMMUNES.find((c) => (r -= c.poids) < 0) ?? COMMUNES[0];
    const nom = pick(NOMS);
    const c: Candidat = {
      id: uid(),
      cohorte_id: cohorteId,
      code: `ELP27-${String(i + 1).padStart(4, "0")}`,
      nom,
      postnom: pick(NOMS.filter((n) => n !== nom)),
      prenom: pick(sexe === "F" ? PRENOMS_F : PRENOMS_M),
      sexe,
      date_naissance: null,
      telephone: tel(),
      email: null,
      ecole: `${pick(ECOLES_T)} ${pick(ECOLES_N)} de ${com.nom}`,
      section: pick(SECTIONS),
      pourcentage_exetat: Math.min(96, Math.round(80 + Math.abs(gauss()) * 4.2)),
      commune: com.nom,
      adresse: "",
      lat: null,
      lng: null,
      statut: "invite",
      statut_depuis: ilYA(tInvite),
      parent_nom: "",
      parent_lien: "",
      parent_telephone: "",
      parent_token: jeton(),
      token: jeton(),
      allergies: "",
      urgence_nom: "",
      urgence_telephone: "",
      consentement_le: null,
      invite_le: ilYA(tInvite),
      inscrit_le: null,
      derniere_activite: null,
      relances: 0,
      telephone_invalide: i % 37 === 11,
      chambre: null,
      compte_ouvert: false,
      note_interne: "",
      anonymise: false,
      rang_attente: null,
    };
    profil[c.id] = rnd();
    db.candidats.push(c);
    sms(c, "invitation", {}, ilYA(tInvite), "sms", "Invitations ELP 2027");
  }
  journal("Mme Nadine K. (encadreure)", "encadreur", "Import de la liste Exetat : 200 élèves, 3 doublons écartés", "ELP 2027", ilYA(tInvite + 0.02));
  journal("Mme Nadine K. (encadreure)", "encadreur", "Envoi de 200 invitations par SMS", "ELP 2027", ilYA(tInvite));

  /* ----- 2. Inscriptions ----- */
  if (E >= 2) {
    const tauxInscrit = E === 2 ? 0.52 : 0.87;
    const tauxComplet = E === 2 ? 0.62 : 0.93;
    for (const c of db.candidats) {
      const p = profil[c.id];
      if (c.telephone_invalide || p > tauxInscrit) {
        c.relances = Math.min(3, Math.floor(tInvite / 3.2));
        for (let k = 1; k <= c.relances; k++) sms(c, "relance_inscription", {}, ilYA(tInvite - k * 3), k >= 2 ? "whatsapp" : "sms", "Relances automatiques");
        continue;
      }
      const com = COMMUNES.find((x) => x.nom === c.commune)!;
      const jour = Math.max(0.1, tInvite - 0.3 - p * (E === 2 ? 5 : 8) * 1.1);
      const complet = rnd() < tauxComplet;
      const manque = complet ? [] : [pick(["gps", "bulletin", "identite", "urgence"]), pick(["bulletin", "photo", "gps"])];
      c.statut = "inscrit";
      c.inscrit_le = ilYA(jour);
      c.statut_depuis = c.inscrit_le;
      c.derniere_activite = ilYA(Math.max(0.05, jour - rnd()));
      c.date_naissance = `${2008 + Math.floor(rnd() * 2)}-${String(1 + Math.floor(rnd() * 12)).padStart(2, "0")}-${String(1 + Math.floor(rnd() * 28)).padStart(2, "0")}`;
      c.adresse = `${1 + Math.floor(rnd() * 180)}, ${pick(AVENUES)}, Q. ${1 + Math.floor(rnd() * 12)}`;
      if (!manque.includes("gps")) {
        c.lat = +(com.lat + gauss() * 0.009).toFixed(5);
        c.lng = +(com.lng + gauss() * 0.009).toFixed(5);
      }
      c.parent_lien = pick(LIENS);
      c.parent_nom = `${pick(["Mère", "Tante", "Grande sœur"].includes(c.parent_lien) ? PRENOMS_F : PRENOMS_M)} ${c.nom}`;
      c.parent_telephone = tel();
      if (!manque.includes("urgence")) {
        c.urgence_nom = c.parent_nom;
        c.urgence_telephone = c.parent_telephone;
      }
      c.allergies = rnd() < 0.08 ? pick(["Arachides", "Pénicilline", "Asthme léger"]) : "";
      c.consentement_le = c.inscrit_le;
      c.email = rnd() < 0.5 ? `${c.prenom}.${c.nom}${Math.floor(rnd() * 90)}@exemple.cd`.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "") : null;
      for (const type of ["photo", "bulletin", "identite"] as TypeDocument[]) {
        if (manque.includes(type)) continue;
        db.documents.push(docVide(uid(), c.id, type, E >= 3 && complet ? "valide" : "recu", c.inscrit_le));
      }
      if (!complet && tInvite > 4) {
        c.relances = 1;
        sms(c, "dossier_incomplet", { manquants: completude(c, db.documents).manquants.slice(0, 2).join(", ") }, ilYA(Math.max(0.2, jour - 2)), "sms", "Relances automatiques");
      }
    }
  }

  /* ----- 3. Convocations ----- */
  const centresTest = db.centres.filter((c) => c.type === "test");
  const hotel = db.centres.find((c) => c.type === "hotel")!;
  if (E >= 3) {
    for (const centre of centresTest)
      for (const h of [8, 13])
        db.sessions_test.push({ id: uid(), cohorte_id: cohorteId, centre_id: centre.id, date_heure: dans(-tTest, h, 30), capacite: 30 });
    const remplissage: Record<string, number> = {};
    const tConv = tTest + 7;
    for (const c of db.candidats) {
      if (c.statut !== "inscrit" || completude(c, db.documents).pct < 100) continue;
      const proches = centresTest.slice().sort((a, b) => distanceKm(c.lat!, c.lng!, a.lat, a.lng) - distanceKm(c.lat!, c.lng!, b.lat, b.lng));
      const session = proches.flatMap((ct) => db.sessions_test.filter((s) => s.centre_id === ct.id)).find((s) => (remplissage[s.id] ?? 0) < s.capacite)!;
      remplissage[session.id] = (remplissage[session.id] ?? 0) + 1;
      const centre = db.centres.find((x) => x.id === session.centre_id)!;
      const p = rnd();
      const present = E >= 4 ? rnd() < 0.93 : null;
      db.convocations.push({ id: uid(), candidat_id: c.id, session_id: session.id, confirme: p < 0.68 ? true : p < 0.72 ? false : null, present, emarge_le: present ? new Date(new Date(session.date_heure).getTime() - rnd() * 1500000).toISOString() : null });
      c.statut = "convoque";
      c.statut_depuis = ilYA(tConv);
      sms(c, "convocation", { date: fmtDate(session.date_heure), heure: fmtHeure(session.date_heure), centre: centre.nom }, ilYA(tConv), "sms", "Convocations au test");
      if (present) {
        db.presences.push({ id: uid(), candidat_id: c.id, contexte: "test", jour: jourISO(new Date(session.date_heure)), horodatage: session.date_heure, methode: "qr", hors_zone: false, valide: true });
        const ecrit = Math.round(Math.min(60, Math.max(14, 37 + (c.pourcentage_exetat - 84) * 0.9 + gauss() * 8)));
        const entretien = Math.round(Math.min(40, Math.max(8, 26 + gauss() * 6)));
        db.notes.push({ id: uid(), candidat_id: c.id, ecrit, entretien, total: ecrit + entretien });
        c.statut = "teste";
        c.statut_depuis = ilYA(tTest);
      }
    }
    journal("Mme Nadine K. (encadreure)", "encadreur", `Convocation de ${db.convocations.length} candidats répartis sur ${db.sessions_test.length} sessions`, "ELP 2027", ilYA(tConv));
    if (E >= 4) journal("Responsable de centre", "centre", "Émargement par QR code terminé", "Centre de test Limete", ilYA(tTest));
  }

  /* ----- 5. Sélection ----- */
  const parId = new Map(db.candidats.map((c) => [c.id, c]));
  if (E >= 5) {
    const liste = db.notes.map((n) => ({ id: n.candidat_id, sexe: parId.get(n.candidat_id)!.sexe, total: n.total }));
    const res = simulerSelection(liste, 40, 10, 50);
    res.selectionnes.forEach((id, i) => {
      const c = parId.get(id)!;
      c.statut = "selectionne";
      c.statut_depuis = ilYA(tSelection);
      sms(c, "selectionne", {}, ilYA(tSelection), "sms", "Résultats de la sélection");
      sms(c, "autorisation_parent", {}, ilYA(tSelection), "sms", "Autorisations parentales");
      const signe = E >= 6 || i % 5 < 3;
      const quand = ilYA(Math.max(0.2, tSelection - 0.3 - rnd() * 2));
      db.documents.push({ ...docVide(uid(), c.id, "autorisation", signe ? "signe" : "en_attente", ilYA(tSelection)), signe_par: signe ? c.parent_nom : "", signe_le: signe ? quand : null, signature: signe ? "demo" : null, code_verification: signe ? `EGF-${hex(4).toUpperCase()}-${hex(4).toUpperCase()}` : "", empreinte: signe ? hex(64) : "" });
      if (!signe && tSelection >= 2) sms(c, "relance_autorisation", {}, ilYA(tSelection - 2), "whatsapp", "Relances automatiques");
    });
    res.attente.forEach((id, i) => {
      const c = parId.get(id)!;
      c.statut = "attente";
      c.rang_attente = i + 1;
      c.statut_depuis = ilYA(tSelection);
      sms(c, "attente", { rang: i + 1 }, ilYA(tSelection), "sms", "Résultats de la sélection");
    });
    res.nonRetenus.forEach((id) => {
      const c = parId.get(id)!;
      c.statut = "non_retenu";
      c.statut_depuis = ilYA(tSelection);
      sms(c, "non_retenu", {}, ilYA(tSelection), "sms", "Résultats de la sélection");
    });
    journal("Admin national EGF", "admin", `Sélection validée : ${res.filles} filles et ${res.garcons} garçons, ${res.attente.length} en liste d'attente`, "ELP 2027", ilYA(tSelection));
    if (E === 5) {
      // Un désistement : la plateforme proposera de promouvoir la liste d'attente.
      const d = parId.get(res.selectionnes[17])!;
      d.statut = "desiste";
      d.statut_depuis = ilYA(0.6);
      d.note_interne = "A appelé : part étudier à Lubumbashi, renonce au programme.";
      journal("Mme Nadine K. (encadreure)", "encadreur", "Désistement enregistré", `${d.prenom} ${d.nom}`, ilYA(0.6));
    }
  }

  /* ----- 6. Induction ----- */
  if (E >= 6) {
    const elus = db.candidats.filter((c) => c.statut === "selectionne");
    for (const s of ["F", "M"] as Sexe[])
      elus.filter((c) => c.sexe === s).forEach((c, i) => {
        c.chambre = `${s === "F" ? 2 : 3}${String(Math.floor(i / 2) + 1).padStart(2, "0")}`;
      });
    const debut = dans(-tInduction, 8, 0);
    for (const c of elus) {
      c.statut = "induction";
      c.statut_depuis = debut;
      sms(c, "induction", { date: fmtDate(debut), heure: fmtHeure(debut), centre: hotel.nom, chambre: c.chambre! }, ilYA(tInduction + 4), "sms", "Informations induction");
      for (let j = 0; j < Math.min(5, Math.floor(tInduction) + 1); j++) {
        if (rnd() < 0.04) continue;
        const d = new Date(new Date(debut).getTime() + j * 86400000 + rnd() * 1200000);
        db.presences.push({ id: uid(), candidat_id: c.id, contexte: "induction", jour: jourISO(d), horodatage: d.toISOString(), methode: "qr", hors_zone: false, valide: true });
      }
    }
  }

  /* ----- 7. Stage ----- */
  if (E >= 7) {
    const stagiaires = db.candidats.filter((c) => c.statut === "induction");
    const debut = dans(-tStage, 8, 0);
    const props = proposerAffectations(stagiaires, db.agences);
    const absent = stagiaires[7]?.id;
    for (const p of props) {
      if (!p.agence_id) continue;
      const c = parId.get(p.candidat_id)!;
      const a = db.agences.find((x) => x.id === p.agence_id)!;
      c.statut = "stage";
      c.statut_depuis = debut;
      c.compte_ouvert = rnd() < 0.85;
      db.affectations.push({ id: uid(), candidat_id: c.id, agence_id: a.id, distance_km: p.distance_km, statut: "validee", manuelle: false, valide_le: ilYA(tStage + 3), evaluation: null, evalue_le: null, indemnite_payee: false });
      sms(c, "affectation_stagiaire", { agence: a.nom, km: p.distance_km, chef: a.chef_nom, date: fmtDate(debut) }, ilYA(tStage + 3), "sms", "Affectations de stage");
      for (let j = tStage; j >= 0; j--) {
        const d = new Date(now - j * 86400000);
        if (d.getDay() === 0 || d.getDay() === 6) continue;
        if (c.id === absent ? j <= 3 : rnd() < 0.05) continue;
        d.setHours(7, 40 + Math.floor(rnd() * 35), 0, 0);
        if (d.getTime() > now) continue;
        db.presences.push({ id: uid(), candidat_id: c.id, contexte: "stage", jour: jourISO(d), horodatage: d.toISOString(), methode: "gps", hors_zone: false, valide: true });
      }
    }
    for (const a of db.agences) {
      const siens = db.affectations.filter((x) => x.agence_id === a.id).map((x) => parId.get(x.candidat_id)!);
      if (!siens.length) continue;
      db.messages.push({ id: uid(), candidat_id: null, destinataire: "agence", nom_destinataire: a.chef_nom, telephone: a.chef_telephone, canal: "sms", modele: "affectation_chef", contenu: remplir(MODELES.find((m) => m.id === "affectation_chef")!.texte, { n: siens.length, agence: a.nom, date: fmtDate(debut), liste: siens.map((c) => `${c.prenom} ${c.nom}`).join(", ") }), lien: null, statut: "livre", campagne: "Affectations de stage", created_at: ilYA(tStage + 3) });
    }
    journal("Mme Nadine K. (encadreure)", "encadreur", `Affectations validées : ${db.affectations.length} stagiaires dans ${new Set(db.affectations.map((a) => a.agence_id)).size} agences`, "ELP 2027", ilYA(tStage + 3));
  }

  db.messages.sort((a, b) => a.created_at.localeCompare(b.created_at));
  db.journal.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return db;
}

export function docVide(id: string, candidat_id: string, type: TypeDocument, statut: DocumentRow["statut"], created_at: string): DocumentRow {
  const noms: Record<TypeDocument, string> = { photo: "photo.jpg", bulletin: "bulletin-exetat.pdf", identite: "piece-identite.jpg", autorisation: "autorisation-parentale.pdf" };
  return { id, candidat_id, type, statut, nom_fichier: noms[type], apercu: null, motif_rejet: "", signe_par: "", signe_le: null, signature: null, code_verification: "", empreinte: "", otp: null, otp_expire_le: null, created_at };
}
