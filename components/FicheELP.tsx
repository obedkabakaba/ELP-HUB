"use client";
// Fiche d'un ELP : s'ouvre au clic sur un nom, n'importe où dans l'application.
import { ExternalLink, Mail, MapPin, MessageSquare, Phone, RotateCcw, School, UserMinus, UserX, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { agencesProches, completude, estRetenu, moyenneEvaluation, nomComplet } from "@/lib/logic";
import { fmtDate, fmtHeure, fmtQuand } from "@/lib/modeles";
import { journaliser, majCandidat, rattacher, reintegrer, sortir } from "@/lib/ops";
import { useStore } from "@/lib/store";
import { estSorti, type Candidat } from "@/lib/types";
import { EnvoiModale } from "./commun";
import { Avatar, Barre, Btn, Modale, Pastille, StatutBadge, champ, cx, toast } from "./ui";

/** Nom cliquable : ouvre la fiche de l'élève. */
export function NomELP({ c, className, children }: { c: Candidat; className?: string; children?: React.ReactNode }) {
  const set = useStore((s) => s.set);
  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); set({ ficheId: c.id }); }} className={cx("text-left font-semibold hover:text-brand-700 hover:underline", className)}>
      {children ?? nomComplet(c)}
    </button>
  );
}

const MOTIFS = ["Absences répétées et non justifiées", "Non-respect du règlement", "Fausse déclaration dans le dossier", "Décision de la Fondation"];

export function SortieModale({ c, type, onClose }: { c: Candidat | null; type: "exclu" | "desiste"; onClose: () => void }) {
  const [motif, setMotif] = useState("");
  if (!c) return null;
  const retrait = type === "exclu";
  return (
    <Modale ouvert onClose={onClose} titre={retrait ? `Retirer ${c.prenom} du programme` : `Désistement de ${c.prenom}`}>
      <p className="text-sm text-muted">{retrait ? "Le dossier n'est pas effacé : il sort des listes actives, garde son historique et reste consultable. La décision, son motif et son auteur sont inscrits au journal. Une réintégration reste possible." : "L'élève renonce de lui-même. Son dossier sort des listes actives mais sa trace est conservée."}</p>
      <label className="mt-4 block text-[13px] font-semibold">Motif (obligatoire)
        <textarea autoFocus className={cx(champ, "mt-1.5 min-h-24")} value={motif} onChange={(e) => setMotif(e.target.value)} placeholder={retrait ? "Expliquez la décision en une ou deux phrases" : "Ce que l'élève ou sa famille a expliqué"} />
      </label>
      {retrait && <div className="mt-2 flex flex-wrap gap-1.5">{MOTIFS.map((m) => <button key={m} onClick={() => setMotif(m)} className="rounded-full bg-sand-100 px-2.5 py-1 text-xs font-semibold hover:bg-sand-200">{m}</button>)}</div>}
      <div className="mt-5 flex justify-end gap-2">
        <Btn variante="secondaire" onClick={onClose}>Annuler</Btn>
        <Btn variante="danger" disabled={motif.trim().length < 5} onClick={() => { sortir(c, type, motif.trim()); toast(estRetenu(c.statut) ? "Enregistré. Le tableau de bord propose un remplaçant de la liste d'attente." : "Enregistré. Le dossier reste consultable dans les sortis."); onClose(); }}>{retrait ? "Retirer du programme" : "Enregistrer le désistement"}</Btn>
      </div>
    </Modale>
  );
}

function Ligne({ icone: I, children }: { icone: typeof Mail; children: React.ReactNode }) {
  return <p className="flex items-start gap-2.5 text-[13px]"><I className="mt-0.5 size-4 shrink-0 text-muted" /><span className="min-w-0 break-words">{children}</span></p>;
}

