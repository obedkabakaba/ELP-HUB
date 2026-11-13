"use client";
import { BedDouble, IdCard, PlayCircle, QrCode } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Avatar, Btn, Card, Chiffre, Entete, Onglets, Pastille, Vide, champS, toast } from "@/components/ui";
import { jourISO, nomComplet } from "@/lib/logic";
import { attribuerChambres, demarrerInduction } from "@/lib/ops";
import { PROGRAMME } from "@/lib/programme";
import { useVue } from "@/lib/store";

type Onglet = "participants" | "presences" | "programme";

export default function Induction() {
  const db = useVue();
  const [onglet, setOnglet] = useState<Onglet>("participants");
  const [debut, setDebut] = useState(() => jourISO(new Date(Date.now() + 5 * 86400000)));

  const d = useMemo(() => {
    const elus = db.candidats.filter((c) => c.statut === "selectionne");
    const enCours = db.candidats.filter((c) => c.statut === "induction");
    const signes = new Set(db.documents.filter((x) => x.type === "autorisation" && x.statut === "valide").map((x) => x.candidat_id));
    const liste = [...enCours, ...elus].sort((a, b) => (a.chambre ?? "zz").localeCompare(b.chambre ?? "zz") || nomComplet(a).localeCompare(nomComplet(b)));
    const pres = db.presences.filter((p) => p.contexte === "induction");
    const jours = [...new Set(pres.map((p) => p.jour))].sort();
    const parJour = new Map(jours.map((j) => [j, new Set(pres.filter((p) => p.jour === j).map((p) => p.candidat_id))]));
    return { elus, enCours, signes, liste, jours, parJour, hotel: db.centres.find((c) => c.type === "hotel") };
  }, [db]);

  const sansChambre = d.liste.filter((c) => !c.chambre).length;
  const prets = d.elus.filter((c) => d.signes.has(c.id)).length;

  return (
    <>
      <Entete titre="Induction" sous={`Une semaine de formation à l'hôtel${d.hotel ? ` · ${d.hotel.nom}, ${d.hotel.commune}` : ""}.`}>
        <Link href="/scan?contexte=induction"><Btn variante="secondaire"><QrCode className="size-4" /> Scanner les présences</Btn></Link>
        <Link href="/doc/badges/tous"><Btn variante="secondaire"><IdCard className="size-4" /> Imprimer les badges</Btn></Link>
      </Entete>
      {!d.liste.length ? <Vide titre="Personne en induction pour l'instant" detail="Les participants apparaissent ici dès que la sélection est validée." /> : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Chiffre accent label="Participants" valeur={d.liste.length} detail={`${d.liste.filter((c) => c.sexe === "F").length} filles · ${d.liste.filter((c) => c.sexe === "M").length} garçons`} />
            <Chiffre label="Autorisations validées" valeur={<>{d.liste.filter((c) => d.signes.has(c.id)).length}<span className="text-base text-muted"> / {d.liste.length}</span></>} />
            <Chiffre label="Chambres attribuées" valeur={new Set(d.liste.map((c) => c.chambre).filter(Boolean)).size} detail={sansChambre ? `${sansChambre} sans chambre` : "2 personnes par chambre"} />
            <Chiffre label="Présence moyenne" valeur={d.jours.length ? `${Math.round(([...d.parJour.values()].reduce((s, x) => s + x.size, 0) / (d.jours.length * Math.max(1, d.enCours.length))) * 100)} %` : "—"} detail={`${d.jours.length} jour(s) pointé(s)`} />
          </div>

          {d.elus.length > 0 && (
            <Card className="mb-4 flex flex-wrap items-center gap-3 border-brand-200 bg-brand-50 p-4 sm:px-6">
              <div className="mr-auto min-w-56 text-sm">
                <p className="font-bold">{prets} sélectionnés sur {d.elus.length} peuvent partir en induction</p>
                <p className="text-muted">{d.elus.length - prets ? `${d.elus.length - prets} bloqués : autorisation parentale pas encore validée.` : "Toutes les autorisations sont signées."}</p>
              </div>
              <Btn variante="secondaire" onClick={() => toast(`Chambres attribuées à ${attribuerChambres()} participants.`)}><BedDouble className="size-4" /> Attribuer les chambres</Btn>
              <input type="date" className={champS} value={debut} onChange={(e) => setDebut(e.target.value)} aria-label="Premier jour de l'induction" />
              <Btn disabled={!prets} onClick={() => { const r = demarrerInduction(new Date(`${debut}T08:00:00`).toISOString()); toast(`${r.partis} participants informés par SMS${r.bloques ? ` · ${r.bloques} en attente d'autorisation` : ""}.`); }}><PlayCircle className="size-4" /> Lancer l&apos;induction</Btn>
            </Card>
          )}

          <Onglets<Onglet> actif={onglet} onChange={setOnglet} onglets={[{ id: "participants", label: "Participants et chambres", n: d.liste.length }, { id: "presences", label: "Présences" }, { id: "programme", label: "Programme" }]} />

          {onglet === "participants" && (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {d.liste.map((c) => (
                <Card key={c.id} className="flex items-center gap-3 p-3.5">
                  <Avatar nom={`${c.prenom} ${c.nom}`} sexe={c.sexe} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/candidats/${c.id}`} className="block truncate text-sm font-bold hover:text-brand-700">{nomComplet(c)}</Link>
                    <p className="text-xs text-muted">{c.commune}{c.allergies ? ` · Santé : ${c.allergies}` : ""}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Pastille ton={c.chambre ? "marque" : "gris"}>{c.chambre ? `Ch. ${c.chambre}` : "Sans chambre"}</Pastille>
                    {!d.signes.has(c.id) && <Pastille ton="ambre">Autorisation ?</Pastille>}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {onglet === "presences" && (!d.jours.length ? <Vide titre="Aucune présence enregistrée" detail="Chaque matin, scannez le QR code des badges à l'entrée de la salle." /> : (
            <Card className="overflow-hidden">
              <div className="scroll-fin max-h-[64vh] overflow-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="sticky top-0 bg-sand-50 text-xs font-semibold text-muted"><tr><th className="px-6 py-2.5 text-left">Participant</th>{d.jours.map((j, i) => <th key={j} className="px-2">{PROGRAMME[i]?.jour ?? j}<br /><span className="font-normal">{new Date(j).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}</span></th>)}</tr></thead>
                  <tbody className="divide-y divide-sand-100">
                    {d.enCours.map((c) => (
                      <tr key={c.id}>
                        <td className="px-6 py-2 font-semibold">{nomComplet(c)}</td>
                        {d.jours.map((j) => <td key={j} className="text-center">{d.parJour.get(j)!.has(c.id) ? <span className="inline-block size-2.5 rounded-full bg-emerald-500" title="Présent" /> : <span className="inline-block rounded bg-rose-100 px-1.5 text-[10px] font-bold text-rose-700">ABS</span>}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}

          {onglet === "programme" && (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              {PROGRAMME.map((p, i) => (
                <Card key={p.jour} className="p-5">
                  <p className="text-xs font-bold text-brand-600">JOUR {i + 1} · {p.jour.toUpperCase()}</p>
                  <p className="mt-1 font-bold leading-snug">{p.theme}</p>
                  <ul className="mt-3 space-y-1.5 text-[13px] text-muted">{p.points.map((x) => <li key={x} className="flex gap-2"><span className="mt-1.5 size-1 shrink-0 rounded-full bg-gold-500" />{x}</li>)}</ul>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
