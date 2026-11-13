"use client";
import { Columns3, Download, List, MessageSquare, PhoneOff, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { EnvoiModale, useCompletudes, useQuery } from "@/components/commun";
import { Avatar, Barre, Btn, Card, Entete, Pastille, StatutBadge, Vide, champ, champS, cx, toast } from "@/components/ui";
import { joursDepuis, nomComplet, normaliser } from "@/lib/logic";
import { changerStatut, journaliser } from "@/lib/ops";
import { useStore, useVue } from "@/lib/store";
import { exporterCandidats } from "@/lib/exports";
import { STATUTS, estSorti, type Candidat, type Statut } from "@/lib/types";

const SPECIAUX: Record<string, string> = { echec: "E-mails en échec", appel: "À appeler", pieces: "Pièces à vérifier", incomplets: "Dossiers incomplets" };

export default function Candidats() {
  const q0 = useQuery();
  const db = useVue();
  const { candidats, documents, chapitres } = db;
  const setStore = useStore((s) => s.set);
  const [sortis, setSortis] = useState(false);
  const [chapitre, setChapitre] = useState("");
  const comp = useCompletudes();
  const [vue, setVue] = useState<"liste" | "kanban">(q0.get("vue") === "kanban" ? "kanban" : "liste");
  const [q, setQ] = useState("");
  const [statut, setStatut] = useState<Statut | "">((q0.get("statut") as Statut) ?? "");
  const [com, setCom] = useState("");
  const [sexe, setSexe] = useState("");
  const [special, setSpecial] = useState(q0.get("filtre") ?? "");
  const [choisis, setChoisis] = useState<Set<string>>(new Set());
  const [limite, setLimite] = useState(40);
  const [envoi, setEnvoi] = useState<Candidat[] | null>(null);
  const [survol, setSurvol] = useState<Statut | null>(null);

  const liste = useMemo(() => {
    const n = normaliser(q);
    const aVerifier = new Set(documents.filter((d) => d.statut === "recu").map((d) => d.candidat_id));
    return candidats.filter((c) => {
      if (!statut && !sortis && estSorti(c.statut)) return false;
      if (sortis && !estSorti(c.statut)) return false;
      if (chapitre && c.chapitre_id !== chapitre) return false;
      if (statut && c.statut !== statut) return false;
      if (com && c.commune !== com) return false;
      if (sexe && c.sexe !== sexe) return false;
      if (special === "echec" && !c.contact_invalide) return false;
      if (special === "appel" && !(c.statut === "invite" && c.relances >= 2)) return false;
      if (special === "pieces" && !(aVerifier.has(c.id) && c.statut === "inscrit")) return false;
      if (special === "incomplets" && !(c.statut === "inscrit" && comp.get(c.id)!.pct < 100)) return false;
      if (n && !normaliser(`${c.prenom}${c.nom}${c.postnom}${c.code}${c.ecole}${c.telephone}`).includes(n)) return false;
      return true;
    });
  }, [candidats, documents, comp, q, statut, com, sexe, special, sortis, chapitre]);

  const basculer = (id: string) => setChoisis((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const selection = liste.filter((c) => choisis.has(c.id));
  const deposer = (s: Statut, id: string) => {
    const c = candidats.find((x) => x.id === id);
    if (!c || c.statut === s) return;
    changerStatut(c, s);
    journaliser(`Statut changé à la main : ${STATUTS.find((x) => x.id === s)!.label}`, nomComplet(c));
    toast(`${nomComplet(c)} → ${STATUTS.find((x) => x.id === s)!.label}`);
  };

  return (
    <>
      <Entete titre="Candidats et ELP" sous={`${liste.length} dossier${liste.length > 1 ? "s" : ""} affiché${liste.length > 1 ? "s" : ""} · ${candidats.filter((c) => !estSorti(c.statut)).length} dans le parcours, ${candidats.filter((c) => estSorti(c.statut)).length} sortis (gardés en mémoire). Cliquez sur un nom pour ouvrir sa fiche.`}>
        <Btn variante="secondaire" onClick={() => exporterCandidats("candidats.xlsx", liste, db)}><Download className="size-4" /> Exporter la liste</Btn>
        <div className="flex rounded-xl bg-sand-100 p-1">
          {([["liste", List, "Liste"], ["kanban", Columns3, "Kanban"]] as const).map(([id, I, l]) => (
            <button key={id} onClick={() => setVue(id)} aria-pressed={vue === id} className={cx("flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold", vue === id ? "bg-surface shadow-sm" : "text-muted")}>
              <I className="size-4" /> {l}
            </button>
          ))}
        </div>
      </Entete>

      <Card className="mb-4 flex flex-wrap items-center gap-2 p-3">
        <div className="relative min-w-52 flex-1">
          <Search className="absolute top-3 left-3.5 size-4 text-muted" />
          <input className={cx(champ, "pl-10")} placeholder="Nom, code, école ou téléphone" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Rechercher" />
        </div>
        <select className={champS} value={statut} onChange={(e) => setStatut(e.target.value as Statut)} aria-label="Statut">
          <option value="">Tous les statuts</option>
          {STATUTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <select className={champS} value={com} onChange={(e) => setCom(e.target.value)} aria-label="Commune">
          <option value="">Toutes les communes</option>
          {[...new Set(candidats.map((c) => c.commune))].sort().map((c) => <option key={c}>{c}</option>)}
        </select>
        <select className={champS} value={sexe} onChange={(e) => setSexe(e.target.value)} aria-label="Sexe">
          <option value="">Filles et garçons</option>
          <option value="F">Filles</option>
          <option value="M">Garçons</option>
        </select>
        {chapitres.length > 0 && (
          <select className={champS} value={chapitre} onChange={(e) => setChapitre(e.target.value)} aria-label="Chapitre">
            <option value="">Tous les chapitres</option>
            {chapitres.map((k) => <option key={k.id} value={k.id}>{k.nom}</option>)}
          </select>
        )}
        <label className="flex items-center gap-2 px-1 text-sm font-semibold whitespace-nowrap"><input type="checkbox" className="size-4 accent-brand-600" checked={sortis} onChange={(e) => setSortis(e.target.checked)} /> Sortis du parcours</label>
        <select className={cx(champS, special && "border-brand-400 bg-brand-50 font-semibold text-brand-700")} value={special} onChange={(e) => setSpecial(e.target.value)} aria-label="Filtre de suivi">
          <option value="">Suivi : tous</option>
          {Object.entries(SPECIAUX).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </Card>

      {selection.length > 0 && (
        <div className="animate-in sticky top-[68px] z-10 mb-3 flex flex-wrap items-center gap-3 rounded-2xl bg-nuit px-4 py-2.5 text-sm text-white shadow-pop">
          <span className="font-bold">{selection.length} sélectionné{selection.length > 1 ? "s" : ""}</span>
          <Btn petit variante="or" onClick={() => setEnvoi(selection)}><MessageSquare className="size-3.5" /> Envoyer un e-mail</Btn>
          <Btn petit variante="secondaire" onClick={() => exporterCandidats(`selection-${selection.length}.xlsx`, selection, db)}><Download className="size-3.5" /> Exporter en Excel</Btn>
          <button className="ml-auto text-xs font-semibold text-white/70 hover:text-white" onClick={() => setChoisis(new Set())}>Tout désélectionner</button>
        </div>
      )}

      {!liste.length ? (
        <Vide titre="Aucun dossier ne correspond" detail="Modifiez la recherche ou les filtres." />
      ) : vue === "liste" ? (
        <Card className="overflow-hidden">
          <div className="scroll-fin overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-sand-200 bg-sand-50 text-left text-xs font-semibold text-muted">
                  <th className="w-10 py-3 pl-4">
                    <input type="checkbox" aria-label="Tout sélectionner" checked={selection.length === liste.length} onChange={(e) => setChoisis(e.target.checked ? new Set(liste.map((c) => c.id)) : new Set())} className="size-4 accent-brand-600" />
                  </th>
                  <th className="px-3 py-3">Élève</th>
                  <th className="px-3 py-3">École · lieu</th>
                  <th className="px-3 py-3">Exetat</th>
                  <th className="px-3 py-3">Statut</th>
                  <th className="px-3 py-3">Dossier</th>
                  <th className="px-3 py-3 pr-5">Suivi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-100">
                {liste.slice(0, limite).map((c) => {
                  const k = comp.get(c.id)!;
                  return (
                    <tr key={c.id} className="group hover:bg-sand-50">
                      <td className="py-2.5 pl-4"><input type="checkbox" aria-label={`Sélectionner ${nomComplet(c)}`} checked={choisis.has(c.id)} onChange={() => basculer(c.id)} className="size-4 accent-brand-600" /></td>
                      <td className="px-3 py-2.5">
                        <button onClick={() => setStore({ ficheId: c.id })} className="flex items-center gap-3 text-left">
                          <Avatar nom={`${c.prenom} ${c.nom}`} sexe={c.sexe} />
                          <span>
                            <span className="block font-bold group-hover:text-brand-700">{nomComplet(c)}</span>
                            <span className="tabular text-xs text-muted">{c.code}</span>
                          </span>
                        </button>
                      </td>
                      <td className="max-w-56 px-3 py-2.5"><span className="block truncate">{c.ecole}</span><span className="text-xs text-muted">{c.commune}, {c.province}</span></td>
                      <td className="tabular px-3 py-2.5 font-bold">{c.pourcentage_exetat} %</td>
                      <td className="px-3 py-2.5"><StatutBadge statut={c.statut} /></td>
                      <td className="w-36 px-3 py-2.5">
                        {c.inscrit_le ? (<><span className="tabular text-xs font-semibold">{k.pct} %</span><Barre pct={k.pct} className="mt-1" /></>) : <span className="text-xs text-muted">Pas commencé</span>}
                      </td>
                      <td className="px-3 py-2.5 pr-5">
                        <div className="flex flex-wrap gap-1">
                          {c.contact_invalide && <Pastille ton="rouge"><PhoneOff className="size-3" /> e-mails en échec</Pastille>}{c.motif_sortie && estSorti(c.statut) && <span className="max-w-48 truncate text-xs text-muted" title={c.motif_sortie}>{c.motif_sortie}</span>}
                          {c.relances > 0 && <Pastille ton={c.relances >= 2 ? "ambre" : "gris"}>{c.relances} relance{c.relances > 1 ? "s" : ""}</Pastille>}
                          {c.statut === "invite" && !c.contact_invalide && <span className="text-xs text-muted">invité il y a {joursDepuis(c.invite_le)} j</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {liste.length > limite && (
            <div className="border-t border-sand-200 p-3 text-center">
              <Btn petit variante="discret" onClick={() => setLimite((l) => l + 60)}>Afficher plus ({liste.length - limite} restants)</Btn>
            </div>
          )}
        </Card>
      ) : (
        <div className="scroll-fin -mx-4 flex gap-3 overflow-x-auto px-4 pb-4 sm:-mx-8 sm:px-8">
          {STATUTS.filter((s) => !estSorti(s.id) || liste.some((c) => c.statut === s.id)).map((s) => {
            const col = liste.filter((c) => c.statut === s.id);
            return (
              <div key={s.id} onDragOver={(e) => { e.preventDefault(); setSurvol(s.id); }} onDragLeave={() => setSurvol(null)} onDrop={(e) => { setSurvol(null); deposer(s.id, e.dataTransfer.getData("text/plain")); }} className={cx("flex w-64 shrink-0 flex-col rounded-2xl bg-sand-100 p-2 transition", survol === s.id && "ring-2 ring-brand-400")}>
                <div className="flex items-center justify-between px-2 py-2">
                  <span className="flex items-center gap-2 text-sm font-bold"><span className="size-2 rounded-full" style={{ background: s.couleur }} />{s.court}</span>
                  <span className="tabular rounded-full bg-surface px-2 text-xs font-bold">{col.length}</span>
                </div>
                <div className="scroll-fin flex max-h-[62vh] flex-col gap-2 overflow-y-auto">
                  {col.slice(0, 30).map((c) => (
                    <div role="button" tabIndex={0} key={c.id} onClick={() => setStore({ ficheId: c.id })} onKeyDown={(e) => e.key === "Enter" && setStore({ ficheId: c.id })} draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", c.id)} className="rounded-xl border border-sand-200 bg-surface p-3 shadow-sm transition hover:border-brand-300">
                      <div className="flex items-center gap-2">
                        <Avatar nom={`${c.prenom} ${c.nom}`} sexe={c.sexe} taille={28} />
                        <span className="min-w-0"><span className="block truncate text-[13px] font-bold">{c.prenom} {c.nom}</span><span className="block truncate text-[11px] text-muted">{c.commune} · {c.pourcentage_exetat} %</span></span>
                      </div>
                      {c.inscrit_le && comp.get(c.id)!.pct < 100 && <Barre pct={comp.get(c.id)!.pct} className="mt-2" />}
                    </div>
                  ))}
                  {col.length > 30 && <p className="py-1 text-center text-xs text-muted">+ {col.length - 30} autres</p>}
                  {!col.length && <p className="px-2 py-6 text-center text-xs text-muted">Glissez un dossier ici</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <EnvoiModale cibles={envoi} onClose={() => { setEnvoi(null); setChoisis(new Set()); }} />
    </>
  );
}
