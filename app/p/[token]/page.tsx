"use client";
import { Camera, CheckCircle2, Clock, Printer, RefreshCw } from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FeuilleAutorisation } from "@/components/Papier";
import { BandeauDemo } from "@/components/Shell";
import { Btn, Logo, cx } from "@/components/ui";
import { miniature } from "@/lib/ops";
import { parentDeposer, parentLire, type VueParent } from "@/lib/parent";

function Etape({ n, titre, children, fait }: { n: number; titre: string; children: React.ReactNode; fait?: boolean }) {
  return (
    <section className={cx("rounded-3xl border p-5", fait ? "border-emerald-200 bg-emerald-50" : "border-sand-200 bg-surface shadow-card")}>
      <h2 className="flex items-center gap-2.5 font-extrabold"><span className={cx("grid size-7 place-items-center rounded-full text-xs text-white", fait ? "bg-emerald-600" : "bg-brand-600")}>{fait ? <CheckCircle2 className="size-4" /> : n}</span>{titre}</h2>
      <div className="mt-3 text-sm">{children}</div>
    </section>
  );
}

/** Page du parent : imprimer l'autorisation, la signer à la main, en déposer la photo. */
export default function PageParent() {
  const { token } = useParams<{ token: string }>();
  const [v, setV] = useState<VueParent | null | undefined>(undefined);
  const [apercu, setApercu] = useState<string | null>(null);
  const [nom, setNom] = useState("");
  const [erreur, setErreur] = useState("");
  const [charge, setCharge] = useState(false);

  const recharger = useCallback(() => parentLire(token).then(setV), [token]);
  useEffect(() => { void recharger(); }, [recharger]);

  const choisir = async (f?: File) => {
    if (!f) return;
    setErreur("");
    if (!f.type.startsWith("image/")) return setErreur("Merci d'envoyer une photo (JPG ou PNG) du papier signé.");
    setNom(f.name);
    setApercu(await miniature(f, 1100).catch(() => null));
  };
  const envoyer = async () => {
    setCharge(true);
    const err = await parentDeposer(token, nom, apercu!);
    setCharge(false);
    if (err) return setErreur(err);
    setApercu(null);
    await recharger();
  };


  return (
    <div className="min-h-dvh bg-sand-100 print:bg-white">
      <div className="no-print"><BandeauDemo /></div>
      <div className="no-print mx-auto min-h-dvh max-w-md bg-sand-50 shadow-pop">
        <header className="flex items-center gap-3 border-b border-sand-200 bg-surface px-5 py-4"><Logo taille={44} /><div className="leading-tight"><p className="font-extrabold">Autorisation parentale</p><p className="text-xs text-muted">Equity Leaders Program</p></div></header>
        <main className="space-y-4 px-5 py-6">
          {v === undefined ? <p className="py-20 text-center text-sm text-muted">Chargement…</p> : v === null ? (
            <div className="py-16 text-center"><p className="text-lg font-bold">Lien invalide</p><p className="mt-1 text-sm text-muted">Ce lien n&apos;existe pas ou a expiré. Demandez-en un nouveau à l&apos;encadreur de votre enfant.</p></div>
          ) : v.statut === "valide" ? (
            <div className="py-10 text-center"><CheckCircle2 className="mx-auto size-16 text-emerald-600" /><h1 className="mt-4 text-2xl font-extrabold">Autorisation validée</h1><p className="mt-2 text-sm text-muted">L&apos;autorisation de {v.prenom} {v.nom} a été vérifiée par un encadreur. Vous n&apos;avez plus rien à faire. Merci !</p></div>
          ) : v.statut === "recu" ? (
            <div className="py-10 text-center"><Clock className="mx-auto size-16 text-gold-500" /><h1 className="mt-4 text-2xl font-extrabold">Bien reçu, merci</h1><p className="mt-2 text-sm text-muted">Un encadreur va vérifier l&apos;autorisation de {v.prenom}. Vous serez prévenu(e) s&apos;il faut la renvoyer.</p><button className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-brand-600" onClick={() => setV({ ...v, statut: "en_attente" })}><RefreshCw className="size-4" /> Envoyer une autre photo</button></div>
          ) : (
            <>
              <div>
                <p className="text-sm text-muted">Bonjour {v.parent_nom || "cher parent"},</p>
                <h1 className="mt-1 text-2xl leading-tight font-extrabold">{v.prenom} {v.nom} est retenu(e) pour le programme ELP d&apos;EquityBCDC.</h1>
                <p className="mt-2 text-sm text-muted">Pour qu&apos;il ou elle puisse participer, nous avons besoin de votre autorisation signée à la main. Trois étapes :</p>
              </div>
              {v.statut === "rejete" && <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">La photo précédente n&apos;a pas pu être acceptée : {v.motif_rejet || "document illisible"}. Merci de la refaire.</p>}
              <Etape n={1} titre="Imprimez l'autorisation">
                <p className="text-muted">Le document est déjà rempli au nom de votre enfant. Pas d&apos;imprimante ? Un cybercafé peut l&apos;imprimer, ou l&apos;encadreur peut vous en remettre un exemplaire.</p>
                <Btn className="mt-3 w-full" variante="secondaire" onClick={() => window.print()}><Printer className="size-4" /> Imprimer le document</Btn>
              </Etape>
              <Etape n={2} titre="Signez-le à la main">
                <p className="text-muted">Écrivez « lu et approuvé », la date, votre nom, puis signez dans le cadre prévu.</p>
              </Etape>
              <Etape n={3} titre="Envoyez la photo du papier signé">
                {apercu ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={apercu} alt="Aperçu du document signé" className="max-h-80 w-full rounded-xl border border-sand-200 object-contain" />
                    <p className="mt-2 text-xs text-muted">La signature est-elle bien lisible ? Sinon, reprenez la photo.</p>
                  </>
                ) : <p className="text-muted">Posez la feuille bien à plat, à la lumière, et cadrez toute la page.</p>}
                <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-sand-300 py-3 text-sm font-bold text-brand-600">
                  <Camera className="size-4" /> {apercu ? "Reprendre la photo" : "Prendre ou choisir la photo"}
                  <input type="file" accept="image/*" capture="environment" hidden onChange={(e) => choisir(e.target.files?.[0])} />
                </label>
                {erreur && <p role="alert" className="mt-2 text-sm font-semibold text-rose-700">{erreur}</p>}
                {apercu && <Btn className="mt-3 w-full py-3.5" disabled={charge} onClick={envoyer}>{charge ? "Envoi…" : "Envoyer l'autorisation signée"}</Btn>}
              </Etape>
            </>
          )}
        </main>
      </div>
      {v && <div className="hidden print:block"><FeuilleAutorisation d={v} /></div>}
    </div>
  );
}
