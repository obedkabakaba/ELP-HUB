"use client";
import { Pencil, Plus, Trash2, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { NomELP } from "@/components/FicheELP";
import { Btn, Card, Champ, Entete, Modale, Pastille, Vide, champ, champS, cx, toast } from "@/components/ui";
import { TOUTES_PROVINCES } from "@/lib/geo";
import { estRetenu, nomComplet, normaliser } from "@/lib/logic";
import { enregistrerChapitre, rattacher, supprimerChapitre } from "@/lib/ops";
import { useStore, useVue } from "@/lib/store";
import { exporterCandidats } from "@/lib/exports";
import type { Chapitre } from "@/lib/types";

const TYPES: Record<Chapitre["type"], string> = { universite: "Université", lieu: "Lieu", autre: "Autre" };

export default function Chapitres() {
  const vue = useVue();
  const tous = useStore((s) => s.db.candidats);
  const chapitres = useStore((s) => s.db.chapitres);
  const province = useStore((s) => s.province);
  const cohortes = useStore((s) => s.db.cohortes);
  const toutDb = useStore((s) => s.db);
  const [edition, setEdition] = useState<Partial<Chapitre> | null>(null);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [ajout, setAjout] = useState("");
  const [q, setQ] = useState("");

  // Les chapitres regroupent des ELP de toutes les cohortes : on compte sur l'ensemble.
  const membres = useMemo(() => {
    const m = new Map<string, typeof tous>();
    for (const c of tous) if (c.chapitre_id) m.set(c.chapitre_id, [...(m.get(c.chapitre_id) ?? []), c]);
    return m;
  }, [tous]);
  const elp = vue.candidats.filter((c) => estRetenu(c.statut));
  const sansChapitre = elp.filter((c) => !c.chapitre_id);
  const liste = chapitres.filter((k) => !province || !k.province || k.province === province).filter((k) => !q || normaliser(k.nom + k.province).includes(normaliser(q)));
  const courant = chapitres.find((k) => k.id === ouvert);

  const sauver = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const k = enregistrerChapitre({ ...edition, nom: String(f.get("nom")).trim(), type: f.get("type") as Chapitre["type"], province: String(f.get("province")), description: String(f.get("description")).trim() });
    toast(edition?.id ? "Chapitre mis à jour." : `Chapitre « ${k.nom} » créé.`);
    setEdition(null);
  };

  return (
    <>
      <Entete titre="Chapitres" sous="Les chapitres regroupent les ELP par université ou par lieu, toutes cohortes confondues. Vous les créez et les organisez librement.">
        <Btn onClick={() => setEdition({ type: "universite" })}><Plus className="size-4" /> Nouveau chapitre</Btn>
      </Entete>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input className={cx(champS, "min-w-60")} placeholder="Chercher un chapitre" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Chercher un chapitre" />
        <span className="text-sm text-muted">{chapitres.length} chapitres · {tous.filter((c) => c.chapitre_id).length} ELP rattachés · <b className="text-ink">{sansChapitre.length}</b> ELP affichés sans chapitre</span>
      </div>

      {!liste.length ? <Vide titre="Aucun chapitre" detail="Créez le premier : par exemple « Chapitre UNIKIN » ou « Chapitre Lubumbashi »."><Btn onClick={() => setEdition({ type: "universite" })}><Plus className="size-4" /> Nouveau chapitre</Btn></Vide> : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {liste.map((k) => {
            const m = membres.get(k.id) ?? [];
            const parCohorte = [...new Set(m.map((c) => c.cohorte_id))].length;
            return (
              <Card key={k.id} className="flex flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-600"><UsersRound className="size-5" /></span>
                  <span className="flex gap-1">
                    <button className="rounded-lg p-1.5 text-muted hover:bg-sand-100" aria-label={`Modifier ${k.nom}`} onClick={() => setEdition(k)}><Pencil className="size-4" /></button>
                    <button className="rounded-lg p-1.5 text-muted hover:bg-rose-50 hover:text-rose-700" aria-label={`Supprimer ${k.nom}`} onClick={() => { if (confirm(`Supprimer « ${k.nom} » ? Ses ${m.length} membres restent dans la plateforme, sans chapitre.`)) { supprimerChapitre(k); toast("Chapitre supprimé."); } }}><Trash2 className="size-4" /></button>
                  </span>
                </div>
                <p className="mt-3 text-lg font-extrabold">{k.nom}</p>
                <p className="text-xs text-muted">{TYPES[k.type]} · {k.province || "toutes provinces"}</p>
                {k.description && <p className="mt-2 text-[13px] text-muted">{k.description}</p>}
                <div className="mt-auto flex items-end justify-between pt-4">
                  <p><span className="tabular text-2xl font-extrabold">{m.length}</span> <span className="text-xs text-muted">membres · {parCohorte} cohorte{parCohorte > 1 ? "s" : ""}</span></p>
                  <Btn petit variante="secondaire" onClick={() => setOuvert(k.id)}>Membres</Btn>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modale ouvert={!!edition} onClose={() => setEdition(null)} titre={edition?.id ? "Modifier le chapitre" : "Nouveau chapitre"}>
        {edition && (
          <form onSubmit={sauver} className="space-y-4">
            <Champ label="Nom"><input name="nom" required className={champ} defaultValue={edition.nom} placeholder="Chapitre UNIKIN" /></Champ>
            <div className="grid grid-cols-2 gap-3">
              <Champ label="Regroupement"><select name="type" className={champ} defaultValue={edition.type}>{Object.entries(TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Champ>
              <Champ label="Province"><select name="province" className={champ} defaultValue={edition.province ?? ""}><option value="">Toutes</option>{TOUTES_PROVINCES.map((p) => <option key={p}>{p}</option>)}</select></Champ>
            </div>
            <Champ label="Description (facultatif)"><textarea name="description" className={cx(champ, "min-h-20")} defaultValue={edition.description} placeholder="Qui en fait partie, qui l'anime…" /></Champ>
            <Btn className="w-full">{edition.id ? "Enregistrer" : "Créer le chapitre"}</Btn>
          </form>
        )}
      </Modale>

      <Modale large ouvert={!!courant} onClose={() => setOuvert(null)} titre={courant ? `Membres · ${courant.nom}` : ""}>
        {courant && (() => {
          const m = (membres.get(courant.id) ?? []).slice().sort((a, b) => nomComplet(a).localeCompare(nomComplet(b)));
          const candidats = elp.filter((c) => c.chapitre_id !== courant.id && (!courant.province || c.province === courant.province));
          return (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <select className={cx(champS, "min-w-64 flex-1")} value={ajout} onChange={(e) => setAjout(e.target.value)} aria-label="ELP à ajouter">
                  <option value="">Ajouter un ELP{courant.province ? ` (${courant.province})` : ""}…</option>
                  {candidats.map((c) => <option key={c.id} value={c.id}>{nomComplet(c)} · {vue.cohortes.find((k) => k.id === c.cohorte_id)?.nom}{c.chapitre_id ? " · déjà dans un autre chapitre" : ""}</option>)}
                </select>
                <Btn disabled={!ajout} onClick={() => { rattacher(tous.filter((c) => c.id === ajout), courant.id); setAjout(""); }}>Ajouter</Btn>
                <Btn variante="secondaire" disabled={!m.length} onClick={() => exporterCandidats(`${courant.nom}.xlsx`, m, toutDb)}>Exporter</Btn>
              </div>
              {!m.length ? <p className="py-8 text-center text-sm text-muted">Aucun membre pour l&apos;instant.</p> : (
                <ul className="divide-y divide-sand-200">
                  {m.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                      <span><NomELP c={c} /> <span className="text-xs text-muted">· {cohortes.find((k) => k.id === c.cohorte_id)?.nom} · {c.universite || c.commune}</span></span>
                      <span className="flex items-center gap-2"><Pastille>{c.statut === "termine" ? "Ancien stagiaire" : "En parcours"}</Pastille><button className="text-xs font-bold text-muted hover:text-rose-700" onClick={() => rattacher([c], null)}>Retirer</button></span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })()}
      </Modale>
    </>
  );
}
