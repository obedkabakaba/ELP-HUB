"use client";
import { BarChart3, Building2, ClipboardCheck, CloudOff, FileSignature, Hotel, LayoutDashboard, Map as MapIcon, Menu, MessageSquare, RefreshCw, ShieldCheck, Smartphone, Upload, Users, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { SUPABASE_ACTIF, useStore } from "@/lib/store";
import { ETAPES, ROLES } from "@/lib/types";
import { useEnLigne } from "./Providers";
import { Logo, cx, toast } from "./ui";

const NAV = [
  { href: "/tableau", label: "Tableau de bord", icone: LayoutDashboard },
  { href: "/cohortes", label: "Cohortes et import", icone: Upload },
  { href: "/candidats", label: "Candidats", icone: Users },
  { href: "/communication", label: "Communication", icone: MessageSquare },
  { href: "/tests", label: "Tests et sélection", icone: ClipboardCheck },
  { href: "/autorisations", label: "Autorisations", icone: FileSignature },
  { href: "/induction", label: "Induction", icone: Hotel },
  { href: "/stage", label: "Stage", icone: Building2 },
  { href: "/carte", label: "Carte", icone: MapIcon },
  { href: "/rapports", label: "Rapports", icone: BarChart3 },
  { href: "/journal", label: "Confidentialité", icone: ShieldCheck },
];

export function BandeauDemo() {
  if (SUPABASE_ACTIF) return null;
  return <div className="no-print bg-ink px-4 py-1.5 text-center text-[11px] font-semibold tracking-wide text-white/85">DÉMONSTRATION · toutes les données sont fictives · aucun vrai SMS n&apos;est envoyé</div>;
}

/** Barre commune : scénario de démo, état du réseau, téléphone de démonstration. */
export function Outils({ clair }: { clair?: boolean }) {
  const etape = useStore((s) => s.etape);
  const reinitialiser = useStore((s) => s.reinitialiser);
  const set = useStore((s) => s.set);
  const attente = useStore((s) => s.outbox.length);
  const enLigne = useEnLigne();
  return (
    <div className="flex items-center gap-2">
      {!enLigne && (
        <span className="flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-800">
          <CloudOff className="size-3.5" /> Hors ligne{attente ? ` · ${attente} en attente` : ""}
        </span>
      )}
      {!SUPABASE_ACTIF && (
        <label className={cx("hidden items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold sm:flex", clair ? "border-white/20 text-white" : "border-sand-300 bg-white")} title="Fait avancer la cohorte fictive jusqu'à l'étape choisie">
          <RefreshCw className="size-3.5 opacity-60" />
          <span className="opacity-60">Scénario</span>
          <select
            aria-label="Étape du scénario de démonstration"
            value={etape}
            onChange={(e) => {
              reinitialiser(+e.target.value);
              toast(`Cohorte fictive replacée à l'étape ${e.target.value} : ${ETAPES[+e.target.value - 1].titre}.`);
            }}
            className={cx("bg-transparent font-bold outline-none", clair && "[&>option]:text-ink")}
          >
            {ETAPES.map((e) => (
              <option key={e.n} value={e.n}>
                {e.n}. {e.titre}
              </option>
            ))}
          </select>
        </label>
      )}
      <button onClick={() => set({ telephoneOuvert: true })} className={cx("flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold", clair ? "bg-white/15 text-white hover:bg-white/25" : "bg-ink text-white hover:bg-brand-900")}>
        <Smartphone className="size-4" /> <span className="hidden sm:inline">Téléphone démo</span>
      </button>
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const chemin = usePathname();
  const router = useRouter();
  const role = useStore((s) => s.role);
  const cohorte = useStore((s) => s.db.cohortes[0]);
  const [menu, setMenu] = useState(false);
  const autorise = role === "encadreur" || role === "admin";

  useEffect(() => {
    if (!autorise) router.replace("/");
  }, [autorise, router]);
  if (!autorise) return null;
  const r = ROLES.find((x) => x.id === role)!;

  return (
    <div className="min-h-dvh lg:pl-[264px]">
      <aside className={cx("no-print motif-toit fixed inset-y-0 left-0 z-40 flex w-[264px] flex-col bg-brand-950 text-white transition-transform lg:translate-x-0", menu ? "translate-x-0" : "-translate-x-full")}>
        <div className="flex items-center gap-3 px-5 pt-6 pb-5">
          <Logo taille={40} />
          <div className="leading-tight">
            <p className="text-[17px] font-extrabold tracking-tight">ELP Hub</p>
            <p className="text-[11px] text-white/55">EquityBCDC</p>
          </div>
          <button aria-label="Fermer le menu" className="ml-auto rounded-lg p-1 hover:bg-white/10 lg:hidden" onClick={() => setMenu(false)}>
            <X className="size-5" />
          </button>
        </div>
        <nav className="scroll-fin flex-1 space-y-0.5 overflow-y-auto px-3" aria-label="Navigation principale">
          {NAV.map(({ href, label, icone: I }) => {
            const actif = chemin === href || chemin.startsWith(href + "/");
            return (
              <Link key={href} href={href} onClick={() => setMenu(false)} aria-current={actif ? "page" : undefined} className={cx("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition", actif ? "bg-white text-brand-900 shadow-lg shadow-black/20" : "text-white/70 hover:bg-white/10 hover:text-white")}>
                <I className={cx("size-[18px]", actif && "text-brand-600")} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="m-3 rounded-2xl bg-white/[0.07] p-3.5">
          <p className="text-[11px] font-semibold tracking-wider text-white/45 uppercase">Connecté en tant que</p>
          <p className="mt-0.5 truncate text-sm font-bold">{r.acteur}</p>
          <Link href="/" className="mt-2 block rounded-lg bg-white/10 py-1.5 text-center text-xs font-semibold hover:bg-white/20">
            Changer de rôle
          </Link>
        </div>
      </aside>
      {menu && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setMenu(false)} />}

      <BandeauDemo />
      <header className="no-print sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-sand-200 bg-sand-50/85 px-4 py-3 backdrop-blur sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button aria-label="Ouvrir le menu" className="rounded-lg p-2 hover:bg-sand-200 lg:hidden" onClick={() => setMenu(true)}>
            <Menu className="size-5" />
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{cohorte?.nom ?? "Aucune cohorte"}</p>
            <p className="hidden text-xs text-muted sm:block">{cohorte ? `${cohorte.places} places · ${cohorte.places / 2} filles et ${cohorte.places / 2} garçons` : ""}</p>
          </div>
        </div>
        <Outils />
      </header>
      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-8 sm:py-8">{children}</main>
    </div>
  );
}
