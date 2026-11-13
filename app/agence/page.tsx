"use client";
import { ArrowLeft, CheckCircle2, Phone, Star } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { BandeauDemo, Outils } from "@/components/Shell";
import { Avatar, Btn, Card, Logo, Modale, Pastille, Vide, champ, cx, toast } from "@/components/ui";
import { jourISO, moyenneEvaluation, nomComplet } from "@/lib/logic";
import { fmtHeure } from "@/lib/modeles";
import { evaluer } from "@/lib/ops";
import { useStore } from "@/lib/store";
import type { Affectation, Evaluation } from "@/lib/types";

const CRITERES: [keyof Omit<Evaluation, "commentaire">, string][] = [["ponctualite", "Ponctualité et assiduité"], ["initiative", "Initiative"], ["equipe", "Esprit d'équipe"], ["apprentissage", "Capacité d'apprentissage"], ["service", "Sens du service au client"]];
const VIDE: Evaluation = { ponctualite: 3, initiative: 3, equipe: 3, apprentissage: 3, service: 3, commentaire: "" };

export default function EspaceAgence() {
  const db = useStore((s) => s.db);
  const agenceId = useStore((s) => s.agenceId);
  const set = useStore((s) => s.set);
  const put = useStore((s) => s.put);
  const [ouvert, setOuvert] = useState<Affectation | null>(null);
  const [ev, setEv] = useState<Evaluation>(VIDE);
  const agence = db.agences.find((a) => a.id === agenceId) ?? db.agences.find((a) => db.affectations.some((x) => x.agence_id === a.id && x.statut === "validee")) ?? db.agences[0];
  const jour = jourISO();

  const stagiaires = useMemo(() => {
    if (!agence) return [];
    return db.affectations.filter((a) => a.agence_id === agence.id && a.statut === "validee").map((a) => {
      const c = db.candidats.find((x) => x.id === a.candidat_id)!;
      const pres = db.presences.filter((p) => p.candidat_id === c.id && p.contexte === "stage");
      return { a, c, jours: pres.filter((p) => p.valide).length, auj: pres.find((p) => p.jour === jour), aConfirmer: pres.filter((p) => p.hors_zone && !p.valide) };
    });
  }, [db, agence, jour]);

  return (
    <div className="min-h-dvh">
      <BandeauDemo />
      <header className="motif-toit bg-brand-950 text-white">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/" aria-label="Accueil" className="rounded-lg p-1.5 hover:bg-white/10"><ArrowLeft className="size-5" /></Link>
            <Logo taille={40} />
            <div className="leading-tight">
              <p className="text-xs text-white/60">Espace chef d&apos;agence</p>
              <select aria-label="Agence" className="-ml-1 bg-transparent text-lg font-extrabold outline-none [&>option]:text-ink" value={agence?.id} onChange={(e) => set({ agenceId: e.target.value })}>
                {db.agences.map((a) => <option key={a.id} value={a.id}>Agence {a.nom}</option>)}
              </select>
            </div>
          </div>
          <Outils clair />
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <p className="text-sm text-muted">Bonjour {agence?.chef_nom}. Vous voyez uniquement les stagiaires ELP affectés à votre agence.</p>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <Card className="p-4"><p className="text-xs font-semibold text-muted">Stagiaires</p><p className="tabular text-2xl font-extrabold">{stagiaires.length}<span className="text-sm text-muted"> / {agence?.capacite}</span></p></Card>
          <Card className="p-4"><p className="text-xs font-semibold text-muted">Présents aujourd&apos;hui</p><p className="tabular text-2xl font-extrabold">{stagiaires.filter((s) => s.auj?.valide).length}</p></Card>
          <Card className="p-4"><p className="text-xs font-semibold text-muted">Évaluations faites</p><p className="tabular text-2xl font-extrabold">{stagiaires.filter((s) => s.a.evaluation).length}<span className="text-sm text-muted"> / {stagiaires.length}</span></p></Card>
        </div>

        <div className="mt-5 space-y-3">
          {!stagiaires.length && <Vide titre="Aucun stagiaire pour l'instant" detail="Vous recevrez un SMS dès qu'un stagiaire ELP sera affecté à votre agence." />}
          {stagiaires.map(({ a, c, jours, auj, aConfirmer }) => (
            <Card key={a.id} className="p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-3">
                <Avatar nom={`${c.prenom} ${c.nom}`} sexe={c.sexe} taille={44} />
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{nomComplet(c)}</p>
                  <p className="text-xs text-muted">{c.ecole} · habite à {a.distance_km} km · {jours} jours pointés</p>
                </div>
                {auj ? <Pastille ton={auj.valide ? "vert" : "ambre"}>{auj.valide ? `Arrivé(e) à ${fmtHeure(auj.horodatage)}` : "Pointage à confirmer"}</Pastille> : <Pastille ton="gris">Pas encore pointé</Pastille>}
                <Btn petit variante={a.evaluation ? "secondaire" : "primaire"} onClick={() => { setEv(a.evaluation ?? VIDE); setOuvert(a); }}><Star className="size-3.5" /> {a.evaluation ? `${moyenneEvaluation(a.evaluation)} / 5` : "Évaluer"}</Btn>
              </div>
              {aConfirmer.map((p) => (
                <div key={p.id} className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-amber-50 px-3 py-2 text-[13px]">
                  <span className="flex-1">A pointé hors de l&apos;agence le {new Date(p.horodatage).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} à {fmtHeure(p.horodatage)}. Était-il ou elle bien présent(e) ?</span>
                  <Btn petit onClick={() => { put("presences", { ...p, valide: true }); toast("Présence confirmée."); }}><CheckCircle2 className="size-3.5" /> Confirmer</Btn>
                </div>
              ))}
              <p className="mt-3 flex items-center gap-1.5 border-t border-sand-100 pt-3 text-xs text-muted"><Phone className="size-3.5" /> En cas d&apos;urgence : {c.urgence_nom || c.parent_nom || "non renseigné"} · {c.urgence_telephone || c.parent_telephone}</p>
            </Card>
          ))}
        </div>
      </main>

      <Modale ouvert={!!ouvert} onClose={() => setOuvert(null)} titre="Évaluation du stagiaire">
        <div className="space-y-4">
          {CRITERES.map(([k, l]) => (
            <div key={k}>
              <p className="mb-1.5 text-sm font-semibold">{l}</p>
              <div className="flex gap-1.5" role="radiogroup" aria-label={l}>
                {[1, 2, 3, 4, 5].map((n) => <button key={n} role="radio" aria-checked={ev[k] === n} onClick={() => setEv({ ...ev, [k]: n })} className={cx("flex-1 rounded-xl py-2.5 text-sm font-bold transition", ev[k] >= n ? "bg-brand-600 text-white" : "bg-sand-100 text-muted")}>{n}</button>)}
              </div>
            </div>
          ))}
          <textarea className={cx(champ, "min-h-24")} placeholder="Points forts, axes de progrès, recommandation…" value={ev.commentaire} onChange={(e) => setEv({ ...ev, commentaire: e.target.value })} aria-label="Commentaire" />
          <Btn className="w-full" onClick={() => { evaluer(ouvert!, ev); setOuvert(null); toast("Évaluation enregistrée et transmise à l'encadreur."); }}>Enregistrer · moyenne {moyenneEvaluation(ev)} / 5</Btn>
        </div>
      </Modale>
    </div>
  );
}
