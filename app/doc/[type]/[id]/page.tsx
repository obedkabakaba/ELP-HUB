"use client";
import { ArrowLeft, Printer } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { QR } from "@/components/commun";
import { FeuilleAutorisation, Pied, Tete } from "@/components/Papier";
import { Btn, Logo, Vide } from "@/components/ui";
import { moyenneEvaluation, nomComplet } from "@/lib/logic";
import { fmtDate, fmtHeure } from "@/lib/modeles";
import { useStore, useVue } from "@/lib/store";
import type { Candidat } from "@/lib/types";

export default function Doc() {
  const { type, id } = useParams<{ type: string; id: string }>();
  const router = useRouter();
  const db = useStore((s) => s.db);
  const vue = useVue();
  const c = db.candidats.find((x) => x.id === id);
  const cohorte = db.cohortes.find((k) => k.id === c?.cohorte_id) ?? vue.cohortes[0];

  let contenu: React.ReactNode = null;

  if (type === "convocation" && c) {
    const conv = db.convocations.find((k) => k.candidat_id === c.id);
    const s = conv && db.sessions_test.find((x) => x.id === conv.session_id);
    const centre = s && db.centres.find((x) => x.id === s.centre_id);
    if (s && centre)
      contenu = (
        <div className="feuille clair flex flex-col text-sm">
          <Tete titre="Convocation au test de sélection" sous={cohorte?.nom ?? ""} />
          <div className="mt-8 grid grid-cols-[1fr_auto] gap-8">
            <div>
              <p className="text-xs font-semibold text-muted">Candidat(e)</p>
              <p className="text-2xl font-extrabold">{nomComplet(c)}</p>
              <p className="tabular text-muted">{c.code} · {c.ecole}</p>
              <dl className="mt-8 space-y-4">
                <div><dt className="text-xs font-semibold text-muted">Date</dt><dd className="text-lg font-bold first-letter:uppercase">{fmtDate(s.date_heure)}</dd></div>
                <div><dt className="text-xs font-semibold text-muted">Heure d&apos;arrivée</dt><dd className="text-lg font-bold">{fmtHeure(s.date_heure)}</dd></div>
                <div><dt className="text-xs font-semibold text-muted">Lieu</dt><dd className="text-lg font-bold">{centre.nom}</dd><dd className="text-muted">{centre.adresse}, {centre.commune} ({centre.province})</dd></div>
              </dl>
            </div>
            <div className="text-center"><QR valeur={`ELP:${c.code}`} taille={190} /><p className="tabular mt-1 font-bold">{c.code}</p><p className="text-[11px] text-muted">À présenter à l&apos;entrée</p></div>
          </div>
          <div className="mt-10 rounded-md bg-sand-100 p-5">
            <p className="font-bold">À apporter</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px]"><li>Cette convocation, imprimée ou sur téléphone</li><li>Une pièce d&apos;identité ou la carte d&apos;élève</li><li>Un stylo à bille bleu ou noir</li></ul>
            <p className="mt-3 text-[13px] text-muted">Arrive 30 minutes avant l&apos;heure indiquée. En cas d&apos;empêchement, signale-le depuis ton espace.</p>
          </div>
          <div className="mt-auto"><Pied /></div>
        </div>
      );
  }

  if (type === "autorisation" && c) {
    const d = db.documents.find((x) => x.candidat_id === c.id && x.type === "autorisation");
    contenu = <FeuilleAutorisation d={{ prenom: c.prenom, nom: c.nom, postnom: c.postnom, code: c.code, ecole: c.ecole, parent_nom: c.parent_nom, parent_lien: c.parent_lien, cohorte: cohorte?.nom ?? "", code_verification: d?.code_verification ?? "" }} />;
  }

  if (type === "attestation" && c) {
    const a = db.affectations.find((x) => x.candidat_id === c.id && x.evaluation);
    const ag = a && db.agences.find((x) => x.id === a.agence_id);
    if (a && ag)
      contenu = (
        <div className="feuille clair flex flex-col">
          <Tete titre="Attestation de stage" sous={cohorte?.nom ?? ""} />
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <p className="text-muted">Nous attestons que</p>
            <p className="mt-2 text-3xl font-extrabold text-[#a6282d]">{nomComplet(c)}</p>
            <p className="mx-auto mt-6 max-w-lg leading-relaxed">a effectué son stage à l&apos;agence EquityBCDC <b>{ag.nom}</b> ({ag.province}) dans le cadre de la cohorte {cohorte?.nom}, avec {db.presences.filter((p) => p.candidat_id === c.id && p.contexte === "stage" && p.valide).length} jours de présence et une évaluation de <b>{moyenneEvaluation(a.evaluation!)} sur 5</b>.</p>
            <p className="mt-16 text-sm text-muted">{ag.chef_nom}, chef d&apos;agence</p>
          </div>
          <Pied />
        </div>
      );
  }

  if (type === "badges") {
    const liste: Candidat[] = vue.candidats.filter((x) => x.statut === "induction" || x.statut === "selectionne").sort((a, b) => nomComplet(a).localeCompare(nomComplet(b)));
    const pages = Array.from({ length: Math.ceil(liste.length / 8) }, (_, i) => liste.slice(i * 8, i * 8 + 8));
    if (liste.length)
      contenu = pages.map((p, i) => (
        <div key={i} className="feuille clair mb-6 grid grid-cols-2 content-start gap-4 !p-[12mm]">
          {p.map((x) => (
            <div key={x.id} className="flex h-[62mm] flex-col overflow-hidden rounded-xl border border-sand-300">
              <div className="flex items-center justify-between border-b-2 border-[#a6282d] px-4 py-2"><Logo nu taille={26} /><span className="text-xs font-extrabold tracking-wide text-[#a6282d]">{db.cohortes.find((k) => k.id === x.cohorte_id)?.nom}</span></div>
              <div className="flex flex-1 items-center gap-3 px-4">
                <div className="min-w-0 flex-1"><p className="text-xl leading-tight font-extrabold">{x.prenom}</p><p className="truncate font-bold">{x.nom} {x.postnom}</p><p className="mt-2 text-xs text-muted">{x.province}</p><p className="tabular mt-1 text-xs font-bold">Chambre {x.chambre ?? "—"} · {x.code}</p></div>
                <QR valeur={`ELP:${x.code}`} taille={84} />
              </div>
            </div>
          ))}
        </div>
      ));
  }

  return (
    <div className="min-h-dvh bg-sand-200 py-6 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-4 flex max-w-[210mm] items-center justify-between px-4">
        <Btn variante="secondaire" onClick={() => router.back()}><ArrowLeft className="size-4" /> Retour</Btn>
        {contenu && <Btn onClick={() => window.print()}><Printer className="size-4" /> Imprimer ou enregistrer en PDF</Btn>}
      </div>
      {contenu ?? <div className="mx-auto max-w-lg px-4"><Vide titre="Document indisponible" detail="Ce document n'existe pas encore pour ce dossier." /></div>}
    </div>
  );
}
