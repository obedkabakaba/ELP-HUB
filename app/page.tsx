"use client";
import { ArrowRight, Building2, GraduationCap, QrCode, ShieldCheck, UserCog, WifiOff, MapPinned, BellRing, FileSignature } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BandeauDemo, Outils } from "@/components/Shell";
import { Btn, Champ, Logo, champ } from "@/components/ui";
import { SUPABASE_ACTIF, useStore } from "@/lib/store";
import { connexion } from "@/lib/sync";
import { ETAPES, ROLES, type Role } from "@/lib/types";

const ICONES: Record<Role, typeof UserCog> = { encadreur: UserCog, admin: ShieldCheck, candidat: GraduationCap, centre: QrCode, agence: Building2 };

export default function Accueil() {
  const router = useRouter();
  const set = useStore((s) => s.set);
  const etape = useStore((s) => s.etape);
  const [email, setEmail] = useState("");
  const [mdp, setMdp] = useState("");
  const [erreur, setErreur] = useState("");
  const [charge, setCharge] = useState(false);

  const entrer = (role: Role) => {
    set({ role });
    router.push(ROLES.find((r) => r.id === role)!.accueil);
  };
  const seConnecter = async (e: React.FormEvent) => {
    e.preventDefault();
    setCharge(true);
    const err = await connexion(email, mdp);
    setCharge(false);
    if (err) return setErreur(err);
    const role = useStore.getState().role!;
    router.push(ROLES.find((r) => r.id === role)!.accueil);
  };

  return (
    <div className="min-h-dvh">
      <BandeauDemo />
      <section className="motif relative overflow-hidden bg-brand-950 text-white">
        <div className="relative mx-auto max-w-6xl px-5 pt-6 pb-16 sm:px-8 sm:pb-24">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Logo taille={50} />
              <div className="leading-tight">
                <p className="text-lg font-extrabold">ELP Hub</p>
                <p className="text-xs text-white/60">Equity Leaders Program</p>
              </div>
            </div>
            <Outils clair />
          </div>
          <div className="mt-14 max-w-3xl sm:mt-20">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-gold-400 ring-1 ring-white/15">De l&apos;Exetat au stage, sans fichier Excel</p>
            <h1 className="mt-5 text-4xl leading-[1.05] font-extrabold tracking-tight sm:text-6xl">
              Chaque élève, à chaque étape. <span className="text-gold-400">Rien ne se perd.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-base text-white/70 sm:text-lg">Un dossier unique par élève, des statuts en temps réel, et une plateforme qui dit chaque matin à l&apos;encadreur qui relancer, qui convoquer et qui appeler.</p>
          </div>
          <ol className="mt-12 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
            {ETAPES.map((e) => (
              <li key={e.n} className={`rounded-2xl p-3.5 ring-1 transition ${!SUPABASE_ACTIF && e.n === etape ? "bg-surface text-ink ring-white" : "bg-white/[0.06] ring-white/10"}`}>
                <p className={`text-[11px] font-bold ${!SUPABASE_ACTIF && e.n === etape ? "text-brand-600" : "text-gold-400"}`}>ÉTAPE {e.n}</p>
                <p className="mt-0.5 text-sm leading-snug font-bold">{e.titre}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto -mt-8 max-w-6xl px-5 pb-16 sm:px-8">
        {SUPABASE_ACTIF ? (
          <form onSubmit={seConnecter} className="relative mx-auto max-w-md space-y-4 rounded-3xl border border-sand-200 bg-surface p-7 shadow-pop">
            <h2 className="text-xl font-extrabold">Connexion</h2>
            <Champ label="Adresse e-mail">
              <input className={champ} type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Champ>
            <Champ label="Mot de passe">
              <input className={champ} type="password" required autoComplete="current-password" value={mdp} onChange={(e) => setMdp(e.target.value)} />
            </Champ>
            {erreur && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{erreur}</p>}
            <Btn className="w-full" disabled={charge}>{charge ? "Connexion…" : "Se connecter"}</Btn>
          </form>
        ) : (
          <>
            <div className="relative grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {ROLES.map((r) => {
                const I = ICONES[r.id];
                return (
                  <button key={r.id} onClick={() => entrer(r.id)} className="group flex flex-col rounded-3xl border border-sand-200 bg-surface p-5 text-left shadow-card transition hover:-translate-y-1 hover:border-brand-300 hover:shadow-pop">
                    <span className="grid size-11 place-items-center rounded-2xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-600 group-hover:text-white">
                      <I className="size-5" />
                    </span>
                    <span className="mt-4 text-base font-extrabold">{r.label}</span>
                    <span className="mt-1 flex-1 text-[13px] leading-snug text-muted">{r.description}</span>
                    <span className="mt-4 flex items-center gap-1 text-xs font-bold text-brand-600">
                      Entrer <ArrowRight className="size-3.5 transition group-hover:translate-x-1" />
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-4 text-center text-xs text-muted">Le parent ou tuteur n&apos;a pas de compte : il reçoit un lien par e-mail. Ouvrez la « Boîte mail démo » pour le voir.</p>
          </>
        )}

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { I: BellRing, t: "Actions du jour", d: "La plateforme repère les dossiers bloqués et propose la bonne relance : deux e-mails, puis un appel de l'encadreur." },
            { I: FileSignature, t: "Autorisation sur papier", d: "Le parent imprime l'autorisation déjà remplie, la signe à la main et en envoie la photo. L'encadreur vérifie et valide." },
            { I: MapPinned, t: "Affectation optimale", d: "Chaque stagiaire est placé dans l'agence la plus proche de chez lui, dans sa province, et l'affectation peut changer en cours de stage." },
            { I: WifiOff, t: "Pensé pour la 2G et pour durer", d: "Application installable, utilisable hors ligne, synchronisée au retour du réseau. Toutes les cohortes et toutes les provinces au même endroit." },
          ].map(({ I, t, d }) => (
            <div key={t} className="rounded-2xl bg-sand-100 p-5">
              <I className="size-5 text-brand-600" />
              <p className="mt-3 font-bold">{t}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-muted">{d}</p>
            </div>
          ))}
        </div>
        <p className="mt-10 text-center text-xs text-muted">Projet étudiant proposé à EquityBCDC et à Equity Group Foundation · maquette de démonstration, non officielle.</p>
      </section>
    </div>
  );
}
