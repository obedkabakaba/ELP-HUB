"use client";
import { X } from "lucide-react";
import Image from "next/image";
import { useEffect, type ReactNode } from "react";
import { create } from "zustand";
import { statutInfo, type Statut } from "@/lib/types";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export function Logo({ taille = 44, className }: { taille?: number; className?: string }) {
  return (
    <span className={cx("inline-grid place-items-center rounded-xl bg-white ring-1 ring-black/5", className)} style={{ width: taille * 1.5, height: taille }}>
      <Image src="/brand/equity-logo.png" alt="Equity" width={174} height={110} priority style={{ height: taille * 0.78, width: "auto" }} />
    </span>
  );
}

export function Card({ children, className, ...p }: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx("rounded-2xl border border-sand-200 bg-white shadow-card", className)} {...p}>
      {children}
    </div>
  );
}

type Variante = "primaire" | "secondaire" | "discret" | "danger" | "or";
const VAR: Record<Variante, string> = {
  primaire: "bg-brand-600 text-white hover:bg-brand-700 shadow-sm shadow-brand-900/20",
  secondaire: "bg-white text-ink border border-sand-300 hover:bg-sand-100",
  discret: "text-muted hover:bg-sand-100 hover:text-ink",
  danger: "bg-white text-rose-700 border border-rose-200 hover:bg-rose-50",
  or: "bg-gold-500 text-white hover:bg-gold-700",
};

export function Btn({ variante = "primaire", petit, className, children, ...p }: { variante?: Variante; petit?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cx("inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[0.98] disabled:opacity-45 disabled:pointer-events-none", petit ? "px-3 py-1.5 text-[13px]" : "px-4 py-2.5 text-sm", VAR[variante], className)}
      {...p}
    >
      {children}
    </button>
  );
}

export function StatutBadge({ statut, className }: { statut: Statut; className?: string }) {
  const s = statutInfo(statut);
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap", className)} style={{ background: s.couleur + "18", color: s.couleur }}>
      <span className="size-1.5 rounded-full" style={{ background: s.couleur }} />
      {s.label}
    </span>
  );
}

const TONS = {
  gris: "bg-sand-100 text-muted",
  vert: "bg-emerald-50 text-emerald-700",
  rouge: "bg-rose-50 text-rose-700",
  ambre: "bg-amber-50 text-amber-700",
  bleu: "bg-blue-50 text-blue-700",
  marque: "bg-brand-50 text-brand-700",
};
export function Pastille({ ton = "gris", children, className }: { ton?: keyof typeof TONS; children: ReactNode; className?: string }) {
  return <span className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap", TONS[ton], className)}>{children}</span>;
}

export function Barre({ pct, couleur, className }: { pct: number; couleur?: string; className?: string }) {
  const c = couleur ?? (pct >= 100 ? "#059669" : pct >= 60 ? "#c8963e" : "#b7443f");
  return (
    <div className={cx("h-1.5 w-full overflow-hidden rounded-full bg-sand-200", className)} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: c }} />
    </div>
  );
}

