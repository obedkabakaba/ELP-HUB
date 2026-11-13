"use client";
import { Check, ExternalLink, Eye, Printer, Send, Upload, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { NomELP } from "@/components/FicheELP";
import { Barre, Btn, Card, Chiffre, Entete, Modale, Pastille, Vide, champ, cx, toast } from "@/components/ui";
import { joursDepuis, nomComplet } from "@/lib/logic";
import { fmtQuand } from "@/lib/modeles";
import { deposerDocument, envoyer, miniature, verifierDocument } from "@/lib/ops";
import { acteurCourant, useVue } from "@/lib/store";
import { estSorti, type Candidat, type DocumentRow } from "@/lib/types";

const ETATS: Record<DocumentRow["statut"], [string, "vert" | "ambre" | "rouge" | "bleu"]> = { valide: ["Validée", "vert"], recu: ["Reçue, à vérifier", "bleu"], en_attente: ["Pas encore reçue", "ambre"], rejete: ["Refusée, à refaire", "rouge"] };
const ORDRE = { recu: 0, rejete: 1, en_attente: 2, valide: 3 };

export default function Autorisations() {
  const db = useVue();
  const [vu, setVu] = useState<{ c: Candidat; d: DocumentRow } | null>(null);
  const [motif, setMotif] = useState("");
  const lignes = useMemo(() => {
    const docs = new Map(db.documents.filter((d) => d.type === "autorisation").map((d) => [d.candidat_id, d]));
    return db.candidats
      .filter((c) => docs.has(c.id) && !c.anonymise && !estSorti(c.statut))
      .map((c) => ({ c, d: docs.get(c.id)!, relances: db.messages.filter((m) => m.candidat_id === c.id && m.modele === "relance_autorisation").length }))
      .sort((a, b) => ORDRE[a.d.statut] - ORDRE[b.d.statut] || nomComplet(a.c).localeCompare(nomComplet(b.c)));
  }, [db]);
  const n = (s: DocumentRow["statut"]) => lignes.filter((l) => l.d.statut === s).length;
  const attente = lignes.filter((l) => l.d.statut === "en_attente" || l.d.statut === "rejete");
  const courant = vu && lignes.find((l) => l.d.id === vu.d.id);

  const relancer = (cibles: Candidat[]) => {
    const avec = cibles.filter((c) => c.parent_email);
    envoyer(avec, "relance_autorisation", "email", { campagne: "Relances automatiques" });
    envoyer(cibles.filter((c) => !c.parent_email), "dossier_incomplet", "email", { campagne: "Relances automatiques" });
    toast(`${avec.length} parent(s) et ${cibles.length - avec.length} élève(s) relancés par e-mail.`);
  };
  const deposer = async (c: Candidat, f?: File) => {
    if (!f) return;
    deposerDocument(c, "autorisation", f.name, await miniature(f, 1100).catch(() => null), acteurCourant().nom);
    toast("Document déposé. Vérifiez-le puis validez.");
  };

  return (
    <>
      <Entete titre="Autorisations parentales" sous="Le parent imprime l'autorisation, la signe à la main, puis en envoie la photo. L'encadreur vérifie la signature et valide.">
        <Btn disabled={!attente.length} onClick={() => relancer(attente.map((l) => l.c))}><Send className="size-4" /> Relancer les {attente.length} en attente</Btn>
      </Entete>
      {!lignes.length ? <Vide titre="Aucune autorisation demandée" detail="Les autorisations sont préparées automatiquement pour chaque élève retenu, dès que la sélection est validée." /> : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Chiffre accent label="Validées" valeur={<>{n("valide")}<span className="text-base text-muted"> / {lignes.length}</span></>} detail={<Barre pct={(n("valide") / lignes.length) * 100} className="mt-2" />} />
            <Chiffre label="Reçues, à vérifier" valeur={n("recu")} detail="Photo déposée par le parent ou l'élève" />
            <Chiffre label="Pas encore reçues" valeur={n("en_attente")} detail={`${lignes.filter((l) => l.d.statut === "en_attente" && joursDepuis(l.d.created_at) >= 3).length} depuis 3 jours et plus`} />
            <Chiffre label="Refusées, à refaire" valeur={n("rejete")} />
          </div>
          <Card className="overflow-hidden">
            <div className="scroll-fin overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead className="bg-sand-50 text-left text-xs font-semibold text-muted"><tr><th className="px-6 py-3">Élève</th><th>Parent ou tuteur</th><th>État</th><th>Suivi</th><th className="pr-6 text-right">Actions</th></tr></thead>
                <tbody className="divide-y divide-sand-100">
                  {lignes.map(({ c, d, relances }) => (
                    <tr key={c.id}>
                      <td className="px-6 py-3"><NomELP c={c} /><br /><span className="text-xs text-muted">{c.province}</span></td>
                      <td>{c.parent_nom || "—"} {c.parent_lien && <span className="text-muted">({c.parent_lien})</span>}<br /><span className="text-xs text-muted">{c.parent_email || c.parent_telephone || "aucun contact"}</span></td>
                      <td><Pastille ton={ETATS[d.statut][1]}>{ETATS[d.statut][0]}</Pastille></td>
                      <td className="text-xs text-muted">{d.statut === "valide" ? `Validée le ${fmtQuand(d.valide_le ?? d.created_at)}` : d.statut === "recu" ? `Déposée par ${d.depose_par || "?"} · ${fmtQuand(d.created_at)}` : d.statut === "rejete" ? d.motif_rejet : `Demandée il y a ${joursDepuis(d.created_at)} j · ${relances} relance${relances > 1 ? "s" : ""}`}</td>
                      <td className="pr-6 text-right">
                        <span className="inline-flex items-center gap-1.5">
                          {d.statut === "recu" || d.statut === "valide" ? (
                            <Btn petit variante={d.statut === "recu" ? "primaire" : "secondaire"} onClick={() => { setMotif(""); setVu({ c, d }); }}><Eye className="size-3.5" /> {d.statut === "recu" ? "Vérifier" : "Voir"}</Btn>
                          ) : (
                            <>
                              <Btn petit variante="secondaire" onClick={() => relancer([c])}>Relancer</Btn>
                              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-sand-300 bg-surface px-3 py-1.5 text-[13px] font-semibold hover:bg-sand-100" title="Le parent a remis le papier signé : déposez-en la photo">
                                <Upload className="size-3.5" /> Déposer
                                <input type="file" accept="image/*" hidden onChange={(e) => deposer(c, e.target.files?.[0])} />
                              </label>
                            </>
                          )}
                          <Link href={`/doc/autorisation/${c.id}`}><Btn petit variante="discret" title="Imprimer l'autorisation vierge"><Printer className="size-3.5" /></Btn></Link>
                          <Link href={`/p/${c.parent_token}`} target="_blank"><Btn petit variante="discret" title="Voir la page que reçoit le parent"><ExternalLink className="size-3.5" /></Btn></Link>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      <Modale large ouvert={!!courant} onClose={() => setVu(null)} titre={courant ? `Autorisation de ${nomComplet(courant.c)}` : ""}>
        {courant && (
          <div className="grid gap-5 sm:grid-cols-[1.2fr_1fr]">
            <div className="clair rounded-2xl bg-sand-100 p-2">
              {courant.d.apercu ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={courant.d.apercu} alt="Autorisation signée" className="max-h-[64vh] w-full rounded-xl object-contain" />
              ) : <div className="grid h-72 place-items-center px-6 text-center text-sm text-muted">Fichier de démonstration : dans la vraie plateforme, la photo du papier signé s&apos;affiche ici.</div>}
            </div>
            <div className="text-sm">
              <p className="font-bold">À vérifier</p>
              <ul className="mt-2 space-y-1.5 text-muted">
                <li>• Le nom de l&apos;élève : <b className="text-ink">{nomComplet(courant.c)}</b></li>
                <li>• La référence : <b className="tabular text-ink">{courant.d.code_verification || courant.c.code}</b></li>
                <li>• Le parent attendu : <b className="text-ink">{courant.c.parent_nom || "non renseigné"}</b></li>
                <li>• La mention « lu et approuvé », la date et la signature</li>
              </ul>
              <p className="mt-3 text-xs text-muted">Déposée par {courant.d.depose_par || "?"} · {fmtQuand(courant.d.created_at)} · {courant.d.nom_fichier}</p>
              {courant.d.statut === "recu" ? (
                <>
                  <Btn className="mt-5 w-full" onClick={() => { verifierDocument(courant.d, true); toast("Autorisation validée."); setVu(null); }}><Check className="size-4" /> Valider l&apos;autorisation</Btn>
                  <textarea className={cx(champ, "mt-4 min-h-16")} placeholder="Motif du refus (envoyé par e-mail)" value={motif} onChange={(e) => setMotif(e.target.value)} aria-label="Motif du refus" />
                  <Btn variante="danger" className="mt-2 w-full" disabled={motif.trim().length < 4} onClick={() => { verifierDocument(courant.d, false, motif.trim()); toast("Refusée : l'élève est prévenu par e-mail."); setVu(null); }}><X className="size-4" /> Refuser et demander une nouvelle photo</Btn>
                </>
              ) : <Pastille ton="vert" className="mt-5">Validée le {fmtQuand(courant.d.valide_le ?? courant.d.created_at)}</Pastille>}
            </div>
          </div>
        )}
      </Modale>
    </>
  );
}
