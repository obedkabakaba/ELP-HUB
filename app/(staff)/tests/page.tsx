"use client";
import { CheckCircle2, QrCode, Scale, Upload, Users } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useCompletudes, useQuery } from "@/components/commun";
import { Barre, Btn, Card, Champ, Chiffre, Entete, Onglets, Pastille, Vide, champ, champS, cx, toast } from "@/components/ui";
import { jourISO, nomComplet, simulerSelection } from "@/lib/logic";
import { fmtDate, fmtHeure } from "@/lib/modeles";
import { convoquer, creerSessions, saisirNote, validerSelection } from "@/lib/ops";
import { useStore } from "@/lib/store";
import { lireFichier } from "@/lib/tableur";

type Onglet = "sessions" | "notes" | "selection";

export default function Tests() {
  const q0 = useQuery();
  const db = useStore((s) => s.db);
  const comp = useCompletudes();
  const cohorte = db.cohortes[0];
  const [onglet, setOnglet] = useState<Onglet>((q0.get("onglet") as Onglet) ?? "sessions");
  const [date, setDate] = useState(() => jourISO(new Date(Date.now() + 7 * 86400000)));
  const [places, setPlaces] = useState(cohorte?.places ?? 40);
  const [attente, setAttente] = useState(cohorte?.taille_attente ?? 10);
  const [noteMin, setNoteMin] = useState(50);
  const fichier = useRef<HTMLInputElement>(null);

  const parId = useMemo(() => new Map(db.candidats.map((c) => [c.id, c])), [db.candidats]);
  const convoques = useMemo(() => new Set(db.convocations.map((k) => k.candidat_id)), [db.convocations]);
  const prets = db.candidats.filter((c) => c.statut === "inscrit" && comp.get(c.id)!.pct === 100 && !convoques.has(c.id));
  const emarges = db.candidats.filter((c) => db.convocations.some((k) => k.candidat_id === c.id && k.present));
  const notes = useMemo(() => new Map(db.notes.map((n) => [n.candidat_id, n])), [db.notes]);
  const dejaValidee = db.candidats.some((c) => ["selectionne", "attente", "induction", "stage", "termine"].includes(c.statut));

  const sim = useMemo(() => {
    const liste = db.notes.filter((n) => ["teste", "selectionne", "attente", "non_retenu"].includes(parId.get(n.candidat_id)?.statut ?? "")).map((n) => ({ id: n.candidat_id, sexe: parId.get(n.candidat_id)!.sexe, total: n.total }));
    return { liste, res: simulerSelection(liste, places, attente, noteMin) };
  }, [db.notes, parId, places, attente, noteMin]);
  const verdict = useMemo(() => {
    const m = new Map<string, "sel" | "att" | "non">();
    sim.res.selectionnes.forEach((id) => m.set(id, "sel"));
    sim.res.attente.forEach((id) => m.set(id, "att"));
    sim.res.nonRetenus.forEach((id) => m.set(id, "non"));
    return m;
  }, [sim]);
  const classement = useMemo(() => sim.liste.slice().sort((a, b) => b.total - a.total), [sim]);
  const parite = new Set(sim.res.entresParParite);

  const importerNotes = async (f: File) => {
    const lignes = await lireFichier(f);
    let n = 0;
    for (const l of lignes) {
      const v = (noms: string[]) => { const k = Object.keys(l).find((x) => noms.some((a) => x.toLowerCase().startsWith(a))); return k ? l[k] : null; };
      const c = db.candidats.find((x) => x.code === String(v(["code"]) ?? "").trim().toUpperCase());
      if (!c) continue;
      saisirNote(c.id, Math.min(60, +(v(["ecrit", "écrit"]) ?? 0)), Math.min(40, +(v(["entretien", "oral"]) ?? 0)));
      n++;
    }
    toast(n ? `${n} notes importées.` : "Aucune ligne reconnue. Colonnes attendues : Code, Écrit, Entretien.", n ? "ok" : "erreur");
  };

  return (
    <>
      <Entete titre="Tests et sélection" sous="Des convocations au classement final : sessions, émargement par QR code, notes, puis sélection avec autant de filles que de garçons.">
        <Link href="/scan"><Btn variante="secondaire"><QrCode className="size-4" /> Ouvrir le scanner</Btn></Link>
      </Entete>
      <Onglets<Onglet> actif={onglet} onChange={setOnglet} onglets={[{ id: "sessions", label: "Sessions et convocations", n: db.sessions_test.length }, { id: "notes", label: "Notes", n: db.notes.length }, { id: "selection", label: "Sélection" }]} />

      {onglet === "sessions" && (
        <>
          {prets.length > 0 && db.sessions_test.length > 0 && (
            <Card className="mb-4 flex flex-wrap items-center gap-4 border-brand-200 bg-brand-50 p-4 sm:px-6">
              <Users className="size-5 text-brand-600" />
              <p className="flex-1 text-sm"><b>{prets.length} dossiers complets</b> attendent leur convocation. Chacun sera placé dans le centre le plus proche de son domicile.</p>
              <Btn onClick={() => { const r = convoquer(prets); toast(`${r.convoques} convocations envoyées${r.sansPlace ? `, ${r.sansPlace} sans place` : ""}.`); }}>Convoquer</Btn>
            </Card>
          )}
          {!db.sessions_test.length ? (
            <Vide titre="Aucune session de test" detail="Choisissez la date : deux sessions (8 h 30 et 13 h 30) sont créées dans chaque centre.">
              <input type="date" className={champS} value={date} min={jourISO()} onChange={(e) => setDate(e.target.value)} aria-label="Date du test" />
              <Btn onClick={() => { creerSessions(date); toast("Sessions créées dans les 4 centres."); }}>Créer les sessions</Btn>
            </Vide>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {db.centres.filter((c) => c.type === "test").map((centre) => (
                <Card key={centre.id} className="p-5">
                  <p className="font-bold">{centre.nom}</p>
                  <p className="text-xs text-muted">{centre.adresse}, {centre.commune}</p>
                  <div className="mt-4 space-y-4">
                    {db.sessions_test.filter((s) => s.centre_id === centre.id).sort((a, b) => a.date_heure.localeCompare(b.date_heure)).map((s) => {
                      const k = db.convocations.filter((x) => x.session_id === s.id);
                      const presents = k.filter((x) => x.present).length;
                      return (
                        <div key={s.id}>
                          <div className="flex items-baseline justify-between text-sm"><span className="inline-block font-semibold first-letter:uppercase">{fmtDate(s.date_heure).split(" ").slice(0, 3).join(" ")} · {fmtHeure(s.date_heure)}</span><span className="tabular font-bold">{k.length}/{s.capacite}</span></div>
                          <Barre pct={(k.length / s.capacite) * 100} couleur="#a32a29" className="mt-1.5" />
                          <p className="mt-1.5 flex flex-wrap gap-1.5">
                            <Pastille ton="vert">{k.filter((x) => x.confirme).length} confirmés</Pastille>
                            {k.some((x) => x.confirme === false) && <Pastille ton="ambre">{k.filter((x) => x.confirme === false).length} empêchés</Pastille>}
                            {presents > 0 && <Pastille ton="bleu">{presents} émargés</Pastille>}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {onglet === "notes" && (
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b border-sand-200 p-4 sm:px-6">
            <p className="mr-auto text-sm"><b>{db.notes.length}</b> notes saisies sur <b>{emarges.length}</b> candidats émargés</p>
            <Btn petit variante="secondaire" onClick={() => fichier.current?.click()}><Upload className="size-3.5" /> Importer un fichier de notes</Btn>
            <input ref={fichier} type="file" accept=".xlsx,.xls,.csv" hidden onChange={(e) => e.target.files?.[0] && importerNotes(e.target.files[0])} />
          </div>
          {!emarges.length ? <div className="p-6"><Vide titre="Aucun candidat émargé" detail="Les notes se saisissent après le test, pour les candidats scannés à l'entrée." /></div> : (
            <div className="scroll-fin max-h-[62vh] overflow-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead className="sticky top-0 bg-sand-50 text-left text-xs font-semibold text-muted"><tr><th className="px-6 py-2.5">Candidat</th><th>Code</th><th>Écrit /60</th><th>Entretien /40</th><th className="pr-6 text-right">Total</th></tr></thead>
                <tbody className="divide-y divide-sand-100">
                  {emarges.map((c) => {
                    const n = notes.get(c.id);
                    return (
                      <tr key={c.id}>
                        <td className="px-6 py-2 font-semibold"><Link href={`/candidats/${c.id}`} className="hover:text-brand-700">{nomComplet(c)}</Link></td>
                        <td className="tabular text-muted">{c.code}</td>
                        <td><input type="number" min={0} max={60} aria-label={`Note écrite de ${nomComplet(c)}`} className={cx(champ, "w-20 py-1.5")} defaultValue={n?.ecrit ?? ""} onBlur={(e) => e.target.value !== "" && saisirNote(c.id, Math.min(60, +e.target.value), n?.entretien ?? 0)} /></td>
                        <td><input type="number" min={0} max={40} aria-label={`Note d'entretien de ${nomComplet(c)}`} className={cx(champ, "w-20 py-1.5")} defaultValue={n?.entretien ?? ""} onBlur={(e) => e.target.value !== "" && saisirNote(c.id, n?.ecrit ?? 0, Math.min(40, +e.target.value))} /></td>
                        <td className="tabular pr-6 text-right text-base font-extrabold">{n ? n.total : <span className="text-xs font-semibold text-rose-600">à saisir</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {onglet === "selection" && (!sim.liste.length ? <Vide titre="Pas encore de notes" detail="La sélection se simule dès que les notes du test sont saisies ou importées." /> : (
        <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
          <div className="space-y-4">
            <Card className="space-y-4 p-5">
              <h2 className="flex items-center gap-2 font-bold"><Scale className="size-4 text-brand-600" /> Paramètres de simulation</h2>
              <Champ label={`Places : ${places}`} aide={`${Math.floor(places / 2)} filles et ${places - Math.floor(places / 2)} garçons`}><input type="range" min={10} max={80} step={2} value={places} onChange={(e) => setPlaces(+e.target.value)} className="w-full accent-brand-600" /></Champ>
              <Champ label={`Liste d'attente : ${attente}`}><input type="range" min={0} max={30} step={2} value={attente} onChange={(e) => setAttente(+e.target.value)} className="w-full accent-brand-600" /></Champ>
              <Champ label={`Note minimale : ${noteMin} / 100`}><input type="range" min={0} max={80} step={5} value={noteMin} onChange={(e) => setNoteMin(+e.target.value)} className="w-full accent-brand-600" /></Champ>
            </Card>
            <div className="grid grid-cols-2 gap-3">
              <Chiffre label="Filles" valeur={sim.res.filles} detail={sim.res.seuilF != null ? `dernière admise : ${sim.res.seuilF}` : ""} />
              <Chiffre label="Garçons" valeur={sim.res.garcons} detail={sim.res.seuilM != null ? `dernier admis : ${sim.res.seuilM}` : ""} />
            </div>
            <Card className="p-5 text-[13px] leading-relaxed">
              <p className="font-bold">Effet de la parité</p>
              <p className="mt-1 text-muted">{sim.res.entresParParite.length ? `Par rapport à un classement aux seules notes, ${sim.res.entresParParite.length} candidat(s) entrent grâce au quota 50/50 et ${sim.res.sortisParParite.length} en sortent. Ils sont marqués dans le tableau.` : "Ici, le quota 50/50 donne le même résultat qu'un classement aux seules notes."}</p>
              {sim.res.filles + sim.res.garcons < places && <p className="mt-2 font-semibold text-amber-700">Seulement {sim.res.filles + sim.res.garcons} candidats atteignent la note minimale.</p>}
            </Card>
            <Btn className="w-full" disabled={dejaValidee} onClick={() => { if (confirm(`Valider la sélection ? ${sim.res.selectionnes.length} candidats seront sélectionnés, ${sim.res.attente.length} mis en liste d'attente, et tous recevront leur résultat par SMS.`)) { validerSelection(sim.res); toast("Sélection validée. Résultats envoyés et autorisations parentales demandées."); } }}>
              <CheckCircle2 className="size-4" /> {dejaValidee ? "Sélection déjà validée" : "Valider la sélection"}
            </Btn>
            {dejaValidee && <p className="text-center text-xs text-muted">Les curseurs restent utilisables pour comparer d&apos;autres scénarios.</p>}
          </div>
          <Card className="overflow-hidden">
            <div className="scroll-fin max-h-[76vh] overflow-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="sticky top-0 bg-sand-50 text-left text-xs font-semibold text-muted"><tr><th className="py-2.5 pl-6">Rang</th><th>Candidat</th><th>Sexe</th><th>Note</th><th className="pr-6">Résultat simulé</th></tr></thead>
                <tbody className="divide-y divide-sand-100">
                  {classement.map((x, i) => {
                    const c = parId.get(x.id)!;
                    const v = verdict.get(x.id);
                    return (
                      <tr key={x.id} className={cx(v === "sel" && "bg-emerald-50/50", v === "att" && "bg-amber-50/50")}>
                        <td className="tabular py-2 pl-6 font-bold text-muted">{i + 1}</td>
                        <td className="font-semibold"><Link href={`/candidats/${c.id}`} className="hover:text-brand-700">{nomComplet(c)}</Link></td>
                        <td>{c.sexe === "F" ? "Fille" : "Garçon"}</td>
                        <td className="tabular font-extrabold">{x.total}</td>
                        <td className="pr-6">
                          <span className="flex flex-wrap gap-1.5">
                            {v === "sel" ? <Pastille ton="vert">Sélectionné(e)</Pastille> : v === "att" ? <Pastille ton="ambre">Attente · rang {sim.res.attente.indexOf(x.id) + 1}</Pastille> : <Pastille>Non retenu(e)</Pastille>}
                            {parite.has(x.id) && <Pastille ton="marque">entre par la parité</Pastille>}
                            {sim.res.sortisParParite.includes(x.id) && <Pastille ton="marque">sort par la parité</Pastille>}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ))}
    </>
  );
}
