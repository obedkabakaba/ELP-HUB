"use client";
import { Download, Printer } from "lucide-react";
import { useMemo } from "react";
import { useCompletudes } from "@/components/commun";
import { Btn, Entete, Logo } from "@/components/ui";
import { moyenneEvaluation, nomComplet } from "@/lib/logic";
import { journaliser } from "@/lib/ops";
import { useStore } from "@/lib/store";
import { exporterExcel } from "@/lib/tableur";
import { STATUTS, statutInfo } from "@/lib/types";

export default function Rapports() {
  const db = useStore((s) => s.db);
  const comp = useCompletudes();
  const cohorte = db.cohortes[0];

  const r = useMemo(() => {
    const c = db.candidats;
    const elus = c.filter((x) => ["selectionne", "induction", "stage", "termine"].includes(x.statut));
    const parCommune = new Map<string, { total: number; inscrits: number; elus: number }>();
    for (const x of c) {
      const k = parCommune.get(x.commune) ?? { total: 0, inscrits: 0, elus: 0 };
      k.total++;
      if (x.inscrit_le) k.inscrits++;
      if (elus.includes(x)) k.elus++;
      parCommune.set(x.commune, k);
    }
    const notes = db.notes.map((n) => n.total);
    const evals = db.affectations.filter((a) => a.evaluation).map((a) => moyenneEvaluation(a.evaluation!));
    const sortants = db.messages.filter((m) => m.modele !== "reponse");
    const signes = db.documents.filter((d) => d.type === "autorisation" && d.statut === "signe").length;
    const autos = db.documents.filter((d) => d.type === "autorisation").length;
    return {
      lignes: [
        ["Élèves présélectionnés (Exetat)", c.length],
        ["Inscrits", c.filter((x) => x.inscrit_le).length],
        ["Dossiers complets", c.filter((x) => x.inscrit_le && comp.get(x.id)!.pct === 100).length],
        ["Convoqués au test", new Set(db.convocations.map((k) => k.candidat_id)).size],
        ["Présents au test", db.convocations.filter((k) => k.present).length],
        ["Sélectionnés", elus.length],
        ["dont filles", elus.filter((x) => x.sexe === "F").length],
        ["dont garçons", elus.filter((x) => x.sexe === "M").length],
        ["Liste d'attente", c.filter((x) => x.statut === "attente").length],
        ["Autorisations parentales signées", autos ? `${signes} / ${autos}` : "—"],
        ["Stagiaires en agence", c.filter((x) => x.statut === "stage" || x.statut === "termine").length],
        ["Désistements", c.filter((x) => x.statut === "desiste").length],
      ] as [string, string | number][],
      moyenne: notes.length ? (notes.reduce((a, b) => a + b, 0) / notes.length).toFixed(1) : "—",
      evalMoy: evals.length ? (evals.reduce((a, b) => a + b, 0) / evals.length).toFixed(1) : "—",
      communes: [...parCommune.entries()].sort((a, b) => b[1].total - a[1].total),
      remise: sortants.length ? Math.round((sortants.filter((m) => m.statut === "livre" || m.statut === "lu").length / sortants.length) * 100) : 0,
      messages: sortants.length,
    };
  }, [db, comp]);

  const excel = () => {
    const notes = new Map(db.notes.map((n) => [n.candidat_id, n]));
    const aff = new Map(db.affectations.map((a) => [a.candidat_id, a]));
    const ag = new Map(db.agences.map((a) => [a.id, a]));
    void exporterExcel(`rapport-${cohorte?.annee ?? "elp"}.xlsx`, [
      { nom: "Synthèse", lignes: r.lignes.map(([Indicateur, Valeur]) => ({ Indicateur, Valeur })) },
      { nom: "Candidats", lignes: db.candidats.filter((c) => !c.anonymise).map((c) => ({ Code: c.code, Nom: c.nom, Postnom: c.postnom, Prénom: c.prenom, Sexe: c.sexe, École: c.ecole, Commune: c.commune, "Exetat (%)": c.pourcentage_exetat, Statut: statutInfo(c.statut).label, "Dossier (%)": comp.get(c.id)?.pct ?? 0, "Note test": notes.get(c.id)?.total ?? null, Agence: ag.get(aff.get(c.id)?.agence_id ?? "")?.nom ?? null, "Distance (km)": aff.get(c.id)?.distance_km ?? null })) },
      { nom: "Communes", lignes: r.communes.map(([Commune, k]) => ({ Commune, Présélectionnés: k.total, Inscrits: k.inscrits, Sélectionnés: k.elus })) },
      { nom: "Stages", lignes: db.affectations.filter((a) => a.statut === "validee").map((a) => { const c = db.candidats.find((x) => x.id === a.candidat_id)!; return { Stagiaire: nomComplet(c), Agence: ag.get(a.agence_id)?.nom ?? "", "Distance (km)": a.distance_km, "Jours pointés": db.presences.filter((p) => p.candidat_id === c.id && p.contexte === "stage" && p.valide).length, "Évaluation (/5)": a.evaluation ? moyenneEvaluation(a.evaluation) : null }; }) },
    ].filter((f) => f.lignes.length));
    journaliser("Export Excel du rapport", cohorte?.nom ?? "");
  };

  return (
    <>
      <Entete titre="Rapports" sous="Le rapport pour la Fondation, toujours à jour. Plus besoin de recompter dans Excel.">
        <Btn variante="secondaire" onClick={excel}><Download className="size-4" /> Excel</Btn>
        <Btn onClick={() => { journaliser("Impression du rapport PDF", cohorte?.nom ?? ""); window.print(); }}><Printer className="size-4" /> PDF</Btn>
      </Entete>
      <div className="feuille rounded-2xl text-[13px]">
        <div className="flex items-start justify-between border-b-2 border-brand-600 pb-5">
          <div>
            <p className="text-xs font-bold tracking-widest text-brand-600 uppercase">EquityBCDC · Equity Leaders Program</p>
            <h2 className="mt-1 text-2xl font-extrabold">Rapport de suivi</h2>
            <p className="text-muted">{cohorte?.nom} · édité le {new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
          <Logo taille={52} />
        </div>

        <div className="mt-6 grid grid-cols-4 gap-3">
          {[["Présélectionnés", r.lignes[0][1]], ["Inscrits", r.lignes[1][1]], ["Sélectionnés", r.lignes[5][1]], ["En stage", r.lignes[10][1]]].map(([l, v]) => (
            <div key={l} className="rounded-xl bg-sand-100 p-3.5"><p className="text-[11px] font-semibold text-muted">{l}</p><p className="tabular text-2xl font-extrabold">{v}</p></div>
          ))}
        </div>

        <h3 className="mt-7 mb-2 text-sm font-extrabold">1. Indicateurs du parcours</h3>
        <table className="w-full"><tbody>
          {r.lignes.map(([l, v]) => <tr key={l} className="border-b border-sand-200"><td className={`py-1.5 ${l.startsWith("dont") ? "pl-5 text-muted" : "font-semibold"}`}>{l}</td><td className="tabular py-1.5 text-right font-bold">{v}</td></tr>)}
          <tr className="border-b border-sand-200"><td className="py-1.5 font-semibold">Note moyenne au test (sur 100)</td><td className="tabular text-right font-bold">{r.moyenne}</td></tr>
          <tr className="border-b border-sand-200"><td className="py-1.5 font-semibold">Évaluation moyenne de stage (sur 5)</td><td className="tabular text-right font-bold">{r.evalMoy}</td></tr>
          <tr><td className="py-1.5 font-semibold">Messages envoyés · taux de remise</td><td className="tabular text-right font-bold">{r.messages} · {r.remise} %</td></tr>
        </tbody></table>

        <h3 className="mt-7 mb-2 text-sm font-extrabold">2. Répartition par statut</h3>
        <div className="flex h-5 overflow-hidden rounded-full">
          {STATUTS.map((s) => { const n = db.candidats.filter((c) => c.statut === s.id).length; return n ? <div key={s.id} style={{ width: `${(n / db.candidats.length) * 100}%`, background: s.couleur }} title={`${s.label} : ${n}`} /> : null; })}
        </div>
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
          {STATUTS.map((s) => { const n = db.candidats.filter((c) => c.statut === s.id).length; return n ? <span key={s.id} className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: s.couleur }} />{s.label} <b className="tabular">{n}</b></span> : null; })}
        </p>

        <h3 className="mt-7 mb-2 text-sm font-extrabold">3. Répartition par commune</h3>
        <table className="w-full">
          <thead><tr className="border-b-2 border-sand-300 text-left text-[11px] text-muted"><th className="py-1.5">Commune</th><th className="text-right">Présélectionnés</th><th className="text-right">Inscrits</th><th className="text-right">Sélectionnés</th></tr></thead>
          <tbody>{r.communes.slice(0, 14).map(([nom, k]) => <tr key={nom} className="border-b border-sand-200"><td className="py-1 font-semibold">{nom}</td><td className="tabular text-right">{k.total}</td><td className="tabular text-right">{k.inscrits}</td><td className="tabular text-right font-bold">{k.elus || "—"}</td></tr>)}</tbody>
        </table>
        <p className="mt-8 border-t border-sand-200 pt-3 text-[10px] text-muted">Document généré par ELP Hub à partir de données fictives de démonstration. Aucune donnée personnelle réelle.</p>
      </div>
    </>
  );
}
