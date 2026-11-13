// Règles métier pures (sans état) : complétude, sélection 50/50, affectation optimale.
import { distanceKm, position } from "./geo";
import type { Agence, Candidat, DocumentRow, Sexe } from "./types";

/* ---------- Complétude du dossier ---------- */

export interface Completude {
  pct: number;
  manquants: string[];
}

export function completude(c: Candidat, docs: DocumentRow[]): Completude {
  const a = (type: string) => docs.some((d) => d.candidat_id === c.id && d.type === type && d.statut !== "rejete");
  const points: [boolean, string][] = [
    [!!c.date_naissance, "date de naissance"],
    [!!c.telephone && !c.telephone_invalide, "téléphone valide"],
    [!!c.ecole && !!c.section, "école et section"],
    [!!c.commune && !!c.adresse, "adresse"],
    [c.lat != null && c.lng != null, "position GPS du domicile"],
    [!!c.parent_nom && !!c.parent_telephone, "parent ou tuteur"],
    [!!c.urgence_nom && !!c.urgence_telephone, "contact d'urgence"],
    [a("photo"), "photo d'identité"],
    [a("bulletin"), "bulletin de l'Exetat"],
    [a("identite"), "pièce d'identité"],
    [!!c.consentement_le, "consentement"],
  ];
  const ok = points.filter(([v]) => v).length;
  return { pct: Math.round((ok / points.length) * 100), manquants: points.filter(([v]) => !v).map(([, l]) => l) };
}

/* ---------- Sélection avec parité ---------- */

export interface Classe {
  id: string;
  sexe: Sexe;
  total: number;
}

export interface ResultatSelection {
  selectionnes: string[];
  attente: string[]; // ordonnée : alternance filles / garçons par rang
  nonRetenus: string[];
  seuilF: number | null;
  seuilM: number | null;
  filles: number;
  garcons: number;
  entresParParite: string[]; // sélectionnés qui ne l'auraient pas été au mérite seul
  sortisParParite: string[]; // dans le top au mérite seul, mais hors sélection
}

export function simulerSelection(liste: Classe[], places: number, tailleAttente: number, noteMin: number): ResultatSelection {
  const tri = (s: Sexe) => liste.filter((c) => c.sexe === s && c.total >= noteMin).sort((a, b) => b.total - a.total);
  const F = tri("F");
  const M = tri("M");
  const moitie = Math.floor(places / 2);
  let nF = Math.min(moitie, F.length);
  let nM = Math.min(places - moitie, M.length);
  // S'il manque des candidats d'un côté, les places restantes vont à l'autre.
  let reste = places - nF - nM;
  const plusF = Math.min(reste, F.length - nF);
  nF += plusF;
  reste -= plusF;
  nM += Math.min(reste, M.length - nM);

  const selF = F.slice(0, nF);
  const selM = M.slice(0, nM);
  const selectionnes = [...selF, ...selM].sort((a, b) => b.total - a.total).map((c) => c.id);

  const attF = F.slice(nF, nF + Math.ceil(tailleAttente / 2));
  const attM = M.slice(nM, nM + Math.floor(tailleAttente / 2));
  const attente: string[] = [];
  for (let i = 0; i < Math.max(attF.length, attM.length); i++) {
    if (attF[i]) attente.push(attF[i].id);
    if (attM[i]) attente.push(attM[i].id);
  }

  const pris = new Set([...selectionnes, ...attente]);
  const nonRetenus = liste.filter((c) => !pris.has(c.id)).map((c) => c.id);

  const merite = new Set(
    [...F, ...M]
      .sort((a, b) => b.total - a.total)
      .slice(0, places)
      .map((c) => c.id),
  );
  const sel = new Set(selectionnes);
  return {
    selectionnes,
    attente,
    nonRetenus,
    seuilF: selF.length ? selF[selF.length - 1].total : null,
    seuilM: selM.length ? selM[selM.length - 1].total : null,
    filles: nF,
    garcons: nM,
    entresParParite: selectionnes.filter((id) => !merite.has(id)),
    sortisParParite: [...merite].filter((id) => !sel.has(id)),
  };
}

/* ---------- Affectation aux agences ---------- */

