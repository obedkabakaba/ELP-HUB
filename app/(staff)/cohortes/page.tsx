"use client";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Btn, Card, Champ, Entete, Pastille, champ, cx, toast } from "@/components/ui";
import { COMMUNES } from "@/lib/geo";
import { normaliser } from "@/lib/logic";
import { envoyer, journaliser } from "@/lib/ops";
import { uid, useStore } from "@/lib/store";
import { exporterExcel, lireFichier, type Ligne } from "@/lib/tableur";
import type { Candidat } from "@/lib/types";

const COLONNES: Record<string, string[]> = {
  nom: ["nom", "name", "nomdefamille"],
  postnom: ["postnom", "post-nom"],
  prenom: ["prenom", "firstname"],
  sexe: ["sexe", "genre", "sex"],
  ecole: ["ecole", "etablissement", "school"],
  section: ["section", "option", "filiere"],
  pourcentage: ["pourcentage", "pourcent", "pct", "resultat", "exetat", "note", "moyenne"],
  telephone: ["telephone", "tel", "phone", "numero", "contact"],
  commune: ["commune", "ville", "localisation"],
};

function exemple(): Ligne[] {
  const base: [string, string, string, string, string, number, string, string][] = [
    ["Mbuyi", "Kalala", "Grâce", "F", "Lycée Lumière de Lemba", 87, "+243 81 555 0101", "Lemba"],
    ["Ilunga", "Ngoy", "Daniel", "M", "Collège Avenir de Limete", 84, "+243 82 555 0102", "Limete"],
    ["Makiese", "Luzolo", "Esther", "F", "Institut Elikya de Masina", 91, "+243 99 555 0103", "Masina"],
    ["Kabongo", "Mutombo", "Trésor", "M", "Complexe scolaire Espoir de Ngaliema", 82, "+243 97 555 0104", "Ngaliema"],
    ["Nzuzi", "Matondo", "Ruth", "F", "Lycée Bondeko de Kalamu", 79, "+243 85 555 0105", "Kalamu"],
    ["Mukendi", "Kazadi", "Samuel", "M", "Collège Mwinda de Ndjili", 88, "", "Ndjili"],
    ["Mbuyi", "Kalala", "Grace", "F", "Lycée Lumière de Lemba", 87, "+243 81 555 0101", "Lemba"],
    ["Lutete", "Nsimba", "Sarah", "F", "Institut Excellence de Bandalungwa", 93, "+243 84 555 0107", "Bandalungwa"],
    ["Bolamba", "Ekofo", "Josué", "M", "Lycée La Colombe de Kintambo", 76, "+243 89 555 0108", "Kintambo"],
    ["Kayembe", "Banza", "Dorcas", "F", "Collège Les Pionniers de Matete", 85, "+243 81 555 0109", "Matete"],
    ["Tshibangu", "Mulumba", "Héritier", "M", "Institut Mont-Sinaï de Kimbanseke", 81, "+243 82 555 0110", "Kimbanseke"],
    ["Mavungu", "Kiala", "Naomie", "F", "Lycée Bosembo de Mont-Ngafula", 90, "+243 99 555 0111", "Mont-Ngafula"],
    ["ILUNGA", "NGOY", "DANIEL", "M", "Collège Avenir de Limete", 84, "+243 82 555 0199", "Limete"],
    ["Lukusa", "Ntumba", "Kevin", "M", "Complexe scolaire Sainte-Trinité de Gombe", 86, "+243 97 555 0113", "Gombe"],
  ];
  return base.map(([Nom, Postnom, Prénom, Sexe, École, Pourcentage, Téléphone, Commune]) => ({ Nom, Postnom, Prénom, Sexe, École, Section: "Scientifique", Pourcentage, Téléphone, Commune }));
}

interface Analyse {
  i: number;
  c: Partial<Candidat> & { nom: string; prenom: string; pourcentage_exetat: number };
  probleme: "" | "doublon_fichier" | "doublon_cohorte" | "sous_seuil" | "sans_nom";
  alerte: string;
}

