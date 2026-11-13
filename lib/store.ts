"use client";
// Magasin local « hors-ligne d'abord » : tout est lu et écrit sur l'appareil,
// puis synchronisé avec Supabase quand la connexion revient (file d'attente).
import { useMemo } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ANNEE_DEMO, buildDemo } from "./seed";
import type { DB, Role, Table } from "./types";
import { ROLES } from "./types";

export interface Op {
  table: Table;
  type: "upsert" | "delete";
  rows?: unknown[];
  ids?: string[];
}

const VIDE: DB = { cohortes: [], candidats: [], documents: [], centres: [], sessions_test: [], convocations: [], notes: [], agences: [], affectations: [], chapitres: [], presences: [], messages: [], journal: [] };

export const SUPABASE_ACTIF = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const TOUTES = "toutes";

interface Etat {
  db: DB;
  pret: boolean;
  etape: number;
  role: Role | null;
  moiId: string | null; // candidat incarné dans l'espace candidat
  jeton: string | null; // lien personnel de l'élève (mode Supabase, sans compte)
  agenceId: string | null; // agence incarnée par le chef d'agence
  cohorteId: string; // cohorte affichée, ou « toutes »
  province: string; // province affichée, ou "" pour toutes
  theme: "clair" | "sombre" | "auto";
  ficheId: string | null; // ELP dont la fiche est ouverte
  outbox: Op[];
  derniereSync: string | null;
  boiteOuverte: boolean;
  put: <T extends Table>(table: T, rows: DB[T][number] | DB[T][number][]) => void;
  del: (table: Table, ids: string[]) => void;
  charger: (db: DB) => void;
  reinitialiser: (etape: number) => void;
  set: (p: Partial<Pick<Etat, "role" | "moiId" | "jeton" | "agenceId" | "cohorteId" | "province" | "theme" | "ficheId" | "outbox" | "derniereSync" | "boiteOuverte" | "pret">>) => void;
}

export const useStore = create<Etat>()(
  persist(
    (set, get) => ({
      db: VIDE,
      pret: false,
      etape: 5,
      role: null,
      moiId: null,
      jeton: null,
      agenceId: null,
      cohorteId: TOUTES,
      province: "",
      theme: "auto",
      ficheId: null,
      outbox: [],
      derniereSync: null,
      boiteOuverte: false,
      put: (table, rows) => {
        const liste = (Array.isArray(rows) ? rows : [rows]) as { id: string }[];
        if (!liste.length) return;
        const actuel = get().db[table] as { id: string }[];
        const index = new Map(actuel.map((r, i) => [r.id, i]));
        const suivant = actuel.slice();
        for (const r of liste) {
          const i = index.get(r.id);
          if (i == null) {
            index.set(r.id, suivant.length);
            suivant.push(r);
          } else suivant[i] = r;
        }
        set((s) => ({ db: { ...s.db, [table]: suivant }, outbox: SUPABASE_ACTIF ? [...s.outbox, { table, type: "upsert", rows: liste }] : s.outbox }));
      },
      del: (table, ids) => {
        const k = new Set(ids);
        set((s) => ({ db: { ...s.db, [table]: (s.db[table] as { id: string }[]).filter((r) => !k.has(r.id)) }, outbox: SUPABASE_ACTIF ? [...s.outbox, { table, type: "delete", ids }] : s.outbox }));
      },
      charger: (db) => set({ db: { ...VIDE, ...db } }),
      reinitialiser: (etape) => {
        const db = buildDemo(etape);
        set({ db, etape, moiId: null, agenceId: null, ficheId: null, outbox: [], province: "", cohorteId: db.cohortes.find((c) => c.annee === ANNEE_DEMO)?.id ?? TOUTES });
      },
      set: (p) => set(p),
    }),
    {
      name: "elp-hub-v2",
      skipHydration: true, // réhydraté après le montage pour éviter tout écart avec le rendu serveur
      partialize: (s) => ({ db: s.db, etape: s.etape, role: s.role, moiId: s.moiId, jeton: s.jeton, agenceId: s.agenceId, cohorteId: s.cohorteId, province: s.province, theme: s.theme, outbox: s.outbox, derniereSync: s.derniereSync }),
      onRehydrateStorage: () => (state) => {
        // Premier lancement en mode démo : on génère les cohortes fictives.
        if (state && !SUPABASE_ACTIF && state.db.candidats.length === 0) state.reinitialiser(5);
        state?.set({ pret: true });
      },
    },
  ),
);

