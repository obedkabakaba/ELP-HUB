"use client";
// Magasin local « hors-ligne d'abord » : tout est lu et écrit sur l'appareil,
// puis synchronisé avec Supabase quand la connexion revient (file d'attente).
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { buildDemo } from "./seed";
import type { DB, Role, Table } from "./types";
import { ROLES } from "./types";

export interface Op {
  table: Table;
  type: "upsert" | "delete";
  rows?: unknown[];
  ids?: string[];
}

const VIDE: DB = { cohortes: [], candidats: [], documents: [], centres: [], sessions_test: [], convocations: [], notes: [], agences: [], affectations: [], presences: [], messages: [], journal: [] };

export const SUPABASE_ACTIF = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

interface Etat {
  db: DB;
  pret: boolean;
  etape: number;
  role: Role | null;
  moiId: string | null; // candidat incarné dans l'espace candidat
  agenceId: string | null; // agence incarnée par le chef d'agence
  outbox: Op[];
  derniereSync: string | null;
  telephoneOuvert: boolean;
  put: <T extends Table>(table: T, rows: DB[T][number] | DB[T][number][]) => void;
  del: (table: Table, ids: string[]) => void;
  charger: (db: DB) => void;
  reinitialiser: (etape: number) => void;
  set: (p: Partial<Pick<Etat, "role" | "moiId" | "agenceId" | "outbox" | "derniereSync" | "telephoneOuvert" | "pret">>) => void;
}

export const useStore = create<Etat>()(
  persist(
    (set, get) => ({
      db: VIDE,
      pret: false,
      etape: 3,
      role: null,
      moiId: null,
      agenceId: null,
      outbox: [],
      derniereSync: null,
      telephoneOuvert: false,
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
      charger: (db) => set({ db }),
      reinitialiser: (etape) => set({ db: buildDemo(etape), etape, moiId: null, agenceId: null, outbox: [] }),
      set: (p) => set(p),
    }),
    {
      name: "elp-hub-v1",
      skipHydration: true, // réhydraté après le montage pour éviter tout écart avec le rendu serveur
      partialize: (s) => ({ db: s.db, etape: s.etape, role: s.role, moiId: s.moiId, agenceId: s.agenceId, outbox: s.outbox, derniereSync: s.derniereSync }),
      onRehydrateStorage: () => (state) => {
        // Premier lancement en mode démo : on génère les 200 élèves fictifs.
        if (state && !SUPABASE_ACTIF && state.db.candidats.length === 0) state.reinitialiser(3);
        state?.set({ pret: true });
      },
    },
  ),
);

export const useDB = <T,>(f: (db: DB) => T) => useStore((s) => f(s.db));

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
