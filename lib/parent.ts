"use client";
// Accès du parent par lien : aucune connexion, seulement le jeton reçu par SMS.
// En mode démo tout se passe en local ; avec Supabase, trois fonctions SQL
// (security definer) font le travail sans jamais exposer la table des élèves.
import { envoyerOtp, signerAutorisation } from "./ops";
import { SUPABASE_ACTIF, useStore } from "./store";
import { supabase } from "./sync";

export interface VueParent {
  prenom: string;
  nom: string;
  parent_nom: string;
  parent_telephone: string;
  cohorte: string;
  signe: boolean;
  code_verification: string;
  candidat_id: string;
}

const local = (token: string) => useStore.getState().db.candidats.find((c) => c.parent_token === token);

export async function parentLire(token: string): Promise<VueParent | null> {
  if (SUPABASE_ACTIF) {
    const { data } = await supabase()!.rpc("parent_lire", { p_token: token });
    return (Array.isArray(data) ? data[0] : data) ?? null;
  }
  const c = local(token);
  if (!c) return null;
  const { db } = useStore.getState();
  const d = db.documents.find((x) => x.candidat_id === c.id && x.type === "autorisation");
  return { prenom: c.prenom, nom: c.nom, parent_nom: c.parent_nom, parent_telephone: c.parent_telephone, cohorte: db.cohortes.find((k) => k.id === c.cohorte_id)?.nom ?? "", signe: d?.statut === "signe", code_verification: d?.code_verification ?? "", candidat_id: c.id };
}

/** Envoie le code par SMS. En démo, le code est renvoyé pour pouvoir être affiché. */
export async function parentDemanderCode(token: string): Promise<{ demo?: string; erreur?: string }> {
  if (SUPABASE_ACTIF) {
    const { error } = await supabase()!.functions.invoke("code-parent", { body: { token } });
    return error ? { erreur: "Le code n'a pas pu être envoyé. Réessayez dans un instant." } : {};
  }
  const c = local(token);
  return c ? { demo: envoyerOtp(c) } : { erreur: "Lien invalide." };
}

export async function parentSigner(token: string, code: string, signature: string): Promise<string | null> {
  if (SUPABASE_ACTIF) {
    const { data, error } = await supabase()!.rpc("parent_signer", { p_token: token, p_code: code.trim(), p_signature: signature });
    return error ? "La signature n'a pas pu être enregistrée." : (data as string | null);
  }
  const c = local(token);
  return c ? signerAutorisation(c, code, signature) : "Lien invalide.";
}
