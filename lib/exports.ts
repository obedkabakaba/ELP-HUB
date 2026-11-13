"use client";
// Exports Excel prêts à l'emploi : mêmes colonnes partout, réimportables tels quels.
import { completude, moyenneEvaluation, nomComplet } from "./logic";
import { exporterExcel, type Ligne } from "./tableur";
import { statutInfo, type Candidat, type DB } from "./types";

export function lignesCandidats(liste: Candidat[], db: DB): Ligne[] {
  const notes = new Map(db.notes.map((n) => [n.candidat_id, n]));
  const aff = new Map(db.affectations.map((a) => [a.candidat_id, a]));
  const ag = new Map(db.agences.map((a) => [a.id, a]));
  const coh = new Map(db.cohortes.map((k) => [k.id, k]));
  const chap = new Map(db.chapitres.map((k) => [k.id, k]));
  const docs = new Map<string, DB["documents"]>();
  for (const d of db.documents) docs.set(d.candidat_id, [...(docs.get(d.candidat_id) ?? []), d]);
  return liste.filter((c) => !c.anonymise).map((c) => {
    const a = aff.get(c.id);
    const auto = (docs.get(c.id) ?? []).find((d) => d.type === "autorisation");
    return {
      Code: c.code,
      Cohorte: coh.get(c.cohorte_id)?.nom ?? "",
      Nom: c.nom,
      Postnom: c.postnom,
      Prénom: c.prenom,
      Sexe: c.sexe,
      "Date de naissance": c.date_naissance,
      Email: c.email,
      Téléphone: c.telephone,
      Province: c.province,
      Commune: c.commune,
      Adresse: c.adresse,
      École: c.ecole,
      Section: c.section,
      "Exetat (%)": c.pourcentage_exetat,
      Statut: statutInfo(c.statut).label,
      "Dossier (%)": completude(c, docs.get(c.id) ?? []).pct,
      "Note test (/100)": notes.get(c.id)?.total ?? null,
      "Rang attente": c.rang_attente,
      "Autorisation parentale": auto ? { valide: "validée", recu: "reçue, à vérifier", rejete: "refusée", en_attente: "pas reçue" }[auto.statut] : null,
      Agence: a ? (ag.get(a.agence_id)?.nom ?? "") : null,
      "Distance (km)": a?.distance_km ?? null,
      "Évaluation (/5)": a?.evaluation ? moyenneEvaluation(a.evaluation) : null,
      Université: c.universite,
      Chapitre: c.chapitre_id ? (chap.get(c.chapitre_id)?.nom ?? "") : "",
      "Parent ou tuteur": c.parent_nom,
      "Lien de parenté": c.parent_lien,
      "Téléphone du parent": c.parent_telephone,
      "Email du parent": c.parent_email,
      "Motif de sortie": c.motif_sortie,
    };
  });
}

export function exporterCandidats(nom: string, liste: Candidat[], db: DB) {
  return exporterExcel(nom, [{ nom: "Candidats", lignes: lignesCandidats(liste, db) }]);
}

/** Classeur complet : une feuille par sujet. */
export function exporterTout(nom: string, db: DB) {
  const parId = new Map(db.candidats.map((c) => [c.id, c]));
  const n = (id: string) => { const c = parId.get(id); return c ? { Code: c.code, Élève: nomComplet(c) } : { Code: "", Élève: "" }; };
  return exporterExcel(nom, [
    { nom: "Candidats", lignes: lignesCandidats(db.candidats, db) },
    { nom: "Cohortes", lignes: db.cohortes.map((k) => ({ Cohorte: k.nom, Année: k.annee, "Seuil Exetat": k.seuil_exetat, Places: k.places, "Liste d'attente": k.taille_attente, "Quota filles (%)": k.quota_filles ?? "aucun", Élèves: db.candidats.filter((c) => c.cohorte_id === k.id).length })) },
    { nom: "Notes", lignes: db.notes.map((x) => ({ ...n(x.candidat_id), Écrit: x.ecrit, Entretien: x.entretien, Total: x.total })) },
    { nom: "Stages", lignes: db.affectations.map((a) => ({ ...n(a.candidat_id), Agence: db.agences.find((g) => g.id === a.agence_id)?.nom ?? "", "Distance (km)": a.distance_km, État: a.statut === "validee" ? "validée" : "proposée", Changements: (a.historique ?? []).length, "Évaluation (/5)": a.evaluation ? moyenneEvaluation(a.evaluation) : null, "Indemnité versée": a.indemnite_payee ? "oui" : "non" })) },
    { nom: "Agences", lignes: db.agences.map((a) => ({ Agence: a.nom, Province: a.province, Commune: a.commune, Adresse: a.adresse, Latitude: a.lat, Longitude: a.lng, Places: a.capacite, "Chef d'agence": a.chef_nom, "Email du chef": a.chef_email, "Téléphone du chef": a.chef_telephone })) },
    { nom: "Chapitres", lignes: db.chapitres.map((k) => ({ Chapitre: k.nom, Type: k.type, Province: k.province, Membres: db.candidats.filter((c) => c.chapitre_id === k.id).length, Description: k.description })) },
    { nom: "Présences", lignes: db.presences.map((p) => ({ ...n(p.candidat_id), Contexte: p.contexte, Jour: p.jour, Méthode: p.methode, Validée: p.valide ? "oui" : "non" })) },
  ].filter((f) => f.lignes.length));
}
