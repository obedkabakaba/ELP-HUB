"use client";
import { ArrowLeft, Check, FileText, MapPin, MessageSquare, Phone, RotateCcw, UserMinus, UserX, X } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { EnvoiModale, QR } from "@/components/commun";
import { Avatar, Barre, Btn, Card, Pastille, StatutBadge, Vide, champ, champS, cx, toast } from "@/components/ui";
import { agencesProches, completude, moyenneEvaluation, nomComplet } from "@/lib/logic";
import { fmtDate, fmtHeure, fmtQuand } from "@/lib/modeles";
import { changerStatut, journaliser, majCandidat, reintegrer, verifierDocument } from "@/lib/ops";
import { useStore } from "@/lib/store";
import { SortieModale } from "@/components/FicheELP";
import { ETAPES, STATUTS, estSorti, statutInfo, type Statut, type TypeDocument } from "@/lib/types";

const PIECES: { type: TypeDocument; label: string }[] = [
  { type: "photo", label: "Photo d'identité" },
  { type: "bulletin", label: "Bulletin de l'Exetat" },
  { type: "identite", label: "Pièce d'identité" },
  { type: "autorisation", label: "Autorisation parentale" },
];

export default function Dossier() {
  const { id } = useParams<{ id: string }>();
  const db = useStore((s) => s.db);
  const c = db.candidats.find((x) => x.id === id);
  const [envoi, setEnvoi] = useState(false);
  const [tel, setTel] = useState<string | null>(null);
  const [sortie, setSortie] = useState<"exclu" | "desiste" | null>(null);
  const vu = useRef(false);

  useEffect(() => {
    // Chaque consultation d'un dossier est tracée (journal des accès).
    if (c && !vu.current) {
      vu.current = true;
      journaliser("Consultation du dossier", nomComplet(c));
    }
  }, [c]);

  const infos = useMemo(() => {
    if (!c) return null;
    const conv = db.convocations.find((k) => k.candidat_id === c.id);
    const session = conv && db.sessions_test.find((s) => s.id === conv.session_id);
    const aff = db.affectations.find((a) => a.candidat_id === c.id);
    return {
      k: completude(c, db.documents),
      docs: db.documents.filter((d) => d.candidat_id === c.id),
      conv,
      session,
      centre: session && db.centres.find((x) => x.id === session.centre_id),
      note: db.notes.find((n) => n.candidat_id === c.id),
      aff,
      agence: aff && db.agences.find((a) => a.id === aff.agence_id),
      joursStage: db.presences.filter((p) => p.candidat_id === c.id && p.contexte === "stage" && p.valide).length,
      messages: db.messages.filter((m) => m.candidat_id === c.id).slice(-8).reverse(),
      proches: agencesProches(c, db.agences).slice(0, 3),
    };
  }, [c, db]);

  if (!c || !infos) return <Vide titre="Dossier introuvable" detail="Ce dossier n'existe pas ou a été supprimé."><Link href="/candidats"><Btn variante="secondaire">Retour aux candidats</Btn></Link></Vide>;
  const etape = statutInfo(c.statut).etape;
  const auto = infos.docs.find((d) => d.type === "autorisation");

  return (
    <>
      <Link href="/candidats" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink"><ArrowLeft className="size-4" /> Candidats</Link>
      <Card className="mb-4 flex flex-wrap items-center gap-4 p-5 sm:p-6">
        <Avatar nom={`${c.prenom} ${c.nom}`} sexe={c.sexe} taille={64} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-extrabold">{nomComplet(c)}</h1>
            <StatutBadge statut={c.statut} />
            {c.rang_attente && <Pastille ton="ambre">rang {c.rang_attente}</Pastille>}
          </div>
          <p className="tabular mt-1 text-sm text-muted">{c.code} · {c.sexe === "F" ? "Fille" : "Garçon"} · {c.pourcentage_exetat} % à l&apos;Exetat · {c.commune}, {c.province}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select aria-label="Changer le statut" className={cx(champS, "py-2")} value={c.statut} onChange={(e) => { changerStatut(c, e.target.value as Statut); journaliser(`Statut changé à la main : ${statutInfo(e.target.value as Statut).label}`, nomComplet(c)); }}>
            {STATUTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <Btn variante="secondaire" onClick={() => setEnvoi(true)}><MessageSquare className="size-4" /> Message</Btn>
          {estSorti(c.statut) ? (
            c.statut !== "non_retenu" && <Btn variante="secondaire" onClick={() => { reintegrer(c); toast(`${c.prenom} est réintégré(e).`); }}><RotateCcw className="size-4" /> Réintégrer</Btn>
          ) : (
            <>
              <Btn variante="secondaire" onClick={() => setSortie("desiste")}><UserX className="size-4" /> Désistement</Btn>
              <Btn variante="danger" onClick={() => setSortie("exclu")}><UserMinus className="size-4" /> Retirer du programme</Btn>
            </>
          )}
        </div>
      </Card>

      {estSorti(c.statut) && (
        <Card className="mb-4 border-rose-200 bg-rose-50 p-4 text-sm">
          <b className="text-rose-700">{c.statut === "exclu" ? "Retiré du programme" : c.statut === "desiste" ? "Désistement" : "Non retenu après le test"}{c.sorti_le ? ` le ${fmtQuand(c.sorti_le)}` : ""}.</b> {c.motif_sortie} <span className="text-muted">Le dossier ne compte plus dans les listes actives, mais tout son historique est conservé.</span>
        </Card>
      )}
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <Card className="p-5 sm:p-6">
            <h2 className="mb-4 font-bold">Parcours</h2>
            <ol className="grid grid-cols-7 gap-1">
              {ETAPES.slice(0, 7).map((e) => {
                const fait = etape > e.n || c.statut === "termine";
                const ici = etape === e.n && c.statut !== "termine";
                return (
                  <li key={e.n} className="text-center">
                    <div className="flex items-center">
                      <span className={cx("h-0.5 flex-1", e.n === 1 ? "opacity-0" : fait || ici ? "bg-brand-500" : "bg-sand-200")} />
                      <span className={cx("grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold", fait ? "bg-brand-600 text-white" : ici ? "animate-pulse-ring bg-surface text-brand-700 ring-2 ring-brand-600" : "bg-sand-200 text-muted")}>{fait ? <Check className="size-4" /> : e.n}</span>
                      <span className={cx("h-0.5 flex-1", e.n === 7 ? "opacity-0" : fait ? "bg-brand-500" : "bg-sand-200")} />
                    </div>
                    <p className={cx("mt-2 text-[10px] leading-tight font-semibold sm:text-xs", !fait && !ici && "text-muted")}>{e.titre}</p>
                  </li>
                );
              })}
            </ol>
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className="mb-4 font-bold">Informations</h2>
            <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold text-muted">Téléphone</dt>
                <dd className="mt-0.5 flex items-center gap-2">
                  {tel == null ? (
                    <>
                      <span className={cx("tabular font-semibold", c.contact_invalide && "text-rose-700 ")}>{c.telephone || "—"}</span>
                      
                      <button className="text-xs font-bold text-brand-600" onClick={() => setTel(c.telephone)}>Corriger</button>
                    </>
                  ) : (
                    <>
                      <input autoFocus className={cx(champ, "py-1.5")} value={tel} onChange={(e) => setTel(e.target.value)} aria-label="Nouveau numéro" />
                      <Btn petit onClick={() => { majCandidat(c, { telephone: tel, contact_invalide: false, relances: 0 }); journaliser("Numéro de téléphone corrigé", nomComplet(c)); setTel(null); toast("Numéro corrigé : les prochains messages partiront vers ce numéro."); }}>OK</Btn>
                    </>
                  )}
                </dd>
              </div>
              <div><dt className="text-xs font-semibold text-muted">E-mail</dt><dd className={cx("mt-0.5 font-semibold break-all", c.contact_invalide && "text-rose-700")}>{c.email ?? "—"}{c.contact_invalide ? " (e-mails en échec)" : ""}</dd></div>
              {[
                ["Date de naissance", c.date_naissance ? new Date(c.date_naissance).toLocaleDateString("fr-FR") : "—"],
                ["École", c.ecole],
                ["Section", c.section],
                ["Adresse", [c.adresse, c.commune, c.province].filter(Boolean).join(", ")],
                ["Université et chapitre", [c.universite, db.chapitres.find((k) => k.id === c.chapitre_id)?.nom].filter(Boolean).join(" · ") || "—"],
                ["Position GPS", c.lat != null ? `${c.lat}, ${c.lng}` : "Non renseignée"],
                ["Parent ou tuteur", c.parent_nom ? [`${c.parent_nom} (${c.parent_lien})`, c.parent_telephone, c.parent_email].filter(Boolean).join(" · ") : "—"],
                ["Contact d'urgence", c.urgence_nom ? `${c.urgence_nom} · ${c.urgence_telephone}` : "—"],
                ["Santé", c.allergies || "Rien à signaler"],
                                ["Compte en agence", c.compte_ouvert ? "Ouvert" : "Pas encore ouvert"],
              ].map(([l, v]) => (
                <div key={l}><dt className="text-xs font-semibold text-muted">{l}</dt><dd className="mt-0.5 font-semibold">{v}</dd></div>
              ))}
            </dl>
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className="mb-4 font-bold">Pièces du dossier</h2>
            <ul className="divide-y divide-sand-100">
              {PIECES.map((p) => {
                const d = infos.docs.find((x) => x.type === p.type);
                if (p.type === "autorisation" && !d) return null;
                return (
                  <li key={p.type} className="flex flex-wrap items-center gap-3 py-3">
                    {d?.apercu ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={d.apercu} alt="" className="size-11 rounded-lg object-cover" />
                    ) : (
                      <span className={cx("grid size-11 place-items-center rounded-lg", d ? "bg-brand-50 text-brand-600" : "bg-sand-100 text-muted")}><FileText className="size-5" /></span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold">{p.label}</p>
                      <p className="text-xs text-muted">{d ? `${d.nom_fichier} · ${fmtQuand(d.valide_le ?? d.created_at)}` : "Manquant"}{d?.motif_rejet ? ` · ${d.motif_rejet}` : ""}</p>
                    </div>
                    {!d ? <Pastille ton="rouge">Manquant</Pastille> : d.statut === "valide" ? <Pastille ton="vert">Validé</Pastille> : d.statut === "rejete" ? <Pastille ton="rouge">Refusé</Pastille> : d.statut === "en_attente" ? <Link href={`/doc/autorisation/${c.id}`}><Pastille ton="ambre">Pas encore reçue · imprimer</Pastille></Link> : (
                      <span className="flex gap-1.5">
                        <Btn petit variante="secondaire" onClick={() => verifierDocument(d, true)}><Check className="size-3.5" /> Valider</Btn>
                        <Btn petit variante="danger" onClick={() => { const m = prompt("Motif du rejet (envoyé à l'élève) :", "Document illisible"); if (m) verifierDocument(d, false, m); }}><X className="size-3.5" /></Btn>
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>

          {(infos.conv || infos.aff) && (
            <div className="grid gap-4 sm:grid-cols-2">
              {infos.conv && infos.session && (
                <Card className="p-5">
                  <h2 className="mb-2 font-bold">Test</h2>
                  <p className="text-sm inline-block font-semibold first-letter:uppercase">{fmtDate(infos.session.date_heure)} à {fmtHeure(infos.session.date_heure)}</p>
                  <p className="text-sm text-muted">{infos.centre?.nom}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Pastille ton={infos.conv.confirme ? "vert" : infos.conv.confirme === false ? "rouge" : "gris"}>{infos.conv.confirme ? "Présence confirmée" : infos.conv.confirme === false ? "Empêchement signalé" : "Pas de réponse"}</Pastille>
                    {infos.conv.present != null && <Pastille ton={infos.conv.present ? "vert" : "rouge"}>{infos.conv.present ? "Émargé" : "Absent"}</Pastille>}
                  </div>
                  {infos.note && <p className="tabular mt-4 text-3xl font-extrabold">{infos.note.total}<span className="text-base text-muted"> / 100</span><span className="ml-3 text-xs font-semibold text-muted">écrit {infos.note.ecrit}/60 · entretien {infos.note.entretien}/40</span></p>}
                </Card>
              )}
              {infos.aff && infos.agence && (
                <Card className="p-5">
                  <h2 className="mb-2 font-bold">Stage</h2>
                  <p className="text-sm font-semibold">Agence {infos.agence.nom}</p>
                  <p className="text-sm text-muted">{infos.aff.distance_km} km du domicile · {infos.agence.chef_nom}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Pastille ton={infos.aff.statut === "validee" ? "vert" : "ambre"}>{infos.aff.statut === "validee" ? "Affectation validée" : "Proposition"}</Pastille>
                    <Pastille>{infos.joursStage} jours pointés</Pastille>
                    {infos.aff.evaluation && <Pastille ton="marque">Évaluation {moyenneEvaluation(infos.aff.evaluation)} / 5</Pastille>}
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between"><h2 className="font-bold">Complétude</h2><span className="tabular text-2xl font-extrabold">{infos.k.pct} %</span></div>
            <Barre pct={infos.k.pct} className="mt-3 h-2" />
            {infos.k.manquants.length > 0 ? (
              <ul className="mt-4 space-y-1.5 text-[13px]">
                {infos.k.manquants.map((m) => <li key={m} className="flex items-center gap-2 text-muted"><span className="size-1.5 rounded-full bg-rose-500" />Manque : {m}</li>)}
              </ul>
            ) : <p className="mt-3 text-[13px] font-semibold text-emerald-700">Dossier complet</p>}
          </Card>

          <Card className="flex items-center gap-4 p-5">
            <QR valeur={`ELP:${c.code}`} taille={92} className="rounded-lg" />
            <div className="text-[13px]">
              <p className="font-bold">QR code personnel</p>
              <p className="text-muted">Sert à l&apos;émargement au test et aux présences à l&apos;induction.</p>
              {infos.conv && <Link className="mt-1 inline-block font-bold text-brand-600" href={`/doc/convocation/${c.id}`}>Convocation PDF</Link>}
            </div>
          </Card>

          {auto && (
            <Card className="p-5">
              <h2 className="font-bold">Autorisation parentale</h2>
              <p className="mt-1 text-[13px] text-muted">{auto.statut === "valide" ? `Papier signé validé le ${fmtQuand(auto.valide_le ?? auto.created_at)}.` : auto.statut === "recu" ? `Photo déposée par ${auto.depose_par || "?"}, à vérifier.` : auto.statut === "rejete" ? `Refusée : ${auto.motif_rejet}. Une nouvelle photo est attendue.` : `À imprimer, signer à la main par ${c.parent_nom || "le parent"}, puis photographier.`}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={`/doc/autorisation/${c.id}`}><Btn petit variante="secondaire">Imprimer</Btn></Link>
                {auto.statut === "recu" ? <Link href="/autorisations"><Btn petit>Vérifier</Btn></Link> : auto.statut !== "valide" && <Link href={`/p/${c.parent_token}`} target="_blank"><Btn petit variante="discret">Page du parent</Btn></Link>}
              </div>
            </Card>
          )}

          <Card className="p-5">
            <h2 className="mb-2 font-bold">Note interne</h2>
            <textarea key={c.id} defaultValue={c.note_interne} onBlur={(e) => e.target.value !== c.note_interne && majCandidat(c, { note_interne: e.target.value })} placeholder="Visible uniquement par les encadreurs" className={cx(champ, "min-h-20")} aria-label="Note interne" />
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 flex items-center gap-2 font-bold"><MapPin className="size-4 text-brand-600" /> Agences les plus proches</h2>
            <ul className="space-y-2 text-[13px]">
              {infos.proches.map(({ agence, km }) => <li key={agence.id} className="flex justify-between gap-3"><span className="truncate font-semibold">{agence.nom}</span><span className="tabular shrink-0 text-muted">{km} km</span></li>)}
            </ul>
            {c.lat == null && <p className="mt-2 text-xs text-muted">Estimation depuis le centre de la commune : le GPS du domicile manque.</p>}
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 flex items-center gap-2 font-bold"><Phone className="size-4 text-brand-600" /> Derniers messages</h2>
            {!infos.messages.length && <p className="text-[13px] text-muted">Aucun message.</p>}
            <ul className="space-y-3">
              {infos.messages.map((m) => (
                <li key={m.id} className="text-[13px]">
                  <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
                    <span className="font-bold text-ink">{m.modele === "reponse" ? "Réponse reçue" : m.destinataire === "parent" ? "Au parent" : "À l'élève"}</span> · {m.canal.toUpperCase()} · {fmtQuand(m.created_at)}
                    <Pastille ton={m.statut === "echec" ? "rouge" : m.statut === "lu" ? "bleu" : "gris"}>{m.statut === "echec" ? "échec" : m.statut === "lu" ? "lu" : m.statut === "livre" ? "remis" : "envoyé"}</Pastille>
                  </p>
                  <p className="mt-0.5 line-clamp-2 leading-snug">{m.contenu}</p>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
      <EnvoiModale cibles={envoi ? [c] : null} onClose={() => setEnvoi(false)} />
      <SortieModale c={sortie ? c : null} type={sortie ?? "exclu"} onClose={() => setSortie(null)} />
    </>
  );
}
