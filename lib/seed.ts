// Données 100 % fictives, générées de façon déterministe : trois cohortes
// (2025 terminée, 2026 en stage, 2027 en cours) réparties sur quatre provinces.
// Aucune donnée réelle n'est utilisée tant que la Fondation et l'informatique
// de la banque n'ont pas donné leur accord.
import { COMMUNES, distanceKm, position } from "./geo";
import { completude, jourISO, proposerAffectations, simulerSelection } from "./logic";
import { MODELES, fmtDate, fmtHeure, remplir } from "./modeles";
import type { Agence, Candidat, Centre, Chapitre, DB, DocumentRow, Sexe, TypeDocument } from "./types";

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
const MOTIFS_EXCLUSION = ["Absences répétées et non justifiées pendant le stage", "Non-respect du règlement de l'agence"];

// Liste d'exemple : à remplacer par la liste officielle des agences EquityBCDC.
const AGENCES_BASE: [string, string, string, string, number, number, number, string][] = [
  ["Gombe — Siège", "Kinshasa", "Gombe", "Boulevard du 30 Juin", -4.3033, 15.307, 6, "Mme Clarisse Mbemba"],
  ["Gombe — Royal", "Kinshasa", "Gombe", "Rond-point Royal", -4.3085, 15.289, 4, "M. Serge Ilunga"],
  ["Kinshasa — Commerce", "Kinshasa", "Kinshasa", "Avenue du Commerce", -4.3105, 15.3125, 4, "M. Alain Mputu"],
  ["Kintambo — Magasin", "Kinshasa", "Kintambo", "Rond-point Kintambo Magasin", -4.329, 15.272, 4, "Mme Sylvie Kanku"],
  ["Ngaliema — UPN", "Kinshasa", "Ngaliema", "Route de Matadi, UPN", -4.404, 15.256, 5, "M. Didier Nsumbu"],
  ["Ngaliema — Ma Campagne", "Kinshasa", "Ngaliema", "Avenue de l'École", -4.356, 15.248, 4, "Mme Odette Lema"],
  ["Bandalungwa", "Kinshasa", "Bandalungwa", "Avenue Kasa-Vubu", -4.344, 15.283, 4, "M. Roger Mabiala"],
  ["Kasa-Vubu — Victoire", "Kinshasa", "Kasa-Vubu", "Rond-point Victoire", -4.338, 15.313, 5, "Mme Aline Tshiala"],
  ["Limete — 7e Rue", "Kinshasa", "Limete", "Boulevard Lumumba, 7e Rue", -4.348, 15.342, 5, "M. Fabrice Kitoko"],
  ["Limete — Kingabwa", "Kinshasa", "Limete", "Route des Poids Lourds", -4.335, 15.355, 3, "Mme Rose Mbuyamba"],
  ["Lemba — Super", "Kinshasa", "Lemba", "Super Lemba", -4.39, 15.332, 5, "M. Guy Kalonji"],
  ["Matete", "Kinshasa", "Matete", "Avenue Kikwit", -4.387, 15.36, 4, "Mme Chantal Ngalula"],
  ["Ndjili — Quartier 7", "Kinshasa", "Ndjili", "Boulevard Lumumba, Q7", -4.4, 15.38, 5, "M. Blaise Nzita"],
  ["Masina — Sans Fil", "Kinshasa", "Masina", "Boulevard Lumumba, Sans Fil", -4.383, 15.395, 6, "Mme Julie Mafuta"],
  ["Kimbanseke", "Kinshasa", "Kimbanseke", "Avenue Mokali", -4.415, 15.405, 5, "M. Pascal Lubaki"],
  ["Mont-Ngafula", "Kinshasa", "Mont-Ngafula", "Route de Matadi, Cité Verte", -4.435, 15.28, 3, "Mme Irène Kiese"],
  ["Lubumbashi — Centre", "Haut-Katanga", "Lubumbashi", "Avenue Kasaï", -11.662, 27.479, 5, "M. Jean Kyungu"],
  ["Lubumbashi — Kenya", "Haut-Katanga", "Kenya", "Avenue de la Kenya", -11.689, 27.482, 4, "Mme Nicole Mwewa"],
  ["Lubumbashi — Golf", "Haut-Katanga", "Annexe", "Route du Golf", -11.63, 27.46, 4, "M. Éric Kasongo"],
  ["Goma — Centre", "Nord-Kivu", "Goma", "Boulevard Kanyamuhanga", -1.679, 29.226, 5, "Mme Furaha Bahati"],
  ["Goma — Virunga", "Nord-Kivu", "Karisimbi", "Avenue Virunga", -1.658, 29.218, 4, "M. Amani Kambale"],
  ["Matadi — Ville", "Kongo-Central", "Matadi", "Avenue Mobutu", -5.824, 13.457, 4, "M. Noël Nsiala"],
  ["Matadi — Port", "Kongo-Central", "Nzanza", "Avenue du Port", -5.833, 13.468, 3, "Mme Ange Lukoki"],
];

