"use client";
import { ExternalLink, FileCheck2, Send } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { Barre, Btn, Card, Chiffre, Entete, Pastille, Vide, toast } from "@/components/ui";
import { joursDepuis, nomComplet } from "@/lib/logic";
import { fmtQuand } from "@/lib/modeles";
import { envoyer } from "@/lib/ops";
import { useStore } from "@/lib/store";

export default function Autorisations() {
  const db = useStore((s) => s.db);
  const lignes = useMemo(() => {
    const docs = new Map(db.documents.filter((d) => d.type === "autorisation").map((d) => [d.candidat_id, d]));
    return db.candidats
      .filter((c) => docs.has(c.id) && !c.anonymise)
      .map((c) => {
        const msgs = db.messages.filter((m) => m.candidat_id === c.id && m.destinataire === "parent" && m.modele !== "otp");
        return { c, d: docs.get(c.id)!, relances: Math.max(0, msgs.length - 1), dernier: msgs[msgs.length - 1]?.created_at ?? null };
      })
      .sort((a, b) => Number(a.d.statut === "signe") - Number(b.d.statut === "signe") || nomComplet(a.c).localeCompare(nomComplet(b.c)));
  }, [db]);
  const signees = lignes.filter((l) => l.d.statut === "signe").length;
  const attente = lignes.filter((l) => l.d.statut !== "signe" && l.c.statut !== "desiste");

  return (
    <>
      <Entete titre="Autorisations parentales" sous="Le parent reçoit un lien par SMS, vérifie son numéro avec un code, puis signe du doigt. Plus de papier à récupérer.">
        <Btn disabled={!attente.length} onClick={() => toast(`${envoyer(attente.map((l) => l.c), "relance_autorisation", "whatsapp", { campagne: "Relances automatiques" })} parents relancés par WhatsApp.`)}><Send className="size-4" /> Relancer les {attente.length} en attente</Btn>
      </Entete>
      {!lignes.length ? <Vide titre="Aucune autorisation demandée" detail="Les autorisations sont demandées automatiquement aux parents dès que la sélection est validée." /> : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Chiffre accent label="Signées" valeur={<>{signees}<span className="text-base text-muted"> / {lignes.length}</span></>} detail={<Barre pct={(signees / lignes.length) * 100} className="mt-2" />} />
            <Chiffre label="En attente" valeur={attente.length} />
            <Chiffre label="En attente depuis 3 jours et plus" valeur={attente.filter((l) => joursDepuis(l.d.created_at) >= 3).length} detail="À appeler" />
            <Chiffre label="Délai moyen de signature" valeur={(() => { const s = lignes.filter((l) => l.d.signe_le); return s.length ? `${(s.reduce((t, l) => t + (new Date(l.d.signe_le!).getTime() - new Date(l.d.created_at).getTime()), 0) / s.length / 3600000).toFixed(0)} h` : "—"; })()} />
          </div>
          <Card className="overflow-hidden">
            <div className="scroll-fin overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-sand-50 text-left text-xs font-semibold text-muted"><tr><th className="px-6 py-3">Élève</th><th>Parent ou tuteur</th><th>État</th><th>Suivi</th><th className="pr-6 text-right">Actions</th></tr></thead>
                <tbody className="divide-y divide-sand-100">
                  {lignes.map(({ c, d, relances, dernier }) => (
                    <tr key={c.id}>
                      <td className="px-6 py-3 font-semibold"><Link href={`/candidats/${c.id}`} className="hover:text-brand-700">{nomComplet(c)}</Link></td>
                      <td>{c.parent_nom} <span className="text-muted">({c.parent_lien})</span><br /><span className="tabular text-xs text-muted">{c.parent_telephone}</span></td>
                      <td>{d.statut === "signe" ? <Pastille ton="vert"><FileCheck2 className="size-3" /> Signée le {fmtQuand(d.signe_le!)}</Pastille> : c.statut === "desiste" ? <Pastille>Désistement</Pastille> : <Pastille ton="ambre">En attente depuis {joursDepuis(d.created_at)} j</Pastille>}</td>
                      <td className="text-xs text-muted">{d.statut === "signe" ? <span className="tabular">{d.code_verification}</span> : <>{relances} relance{relances > 1 ? "s" : ""}{dernier ? ` · ${fmtQuand(dernier)}` : ""}</>}</td>
                      <td className="pr-6 text-right">
                        {d.statut === "signe" ? (
                          <Link href={`/doc/autorisation/${c.id}`}><Btn petit variante="secondaire">Document</Btn></Link>
                        ) : c.statut !== "desiste" && (
                          <span className="inline-flex gap-1.5">
                            <Btn petit variante="secondaire" onClick={() => { envoyer([c], "relance_autorisation", "sms", { campagne: "Relances automatiques" }); toast(`Lien renvoyé à ${c.parent_nom}.`); }}>Relancer</Btn>
                            <Link href={`/p/${c.parent_token}`} target="_blank"><Btn petit variante="discret" title="Voir la page que reçoit le parent"><ExternalLink className="size-3.5" /></Btn></Link>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </>
  );
}
