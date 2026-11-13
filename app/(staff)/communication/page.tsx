"use client";
import { ArrowRight, MessageSquarePlus, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { EnvoiModale } from "@/components/commun";
import { Btn, Card, Chiffre, Entete, Onglets, Pastille, Vide, champS, toast } from "@/components/ui";
import { actionsDuJour } from "@/lib/actions";
import { nomComplet } from "@/lib/logic";
import { COUT_USD, MODELES, fmtQuand, segments } from "@/lib/modeles";
import { useStore } from "@/lib/store";
import { STATUTS, type Candidat, type Statut } from "@/lib/types";

type Onglet = "campagnes" | "relances" | "reponses" | "modeles";

export default function Communication() {
  const db = useStore((s) => s.db);
  const [onglet, setOnglet] = useState<Onglet>("campagnes");
  const [cible, setCible] = useState<Statut>("inscrit");
  const [envoi, setEnvoi] = useState<Candidat[] | null>(null);
  const actions = useMemo(() => actionsDuJour(db).filter((a) => a.executer && a.id !== "promotion" && a.id !== "convoquer"), [db]);

  const { campagnes, stats, reponses, echecs } = useMemo(() => {
    const sortants = db.messages.filter((m) => m.modele !== "reponse");
    const m = new Map<string, { nom: string; total: number; livres: number; lus: number; echecs: number; dernier: string; canaux: Set<string>; cout: number }>();
    for (const x of sortants) {
      const k = m.get(x.campagne) ?? { nom: x.campagne, total: 0, livres: 0, lus: 0, echecs: 0, dernier: x.created_at, canaux: new Set<string>(), cout: 0 };
      k.total++;
      if (x.statut === "livre" || x.statut === "lu") k.livres++;
      if (x.statut === "lu") k.lus++;
      if (x.statut === "echec") k.echecs++;
      if (x.created_at > k.dernier) k.dernier = x.created_at;
      k.canaux.add(x.canal);
      k.cout += (x.canal === "sms" ? segments(x.contenu) : 1) * COUT_USD[x.canal];
      m.set(x.campagne, k);
    }
    const livres = sortants.filter((x) => x.statut === "livre" || x.statut === "lu").length;
    return {
      campagnes: [...m.values()].sort((a, b) => b.dernier.localeCompare(a.dernier)),
      stats: { total: sortants.length, taux: sortants.length ? Math.round((livres / sortants.length) * 100) : 0, echecs: sortants.filter((x) => x.statut === "echec").length, cout: [...m.values()].reduce((s, k) => s + k.cout, 0) },
      reponses: db.messages.filter((x) => x.modele === "reponse").reverse(),
      echecs: sortants.filter((x) => x.statut === "echec"),
    };
  }, [db.messages]);

  const parId = useMemo(() => new Map(db.candidats.map((c) => [c.id, c])), [db.candidats]);
  const echecsUniques = [...new Map(echecs.map((m) => [m.candidat_id, m])).values()];

  return (
    <>
      <Entete titre="Communication" sous="SMS d'abord, WhatsApp ensuite. Chaque message est suivi : envoyé, remis, lu ou en échec.">
        <select className={champS} value={cible} onChange={(e) => setCible(e.target.value as Statut)} aria-label="Destinataires par statut">
          {STATUTS.map((s) => <option key={s.id} value={s.id}>{s.court} ({db.candidats.filter((c) => c.statut === s.id).length})</option>)}
        </select>
        <Btn onClick={() => setEnvoi(db.candidats.filter((c) => c.statut === cible && !c.anonymise))} disabled={!db.candidats.some((c) => c.statut === cible)}><MessageSquarePlus className="size-4" /> Nouveau message</Btn>
      </Entete>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Chiffre label="Messages envoyés" valeur={stats.total} />
        <Chiffre label="Taux de remise" valeur={`${stats.taux} %`} accent />
        <Chiffre label="En échec" valeur={stats.echecs} detail={`${echecsUniques.length} numéros à corriger`} />
        <Chiffre label="Coût estimé" valeur={`${stats.cout.toFixed(2)} $`} detail="Tarifs indicatifs, à confirmer" />
      </div>

      <Onglets<Onglet> actif={onglet} onChange={setOnglet} onglets={[{ id: "campagnes", label: "Campagnes", n: campagnes.length }, { id: "relances", label: "Relances automatiques", n: actions.length }, { id: "reponses", label: "Réponses et échecs", n: reponses.length + echecsUniques.length }, { id: "modeles", label: "Modèles", n: MODELES.length - 1 }]} />

      {onglet === "campagnes" && (
        <Card className="divide-y divide-sand-100">
          {campagnes.map((k) => (
            <div key={k.nom} className="grid items-center gap-3 p-4 sm:grid-cols-[1.3fr_1fr_auto] sm:px-6">
              <div>
                <p className="font-bold">{k.nom}</p>
                <p className="text-xs text-muted">{fmtQuand(k.dernier)} · {[...k.canaux].map((x) => x.toUpperCase()).join(" + ")} · {k.cout.toFixed(2)} $</p>
              </div>
              <div>
                <div className="flex h-2 overflow-hidden rounded-full bg-sand-200">
                  <div className="bg-emerald-500" style={{ width: `${((k.livres - k.lus) / k.total) * 100}%` }} />
                  <div className="bg-blue-500" style={{ width: `${(k.lus / k.total) * 100}%` }} />
                  <div className="bg-rose-500" style={{ width: `${(k.echecs / k.total) * 100}%` }} />
                </div>
                <p className="tabular mt-1.5 flex flex-wrap gap-x-3 text-xs text-muted">
                  <span><b className="text-emerald-700">{k.livres}</b> remis</span>
                  {k.lus > 0 && <span><b className="text-blue-700">{k.lus}</b> lus</span>}
                  {k.echecs > 0 && <span><b className="text-rose-700">{k.echecs}</b> échecs</span>}
                </p>
              </div>
              <p className="tabular text-right text-2xl font-extrabold">{k.total}</p>
            </div>
          ))}
          {!campagnes.length && <div className="p-6"><Vide titre="Aucune campagne" detail="Les messages envoyés apparaîtront ici, regroupés par campagne." /></div>}
        </Card>
      )}

      {onglet === "relances" && (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <Card className="divide-y divide-sand-100">
            {actions.map((a) => (
              <div key={a.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:px-6">
                <div className="flex-1"><p className="font-bold">{a.titre}</p><p className="text-[13px] text-muted">{a.detail}</p></div>
                <Btn petit onClick={() => toast(a.executer!())}><Sparkles className="size-3.5" /> {a.bouton}</Btn>
              </div>
            ))}
            {!actions.length && <div className="p-6"><Vide titre="Aucune relance à envoyer" detail="Tout le monde a répondu, ou vient d'être relancé." /></div>}
          </Card>
          <Card className="h-fit p-5">
            <h2 className="font-bold">Règle d&apos;escalade</h2>
            <ol className="mt-3 space-y-3 text-[13px]">
              {[["1", "SMS", "3 jours sans réponse"], ["2", "WhatsApp", "2 jours après le SMS"], ["3", "Appel de l'encadreur", "après deux relances sans effet"]].map(([n, t, d]) => (
                <li key={n} className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">{n}</span><span><b>{t}</b><br /><span className="text-muted">{d}</span></span></li>
              ))}
            </ol>
            <p className="mt-4 rounded-xl bg-sand-100 p-3 text-xs text-muted">En production, ces relances partent seules chaque matin à 8 h (tâche planifiée côté serveur). Personne n&apos;est relancé deux fois le même jour.</p>
          </Card>
        </div>
      )}

      {onglet === "reponses" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <h2 className="mb-3 font-bold">Réponses reçues par SMS</h2>
            {!reponses.length && <p className="text-sm text-muted">Aucune réponse pour l&apos;instant. Dans le téléphone de démonstration, répondez « 1 » à une convocation.</p>}
            <ul className="space-y-2">
              {reponses.slice(0, 30).map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 text-sm">
                  <Link href={`/candidats/${m.candidat_id}`} className="font-semibold hover:text-brand-700">{m.nom_destinataire}</Link>
                  <span className="flex items-center gap-2"><Pastille ton={m.contenu === "1" ? "vert" : "ambre"}>« {m.contenu} »{m.contenu === "1" ? " présence confirmée" : m.contenu === "2" ? " empêchement" : ""}</Pastille><span className="text-xs text-muted">{fmtQuand(m.created_at)}</span></span>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-5">
            <h2 className="mb-3 font-bold">Numéros en échec</h2>
            {!echecsUniques.length && <p className="text-sm text-muted">Aucun échec de remise.</p>}
            <ul className="space-y-2">
              {echecsUniques.map((m) => {
                const c = m.candidat_id ? parId.get(m.candidat_id) : null;
                return (
                  <li key={m.id} className="flex items-center justify-between gap-3 text-sm">
                    <span><b>{c ? nomComplet(c) : m.nom_destinataire}</b> <span className="tabular text-muted">· {m.telephone}</span></span>
                    {c && <Link href={`/candidats/${c.id}`} className="flex items-center gap-1 text-xs font-bold text-brand-600">Corriger <ArrowRight className="size-3" /></Link>}
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      )}

      {onglet === "modeles" && (
        <div className="grid gap-3 md:grid-cols-2">
          {MODELES.filter((m) => m.id !== "libre").map((m) => (
            <Card key={m.id} className="p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold">{m.nom}</p>
                <Pastille ton={m.destinataire === "parent" ? "ambre" : m.destinataire === "agence" ? "bleu" : "marque"}>{m.destinataire === "parent" ? "Parent" : m.destinataire === "agence" ? "Chef d'agence" : "Élève"}</Pastille>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">{m.texte}</p>
              <p className="mt-2 text-[11px] text-muted">{m.texte.length} caractères avant variables</p>
            </Card>
          ))}
        </div>
      )}
      <EnvoiModale cibles={envoi} onClose={() => setEnvoi(null)} />
    </>
  );
}
