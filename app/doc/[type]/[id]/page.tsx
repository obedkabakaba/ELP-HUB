"use client";
import { ArrowLeft, Printer } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { QR } from "@/components/commun";
import { Btn, Logo, Vide } from "@/components/ui";
import { moyenneEvaluation, nomComplet } from "@/lib/logic";
import { fmtDate, fmtHeure } from "@/lib/modeles";
import { useStore } from "@/lib/store";
import type { Candidat } from "@/lib/types";

const ENGAGEMENTS = ["la participation de mon enfant à l'Equity Leaders Program ;", "son séjour d'une semaine à l'hôtel pour la formation d'induction, sous la responsabilité des encadreurs ;", "un stage de deux mois dans une agence EquityBCDC proche de notre domicile ;", "l'utilisation des informations de son dossier pour les seuls besoins du programme."];

function Tete({ titre, sous }: { titre: string; sous: string }) {
  return (
    <div className="flex items-start justify-between border-b-2 border-brand-600 pb-5">
      <div><p className="text-[11px] font-bold tracking-widest text-brand-600 uppercase">Equity Group Foundation · Equity Leaders Program</p><h1 className="mt-1 text-2xl font-extrabold">{titre}</h1><p className="text-sm text-muted">{sous}</p></div>
      <Logo taille={52} />
    </div>
  );
}
const Pied = () => <p className="mt-10 border-t border-sand-200 pt-3 text-[10px] text-muted">Document de démonstration généré par ELP Hub à partir de données fictives. Sans valeur officielle.</p>;