const CENTRES_BASE: [string, "test" | "hotel", string, string, string, number, number, number][] = [
  ["Centre de test Gombe", "test", "Kinshasa", "Gombe", "Salle polyvalente, av. de la Justice", -4.3065, 15.297, 60],
  ["Centre de test Limete", "test", "Kinshasa", "Limete", "Salle paroissiale, 12e Rue", -4.356, 15.347, 60],
  ["Centre de test Masina", "test", "Kinshasa", "Masina", "Complexe scolaire, Quartier 3", -4.388, 15.402, 60],
  ["Centre de test Ngaliema", "test", "Kinshasa", "Ngaliema", "Amphithéâtre, route de Matadi", -4.372, 15.25, 60],
  ["Centre de test Lubumbashi", "test", "Haut-Katanga", "Lubumbashi", "Salle des fêtes, av. Mama Yemo", -11.666, 27.485, 60],
  ["Centre de test Goma", "test", "Nord-Kivu", "Goma", "Salle communale, av. du Rond-Point", -1.677, 29.23, 60],
  ["Centre de test Matadi", "test", "Kongo-Central", "Matadi", "Salle paroissiale, av. Inga", -5.827, 13.459, 60],
  ["Hôtel de l'induction", "hotel", "Kinshasa", "Gombe", "Avenue Batetela (lieu fictif)", -4.3, 15.312, 80],
];

const CHAPITRES_BASE: [string, Chapitre["type"], string, string, string][] = [
  ["Chapitre UNIKIN", "universite", "Kinshasa", "Université de Kinshasa", "ELP étudiant à l'Université de Kinshasa"],
  ["Chapitre UPC", "universite", "Kinshasa", "Université Protestante au Congo", "ELP étudiant à l'UPC"],
  ["Chapitre ISC Kinshasa", "universite", "Kinshasa", "Institut Supérieur de Commerce", "ELP étudiant à l'ISC"],
  ["Chapitre Lubumbashi", "lieu", "Haut-Katanga", "Université de Lubumbashi", "Tous les ELP du Haut-Katanga"],
  ["Chapitre Goma", "lieu", "Nord-Kivu", "Université de Goma", "Tous les ELP du Nord-Kivu"],
];

export const ANNEE_DEMO = 2027;