export function Entete({ titre, sous, children }: { titre: string; sous?: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-extrabold sm:text-[28px]">{titre}</h1>
        {sous && <p className="mt-1 max-w-2xl text-sm text-muted">{sous}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function Onglets<T extends string>({ onglets, actif, onChange }: { onglets: { id: T; label: string; n?: number }[]; actif: T; onChange: (id: T) => void }) {
  return (
    <div className="scroll-fin mb-5 flex gap-1 overflow-x-auto rounded-xl bg-sand-100 p-1" role="tablist">
      {onglets.map((o) => (
        <button key={o.id} role="tab" aria-selected={actif === o.id} onClick={() => onChange(o.id)} className={cx("flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold whitespace-nowrap transition", actif === o.id ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink")}>
          {o.label}
          {o.n != null && <span className={cx("tabular rounded-full px-1.5 text-[11px]", actif === o.id ? "bg-brand-50 text-brand-700" : "bg-sand-200")}>{o.n}</span>}
        </button>
      ))}
    </div>
  );
}

export function Modale({ ouvert, onClose, titre, children, large }: { ouvert: boolean; onClose: () => void; titre: string; children: ReactNode; large?: boolean }) {
  useEffect(() => {
    if (!ouvert) return;
    const f = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [ouvert, onClose]);
  if (!ouvert) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-brand-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal aria-label={titre} className={cx("animate-in flex max-h-[92dvh] w-full flex-col rounded-t-3xl bg-white shadow-pop sm:rounded-3xl", large ? "sm:max-w-3xl" : "sm:max-w-lg")}>
        <div className="flex items-center justify-between gap-4 border-b border-sand-200 px-6 py-4">
          <h2 className="text-lg font-bold">{titre}</h2>
          <button onClick={onClose} aria-label="Fermer" className="rounded-lg p-1.5 text-muted hover:bg-sand-100">
            <X className="size-5" />
          </button>
        </div>
        <div className="scroll-fin overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

const champBase = "rounded-xl border border-sand-300 bg-white px-3.5 py-2.5 text-sm outline-none transition placeholder:text-muted/60 focus:border-brand-500 focus:ring-4 focus:ring-brand-100";
export const champ = `w-full ${champBase}`;
/** Variante à largeur automatique (filtres, listes déroulantes en ligne). */
export const champS = `w-auto ${champBase}`;

export function Champ({ label, aide, children }: { label: string; aide?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold">{label}</span>
      {children}
      {aide && <span className="mt-1 block text-xs text-muted">{aide}</span>}
    </label>
  );
}

export function Vide({ titre, detail, children }: { titre: string; detail?: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-sand-300 px-6 py-12 text-center">
      <p className="font-bold">{titre}</p>
      {detail && <p className="mx-auto mt-1 max-w-md text-sm text-muted">{detail}</p>}
      {children && <div className="mt-4 flex justify-center gap-2">{children}</div>}
    </div>
  );
}

export function Chiffre({ label, valeur, detail, accent }: { label: string; valeur: ReactNode; detail?: ReactNode; accent?: boolean }) {
  return (
    <Card className={cx("p-5", accent && "border-brand-200 bg-gradient-to-br from-brand-50 to-white")}>
      <p className="text-[13px] font-semibold text-muted">{label}</p>
      <p className="tabular mt-1 text-3xl font-extrabold tracking-tight">{valeur}</p>
      {detail && <div className="mt-1 text-xs text-muted">{detail}</div>}
    </Card>
  );
}

export function Avatar({ nom, sexe, taille = 36 }: { nom: string; sexe?: "F" | "M"; taille?: number }) {
  const ini = nom.split(" ").filter(Boolean).slice(0, 2).map((x) => x[0]).join("").toUpperCase();
  return (
    <span className={cx("inline-grid shrink-0 place-items-center rounded-full font-bold", sexe === "F" ? "bg-brand-100 text-brand-700" : sexe === "M" ? "bg-gold-100 text-gold-700" : "bg-sand-200 text-muted")} style={{ width: taille, height: taille, fontSize: taille * 0.36 }}>
      {ini}
    </span>
  );
}

/* ---------- Notifications ---------- */
interface ToastEtat {
  items: { id: number; texte: string; ton: "ok" | "erreur" }[];
  ajouter: (texte: string, ton?: "ok" | "erreur") => void;
}
export const useToast = create<ToastEtat>((set) => ({
  items: [],
  ajouter: (texte, ton = "ok") => {
    const id = Date.now() + Math.random();
    set((s) => ({ items: [...s.items, { id, texte, ton }] }));
    setTimeout(() => set((s) => ({ items: s.items.filter((i) => i.id !== id) })), 5200);
  },
}));
export const toast = (texte: string, ton: "ok" | "erreur" = "ok") => useToast.getState().ajouter(texte, ton);

export function Toasts() {
  const items = useToast((s) => s.items);
  return (
    <div className="no-print pointer-events-none fixed inset-x-0 bottom-4 z-[70] flex flex-col items-center gap-2 px-4" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={cx("animate-in pointer-events-auto max-w-md rounded-2xl px-4 py-3 text-sm font-medium text-white shadow-pop", t.ton === "ok" ? "bg-ink" : "bg-rose-700")}>
          {t.texte}
        </div>
      ))}
    </div>
  );
}
