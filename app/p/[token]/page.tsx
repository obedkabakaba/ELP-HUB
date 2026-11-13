"use client";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { BandeauDemo } from "@/components/Shell";
import { Signature } from "@/components/Signature";
import { Btn, Logo, champ, cx } from "@/components/ui";
import { parentDemanderCode, parentLire, parentSigner, type VueParent } from "@/lib/parent";

const ENGAGEMENTS = [
  "J'autorise mon enfant à participer à l'Equity Leaders Program d'EquityBCDC.",
  "J'autorise mon enfant à séjourner une semaine à l'hôtel pour la formation d'induction, sous la responsabilité des encadreurs.",
  "J'autorise mon enfant à effectuer un stage de deux mois dans une agence EquityBCDC proche de notre domicile.",
  "J'accepte que la Fondation Equity utilise les informations du dossier uniquement pour le programme.",
];

export default function PageParent() {
  const { token } = useParams<{ token: string }>();
  const [v, setV] = useState<VueParent | null | undefined>(undefined);
  const [coches, setCoches] = useState<boolean[]>(ENGAGEMENTS.map(() => false));
  const [etape, setEtape] = useState<"lire" | "code" | "fini">("lire");
  const [code, setCode] = useState("");
  const [demo, setDemo] = useState("");
  const [signature, setSignature] = useState<string | null>(null);
  const [erreur, setErreur] = useState("");
  const [charge, setCharge] = useState(false);

  const recharger = useCallback(() => parentLire(token).then((x) => { setV(x); if (x?.signe) setEtape("fini"); }), [token]);
  useEffect(() => { void recharger(); }, [recharger]);

  const demander = async () => {
    setCharge(true);
    const r = await parentDemanderCode(token);
    setCharge(false);
    if (r.erreur) return setErreur(r.erreur);
    setDemo(r.demo ?? "");
    setErreur("");
    setEtape("code");
  };
  const signer = async () => {
    setCharge(true);
    const err = await parentSigner(token, code, signature!);
    setCharge(false);
    if (err) return setErreur(err);
    await recharger();
  };

  return (
    <div className="min-h-dvh bg-sand-100">
      <BandeauDemo />
      <div className="mx-auto min-h-dvh max-w-md bg-sand-50 shadow-pop">
        <header className="flex items-center gap-3 border-b border-sand-200 bg-white px-5 py-4"><Logo taille={40} /><div className="leading-tight"><p className="font-extrabold">Autorisation parentale</p><p className="text-xs text-muted">EquityBCDC · Equity Leaders Program</p></div></header>
        <main className="px-5 py-6">
          {v === undefined ? <p className="py-20 text-center text-sm text-muted">Chargement…</p> : v === null ? (
            <div className="py-16 text-center"><p className="text-lg font-bold">Lien invalide</p><p className="mt-1 text-sm text-muted">Ce lien n&apos;existe pas ou a expiré. Demandez-en un nouveau à l&apos;encadreur de votre enfant.</p></div>
          ) : etape === "fini" ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="mx-auto size-16 text-emerald-600" />
              <h1 className="mt-4 text-2xl font-extrabold">Merci, c&apos;est signé</h1>
              <p className="mt-2 text-sm text-muted">L&apos;autorisation de {v.prenom} {v.nom} est enregistrée. Vous n&apos;avez plus rien à faire.</p>
              <div className="mt-6 rounded-2xl bg-white p-4 ring-1 ring-sand-200"><p className="text-xs font-semibold text-muted">Code de vérification du document</p><p className="tabular mt-1 text-xl font-extrabold tracking-wider">{v.code_verification}</p></div>
              <Link href={`/doc/autorisation/${v.candidat_id}`} className="mt-5 inline-block text-sm font-bold text-brand-600">Voir le document signé</Link>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted">Bonjour {v.parent_nom || "cher parent"},</p>
              <h1 className="mt-1 text-2xl leading-tight font-extrabold">Votre enfant {v.prenom} {v.nom} est sélectionné(e) pour le programme ELP.</h1>
              <p className="mt-2 text-sm text-muted">{v.cohorte}. Pour qu&apos;il ou elle puisse participer, nous avons besoin de votre accord. Cela prend deux minutes.</p>

              {etape === "lire" && (
                <>
                  <div className="mt-6 space-y-2.5">
                    {ENGAGEMENTS.map((e, i) => (
                      <label key={i} className={cx("flex gap-3 rounded-2xl border-2 p-4 text-sm leading-relaxed transition", coches[i] ? "border-emerald-300 bg-emerald-50" : "border-sand-200 bg-white")}>
                        <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-emerald-600" checked={coches[i]} onChange={(ev) => setCoches(coches.map((c, j) => (j === i ? ev.target.checked : c)))} />
                        {e}
                      </label>
                    ))}
                  </div>
                  {erreur && <p role="alert" className="mt-3 text-sm font-semibold text-rose-700">{erreur}</p>}
                  <Btn className="mt-6 w-full py-3.5" disabled={!coches.every(Boolean) || charge} onClick={demander}>{charge ? "Envoi du code…" : "Recevoir mon code par SMS"}</Btn>
                  <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted"><ShieldCheck className="size-4" /> Le code est envoyé au {v.parent_telephone.replace(/\d(?=(?:\D*\d){3})/g, "•")}</p>
                </>
              )}

              {etape === "code" && (
                <div className="mt-6 space-y-5">
                  <div>
                    <label htmlFor="code" className="mb-1.5 block text-sm font-bold">1. Entrez le code reçu par SMS</label>
                    <input id="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} className={cx(champ, "tabular py-3.5 text-center text-2xl font-extrabold tracking-[0.4em]")} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="••••••" />
                    {demo && <p className="mt-2 rounded-xl bg-gold-100 px-3 py-2 text-xs font-semibold text-gold-700">Démonstration : le SMS n&apos;est pas réellement envoyé. Code : <button className="tabular font-extrabold underline" onClick={() => setCode(demo)}>{demo}</button></p>}
                    <button className="mt-2 text-xs font-bold text-brand-600" onClick={demander}>Renvoyer un code</button>
                  </div>
                  <div>
                    <p className="mb-1.5 text-sm font-bold">2. Signez avec votre doigt</p>
                    <Signature onChange={setSignature} />
                  </div>
                  {erreur && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{erreur}</p>}
                  <Btn className="w-full py-3.5" disabled={code.length !== 6 || !signature || charge} onClick={signer}>{charge ? "Enregistrement…" : "Signer l'autorisation"}</Btn>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
