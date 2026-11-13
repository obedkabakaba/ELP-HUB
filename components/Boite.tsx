"use client";
// Boîte mail de démonstration : montre les e-mails tels que l'élève, le parent
// ou le chef d'agence les reçoit. Aucun vrai message n'est envoyé.
import { ArrowLeft, ExternalLink, Mail, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { fmtQuand } from "@/lib/modeles";
import { useStore } from "@/lib/store";
import type { Message } from "@/lib/types";
import { cx } from "./ui";

export function Boite() {
  const ouvert = useStore((s) => s.boiteOuverte);
  const set = useStore((s) => s.set);
  const messages = useStore((s) => s.db.messages);
  const [fil, setFil] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const fils = useMemo(() => {
    const m = new Map<string, Message[]>();
    for (const x of messages) {
      const k = x.contact || `sans-adresse-${x.candidat_id}`;
      const l = m.get(k);
      if (l) l.push(x);
      else m.set(k, [x]);
    }
    return [...m.entries()].map(([contact, l]) => ({ contact, l, dernier: l[l.length - 1] })).sort((a, b) => b.dernier.created_at.localeCompare(a.dernier.created_at));
  }, [messages]);

  if (!ouvert) return null;
  const courant = fils.find((f) => f.contact === fil);
  const visibles = fils.filter((f) => !q || f.dernier.nom_destinataire.toLowerCase().includes(q.toLowerCase()) || f.contact.includes(q.toLowerCase())).slice(0, 60);
  const qui = (m: Message) => (m.destinataire === "parent" ? "parent" : m.destinataire === "agence" ? "chef d'agence" : "élève");

  return (
    <div className="no-print fixed inset-0 z-[60] flex justify-end bg-black/50 backdrop-blur-[2px]" onMouseDown={(e) => e.target === e.currentTarget && set({ boiteOuverte: false })}>
      <div className="animate-in flex h-full w-full max-w-[460px] flex-col bg-sand-50 shadow-pop">
        <div className="flex items-start justify-between gap-3 border-b border-sand-200 px-5 py-4">
          <div>
            <p className="flex items-center gap-2 font-bold"><Mail className="size-4 text-brand-600" /> Boîte mail de démonstration</p>
            <p className="mt-0.5 text-xs text-muted">Ce que reçoivent élèves, parents et chefs d&apos;agence. Aucun vrai e-mail n&apos;est envoyé.</p>
          </div>
          <button aria-label="Fermer" onClick={() => set({ boiteOuverte: false })} className="rounded-lg p-1.5 text-muted hover:bg-sand-200"><X className="size-5" /></button>
        </div>
        {!courant ? (
          <>
            <div className="border-b border-sand-200 p-3">
              <div className="relative">
                <Search className="absolute top-2.5 left-3 size-4 text-muted" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher un destinataire" className="w-full rounded-full bg-sand-100 py-2 pr-3 pl-9 text-sm outline-none" />
              </div>
            </div>
            <ul className="scroll-fin flex-1 overflow-y-auto">
              {visibles.map((f) => (
                <li key={f.contact}>
                  <button onClick={() => setFil(f.contact)} className="flex w-full items-start gap-3 border-b border-sand-200 px-5 py-3 text-left hover:bg-sand-100">
                    <span className={cx("mt-0.5 grid size-9 shrink-0 place-items-center rounded-full text-xs font-bold", f.dernier.destinataire === "parent" ? "bg-gold-100 text-gold-700" : f.dernier.destinataire === "agence" ? "bg-blue-50 text-blue-700" : "bg-brand-100 text-brand-700")}>
                      {f.dernier.destinataire === "parent" ? "P" : f.dernier.destinataire === "agence" ? "A" : "É"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex justify-between gap-2 text-sm font-semibold">
                        <span className="truncate">{f.dernier.nom_destinataire || f.contact}</span>
                        <span className="shrink-0 text-[11px] font-normal text-muted">{fmtQuand(f.dernier.created_at).split(" · ")[0]}</span>
                      </span>
                      <span className="block truncate text-[13px] font-medium">{f.dernier.objet}</span>
                      <span className="block truncate text-xs text-muted">{f.dernier.contenu}</span>
                    </span>
                    {f.l.length > 1 && <span className="tabular mt-1 rounded-full bg-sand-200 px-1.5 text-[11px] font-bold">{f.l.length}</span>}
                  </button>
                </li>
              ))}
              {!visibles.length && <li className="p-8 text-center text-sm text-muted">Aucun message.</li>}
            </ul>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 border-b border-sand-200 px-3 py-2.5">
              <button aria-label="Retour" onClick={() => setFil(null)} className="rounded-lg p-1.5 hover:bg-sand-200"><ArrowLeft className="size-4" /></button>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{courant.dernier.nom_destinataire}</p>
                <p className="truncate text-[11px] text-muted">{courant.contact.startsWith("sans-adresse") ? "aucune adresse e-mail" : courant.contact} · {qui(courant.dernier)}</p>
              </div>
            </div>
            <div className="scroll-fin flex flex-1 flex-col gap-3 overflow-y-auto p-4">
              {courant.l.slice().reverse().map((m) => (
                <article key={m.id} className={cx("rounded-2xl border p-4", m.statut === "echec" ? "border-dashed border-rose-300 bg-rose-50" : "border-sand-200 bg-surface shadow-card")}>
                  <p className="text-[11px] text-muted">De : EquityBCDC · programme ELP · {fmtQuand(m.created_at)}{m.statut === "echec" ? " · non remis" : m.statut === "lu" ? " · ouvert" : ""}</p>
                  <h3 className="mt-1 text-sm font-bold">{m.objet}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed">{m.contenu}</p>
                  {m.lien && m.statut !== "echec" && (
                    <a href={m.lien} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2 text-xs font-bold text-white">Ouvrir le lien <ExternalLink className="size-3.5" /></a>
                  )}
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