export function buildDemo(etape: number, graine = 2027): DB {
  const rnd = mulberry32(graine);
  const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
  const hex = (n: number) => Array.from({ length: n }, () => Math.floor(rnd() * 16).toString(16)).join("");
  const uid = () => `${hex(8)}-${hex(4)}-4${hex(3)}-a${hex(3)}-${hex(12)}`;
  const jeton = () => Array.from({ length: 12 }, () => "abcdefghjkmnpqrstuvwxyz23456789"[Math.floor(rnd() * 31)]).join("");
  const gauss = () => (rnd() + rnd() + rnd() + rnd() - 2) / 0.58;
  const tel = () => `+243 ${pick(["81", "82", "84", "85", "89", "97", "99"])}${Math.floor(rnd() * 10)} ${String(Math.floor(rnd() * 1000)).padStart(3, "0")} ${String(Math.floor(rnd() * 1000)).padStart(3, "0")}`;
  const ascii = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z]/g, "");
  const now = Date.now();
  const totalPoids = COMMUNES.reduce((s, c) => s + c.poids, 0);

  const db: DB = {
    cohortes: [],
    candidats: [],
    documents: [],
    centres: CENTRES_BASE.map(([nom, type, province, commune, adresse, lat, lng, capacite]): Centre => ({ id: uid(), nom, type, province, commune, adresse, lat, lng, capacite })),
    sessions_test: [],
    convocations: [],
    notes: [],
    agences: AGENCES_BASE.map(([nom, province, commune, adresse, lat, lng, capacite, chef_nom]): Agence => ({ id: uid(), nom, province, commune, adresse, lat, lng, capacite, chef_nom, chef_telephone: tel(), chef_email: `agence.${ascii(nom)}@exemple.cd`, position_verifiee: false })),
    affectations: [],
    chapitres: CHAPITRES_BASE.map(([nom, type, province, , description]): Chapitre => ({ id: uid(), nom, type, province, description, created_at: new Date(now - 400 * 86400000).toISOString() })),
    presences: [],
    messages: [],
    journal: [],
  };
  const hotel = db.centres.find((c) => c.type === "hotel")!;

  /** Ajoute une cohorte avancée jusqu'à `etape`. `decalage` = jours écoulés depuis sa propre « aujourd'hui ». */
  function cohorte(annee: number, n: number, places: number, etape: number, decalage: number, avecMessages: boolean) {
    const E = Math.min(8, Math.max(1, etape));
    const ilYA = (jours: number) => new Date(now - (jours + decalage) * 86400000).toISOString();
    const dans = (jours: number, heure = 8, minute = 30) => {
      const d = new Date(now + (jours - decalage) * 86400000);
      d.setHours(heure, minute, 0, 0);
      return d.toISOString();
    };
    const tInvite = [0.08, 6, 14, 24, 30, 40, 62, 110][E - 1];
    const tTest = [0, 0, -3, 2, 8, 18, 40, 88][E - 1];
    const tSelection = [0, 0, 0, 0, 3, 13, 35, 83][E - 1];
    const tInduction = [0, 0, 0, 0, -5, 2, 24, 72][E - 1];
    const tStage = E === 8 ? 62 : 14;

    const cohorteId = uid();
    const yy = String(annee).slice(2);
    db.cohortes.push({ id: cohorteId, nom: `ELP ${annee}`, annee, seuil_exetat: 80, places, taille_attente: Math.round(places / 4), quota_filles: 50, statut: "active", created_at: ilYA(tInvite + 1) });
    const liste: Candidat[] = [];
    const parId = new Map<string, Candidat>();
    const profil: Record<string, number> = {};

    const msg = (c: Candidat, modeleId: string, vars: Record<string, string | number>, quand: string, campagne = "") => {
      if (!avecMessages) return;
      const m = MODELES.find((x) => x.id === modeleId)!;
      const lien = m.lien === "parent" ? `/p/${c.parent_token}` : m.lien === "inscription" ? `/moi?t=${c.token}` : null;
      const parent = m.destinataire === "parent";
      const v = { prenom: c.prenom, nom: c.nom, pct: c.pourcentage_exetat, annee, lien: lien ? `elp-hub.cd${lien}` : "", ...vars };
      db.messages.push({ id: uid(), candidat_id: c.id, destinataire: m.destinataire, nom_destinataire: parent ? c.parent_nom : `${c.prenom} ${c.nom}`, contact: parent ? c.parent_email : (c.email ?? ""), canal: "email", modele: modeleId, objet: remplir(m.objet, v), contenu: remplir(m.texte, v), lien, statut: !parent && c.contact_invalide ? "echec" : rnd() < 0.6 ? "lu" : "livre", campagne: campagne || m.nom, created_at: quand });
    };
    const journal = (acteur: string, role: DB["journal"][number]["role"], action: string, cible: string, quand: string) => {
      if (avecMessages) db.journal.push({ id: uid(), acteur, role, action, cible, created_at: quand });
    };

    /* 1. Liste Exetat importée : nom, école, pourcentage, e-mail, téléphone */
    for (let i = 0; i < n; i++) {
      const sexe: Sexe = i % 2 === 0 ? "F" : "M";
      let r = rnd() * totalPoids;
      const com = COMMUNES.find((c) => (r -= c.poids) < 0) ?? COMMUNES[0];
      const nom = pick(NOMS);
      const prenom = pick(sexe === "F" ? PRENOMS_F : PRENOMS_M);
      const c: Candidat = {
        id: uid(), cohorte_id: cohorteId, code: `ELP${yy}-${String(i + 1).padStart(4, "0")}`, nom, postnom: pick(NOMS.filter((x) => x !== nom)), prenom, sexe,
        date_naissance: null, telephone: tel(), email: `${ascii(prenom)}.${ascii(nom)}${yy}${i}@exemple.cd`, ecole: `${pick(ECOLES_T)} ${pick(ECOLES_N)} de ${com.nom}`, section: pick(SECTIONS),
        pourcentage_exetat: Math.min(96, Math.round(80 + Math.abs(gauss()) * 4.2)), province: com.province, commune: com.nom, adresse: "", lat: null, lng: null, universite: "", chapitre_id: null,
        statut: "invite", statut_depuis: ilYA(tInvite), parent_nom: "", parent_lien: "", parent_telephone: "", parent_email: "", parent_token: jeton(), token: jeton(),
        allergies: "", urgence_nom: "", urgence_telephone: "", consentement_le: null, invite_le: ilYA(tInvite), inscrit_le: null, derniere_activite: null, relances: 0,
        contact_invalide: i % 37 === 11, motif_sortie: "", sorti_le: null, chambre: null, compte_ouvert: false, note_interne: "", anonymise: false, rang_attente: null,
      };
      profil[c.id] = rnd();
      liste.push(c);
      parId.set(c.id, c);
      msg(c, "invitation", {}, ilYA(tInvite), `Invitations ELP ${annee}`);
    }
    db.candidats.push(...liste);
    journal("Mme Nadine K. (encadreure)", "encadreur", `Import de la liste Exetat : ${n} élèves, 3 doublons écartés`, `ELP ${annee}`, ilYA(tInvite + 0.02));
    journal("Mme Nadine K. (encadreure)", "encadreur", `Envoi de ${n} invitations par e-mail`, `ELP ${annee}`, ilYA(tInvite));

    /* 2. Inscription légère : identité, contacts, parent, consentement */
    if (E >= 2) {
      const tauxInscrit = E === 2 ? 0.52 : 0.87;
      const tauxComplet = E === 2 ? 0.7 : 0.94;
      for (const c of liste) {
        const p = profil[c.id];
        if (c.contact_invalide || p > tauxInscrit) {
          c.relances = Math.min(3, Math.floor(tInvite / 3.2));
          for (let k = 1; k <= c.relances; k++) msg(c, "relance_inscription", {}, ilYA(tInvite - k * 3), "Relances automatiques");
          continue;
        }
        const jour = Math.max(0.1, tInvite - 0.3 - p * (E === 2 ? 5 : 8) * 1.1);
        const complet = rnd() < tauxComplet;
        c.statut = "inscrit";
        c.inscrit_le = ilYA(jour);
        c.statut_depuis = c.inscrit_le;
        c.derniere_activite = ilYA(Math.max(0.05, jour - rnd()));
        c.date_naissance = `${annee - 19 + Math.floor(rnd() * 2)}-${String(1 + Math.floor(rnd() * 12)).padStart(2, "0")}-${String(1 + Math.floor(rnd() * 28)).padStart(2, "0")}`;
        c.consentement_le = c.inscrit_le;
        if (complet) {
          c.parent_lien = pick(LIENS);
          c.parent_nom = `${pick(["Mère", "Tante", "Grande sœur"].includes(c.parent_lien) ? PRENOMS_F : PRENOMS_M)} ${c.nom}`;
          c.parent_telephone = tel();
          c.parent_email = rnd() < 0.65 ? `${ascii(c.parent_nom)}${Math.floor(rnd() * 90)}@exemple.cd` : "";
        } else if (tInvite > 4) {
          c.relances = 1;
          msg(c, "dossier_incomplet", { manquants: completude(c, db.documents).manquants.slice(0, 2).join(", ") }, ilYA(Math.max(0.2, jour - 2)), "Relances automatiques");
        }
      }
    }

    /* 3 et 4. Convocations dans la province de l'élève, puis test */
    if (E >= 3) {
      const sessions = db.centres.filter((c) => c.type === "test").flatMap((centre) => [8, 13].map((h) => ({ id: uid(), cohorte_id: cohorteId, centre_id: centre.id, date_heure: dans(-tTest, h, 30), capacite: 30 })));
      db.sessions_test.push(...sessions);
      const remplissage: Record<string, number> = {};
      const tConv = tTest + 7;
      let nConv = 0;
      for (const c of liste) {
        if (c.statut !== "inscrit" || completude(c, db.documents).pct < 100) continue;
        const pos = position(c)!;
        const centres = db.centres.filter((x) => x.type === "test" && x.province === c.province).sort((a, b) => distanceKm(pos[0], pos[1], a.lat, a.lng) - distanceKm(pos[0], pos[1], b.lat, b.lng));
        const session = centres.flatMap((ct) => sessions.filter((s) => s.centre_id === ct.id)).find((s) => (remplissage[s.id] ?? 0) < s.capacite);
        if (!session) continue;
        remplissage[session.id] = (remplissage[session.id] ?? 0) + 1;
        const centre = db.centres.find((x) => x.id === session.centre_id)!;
        const p = rnd();
        const present = E >= 4 ? rnd() < 0.93 : null;
        db.convocations.push({ id: uid(), candidat_id: c.id, session_id: session.id, confirme: p < 0.68 ? true : p < 0.72 ? false : null, present, emarge_le: present ? new Date(new Date(session.date_heure).getTime() - rnd() * 1500000).toISOString() : null });
        nConv++;
        c.statut = "convoque";
        c.statut_depuis = ilYA(tConv);
        msg(c, "convocation", { date: fmtDate(session.date_heure), heure: fmtHeure(session.date_heure), centre: centre.nom }, ilYA(tConv), "Convocations au test");
        if (present) {
          if (avecMessages) db.presences.push({ id: uid(), candidat_id: c.id, contexte: "test", jour: jourISO(new Date(session.date_heure)), horodatage: session.date_heure, methode: "qr", hors_zone: false, valide: true });
          const ecrit = Math.round(Math.min(60, Math.max(14, 37 + (c.pourcentage_exetat - 84) * 0.9 + gauss() * 8)));
          const entretien = Math.round(Math.min(40, Math.max(8, 26 + gauss() * 6)));
          db.notes.push({ id: uid(), candidat_id: c.id, ecrit, entretien, total: ecrit + entretien });
          c.statut = "teste";
          c.statut_depuis = ilYA(tTest);
        }
      }
      journal("Mme Nadine K. (encadreure)", "encadreur", `Convocation de ${nConv} candidats dans ${sessions.length / 2} centres`, `ELP ${annee}`, ilYA(tConv));
      if (E >= 4) journal("Responsable de centre", "centre", "Émargement par QR code terminé", "Centre de test Limete", ilYA(tTest));
    }

    /* 5. Sélection, puis dossier complet demandé aux seuls retenus */
    if (E >= 5) {
      const classe = db.notes.filter((x) => parId.has(x.candidat_id)).map((x) => ({ id: x.candidat_id, sexe: parId.get(x.candidat_id)!.sexe, total: x.total }));
      const res = simulerSelection(classe, places, Math.round(places / 4), 50, 50);
      res.selectionnes.forEach((id, i) => {
        const c = parId.get(id)!;
        const com = COMMUNES.find((x) => x.nom === c.commune && x.province === c.province)!;
        c.statut = "selectionne";
        c.statut_depuis = ilYA(tSelection);
        msg(c, "selectionne", {}, ilYA(tSelection), "Résultats de la sélection");
        if (c.parent_email) msg(c, "autorisation_parent", {}, ilYA(tSelection), "Autorisations parentales");
        const etat = E >= 6 ? 3 : i % 5; // 0-1 : rien encore, 2 : photo reçue à vérifier, 3-4 : validée
        const fini = E >= 6 || i % 5 >= 2;
        if (fini) {
          c.adresse = `${1 + Math.floor(rnd() * 180)}, ${pick(AVENUES)}, Q. ${1 + Math.floor(rnd() * 12)}`;
          c.lat = +(com.lat + gauss() * 0.008).toFixed(5);
          c.lng = +(com.lng + gauss() * 0.008).toFixed(5);
          c.urgence_nom = c.parent_nom;
          c.urgence_telephone = c.parent_telephone;
          c.allergies = rnd() < 0.08 ? pick(["Arachides", "Pénicilline", "Asthme léger"]) : "";
          for (const type of ["photo", "bulletin", "identite"] as TypeDocument[]) db.documents.push(docVide(uid(), c.id, type, E >= 6 || i % 2 ? "valide" : "recu", ilYA(Math.max(0.2, tSelection - 1))));
        }
        const quand = ilYA(Math.max(0.2, tSelection - 0.5 - rnd() * 2));
        db.documents.push({ ...docVide(uid(), c.id, "autorisation", etat >= 3 ? "valide" : etat === 2 ? "recu" : "en_attente", ilYA(tSelection)), code_verification: `ELP-${hex(4).toUpperCase()}-${hex(4).toUpperCase()}`, depose_par: etat >= 2 ? (rnd() < 0.5 ? "parent" : "élève") : "", valide_le: etat >= 3 ? quand : null });
        if (etat < 2 && tSelection >= 2 && c.parent_email) msg(c, "relance_autorisation", {}, ilYA(tSelection - 2), "Relances automatiques");
      });
      res.attente.forEach((id, i) => {
        const c = parId.get(id)!;
        c.statut = "attente";
        c.rang_attente = i + 1;
        c.statut_depuis = ilYA(tSelection);
        msg(c, "attente", { rang: i + 1 }, ilYA(tSelection), "Résultats de la sélection");
      });
      res.nonRetenus.forEach((id) => {
        const c = parId.get(id)!;
        c.statut = "non_retenu";
        c.statut_depuis = ilYA(tSelection);
        c.sorti_le = c.statut_depuis;
        msg(c, "non_retenu", {}, ilYA(tSelection), "Résultats de la sélection");
      });
      journal("Admin national EGF", "admin", `Sélection validée : ${res.filles} filles et ${res.garcons} garçons, ${res.attente.length} en liste d'attente`, `ELP ${annee}`, ilYA(tSelection));
      if (E === 5) {
        const d = parId.get(res.selectionnes[17])!;
        d.statut = "desiste";
        d.statut_depuis = ilYA(0.6);
        d.sorti_le = d.statut_depuis;
        d.motif_sortie = "A appelé : part étudier à l'étranger, renonce au programme.";
        journal("Mme Nadine K. (encadreure)", "encadreur", "Désistement enregistré", `${d.prenom} ${d.nom}`, ilYA(0.6));
      }
    }

    /* 6. Induction */
    if (E >= 6) {
      const elus = liste.filter((c) => c.statut === "selectionne");
      for (const s of ["F", "M"] as Sexe[]) elus.filter((c) => c.sexe === s).forEach((c, i) => (c.chambre = `${s === "F" ? 2 : 3}${String(Math.floor(i / 2) + 1).padStart(2, "0")}`));
      const debut = dans(-tInduction, 8, 0);
      for (const c of elus) {
        c.statut = "induction";
        c.statut_depuis = debut;
        msg(c, "induction", { date: fmtDate(debut), heure: fmtHeure(debut), centre: hotel.nom, chambre: c.chambre! }, ilYA(tInduction + 4), "Informations induction");
        if (!avecMessages) continue;
        for (let j = 0; j < Math.min(5, Math.floor(tInduction) + 1); j++) {
          if (rnd() < 0.04) continue;
          const d = new Date(new Date(debut).getTime() + j * 86400000 + rnd() * 1200000);
          db.presences.push({ id: uid(), candidat_id: c.id, contexte: "induction", jour: jourISO(d), horodatage: d.toISOString(), methode: "qr", hors_zone: false, valide: true });
        }
      }
    }

    /* 7 et 8. Stage, puis fin de stage */
    if (E >= 7) {
      const stagiaires = liste.filter((c) => c.statut === "induction");
      const debut = dans(-tStage, 8, 0);
      const occupees: Record<string, number> = {};
      for (const a of db.affectations) if (db.candidats.find((c) => c.id === a.candidat_id)?.statut === "stage") occupees[a.agence_id] = (occupees[a.agence_id] ?? 0) + 1;
      const props = proposerAffectations(stagiaires, db.agences, occupees);
      const absent = stagiaires[7]?.id;
      const exclu = E === 7 && !avecMessages ? stagiaires[11]?.id : null;
      for (const p of props) {
        if (!p.agence_id) continue;
        const c = parId.get(p.candidat_id)!;
        const a = db.agences.find((x) => x.id === p.agence_id)!;
        c.statut = E === 8 ? "termine" : "stage";
        c.statut_depuis = E === 8 ? ilYA(2) : debut;
        c.compte_ouvert = E === 8 || rnd() < 0.85;
        const note = () => 3 + Math.floor(rnd() * 3);
        const evalue = E === 8 || rnd() < 0.2;
        db.affectations.push({ id: uid(), candidat_id: c.id, agence_id: a.id, distance_km: p.distance_km, statut: "validee", manuelle: false, valide_le: ilYA(tStage + 3), evaluation: evalue ? { ponctualite: note(), initiative: note(), equipe: note(), apprentissage: note(), service: note(), commentaire: "" } : null, evalue_le: evalue ? ilYA(3) : null, indemnite_payee: E === 8, historique: [] });
        msg(c, "affectation_stagiaire", { agence: a.nom, km: p.distance_km, chef: a.chef_nom, date: fmtDate(debut) }, ilYA(tStage + 3), "Affectations de stage");
        if (E === 8) {
          // Après le stage, les ELP entrent à l'université et rejoignent un chapitre.
          const possibles = db.chapitres.filter((k) => k.province === c.province);
          if (possibles.length && rnd() < 0.8) {
            const k = pick(possibles);
            c.chapitre_id = k.id;
            c.universite = CHAPITRES_BASE.find((x) => x[0] === k.nom)![3];
          }
        }
        if (c.id === exclu) {
          c.statut = "exclu";
          c.statut_depuis = ilYA(4);
          c.sorti_le = c.statut_depuis;
          c.motif_sortie = pick(MOTIFS_EXCLUSION);
        }
        const jours = E === 8 ? 44 : tStage;
        for (let j = jours; j >= 0; j--) {
          const d = new Date(now - (j + (E === 8 ? decalage + 2 : decalage)) * 86400000);
          if (d.getDay() === 0 || d.getDay() === 6) continue;
          if (c.id === absent && E === 7 ? j <= 3 : rnd() < 0.05) continue;
          if (c.statut === "exclu" && j <= 4) continue;
          d.setHours(7, 40 + Math.floor(rnd() * 35), 0, 0);
          if (d.getTime() > now) continue;
          db.presences.push({ id: uid(), candidat_id: c.id, contexte: "stage", jour: jourISO(d), horodatage: d.toISOString(), methode: "gps", hors_zone: false, valide: true });
        }
      }
      if (avecMessages)
        for (const a of db.agences) {
          const siens = db.affectations.filter((x) => x.agence_id === a.id && parId.has(x.candidat_id)).map((x) => parId.get(x.candidat_id)!);
          if (!siens.length) continue;
          const m = MODELES.find((x) => x.id === "affectation_chef")!;
          db.messages.push({ id: uid(), candidat_id: null, destinataire: "agence", nom_destinataire: a.chef_nom, contact: a.chef_email, canal: "email", modele: m.id, objet: m.objet, contenu: remplir(m.texte, { n: siens.length, agence: a.nom, date: fmtDate(debut), liste: siens.map((c) => `${c.prenom} ${c.nom}`).join(", ") }), lien: null, statut: "lu", campagne: "Affectations de stage", created_at: ilYA(tStage + 3) });
        }
      journal("Mme Nadine K. (encadreure)", "encadreur", `Affectations validées : ${props.filter((p) => p.agence_id).length} stagiaires`, `ELP ${annee}`, ilYA(tStage + 3));
    }
  }

  cohorte(2025, 90, 24, 8, 300, false);
  cohorte(2026, 110, 30, 7, 0, false);
  cohorte(ANNEE_DEMO, 200, 40, etape, 0, true);

  db.cohortes.sort((a, b) => b.annee - a.annee);
  db.messages.sort((a, b) => a.created_at.localeCompare(b.created_at));
  db.journal.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return db;
}

export function docVide(id: string, candidat_id: string, type: TypeDocument, statut: DocumentRow["statut"], created_at: string): DocumentRow {
  const noms: Record<TypeDocument, string> = { photo: "photo.jpg", bulletin: "bulletin-exetat.pdf", identite: "piece-identite.jpg", autorisation: "autorisation-signee.jpg" };
  return { id, candidat_id, type, statut, nom_fichier: statut === "en_attente" ? "" : noms[type], apercu: null, motif_rejet: "", depose_par: "", code_verification: "", valide_le: null, created_at };
}
