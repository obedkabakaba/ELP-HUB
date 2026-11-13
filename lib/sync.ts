"use client";
// Synchronisation avec Supabase (activée seulement si les variables
// NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY sont définies).
// Principe : on lit et on écrit toujours en local ; les écritures partent dans
// une file d'attente qui se vide dès que le réseau est disponible.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ACTIF, useStore } from "./store";
import { TABLES, type DB, type Role, type Table } from "./types";

let client: SupabaseClient | null = null;
export function supabase(): SupabaseClient | null {
  if (!SUPABASE_ACTIF) return null;
  client ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  return client;
}

async function lireTout(sb: SupabaseClient, table: Table): Promise<unknown[]> {
  const rows: unknown[] = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await sb.from(table).select("*").order("id").range(de, de + 999);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) return rows;
  }
}

// Le centre de test et le chef d'agence n'ont pas accès aux dossiers complets :
// ils lisent une vue réduite, complétée ici par des valeurs vides.
const VUES: Partial<Record<Role, string>> = { centre: "candidats_centre", agence: "candidats_agence" };
const CANDIDAT_VIDE = { postnom: "", date_naissance: null, telephone: "", email: null, ecole: "", section: "", pourcentage_exetat: 0, commune: "", adresse: "", lat: null, lng: null, parent_nom: "", parent_lien: "", parent_telephone: "", parent_token: "", token: "", allergies: "", urgence_nom: "", urgence_telephone: "", consentement_le: null, invite_le: null, inscrit_le: null, derniere_activite: null, relances: 0, contact_invalide: false, motif_sortie: "", sorti_le: null, universite: "", chapitre_id: null, parent_email: "", chambre: null, compte_ouvert: false, note_interne: "", anonymise: false, rang_attente: null };

/** Récupère toutes les tables visibles pour le rôle connecté (filtrage par RLS côté serveur). */
export async function tirer(): Promise<void> {
  const sb = supabase();
  if (!sb) return;
  const vue = VUES[useStore.getState().role ?? "encadreur"];
  const db = {} as Record<Table, unknown[]>;
  for (const t of TABLES) {
    if (t === "candidats" && vue) db[t] = (await lireTout(sb, vue as Table)).map((r) => ({ ...CANDIDAT_VIDE, ...(r as object) }));
    else db[t] = await lireTout(sb, t);
  }
  useStore.getState().charger(db as unknown as DB);
  useStore.getState().set({ derniereSync: new Date().toISOString() });
}

let enCours = false;
/** Vide la file d'attente des écritures. Sans réseau, on réessaiera plus tard. */
export async function pousser(): Promise<void> {
  const sb = supabase();
  if (!sb || enCours || (typeof navigator !== "undefined" && !navigator.onLine)) return;
  enCours = true;
  try {
    while (useStore.getState().outbox.length) {
      const op = useStore.getState().outbox[0];
      const { error } = op.type === "upsert" ? await sb.from(op.table).upsert(op.rows as object[]) : await sb.from(op.table).delete().in("id", op.ids!);
      // Écriture refusée par les règles d'accès (42501) : inutile de réessayer, le serveur a le dernier mot.
      if (error && error.code !== "42501") {
        console.warn("Synchronisation en attente :", error.message);
        break;
      }
      useStore.getState().set({ outbox: useStore.getState().outbox.slice(1) });
    }
    if (!useStore.getState().outbox.length) useStore.getState().set({ derniereSync: new Date().toISOString() });
  } finally {
    enCours = false;
  }
}

export async function connexion(email: string, motDePasse: string): Promise<string | null> {
  const sb = supabase();
  if (!sb) return "Supabase n'est pas configuré.";
  const { data, error } = await sb.auth.signInWithPassword({ email, password: motDePasse });
  if (error || !data.user) return "E-mail ou mot de passe incorrect.";
  const { data: profil } = await sb.from("profils").select("role, agence_id, candidat_id").eq("id", data.user.id).single();
  if (!profil) return "Ce compte n'a pas encore de rôle attribué.";
  useStore.getState().set({ role: profil.role as Role, agenceId: profil.agence_id, moiId: profil.candidat_id });
  await tirer();
  return null;
}

export async function deconnexion(): Promise<void> {
  await supabase()?.auth.signOut();
  useStore.getState().set({ role: null, moiId: null, agenceId: null });
}

/** À appeler une fois au démarrage : synchronise au retour du réseau et toutes les 20 s. */
export function demarrerSync(): () => void {
  if (!SUPABASE_ACTIF) return () => {};
  const tic = () => void pousser();
  window.addEventListener("online", tic);
  const t = setInterval(tic, 20000);
  const fin = useStore.subscribe((s, avant) => {
    if (s.outbox.length > avant.outbox.length) tic();
  });
  return () => {
    window.removeEventListener("online", tic);
    clearInterval(t);
    fin();
  };
}