export default function Doc() {
  const { type, id } = useParams<{ type: string; id: string }>();
  const router = useRouter();
  const db = useStore((s) => s.db);
  const c = db.candidats.find((x) => x.id === id);
  const cohorte = db.cohortes[0];
  const origine = typeof window === "undefined" ? "" : window.location.origin;

  let contenu: React.ReactNode = null;

  if (type === "convocation" && c) {
    const conv = db.convocations.find((k) => k.candidat_id === c.id);
    const s = conv && db.sessions_test.find((x) => x.id === conv.session_id);
    const centre = s && db.centres.find((x) => x.id === s.centre_id);
    if (s && centre)
      contenu = (
        <div className="feuille text-sm">
          <Tete titre="Convocation au test de sélection" sous={cohorte?.nom ?? ""} />
          <div className="mt-8 grid grid-cols-[1fr_auto] gap-8">
            <div>
              <p className="text-xs font-semibold text-muted">Candidat(e)</p>
              <p className="text-2xl font-extrabold">{nomComplet(c)}</p>
              <p className="tabular text-muted">{c.code} · {c.ecole}</p>
              <dl className="mt-8 space-y-4">
                <div><dt className="text-xs font-semibold text-muted">Date</dt><dd className="text-lg font-bold first-letter:uppercase">{fmtDate(s.date_heure)}</dd></div>
                <div><dt className="text-xs font-semibold text-muted">Heure d&apos;arrivée</dt><dd className="text-lg font-bold">{fmtHeure(s.date_heure)}</dd></div>
                <div><dt className="text-xs font-semibold text-muted">Lieu</dt><dd className="text-lg font-bold">{centre.nom}</dd><dd className="text-muted">{centre.adresse}, {centre.commune}</dd></div>
              </dl>
            </div>
            <div className="text-center"><QR valeur={`ELP:${c.code}`} taille={190} /><p className="tabular mt-1 font-bold">{c.code}</p><p className="text-[11px] text-muted">À présenter à l&apos;entrée</p></div>
          </div>
          <div className="mt-10 rounded-xl bg-sand-100 p-5">
            <p className="font-bold">À apporter</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px]"><li>Cette convocation, imprimée ou sur téléphone</li><li>Une pièce d&apos;identité ou la carte d&apos;élève</li><li>Un stylo à bille bleu ou noir</li></ul>
            <p className="mt-3 text-[13px] text-muted">Arrive 30 minutes avant l&apos;heure indiquée. En cas d&apos;empêchement, réponds 2 au SMS de convocation.</p>
          </div>
          <Pied />
        </div>
      );
  }

  if (type === "autorisation" && c) {
    const d = db.documents.find((x) => x.candidat_id === c.id && x.type === "autorisation" && x.statut === "signe");
    if (d)
      contenu = (
        <div className="feuille text-sm leading-relaxed">
          <Tete titre="Autorisation parentale" sous={cohorte?.nom ?? ""} />
          <p className="mt-8">Je soussigné(e) <b>{d.signe_par}</b>, {c.parent_lien ? `${c.parent_lien.toLowerCase()} ` : "parent ou tuteur "}de <b>{nomComplet(c)}</b> ({c.code}), élève de {c.ecole}, autorise :</p>
          <ol className="mt-4 list-decimal space-y-2 pl-6">{ENGAGEMENTS.map((e) => <li key={e}>{e}</li>)}</ol>
          <div className="mt-10 grid grid-cols-[1fr_auto] items-end gap-8">
            <div>
              <p className="text-xs font-semibold text-muted">Signé électroniquement le</p>
              <p className="font-bold first-letter:uppercase">{fmtDate(d.signe_le!)} à {fmtHeure(d.signe_le!)}</p>
              <p className="mt-1 text-xs text-muted">Identité vérifiée par un code à usage unique envoyé par SMS au numéro du signataire.</p>
              <div className="mt-4 h-28 w-64 rounded-xl border border-sand-300 p-2">
                {d.signature && d.signature !== "demo" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={d.signature} alt={`Signature de ${d.signe_par}`} className="size-full object-contain" />
                ) : <p className="grid size-full place-items-center text-2xl text-brand-900 italic" style={{ fontFamily: "cursive" }}>{d.signe_par}</p>}
              </div>
            </div>
            <div className="text-center"><QR valeur={`${origine}/verifier/${d.code_verification}`} taille={120} /><p className="tabular mt-1 text-sm font-extrabold">{d.code_verification}</p><p className="text-[10px] text-muted">Scanner pour vérifier</p></div>
          </div>
          <p className="tabular mt-8 rounded-lg bg-sand-100 p-3 text-[10px] break-all text-muted">Empreinte SHA-256 : {d.empreinte}</p>
          <Pied />
        </div>
      );
  }

  if (type === "attestation" && c) {
    const a = db.affectations.find((x) => x.candidat_id === c.id && x.evaluation);
    const ag = a && db.agences.find((x) => x.id === a.agence_id);
    if (a && ag)
      contenu = (
        <div className="feuille flex flex-col text-center">
          <Logo taille={64} className="mx-auto" />
          <p className="mt-10 text-xs font-bold tracking-[0.3em] text-brand-600 uppercase">Equity Leaders Program</p>
          <h1 className="mt-3 text-4xl font-extrabold">Attestation de stage</h1>
          <p className="mt-12 text-muted">Nous attestons que</p>
          <p className="mt-2 text-3xl font-extrabold text-brand-700">{nomComplet(c)}</p>
          <p className="mx-auto mt-6 max-w-lg leading-relaxed">a effectué son stage à l&apos;agence EquityBCDC <b>{ag.nom}</b> dans le cadre de la cohorte {cohorte?.nom}, avec {db.presences.filter((p) => p.candidat_id === c.id && p.contexte === "stage" && p.valide).length} jours de présence et une évaluation de <b>{moyenneEvaluation(a.evaluation!)} sur 5</b>.</p>
          <p className="mt-16 text-sm text-muted">{ag.chef_nom}, chef d&apos;agence</p>
          <div className="mt-auto"><Pied /></div>
        </div>
      );
  }

  if (type === "badges") {
    const liste: Candidat[] = db.candidats.filter((x) => x.statut === "induction" || x.statut === "selectionne").sort((a, b) => nomComplet(a).localeCompare(nomComplet(b)));
    const pages = Array.from({ length: Math.ceil(liste.length / 8) }, (_, i) => liste.slice(i * 8, i * 8 + 8));
    if (liste.length)
      contenu = pages.map((p, i) => (
        <div key={i} className="feuille mb-6 grid grid-cols-2 content-start gap-4 !p-[12mm]">
          {p.map((x) => (
            <div key={x.id} className="flex h-[62mm] flex-col overflow-hidden rounded-2xl border border-sand-300">
              <div className="flex items-center justify-between bg-brand-600 px-4 py-2 text-white"><span className="text-xs font-extrabold tracking-wide">ELP {cohorte?.annee}</span><span className="rounded bg-white px-1.5 py-0.5"><Logo taille={18} className="!ring-0" /></span></div>
              <div className="flex flex-1 items-center gap-3 px-4">
                <div className="min-w-0 flex-1"><p className="text-xl leading-tight font-extrabold">{x.prenom}</p><p className="truncate font-bold">{x.nom} {x.postnom}</p><p className="mt-2 text-xs text-muted">{x.ecole}</p><p className="tabular mt-1 text-xs font-bold">Chambre {x.chambre ?? "—"} · {x.code}</p></div>
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