export default function Cohortes() {
  const db = useStore((s) => s.db);
  const put = useStore((s) => s.put);
  const cohorte = db.cohortes[0];
  const [lignes, setLignes] = useState<Ligne[] | null>(null);
  const [fichier, setFichier] = useState("");
  const [inviter, setInviter] = useState(true);
  const input = useRef<HTMLInputElement>(null);

  const analyse = useMemo<Analyse[]>(() => {
    if (!lignes || !cohorte) return [];
    const cles = Object.keys(lignes[0] ?? {});
    const col = (champ: string) => cles.find((k) => COLONNES[champ].some((a) => normaliser(k) === normaliser(a))) ?? cles.find((k) => COLONNES[champ].some((a) => normaliser(k).startsWith(normaliser(a))));
    const map = Object.fromEntries(Object.keys(COLONNES).map((k) => [k, col(k)]));
    const cle = (nom: string, postnom: string, prenom: string, ecole: string) => normaliser(nom + postnom + prenom) + "|" + normaliser(ecole);
    const existants = new Set(db.candidats.map((c) => cle(c.nom, c.postnom, c.prenom, c.ecole)));
    const telsExistants = new Set(db.candidats.map((c) => c.telephone.replace(/\D/g, "")).filter(Boolean));
    const vus = new Set<string>();
    return lignes.map((l, i) => {
      const v = (k: string) => String((map[k] && l[map[k]!]) ?? "").trim();
      const pct = parseFloat(v("pourcentage").replace(",", ".")) || 0;
      const tel = v("telephone");
      const k = cle(v("nom"), v("postnom"), v("prenom"), v("ecole"));
      const sexe = /^(f|fille|fem)/i.test(v("sexe")) ? "F" : "M";
      const commune = COMMUNES.find((x) => normaliser(x.nom) === normaliser(v("commune")))?.nom ?? v("commune");
      let probleme: Analyse["probleme"] = "";
      if (!v("nom") || !v("prenom")) probleme = "sans_nom";
      else if (vus.has(k)) probleme = "doublon_fichier";
      else if (existants.has(k) || (tel && telsExistants.has(tel.replace(/\D/g, "")))) probleme = "doublon_cohorte";
      else if (pct < cohorte.seuil_exetat) probleme = "sous_seuil";
      vus.add(k);
      return { i, probleme, alerte: !probleme && !tel ? "Sans téléphone : passer par l'école" : "", c: { nom: v("nom"), postnom: v("postnom"), prenom: v("prenom"), sexe, ecole: v("ecole"), section: v("section"), pourcentage_exetat: pct, telephone: tel, commune } };
    });
  }, [lignes, db.candidats, cohorte]);

  const bons = analyse.filter((a) => !a.probleme);
  const compte = (p: Analyse["probleme"]) => analyse.filter((a) => a.probleme === p).length;

  const charger = async (f: File) => {
    try {
      const l = await lireFichier(f);
      if (!l.length) return toast("Ce fichier ne contient aucune ligne.", "erreur");
      setLignes(l);
      setFichier(f.name);
    } catch {
      toast("Impossible de lire ce fichier. Formats acceptés : .xlsx, .xls, .csv", "erreur");
    }
  };

  const importer = () => {
    const depart = db.candidats.length;
    const t = new Date().toISOString();
    const jeton = () => Math.random().toString(36).slice(2, 12);
    const nouveaux = bons.map((a, n): Candidat => ({
      id: uid(), cohorte_id: cohorte.id, code: `ELP${String(cohorte.annee).slice(2)}-${String(depart + n + 1).padStart(4, "0")}`, nom: a.c.nom, postnom: a.c.postnom ?? "", prenom: a.c.prenom, sexe: a.c.sexe ?? "M", date_naissance: null, telephone: a.c.telephone ?? "", email: null, ecole: a.c.ecole ?? "", section: a.c.section ?? "", pourcentage_exetat: a.c.pourcentage_exetat, commune: a.c.commune ?? "", adresse: "", lat: null, lng: null, statut: "invite", statut_depuis: t, parent_nom: "", parent_lien: "", parent_telephone: "", parent_token: jeton(), token: jeton(), allergies: "", urgence_nom: "", urgence_telephone: "", consentement_le: null, invite_le: inviter ? t : null, inscrit_le: null, derniere_activite: null, relances: 0, telephone_invalide: false, chambre: null, compte_ouvert: false, note_interne: "", anonymise: false, rang_attente: null,
    }));
    put("candidats", nouveaux);
    journaliser(`Import de la liste Exetat : ${nouveaux.length} élèves ajoutés, ${compte("doublon_fichier") + compte("doublon_cohorte")} doublons et ${compte("sous_seuil")} sous le seuil écartés`, cohorte.nom);
    if (inviter) envoyer(nouveaux.filter((c) => c.telephone), "invitation", "sms", { campagne: `Invitations ${cohorte.nom}` });
    toast(`${nouveaux.length} élèves importés${inviter ? " et invités par SMS" : ""}.`);
    setLignes(null);
  };

  const LIB: Record<string, [string, "rouge" | "ambre" | "gris"]> = { doublon_fichier: ["Doublon dans le fichier", "ambre"], doublon_cohorte: ["Déjà dans la cohorte", "ambre"], sous_seuil: ["Sous le seuil", "gris"], sans_nom: ["Nom manquant", "rouge"] };

  return (
    <>
      <Entete titre="Cohortes et import" sous="Importez la liste des résultats de l'Exetat : les doublons et les élèves sous le seuil sont repérés avant toute invitation." />
      {cohorte && (
        <Card className="mb-4 grid gap-4 p-5 sm:grid-cols-[1.4fr_1fr_1fr_1fr] sm:items-end sm:p-6">
          <div>
            <Pastille ton="vert">Cohorte active</Pastille>
            <p className="mt-2 text-xl font-extrabold">{cohorte.nom}</p>
            <p className="text-sm text-muted">{db.candidats.filter((c) => c.cohorte_id === cohorte.id).length} élèves</p>
          </div>
          <Champ label="Seuil Exetat (%)"><input type="number" min={50} max={100} className={champ} value={cohorte.seuil_exetat} onChange={(e) => put("cohortes", { ...cohorte, seuil_exetat: +e.target.value })} /></Champ>
          <Champ label="Places"><input type="number" min={2} step={2} className={champ} value={cohorte.places} onChange={(e) => put("cohortes", { ...cohorte, places: +e.target.value })} /></Champ>
          <Champ label="Liste d'attente"><input type="number" min={0} className={champ} value={cohorte.taille_attente} onChange={(e) => put("cohortes", { ...cohorte, taille_attente: +e.target.value })} /></Champ>
        </Card>
      )}

      {!lignes ? (
        <Card className="p-5 sm:p-6">
          <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) void charger(f); }} className="flex flex-col items-center rounded-2xl border-2 border-dashed border-sand-300 bg-sand-50 px-6 py-14 text-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-600"><FileSpreadsheet className="size-7" /></span>
            <p className="mt-4 text-lg font-bold">Déposez la liste Exetat ici</p>
            <p className="mt-1 max-w-md text-sm text-muted">Fichier Excel ou CSV. Les colonnes sont reconnues automatiquement : nom, postnom, prénom, sexe, école, pourcentage, téléphone, commune.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Btn onClick={() => input.current?.click()}><Upload className="size-4" /> Choisir un fichier</Btn>
              <Btn variante="secondaire" onClick={() => { setLignes(exemple()); setFichier("exemple-liste-exetat.xlsx"); }}>Essayer avec un exemple</Btn>
              <Btn variante="discret" onClick={() => exporterExcel("exemple-liste-exetat.xlsx", [{ nom: "Exetat", lignes: exemple() }])}><Download className="size-4" /> Modèle de fichier</Btn>
            </div>
            <input ref={input} type="file" accept=".xlsx,.xls,.csv" hidden onChange={(e) => e.target.files?.[0] && charger(e.target.files[0])} />
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b border-sand-200 p-5 sm:px-6">
            <div className="mr-auto">
              <p className="font-bold">{fichier}</p>
              <p className="text-sm text-muted">{analyse.length} lignes lues</p>
            </div>
            <Pastille ton="vert"><CheckCircle2 className="size-3" /> {bons.length} à importer</Pastille>
            {compte("doublon_fichier") + compte("doublon_cohorte") > 0 && <Pastille ton="ambre"><AlertTriangle className="size-3" /> {compte("doublon_fichier") + compte("doublon_cohorte")} doublons</Pastille>}
            {compte("sous_seuil") > 0 && <Pastille>{compte("sous_seuil")} sous {cohorte.seuil_exetat} %</Pastille>}
            {bons.filter((b) => b.alerte).length > 0 && <Pastille ton="rouge">{bons.filter((b) => b.alerte).length} sans téléphone</Pastille>}
          </div>
          <div className="scroll-fin max-h-[52vh] overflow-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="sticky top-0 bg-sand-50 text-left text-xs font-semibold text-muted">
                <tr><th className="px-5 py-2.5">Élève</th><th className="px-3">École</th><th className="px-3">Exetat</th><th className="px-3">Téléphone</th><th className="px-3">Verdict</th></tr>
              </thead>
              <tbody className="divide-y divide-sand-100">
                {analyse.map((a) => (
                  <tr key={a.i} className={cx(a.probleme && "bg-sand-50 text-muted")}>
                    <td className="px-5 py-2.5 font-semibold">{a.c.prenom} {a.c.nom} {a.c.postnom} <span className="font-normal text-muted">· {a.c.sexe}</span></td>
                    <td className="px-3">{a.c.ecole}</td>
                    <td className="tabular px-3 font-bold">{a.c.pourcentage_exetat} %</td>
                    <td className="tabular px-3">{a.c.telephone || "—"}</td>
                    <td className="px-3">{a.probleme ? <Pastille ton={LIB[a.probleme][1]}>{LIB[a.probleme][0]}</Pastille> : a.alerte ? <Pastille ton="rouge">{a.alerte}</Pastille> : <Pastille ton="vert">OK</Pastille>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center gap-4 border-t border-sand-200 p-5 sm:px-6">
            <label className="mr-auto flex items-center gap-2.5 text-sm font-semibold">
              <input type="checkbox" className="size-4 accent-brand-600" checked={inviter} onChange={(e) => setInviter(e.target.checked)} />
              Envoyer l&apos;invitation par SMS dès l&apos;import
            </label>
            <Btn variante="secondaire" onClick={() => setLignes(null)}>Annuler</Btn>
            <Btn disabled={!bons.length} onClick={importer}>Importer {bons.length} élèves</Btn>
          </div>
        </Card>
      )}
    </>
  );
}
