"use client";
import { EyeOff, Lock, ShieldCheck, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Btn, Card, Entete, Onglets, Pastille, champ, cx, toast } from "@/components/ui";
import { joursDepuis } from "@/lib/logic";
import { fmtQuand } from "@/lib/modeles";
import { anonymiser } from "@/lib/ops";
import { useStore } from "@/lib/store";

type Onglet = "journal" | "acces" | "conservation";

const ACCES: [string, string, string, string, string, string][] = [
  ["Dossiers des élèves", "Tous", "Tous", "Le sien", "Nom et code seulement", "Ses stagiaires"],
  ["Fiche santé et contact d'urgence", "Oui", "Oui", "La sienne", "Non", "Contact d'urgence seul"],
  ["Notes du test et classement", "Oui", "Oui", "Son résultat", "Non", "Non"],
  ["Envoi de messages", "Oui", "Oui", "Non", "Non", "Non"],
  ["Validation de la sélection", "Oui", "Non", "Non", "Non", "Non"],
  ["Évaluation de stage", "Lecture", "Lecture", "La sienne, à la fin", "Non", "Ses stagiaires"],
  ["Journal des accès et anonymisation", "Oui", "Lecture", "Non", "Non", "Non"],
];

export default function Confidentialite() {
  const db = useStore((s) => s.db);
  const role = useStore((s) => s.role);
  const [onglet, setOnglet] = useState<Onglet>("journal");
  const [q, setQ] = useState("");
  const [mois, setMois] = useState(12);

  const journal = useMemo(() => db.journal.slice().sort((a, b) => b.created_at.localeCompare(a.created_at)).filter((j) => !q || `${j.acteur} ${j.action} ${j.cible}`.toLowerCase().includes(q.toLowerCase())), [db.journal, q]);
  const sortis = db.candidats.filter((c) => (c.statut === "non_retenu" || c.statut === "desiste") && !c.anonymise);
  const echus = sortis.filter((c) => joursDepuis(c.statut_depuis) >= mois * 30);

  return (
    <>
      <Entete titre="Confidentialité" sous="Les élèves sont souvent mineurs : chaque accès est tracé, chaque rôle ne voit que ce dont il a besoin, et rien n'est gardé plus longtemps que nécessaire." />
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {[[ShieldCheck, "Consentement recueilli", `${db.candidats.filter((c) => c.consentement_le).length} élèves ont accepté le traitement de leurs données à l'inscription.`], [Lock, "Aucune donnée bancaire", "La plateforme note seulement si le compte est ouvert. Le numéro de compte reste dans les systèmes de la banque."], [EyeOff, "Accès selon le rôle", "Le centre de test ne voit que le nom et le code. Le chef d'agence ne voit que ses stagiaires."]].map(([I, t, d]) => {
          const Icone = I as typeof Lock;
          return <Card key={t as string} className="p-5"><Icone className="size-5 text-brand-600" /><p className="mt-2 font-bold">{t as string}</p><p className="mt-1 text-[13px] text-muted">{d as string}</p></Card>;
        })}
      </div>
      <Onglets<Onglet> actif={onglet} onChange={setOnglet} onglets={[{ id: "journal", label: "Journal des accès", n: db.journal.length }, { id: "acces", label: "Qui voit quoi" }, { id: "conservation", label: "Durée de conservation" }]} />

      {onglet === "journal" && (
        <Card className="overflow-hidden">
          <div className="border-b border-sand-200 p-3"><input className={champ} placeholder="Filtrer par personne, action ou dossier" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filtrer le journal" /></div>
          <div className="scroll-fin max-h-[60vh] overflow-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="sticky top-0 bg-sand-50 text-left text-xs font-semibold text-muted"><tr><th className="px-5 py-2.5">Quand</th><th>Qui</th><th>Action</th><th className="pr-5">Sur</th></tr></thead>
              <tbody className="divide-y divide-sand-100">
                {journal.slice(0, 200).map((j) => (
                  <tr key={j.id}><td className="tabular px-5 py-2 whitespace-nowrap text-muted">{fmtQuand(j.created_at)}</td><td className="font-semibold">{j.acteur} <Pastille>{j.role}</Pastille></td><td>{j.action}</td><td className="pr-5 text-muted">{j.cible}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {onglet === "acces" && (
        <Card className="scroll-fin overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-sand-50 text-left text-xs font-semibold text-muted"><tr><th className="px-5 py-3">Donnée ou action</th><th>Admin Fondation</th><th>Encadreur</th><th>Candidat</th><th>Centre de test</th><th className="pr-5">Chef d&apos;agence</th></tr></thead>
            <tbody className="divide-y divide-sand-100">
              {ACCES.map(([l, ...v]) => <tr key={l}><td className="px-5 py-2.5 font-semibold">{l}</td>{v.map((x, i) => <td key={i} className={cx("py-2.5", x === "Non" ? "text-muted" : "font-medium")}>{x}</td>)}</tr>)}
            </tbody>
          </table>
          <p className="border-t border-sand-200 px-5 py-3 text-xs text-muted">Ces règles sont appliquées dans la base de données elle-même (sécurité au niveau des lignes), pas seulement à l&apos;écran. Le parent n&apos;a pas de compte : son lien ne donne accès qu&apos;à l&apos;autorisation de son enfant.</p>
        </Card>
      )}

      {onglet === "conservation" && (
        <Card className="p-5 sm:p-6">
          <h2 className="font-bold">Dossiers des élèves non retenus ou désistés</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">Passé le délai choisi, le nom, le téléphone, l&apos;adresse, le parent, les pièces et les messages sont effacés. Seules restent les statistiques anonymes (commune, sexe, note).</p>
          <div className="mt-5 flex flex-wrap items-end gap-4">
            <label className="text-sm font-semibold">Conserver pendant
              <select className={cx(champ, "mt-1.5 block w-auto")} value={mois} onChange={(e) => setMois(+e.target.value)}>
                <option value={0}>0 mois (démonstration)</option><option value={6}>6 mois</option><option value={12}>12 mois</option><option value={24}>24 mois</option>
              </select>
            </label>
            <div className="text-sm"><p><b>{sortis.length}</b> dossiers concernés · <b>{echus.length}</b> ont dépassé le délai</p><p className="text-xs text-muted">{db.candidats.filter((c) => c.anonymise).length} dossiers déjà anonymisés</p></div>
            <Btn variante="danger" disabled={!echus.length || role !== "admin"} onClick={() => { if (confirm(`Anonymiser définitivement ${echus.length} dossiers ?`)) toast(`${anonymiser(echus)} dossiers anonymisés.`); }}><Trash2 className="size-4" /> Anonymiser {echus.length} dossiers</Btn>
          </div>
          {role !== "admin" && <p className="mt-3 text-xs font-semibold text-amber-700">Seul l&apos;admin de la Fondation peut lancer l&apos;anonymisation.</p>}
          <p className="mt-5 rounded-xl bg-sand-100 p-3 text-xs text-muted">La durée légale exacte est à valider avec le service juridique au regard du Code du numérique (2023).</p>
        </Card>
      )}
    </>
  );
}
