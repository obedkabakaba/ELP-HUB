"use client";
// Téléphone de démonstration : montre les SMS et WhatsApp tels que l'élève,
// le parent ou le chef d'agence les reçoit. Aucun vrai message n'est envoyé.
import { ArrowLeft, Check, CheckCheck, ExternalLink, Search, Signal, X } from "lucide-react";
import { useMemo, useState } from "react";
import { fmtQuand } from "@/lib/modeles";
import { repondreSms } from "@/lib/ops";
import { useStore } from "@/lib/store";
import type { Message } from "@/lib/types";
import { cx } from "./ui";

export function Telephone() {
  const ouvert = useStore((s) => s.telephoneOuvert);
  const set = useStore((s) => s.set);
  const messages = useStore((s) => s.db.messages);
  const candidats = useStore((s) => s.db.candidats);
  const [fil, setFil] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const fils = useMemo(() => {
    const m = new Map<string, Message[]>();
    for (const x of messages) {
      const l = m.get(x.telephone);
      if (l) l.push(x);
      else m.set(x.telephone, [x]);
    }
    return [...m.entries()].map(([tel, l]) => ({ tel, l, dernier: l[l.length - 1] })).sort((a, b) => b.dernier.created_at.localeCompare(a.dernier.created_at));
  }, [messages]);

  if (!ouvert) return null;
  const courant = fils.find((f) => f.tel === fil);
  const visibles = fils.filter((f) => !q || f.dernier.nom_destinataire.toLowerCase().includes(q.toLowerCase()) || f.tel.includes(q)).slice(0, 60);
  const candidat = courant && candidats.find((c) => c.id === courant.dernier.candidat_id && courant.dernier.destinataire === "candidat");
  const peutRepondre = candidat && courant.l.some((m) => m.modele === "convocation" || m.modele === "relance_confirmation");

  return (
    <div className="no-print fixed inset-0 z-[60] flex justify-end bg-brand-950/40 backdrop-blur-[2px]" onMouseDown={(e) => e.target === e.currentTarget && set({ telephoneOuvert: false })}>
      <div className="animate-in flex h-full w-full max-w-[420px] flex-col bg-sand-50 p-4 shadow-pop sm:p-6">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="font-bold">Téléphone de démonstration</p>
            <p className="text-xs text-muted">Ce que reçoivent élèves, parents et chefs d&apos;agence. Aucun vrai SMS n&apos;est envoyé.</p>
          </div>
          <button aria-label="Fermer" onClick={() => set({ telephoneOuvert: false })} className="rounded-lg p-1.5 text-muted hover:bg-sand-200">
            <X className="size-5" />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[2.2rem] border-[10px] border-ink bg-white shadow-pop">
          <div className="flex items-center justify-between bg-ink px-5 pb-2 text-[11px] font-semibold text-white/80">
            <span>{new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
            <span className="flex items-center gap-1">
              <Signal className="size-3" /> 2G
            </span>
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
                  <li key={f.tel}>
                    <button onClick={() => setFil(f.tel)} className="flex w-full items-center gap-3 border-b border-sand-100 px-4 py-3 text-left hover:bg-sand-50">
                      <span className={cx("grid size-9 shrink-0 place-items-center rounded-full text-xs font-bold", f.dernier.destinataire === "parent" ? "bg-gold-100 text-gold-700" : f.dernier.destinataire === "agence" ? "bg-blue-50 text-blue-700" : "bg-brand-100 text-brand-700")}>
                        {f.dernier.destinataire === "parent" ? "P" : f.dernier.destinataire === "agence" ? "A" : "É"}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex justify-between gap-2 text-sm font-semibold">
                          <span className="truncate">{f.dernier.nom_destinataire || f.tel}</span>
                          <span className="shrink-0 text-[11px] font-normal text-muted">{fmtQuand(f.dernier.created_at).split(" · ")[0]}</span>
                        </span>
                        <span className="block truncate text-xs text-muted">{f.dernier.contenu}</span>
                      </span>
                    </button>
                  </li>
                ))}
                {!visibles.length && <li className="p-8 text-center text-sm text-muted">Aucun message.</li>}
              </ul>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 border-b border-sand-200 px-3 py-2.5">
                <button aria-label="Retour" onClick={() => setFil(null)} className="rounded-lg p-1.5 hover:bg-sand-100">
                  <ArrowLeft className="size-4" />
                </button>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{courant.dernier.nom_destinataire}</p>
                  <p className="text-[11px] text-muted">
                    {courant.tel} · {courant.dernier.destinataire === "parent" ? "parent" : courant.dernier.destinataire === "agence" ? "chef d'agence" : "élève"}
                  </p>
                </div>
              </div>
              <div className="scroll-fin flex flex-1 flex-col gap-2.5 overflow-y-auto bg-sand-50 p-3">
                {courant.l.map((m) =>
                  m.modele === "reponse" ? (
                    <div key={m.id} className="max-w-[70%] self-end rounded-2xl rounded-br-md bg-emerald-600 px-3.5 py-2 text-sm text-white">{m.contenu}</div>
                  ) : (
                    <div key={m.id} className="max-w-[88%] self-start">
                      <p className="mb-0.5 ml-1 text-[10px] font-bold tracking-wide text-muted uppercase">{m.canal === "whatsapp" ? "WhatsApp · Equity ELP" : "SMS · EquityELP"}</p>
                      <div className={cx("rounded-2xl rounded-bl-md px-3.5 py-2.5 text-[13px] leading-relaxed", m.statut === "echec" ? "border border-dashed border-rose-300 bg-rose-50 text-rose-800" : "bg-white shadow-sm ring-1 ring-sand-200")}>
                        {m.contenu}
                        {m.lien && m.statut !== "echec" && (
                          <a href={m.lien} target="_blank" rel="noreferrer" className="mt-2 flex items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-3 py-2 text-xs font-bold text-white">
                            Ouvrir le lien <ExternalLink className="size-3.5" />
                          </a>
                        )}
                      </div>
                      <p className="mt-0.5 ml-1 flex items-center gap-1 text-[10px] text-muted">
                        {fmtQuand(m.created_at)}
                        {m.statut === "echec" ? " · non remis" : m.statut === "lu" ? <CheckCheck className="size-3 text-blue-500" /> : m.statut === "livre" ? <CheckCheck className="size-3" /> : <Check className="size-3" />}
                      </p>
                    </div>
                  ),
                )}
              </div>
              {peutRepondre && (
                <div className="flex gap-2 border-t border-sand-200 p-3">
                  <button onClick={() => repondreSms(candidat, "1")} className="flex-1 rounded-full bg-emerald-600 py-2 text-xs font-bold text-white">
                    Répondre 1 · je viens
                  </button>
                  <button onClick={() => repondreSms(candidat, "2")} className="flex-1 rounded-full bg-sand-200 py-2 text-xs font-bold">
                    Répondre 2 · empêché
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
