"use client";
import { CheckCircle2, MapPinned, Route, Wand2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Barre, Btn, Card, Chiffre, Entete, Onglets, Pastille, Vide, champ, champS, cx, toast } from "@/components/ui";
import { INDEMNITE_JOUR_USD, distanceGloutonne, jourISO, moyenneEvaluation, nomComplet } from "@/lib/logic";
import { calculerPropositions, deplacerAffectation, enregistrerPropositions, majCandidat, validerAffectations } from "@/lib/ops";
import { useStore } from "@/lib/store";

type Onglet = "affectation" | "suivi" | "agences";

export default function Stage() {
  const db = useStore((s) => s.db);
  const put = useStore((s) => s.put);
  const [onglet, setOnglet] = useState<Onglet>(db.affectations.some((a) => a.statut === "validee") ? "suivi" : "affectation");
  const [debut, setDebut] = useState(() => jourISO(new Date(Date.now() + 7 * 86400000)));

  const d = useMemo(() => {
    const parId = new Map(db.candidats.map((c) => [c.id, c]));
    const validees = db.affectations.filter((a) => a.statut === "validee");
    const props = db.affectations.filter((a) => a.statut === "proposee");
    const affectes = new Set(validees.map((a) => a.candidat_id));
    const aPlacer = db.candidats.filter((c) => c.statut === "induction" && !affectes.has(c.id));
    const occ: Record<string, number> = {};
    for (const a of db.affectations) occ[a.agence_id] = (occ[a.agence_id] ?? 0) + 1;
    const km = props.reduce((s, a) => s + a.distance_km, 0);
    const glouton = props.length ? distanceGloutonne(props.map((a) => parId.get(a.candidat_id)!), db.agences) : 0;
    const jours = new Map<string, number>();
    for (const p of db.presences) if (p.contexte === "stage" && p.valide) jours.set(p.candidat_id, (jours.get(p.candidat_id) ?? 0) + 1);
    return { parId, validees, props, aPlacer, occ, km, glouton, jours, capacite: db.agences.reduce((s, a) => s + a.capacite, 0) };
  }, [db]);

  const lancer = () => {
    const p = calculerPropositions();
    enregistrerPropositions(p);
    const sans = p.filter((x) => !x.agence_id).length;
    toast(`${p.length - sans} affectations proposées${sans ? ` · ${sans} stagiaires sans place : augmentez la capacité d'une agence.` : "."}`);
  };

  return (
    <>
      <Entete titre="Stage" sous="Deux mois en agence EquityBCDC. Chaque stagiaire est placé au plus près de son domicile, dans la limite des places de chaque agence.">
        <Link href="/carte?liens=1"><Btn variante="secondaire"><MapPinned className="size-4" /> Voir sur la carte</Btn></Link>
      </Entete>
      <Onglets<Onglet> actif={onglet} onChange={setOnglet} onglets={[{ id: "affectation", label: "Affectation", n: d.aPlacer.length }, { id: "suivi", label: "Suivi des stagiaires", n: d.validees.length }, { id: "agences", label: "Agences", n: db.agences.length }]} />

      {onglet === "affectation" && (!d.aPlacer.length && !d.props.length ? (
        <Vide titre={d.validees.length ? "Tous les stagiaires ont une agence" : "Personne à affecter pour l'instant"} detail={d.validees.length ? `${d.validees.length} affectations validées. Le suivi se fait dans l'onglet suivant.` : "L'affectation se fait pendant la semaine d'induction."} />
      ) : !d.props.length ? (
        <Card className="flex flex-col items-center px-6 py-14 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-600"><Wand2 className="size-7" /></span>
          <p className="mt-4 text-lg font-bold">{d.aPlacer.length} stagiaires à placer dans {db.agences.length} agences</p>
          <p className="mt-1 max-w-lg text-sm text-muted">La plateforme cherche la répartition qui réduit le trajet total de tous les stagiaires, pas seulement celui des premiers de la liste. Vous ajustez ensuite à la main avant de valider.</p>
          <Btn className="mt-5" onClick={lancer}><Wand2 className="size-4" /> Proposer les affectations</Btn>
          {d.capacite < d.aPlacer.length && <p className="mt-3 text-xs font-semibold text-amber-700">Attention : {d.capacite} places pour {d.aPlacer.length} stagiaires.</p>}
        </Card>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Chiffre accent label="Trajet moyen" valeur={`${(d.km / d.props.length).toFixed(1)} km`} detail="du domicile à l'agence" />
            <Chiffre label="Trajet total" valeur={`${d.km.toFixed(0)} km`} detail={d.glouton > d.km + 0.5 ? `${(d.glouton - d.km).toFixed(0)} km de moins qu'une répartition à la main` : "répartition optimale"} />
            <Chiffre label="À plus de 5 km" valeur={d.props.filter((a) => a.distance_km > 5).length} detail="à regarder de près" />
            <Chiffre label="Ajustées à la main" valeur={d.props.filter((a) => a.manuelle).length} />
          </div>
          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 border-b border-sand-200 p-4 sm:px-6">
              <p className="mr-auto flex items-center gap-2 text-sm font-bold"><Route className="size-4 text-brand-600" /> Proposition à valider</p>
              <Btn petit variante="discret" onClick={lancer}>Recalculer</Btn>
              <label className="flex items-center gap-2 text-xs font-semibold text-muted">Début du stage <input type="date" className={cx(champS, "py-1.5")} value={debut} onChange={(e) => setDebut(e.target.value)} /></label>
              <Btn onClick={() => { if (confirm(`Valider ${d.props.length} affectations ? Chaque stagiaire et chaque chef d'agence recevra un SMS.`)) { const n = validerAffectations(new Date(`${debut}T08:00:00`).toISOString()); toast(`${n} affectations validées. Stagiaires et chefs d'agence prévenus par SMS.`); setOnglet("suivi"); } }}><CheckCircle2 className="size-4" /> Valider et prévenir par SMS</Btn>
            </div>
            <div className="scroll-fin max-h-[60vh] overflow-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead className="sticky top-0 bg-sand-50 text-left text-xs font-semibold text-muted"><tr><th className="px-6 py-2.5">Stagiaire</th><th>Domicile</th><th>Agence proposée</th><th className="pr-6 text-right">Distance</th></tr></thead>
                <tbody className="divide-y divide-sand-100">
                  {d.props.slice().sort((a, b) => b.distance_km - a.distance_km).map((a) => {
                    const c = d.parId.get(a.candidat_id)!;
                    return (
                      <tr key={a.id}>
                        <td className="px-6 py-2 font-semibold"><Link href={`/candidats/${c.id}`} className="hover:text-brand-700">{nomComplet(c)}</Link></td>
                        <td className="text-muted">{c.commune}{c.lat == null && " (GPS manquant)"}</td>
                        <td>
                          <select aria-label={`Agence de ${nomComplet(c)}`} className={cx(champS, "py-1.5", a.manuelle && "border-gold-500 bg-gold-100")} value={a.agence_id} onChange={(e) => deplacerAffectation(a, db.agences.find((x) => x.id === e.target.value)!)}>
                            {db.agences.map((ag) => <option key={ag.id} value={ag.id} disabled={ag.id !== a.agence_id && (d.occ[ag.id] ?? 0) >= ag.capacite}>{ag.nom} ({d.occ[ag.id] ?? 0}/{ag.capacite})</option>)}
                          </select>
                        </td>
                        <td className={cx("tabular pr-6 text-right font-bold", a.distance_km > 5 && "text-amber-700")}>{a.distance_km} km</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ))}

      {onglet === "suivi" && (!d.validees.length ? <Vide titre="Aucun stagiaire en agence" detail="Le suivi commence dès que les affectations sont validées." /> : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Chiffre accent label="Stagiaires en agence" valeur={d.validees.length} />
            <Chiffre label="Comptes ouverts" valeur={<>{d.validees.filter((a) => d.parId.get(a.candidat_id)?.compte_ouvert).length}<span className="text-base text-muted"> / {d.validees.length}</span></>} />
            <Chiffre label="Évaluations reçues" valeur={<>{d.validees.filter((a) => a.evaluation).length}<span className="text-base text-muted"> / {d.validees.length}</span></>} />
            <Chiffre label="Indemnités dues" valeur={`${d.validees.filter((a) => !a.indemnite_payee).reduce((s, a) => s + (d.jours.get(a.candidat_id) ?? 0) * INDEMNITE_JOUR_USD, 0)} $`} detail={`${INDEMNITE_JOUR_USD} $ par jour pointé (montant fictif)`} />
          </div>
          <Card className="overflow-hidden">
            <div className="scroll-fin max-h-[62vh] overflow-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead className="sticky top-0 bg-sand-50 text-left text-xs font-semibold text-muted"><tr><th className="px-6 py-2.5">Stagiaire</th><th>Agence</th><th>Jours pointés</th><th>Compte</th><th>Évaluation</th><th className="pr-6 text-right">Indemnité</th></tr></thead>
                <tbody className="divide-y divide-sand-100">
                  {d.validees.map((a) => {
                    const c = d.parId.get(a.candidat_id)!;
                    const ag = db.agences.find((x) => x.id === a.agence_id)!;
                    const j = d.jours.get(c.id) ?? 0;
                    return (
                      <tr key={a.id}>
                        <td className="px-6 py-2.5 font-semibold"><Link href={`/candidats/${c.id}`} className="hover:text-brand-700">{nomComplet(c)}</Link></td>
                        <td>{ag.nom}<br /><span className="text-xs text-muted">{a.distance_km} km</span></td>
                        <td className="tabular font-bold">{j}</td>
                        <td><button onClick={() => majCandidat(c, { compte_ouvert: !c.compte_ouvert })} title="Cliquer pour changer"><Pastille ton={c.compte_ouvert ? "vert" : "ambre"}>{c.compte_ouvert ? "Ouvert" : "À ouvrir"}</Pastille></button></td>
                        <td>{a.evaluation ? <Pastille ton="marque">{moyenneEvaluation(a.evaluation)} / 5</Pastille> : <span className="text-xs text-muted">En attente du chef d&apos;agence</span>}</td>
                        <td className="pr-6 text-right"><button onClick={() => put("affectations", { ...a, indemnite_payee: !a.indemnite_payee })} title="Cliquer pour changer"><Pastille ton={a.indemnite_payee ? "vert" : "gris"}>{j * INDEMNITE_JOUR_USD} $ · {a.indemnite_payee ? "versée" : "à verser"}</Pastille></button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ))}

      {onglet === "agences" && (
        <>
          <p className="mb-3 rounded-xl bg-gold-100 px-4 py-2.5 text-[13px] font-medium text-gold-700">Liste et positions de démonstration : à remplacer par la liste officielle des agences EquityBCDC de Kinshasa.</p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {db.agences.map((ag) => {
              const n = d.occ[ag.id] ?? 0;
              return (
                <Card key={ag.id} className="p-4">
                  <p className="font-bold">{ag.nom}</p>
                  <p className="text-xs text-muted">{ag.adresse}</p>
                  <p className="mt-2 text-xs text-muted">{ag.chef_nom}</p>
                  <div className="mt-3 flex items-center gap-3">
                    <Barre pct={(n / Math.max(1, ag.capacite)) * 100} couleur={n >= ag.capacite ? "#1d1513" : "#a32a29"} />
                    <span className="tabular shrink-0 text-sm font-bold">{n}/</span>
                    <input type="number" min={n} max={12} aria-label={`Places à l'agence ${ag.nom}`} className={cx(champ, "w-16 px-2 py-1 text-center")} value={ag.capacite} onChange={(e) => put("agences", { ...ag, capacite: Math.max(n, +e.target.value) })} />
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