/** Algorithme hongrois : affectation de coût total minimal (lignes ≤ colonnes). */
export function hongrois(cout: number[][]): number[] {
  const n = cout.length;
  if (!n) return [];
  const m = cout[0].length;
  const u = new Array(n + 1).fill(0);
  const v = new Array(m + 1).fill(0);
  const p = new Array(m + 1).fill(0);
  const way = new Array(m + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = new Array(m + 1).fill(Infinity);
    const used = new Array(m + 1).fill(false);
    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = Infinity;
      let j1 = 0;
      for (let j = 1; j <= m; j++) {
        if (used[j]) continue;
        const cur = cout[i0 - 1][j - 1] - u[i0] - v[j];
        if (cur < minv[j]) {
          minv[j] = cur;
          way[j] = j0;
        }
        if (minv[j] < delta) {
          delta = minv[j];
          j1 = j;
        }
      }
      for (let j = 0; j <= m; j++) {
        if (used[j]) {
          u[p[j]] += delta;
          v[j] -= delta;
        } else minv[j] -= delta;
      }
      j0 = j1;
    } while (p[j0] !== 0);
    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0);
  }
  const res = new Array(n).fill(-1);
  for (let j = 1; j <= m; j++) if (p[j]) res[p[j] - 1] = j - 1;
  return res;
}

export interface Proposition {
  candidat_id: string;
  agence_id: string | null; // null : plus aucune place disponible
  distance_km: number;
}

const SANS_PLACE = 1e6;

function dist(c: Candidat, a: Agence): number {
  const p = position(c);
  return p ? distanceKm(p[0], p[1], a.lat, a.lng) : 15;
}

/**
 * Propose pour chaque stagiaire une agence, en minimisant la distance totale
 * et en respectant les places de chaque agence. `occupees` = places déjà prises.
 */
export function proposerAffectations(stagiaires: Candidat[], agences: Agence[], occupees: Record<string, number> = {}): Proposition[] {
  if (!stagiaires.length) return [];
  const places: Agence[] = [];
  for (const a of agences) {
    const libres = Math.max(0, a.capacite - (occupees[a.id] ?? 0));
    for (let i = 0; i < libres; i++) places.push(a);
  }
  const cols = Math.max(places.length, stagiaires.length);
  const cout = stagiaires.map((c) => Array.from({ length: cols }, (_, j) => (places[j] ? dist(c, places[j]) : SANS_PLACE)));
  const sol = hongrois(cout);
  return stagiaires.map((c, i) => {
    const a = places[sol[i]];
    return { candidat_id: c.id, agence_id: a ? a.id : null, distance_km: a ? Math.round(dist(c, a) * 10) / 10 : 0 };
  });
}

/** Méthode « à la main » : chacun à tour de rôle prend l'agence libre la plus proche. */
export function distanceGloutonne(stagiaires: Candidat[], agences: Agence[]): number {
  const libres: Record<string, number> = Object.fromEntries(agences.map((a) => [a.id, a.capacite]));
  let total = 0;
  for (const c of stagiaires) {
    const choix = agences
      .filter((a) => libres[a.id] > 0)
      .map((a) => ({ a, d: dist(c, a) }))
      .sort((x, y) => x.d - y.d)[0];
    if (!choix) continue;
    libres[choix.a.id]--;
    total += choix.d;
  }
  return total;
}

/** Les agences les plus proches d'un candidat, avec distance. */
export function agencesProches(c: Candidat, agences: Agence[]): { agence: Agence; km: number }[] {
  return agences.map((a) => ({ agence: a, km: Math.round(dist(c, a) * 10) / 10 })).sort((x, y) => x.km - y.km);
}

/* ---------- Divers ---------- */

export function moyenneEvaluation(e: { ponctualite: number; initiative: number; equipe: number; apprentissage: number; service: number }): number {
  return Math.round(((e.ponctualite + e.initiative + e.equipe + e.apprentissage + e.service) / 5) * 10) / 10;
}

export const INDEMNITE_JOUR_USD = 5; // valeur fictive de démonstration

export function nomComplet(c: { prenom: string; nom: string; postnom?: string }): string {
  return `${c.prenom} ${c.nom}${c.postnom ? " " + c.postnom : ""}`;
}

export function joursDepuis(iso: string | null): number {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

export function jourISO(d: Date = new Date()): string {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function normaliser(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}