/**
 * Restreint la base à une cohorte et / ou une province. La cohorte choisie est
 * placée en tête de `cohortes` ; les agences et centres ne sont filtrés que par province.
 */
export function scoper(db: DB, cohorteId: string, province: string): DB {
  if (cohorteId === TOUTES && !province) return db;
  const candidats = db.candidats.filter((c) => (cohorteId === TOUTES || c.cohorte_id === cohorteId) && (!province || c.province === province));
  const ids = new Set(candidats.map((c) => c.id));
  const agences = province ? db.agences.filter((a) => a.province === province) : db.agences;
  const centres = province ? db.centres.filter((a) => a.province === province || a.type === "hotel") : db.centres;
  const idCentres = new Set(centres.map((c) => c.id));
  const contacts = new Set(agences.map((a) => a.chef_email));
  const choisie = db.cohortes.find((c) => c.id === cohorteId);
  return {
    ...db,
    cohortes: choisie ? [choisie, ...db.cohortes.filter((c) => c.id !== cohorteId)] : db.cohortes,
    candidats,
    agences,
    centres,
    documents: db.documents.filter((d) => ids.has(d.candidat_id)),
    sessions_test: db.sessions_test.filter((s) => (cohorteId === TOUTES || s.cohorte_id === cohorteId) && idCentres.has(s.centre_id)),
    convocations: db.convocations.filter((d) => ids.has(d.candidat_id)),
    notes: db.notes.filter((d) => ids.has(d.candidat_id)),
    affectations: db.affectations.filter((d) => ids.has(d.candidat_id)),
    presences: db.presences.filter((d) => ids.has(d.candidat_id)),
    messages: db.messages.filter((m) => (m.candidat_id ? ids.has(m.candidat_id) : cohorteId === TOUTES && contacts.has(m.contact))),
  };
}

/** La base telle que l'encadreur la regarde : cohorte et province choisies en haut de l'écran. */
export function useVue(): DB {
  const db = useStore((s) => s.db);
  const cohorteId = useStore((s) => s.cohorteId);
  const province = useStore((s) => s.province);
  return useMemo(() => scoper(db, cohorteId, province), [db, cohorteId, province]);
}
/** Même portée, pour les opérations (hors composants). */
export const vue = (): DB => {
  const s = useStore.getState();
  return scoper(s.db, s.cohorteId, s.province);
};
/** La cohorte sur laquelle on travaille, ou null si « toutes les cohortes » est affiché. */
export function useCohorte() {
  const cohortes = useStore((s) => s.db.cohortes);
  const id = useStore((s) => s.cohorteId);
  return cohortes.find((c) => c.id === id) ?? null;
}

export function acteurCourant(): { nom: string; role: Role } {
  const { role, moiId, agenceId, db } = useStore.getState();
  const r = role ?? "encadreur";
  if (r === "candidat") {
    const c = db.candidats.find((x) => x.id === moiId);
    return { nom: c ? `${c.prenom} ${c.nom}` : "Candidat", role: r };
  }
  if (r === "agence") {
    const a = db.agences.find((x) => x.id === agenceId);
    return { nom: a ? a.chef_nom : "Chef d'agence", role: r };
  }
  return { nom: ROLES.find((x) => x.id === r)!.acteur, role: r };
}

export const uid = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (+c ^ ((Math.random() * 16) >> (+c / 4))).toString(16)));
