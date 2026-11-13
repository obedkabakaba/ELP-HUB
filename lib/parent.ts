"use client";
// Accès du parent par lien : aucune connexion, seulement le jeton reçu par e-mail.
// Le parent imprime l'autorisation, la signe à la main, puis en dépose la photo.
// En mode démo tout se passe en local ; avec Supabase, deux fonctions SQL
// (security definer) font le travail sans jamais exposer la table des élèves.
import { deposerDocument } from "./ops";
import { SUPABASE_ACTIF, useStore } from "./store";
import { supabase } from "./sync";
import type { DocumentRow } from "./types";

export interface VueParent {
  candidat_id: string;
  code: string;
  prenom: string;
  nom: string;
  postnom: string;
  ecole: string;
  parent_nom: string;
  parent_lien: string;
  cohorte: string;
  statut: DocumentRow["statut"] | "aucune";
  motif_rejet: string;
  code_verification: string;
}

const local = (token: string) => useStore.getState().db.candidats.find((c) => c.parent_token === token);

export async function parentLire(token: string): Promise<VueParent | null> {
  if (SUPABASE_ACTIF) {
    const { data } = await supabase()!.rpc("elp_parent_lire", { p_token: token });
    return (Array.isArray(data) ? data[0] : data) ?? null;
  }
  const c = local(token);
  if (!c) return null;
  const { db } = useStore.getState();
  const d = db.documents.find((x) => x.candidat_id === c.id && x.type === "autorisation");
  return { candidat_id: c.id, code: c.code, prenom: c.prenom, nom: c.nom, postnom: c.postnom, ecole: c.ecole, parent_nom: c.parent_nom, parent_lien: c.parent_lien, cohorte: db.cohortes.find((k) => k.id === c.cohorte_id)?.nom ?? "", statut: d?.statut ?? "aucune", motif_rejet: d?.motif_rejet ?? "", code_verification: d?.code_verification ?? "" };
}

/** Dépose la photo du papier signé. Renvoie null si tout va bien, sinon le message d'erreur. */
export async function parentDeposer(token: string, nomFichier: string, image: string): Promise<string | null> {
  if (SUPABASE_ACTIF) {
    const { data, error } = await supabase()!.rpc("elp_parent_deposer", { p_token: token, p_nom_fichier: nomFichier, p_image: image });
    return error ? "L'envoi n'a pas abouti. Vérifiez la connexion et réessayez." : (data as string | null);
  }
  const c = local(token);
  if (!c) return "Lien invalide.";
  deposerDocument(c, "autorisation", nomFichier, image, "parent");
  return null;
}
