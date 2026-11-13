"use client";
import { ArrowRight, CalendarClock, CheckCircle2, Sparkles, Zap } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Btn, Card, Chiffre, Entete, Pastille, cx, toast } from "@/components/ui";
import { actionsDuJour } from "@/lib/actions";
import { completude } from "@/lib/logic";
import { fmtDate, fmtQuand } from "@/lib/modeles";
import { acteurCourant, useStore } from "@/lib/store";

const URGENCE = { 1: { l: "Aujourd'hui", ton: "rouge" as const }, 2: { l: "Cette semaine", ton: "ambre" as const }, 3: { l: "À surveiller", ton: "gris" as const } };

export default function Tableau() {
  const db = useStore((s) => s.db);
  const [faits, setFaits] = useState<string[]>([]);
  const actions = useMemo(() => actionsDuJour(db), [db]);

  const s = useMemo(() => {
    const c = db.candidats;
    const inscrits = c.filter((x) => x.inscrit_le);
    const complets = inscrits.filter((x) => completude(x, db.documents).pct === 100);
    const convoques = new Set(db.convocations.map((k) => k.candidat_id));
    const testes = new Set(db.notes.map((n) => n.candidat_id));
    const elus = c.filter((x) => ["selectionne", "induction", "stage", "termine"].includes(x.statut));
    const sortants = db.messages.filter((m) => m.modele !== "reponse");
    const livres = sortants.filter((m) => m.statut === "livre" || m.statut === "lu").length;
    return {
      total: c.length,
      inscrits: inscrits.length,
      complets: complets.length,
      etapes: [
        { l: "Invités", n: c.length },
        { l: "Inscrits", n: inscrits.length },
        { l: "Convoqués", n: convoques.size },
        { l: "Testés", n: testes.size },
        { l: "Sélectionnés", n: elus.length },
        { l: "Induction", n: c.filter((x) => ["induction", "stage", "termine"].includes(x.statut)).length },
        { l: "En stage", n: c.filter((x) => ["stage", "termine"].includes(x.statut)).length },
      ],
      filles: elus.filter((x) => x.sexe === "F").length,
      elus: elus.length,
      livraison: sortants.length ? Math.round((livres / sortants.length) * 100) : 0,
      messages: sortants.length,
    };
  }, [db]);

  const echeance = useMemo(() => {
    const now = new Date().toISOString();
    const t = db.sessions_test.map((x) => x.date_heure).filter((d) => d > now).sort()[0];
    return t ? { l: "Prochain test", d: t } : null;
  }, [db.sessions_test]);

  const prenom = acteurCourant().nom.split(" ").slice(0, 2).join(" ");
  const max = Math.max(1, s.etapes[0].n);

  return (
    <>
      <Entete titre={`Bonjour ${prenom}`} sous={`${actions.length ? `${actions.length} points demandent votre attention` : "Tout est à jour"} · ${new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}`}>
        <Link href="/rapports">
          <Btn variante="secondaire">Rapport Fondation</Btn>
        </Link>
      </Entete>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Chiffre accent label="Présélectionnés" valeur={s.total} detail="Élèves à 80 % et plus à l'Exetat" />
        <Chiffre label="Inscrits" valeur={<>{s.inscrits} <span className="text-base font-bold text-muted">· {Math.round((s.inscrits / Math.max(1, s.total)) * 100)} %</span></>} detail={`${s.complets} dossiers complets`} />
        <Chiffre label="Parité des sélectionnés" valeur={s.elus ? <>{s.filles} F <span className="text-muted">·</span> {s.elus - s.filles} G</> : "—"} detail={s.elus ? `${s.elus} sélectionnés au total` : "Sélection pas encore faite"} />
        <Chiffre label="Messages remis" valeur={`${s.livraison} %`} detail={`${s.messages} messages envoyés`} />
      </div>

      <Card className="mt-4 p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold">Parcours de la cohorte</h2>
          <Link href="/candidats?vue=kanban" className="flex items-center gap-1 text-xs font-bold text-brand-600">Vue Kanban <ArrowRight className="size-3.5" /></Link>
        </div>
        <div className="grid grid-cols-7 items-end gap-1.5 sm:gap-3">
          {s.etapes.map((e, i) => (
            <div key={e.l} className="min-w-0">
              <div className="flex h-28 items-end">
                <div className="w-full rounded-t-xl bg-gradient-to-t from-brand-700 to-brand-400 transition-all duration-700" style={{ height: `${Math.max(3, (e.n / max) * 100)}%`, opacity: e.n ? 1 - i * 0.07 : 0.25 }} />
              </div>
              <p className="tabular mt-2 text-lg font-extrabold sm:text-xl">{e.n}</p>
              <p className="truncate text-[10px] font-semibold text-muted sm:text-xs">{e.l}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_360px]">
        <Card className="overflow-hidden">
          <div className="flex items-center gap-3 border-b border-sand-200 px-5 py-4 sm:px-6">
            <span className="grid size-9 place-items-center rounded-xl bg-brand-600 text-white"><Zap className="size-4" /></span>
            <div>
              <h2 className="font-bold">À faire aujourd&apos;hui</h2>
              <p className="text-xs text-muted">Calculé à partir des dossiers : qui doit faire quoi ensuite.</p>
            </div>
          </div>
          {!actions.length && (
            <div className="flex flex-col items-center px-6 py-14 text-center">
              <CheckCircle2 className="size-10 text-emerald-600" />
              <p className="mt-3 font-bold">Aucune action en attente</p>
              <p className="text-sm text-muted">Tous les dossiers avancent normalement.</p>
            </div>
          )}
          <ul className="divide-y divide-sand-200">
            {actions.map((a) => (
              <li key={a.id} className={cx("flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:px-6", faits.includes(a.id) && "opacity-50")}>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Pastille ton={URGENCE[a.urgence].ton}>{URGENCE[a.urgence].l}</Pastille>
                    <p className="font-bold">{a.titre}</p>
                  </div>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted">{a.detail}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {a.lien && (
                    <Link href={a.lien}><Btn petit variante="secondaire">Voir <ArrowRight className="size-3.5" /></Btn></Link>
                  )}
                  {a.executer && (
                    <Btn petit onClick={() => { toast(a.executer!()); setFaits((f) => [...f, a.id]); }}>
                      <Sparkles className="size-3.5" /> {a.bouton}
                    </Btn>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <div className="space-y-4">
          {echeance && (
            <Card className="flex items-center gap-4 p-5">
              <span className="grid size-11 place-items-center rounded-2xl bg-gold-100 text-gold-700"><CalendarClock className="size-5" /></span>
              <div>
                <p className="text-xs font-semibold text-muted">{echeance.l}</p>
                <p className="font-bold first-letter:uppercase">{fmtDate(echeance.d)}</p>
              </div>
            </Card>
          )}
          <Card className="p-5">
            <h2 className="mb-3 font-bold">Activité récente</h2>
            <ol className="space-y-3.5">
              {db.journal.slice().sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 7).map((j) => (
                <li key={j.id} className="relative pl-4 text-[13px] leading-snug before:absolute before:top-1.5 before:left-0 before:size-1.5 before:rounded-full before:bg-brand-400">
                  <p className="font-semibold">{j.action}</p>
                  <p className="text-xs text-muted">{j.acteur} · {fmtQuand(j.created_at)}</p>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}