export function FicheELP() {
  const id = useStore((s) => s.ficheId);
  const set = useStore((s) => s.set);
  const db = useStore((s) => s.db);
  const [envoi, setEnvoi] = useState(false);
  const [sortie, setSortie] = useState<"exclu" | "desiste" | null>(null);
  const [edition, setEdition] = useState(false);
  const c = db.candidats.find((x) => x.id === id);

  useEffect(() => {
    // Chaque consultation d'une fiche est tracée (journal des accès).
    if (c) journaliser("Consultation de la fiche", nomComplet(c));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  useEffect(() => {
    if (!id) return;
    const f = (e: KeyboardEvent) => e.key === "Escape" && set({ ficheId: null });
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [id, set]);

  const x = useMemo(() => {
    if (!c) return null;
    const conv = db.convocations.find((k) => k.candidat_id === c.id);
    const session = conv && db.sessions_test.find((s) => s.id === conv.session_id);
    const aff = db.affectations.find((a) => a.candidat_id === c.id);
    return {
      k: completude(c, db.documents),
      cohorte: db.cohortes.find((k) => k.id === c.cohorte_id),
      conv, session, centre: session && db.centres.find((k) => k.id === session.centre_id),
      note: db.notes.find((n) => n.candidat_id === c.id),
      aff, agence: aff && db.agences.find((a) => a.id === aff.agence_id),
      jours: db.presences.filter((p) => p.candidat_id === c.id && p.contexte === "stage" && p.valide).length,
      auto: db.documents.find((d) => d.candidat_id === c.id && d.type === "autorisation"),
      proche: agencesProches(c, db.agences)[0],
      dernier: db.messages.filter((m) => m.candidat_id === c.id).slice(-1)[0],
    };
  }, [c, db]);

  if (!c || !x) return null;
  const fermer = () => { set({ ficheId: null }); setEdition(false); };
  const sorti = estSorti(c.statut);

  return (
    <div className="no-print fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-[2px]" onMouseDown={(e) => e.target === e.currentTarget && fermer()}>
      <aside role="dialog" aria-modal aria-label={`Fiche de ${nomComplet(c)}`} className="animate-in flex h-full w-full max-w-[440px] flex-col bg-sand-50 shadow-pop">
        <div className="motif relative bg-brand-950 px-5 pt-5 pb-5 text-white">
          <button aria-label="Fermer" onClick={fermer} className="absolute top-3 right-3 rounded-lg p-1.5 text-white/70 hover:bg-white/10"><X className="size-5" /></button>
          <div className="flex items-center gap-3.5">
            <Avatar nom={`${c.prenom} ${c.nom}`} sexe={c.sexe} taille={56} />
            <div className="min-w-0">
              <h2 className="truncate text-xl font-extrabold">{nomComplet(c)}</h2>
              <p className="tabular text-xs text-white/60">{c.code} · {x.cohorte?.nom} · {c.sexe === "F" ? "Fille" : "Garçon"}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatutBadge statut={c.statut} className="!bg-white" />
            {c.rang_attente && <Pastille ton="ambre">rang {c.rang_attente}</Pastille>}
            {c.contact_invalide && <Pastille ton="rouge">e-mails en échec</Pastille>}
          </div>
        </div>

        <div className="scroll-fin flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {sorti && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-[13px]">
              <p className="font-bold text-rose-700">{c.statut === "exclu" ? "Retiré du programme" : c.statut === "desiste" ? "Désistement" : "Non retenu après le test"}{c.sorti_le ? ` · ${fmtQuand(c.sorti_le)}` : ""}</p>
              {c.motif_sortie && <p className="mt-1">{c.motif_sortie}</p>}
              <p className="mt-1 text-xs text-muted">Ce dossier ne compte plus dans les listes actives ; sa trace est conservée.</p>
            </div>
          )}

          <section className="space-y-2">
            {!edition ? (
              <>
                <Ligne icone={Mail}>{c.email || <span className="text-rose-700">Pas d&apos;adresse e-mail</span>}</Ligne>
                <Ligne icone={Phone}><span className="tabular">{c.telephone || "—"}</span></Ligne>
                <Ligne icone={MapPin}>{[c.adresse, c.commune, c.province].filter(Boolean).join(", ")}{c.lat == null && estRetenu(c.statut) ? " · position du domicile manquante" : ""}</Ligne>
                <Ligne icone={School}>{c.ecole} · {c.section} · <b>{c.pourcentage_exetat} %</b> à l&apos;Exetat{c.universite ? ` · aujourd'hui : ${c.universite}` : ""}</Ligne>
                <button className="text-xs font-bold text-brand-600" onClick={() => setEdition(true)}>Corriger l&apos;e-mail ou le téléphone</button>
              </>
            ) : (
              <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); majCandidat(c, { email: String(f.get("email")).trim() || null, telephone: String(f.get("tel")).trim(), contact_invalide: false, relances: 0 }); journaliser("Coordonnées corrigées", nomComplet(c)); setEdition(false); toast("Coordonnées corrigées : les prochains e-mails partiront à cette adresse."); }}>
                <input name="email" type="email" defaultValue={c.email ?? ""} placeholder="Adresse e-mail" className={champ} aria-label="Adresse e-mail" />
                <input name="tel" defaultValue={c.telephone} placeholder="Téléphone" className={champ} aria-label="Téléphone" />
                <div className="flex gap-2"><Btn petit>Enregistrer</Btn><Btn petit type="button" variante="discret" onClick={() => setEdition(false)}>Annuler</Btn></div>
              </form>
            )}
          </section>

          <section>
            <div className="flex items-baseline justify-between"><h3 className="text-sm font-bold">{x.k.phase === 1 ? "Inscription" : "Dossier complet"}</h3><span className="tabular text-sm font-extrabold">{x.k.pct} %</span></div>
            <Barre pct={x.k.pct} className="mt-1.5" />
            {x.k.manquants.length > 0 && <p className="mt-1.5 text-xs text-muted">Manque : {x.k.manquants.join(", ")}.</p>}
          </section>

          <section className="grid grid-cols-2 gap-2 text-[13px]">
            <div className="rounded-xl bg-sand-100 p-3"><p className="text-[11px] font-semibold text-muted">Parent ou tuteur</p><p className="font-semibold">{c.parent_nom || "—"}</p><p className="truncate text-xs text-muted">{c.parent_lien}{c.parent_telephone ? ` · ${c.parent_telephone}` : ""}</p></div>
            <div className="rounded-xl bg-sand-100 p-3"><p className="text-[11px] font-semibold text-muted">Test</p>{x.note ? <p className="tabular text-lg font-extrabold">{x.note.total}<span className="text-xs font-semibold text-muted"> / 100</span></p> : x.session ? <p className="font-semibold">{fmtDate(x.session.date_heure).split(" ").slice(1).join(" ")}, {fmtHeure(x.session.date_heure)}</p> : <p className="font-semibold">—</p>}<p className="truncate text-xs text-muted">{x.centre?.nom ?? "Pas encore convoqué"}</p></div>
            {x.auto && <div className="rounded-xl bg-sand-100 p-3"><p className="text-[11px] font-semibold text-muted">Autorisation parentale</p><p className="font-semibold">{x.auto.statut === "valide" ? "Validée" : x.auto.statut === "recu" ? "Reçue, à vérifier" : x.auto.statut === "rejete" ? "Refusée, à refaire" : "Pas encore reçue"}</p></div>}
            {(x.agence || (estRetenu(c.statut) && x.proche)) && <div className="rounded-xl bg-sand-100 p-3"><p className="text-[11px] font-semibold text-muted">{x.agence ? "Agence de stage" : "Agence la plus proche"}</p><p className="truncate font-semibold">{(x.agence ?? x.proche.agence).nom}</p><p className="text-xs text-muted">{x.aff ? `${x.aff.distance_km} km · ${x.jours} jours pointés${x.aff.evaluation ? ` · ${moyenneEvaluation(x.aff.evaluation)}/5` : ""}` : `${x.proche.km} km`}</p></div>}
          </section>

          {estRetenu(c.statut) && (
            <label className="block text-[13px] font-semibold">Chapitre
              <select className={cx(champ, "mt-1.5")} value={c.chapitre_id ?? ""} onChange={(e) => rattacher([c], e.target.value || null)}>
                <option value="">Aucun chapitre</option>
                {db.chapitres.map((k) => <option key={k.id} value={k.id}>{k.nom}</option>)}
              </select>
            </label>
          )}

          {x.dernier && <p className="rounded-xl border border-sand-200 p-3 text-xs text-muted"><b className="text-ink">Dernier message · {fmtQuand(x.dernier.created_at)}</b><br />{x.dernier.objet}</p>}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-sand-200 bg-surface p-4">
          <Link href={`/candidats/${c.id}`} onClick={fermer} className="flex-1"><Btn className="w-full"><ExternalLink className="size-4" /> Dossier complet</Btn></Link>
          <Btn variante="secondaire" onClick={() => setEnvoi(true)} title="Écrire à l'élève"><MessageSquare className="size-4" /></Btn>
          {sorti ? (
            c.statut !== "non_retenu" && <Btn variante="secondaire" onClick={() => { reintegrer(c); toast(`${c.prenom} est réintégré(e) dans le programme.`); }}><RotateCcw className="size-4" /> Réintégrer</Btn>
          ) : (
            <>
              <Btn variante="secondaire" title="Désistement de l'élève" onClick={() => setSortie("desiste")}><UserX className="size-4" /></Btn>
              <Btn variante="danger" title="Retirer du programme" onClick={() => setSortie("exclu")}><UserMinus className="size-4" /></Btn>
            </>
          )}
        </div>
      </aside>
      <EnvoiModale cibles={envoi ? [c] : null} onClose={() => setEnvoi(false)} />
      <SortieModale c={sortie ? c : null} type={sortie ?? "exclu"} onClose={() => setSortie(null)} />
    </div>
  );
}
