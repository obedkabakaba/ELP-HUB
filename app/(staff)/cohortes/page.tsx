"use client";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Plus, Upload } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { Btn, Card, Champ, Entete, Modale, Pastille, champ, cx, toast } from "@/components/ui";
import { COMMUNES, TOUTES_PROVINCES } from "@/lib/geo";
import { normaliser } from "@/lib/logic";
import { envoyer, journaliser } from "@/lib/ops";
import { TOUTES, uid, useCohorte, useStore } from "@/lib/store";
import { exporterExcel, lireFichier, type Ligne } from "@/lib/tableur";
import { ETAPES, statutInfo, type Candidat, type Cohorte } from "@/lib/types";

const COLONNES: Record<string, string[]> = {
  nom: ["nom", "name", "nomdefamille"],
  postnom: ["postnom", "post-nom"],
  prenom: ["prenom", "firstname"],
  sexe: ["sexe", "genre", "sex"],
  ecole: ["ecole", "etablissement", "school"],
  section: ["section", "option", "filiere"],
  pourcentage: ["pourcentage", "pourcent", "pct", "resultat", "exetat", "note", "moyenne"],
  email: ["email", "e-mail", "mail", "courriel", "adresseemail"],
  telephone: ["telephone", "tel", "phone", "numero", "contact"],
  province: ["province", "region"],
  commune: ["commune", "ville", "localisation"],
};

function exemple(): Ligne[] {
  const base: [string, string, string, string, string, number, string, string, string, string][] = [
    ["Mbuyi", "Kalala", "Grâce", "F", "Lycée Lumière de Lemba", 87, "grace.mbuyi@exemple.cd", "+243 81 555 0101", "Kinshasa", "Lemba"],
    ["Ilunga", "Ngoy", "Daniel", "M", "Collège Avenir de Limete", 84, "daniel.ilunga@exemple.cd", "+243 82 555 0102", "Kinshasa", "Limete"],
    ["Makiese", "Luzolo", "Esther", "F", "Institut Elikya de Masina", 91, "esther.makiese@exemple.cd", "+243 99 555 0103", "Kinshasa", "Masina"],
    ["Kabongo", "Mutombo", "Trésor", "M", "Complexe scolaire Espoir de Lubumbashi", 82, "tresor.kabongo@exemple.cd", "+243 97 555 0104", "Haut-Katanga", "Lubumbashi"],
    ["Nzuzi", "Matondo", "Ruth", "F", "Lycée Bondeko de Kalamu", 79, "ruth.nzuzi@exemple.cd", "+243 85 555 0105", "Kinshasa", "Kalamu"],
    ["Mukendi", "Kazadi", "Samuel", "M", "Collège Mwinda de Ndjili", 88, "", "+243 81 555 0106", "Kinshasa", "Ndjili"],
    ["Mbuyi", "Kalala", "Grace", "F", "Lycée Lumière de Lemba", 87, "grace.mbuyi@exemple.cd", "+243 81 555 0101", "Kinshasa", "Lemba"],
    ["Lutete", "Nsimba", "Sarah", "F", "Institut Excellence de Goma", 93, "sarah.lutete@exemple.cd", "+243 84 555 0107", "Nord-Kivu", "Goma"],
    ["Bolamba", "Ekofo", "Josué", "M", "Lycée La Colombe de Kintambo", 76, "josue.bolamba@exemple.cd", "+243 89 555 0108", "Kinshasa", "Kintambo"],
    ["Kayembe", "Banza", "Dorcas", "F", "Collège Les Pionniers de Matadi", 85, "dorcas.kayembe@exemple.cd", "+243 81 555 0109", "Kongo-Central", "Matadi"],
    ["Tshibangu", "Mulumba", "Héritier", "M", "Institut Mont-Sinaï de Kimbanseke", 81, "heritier.tshibangu@exemple.cd", "+243 82 555 0110", "Kinshasa", "Kimbanseke"],
    ["Mavungu", "Kiala", "Naomie", "F", "Lycée Bosembo de Mont-Ngafula", 90, "naomie.mavungu@exemple.cd", "+243 99 555 0111", "Kinshasa", "Mont-Ngafula"],
    ["ILUNGA", "NGOY", "DANIEL", "M", "Collège Avenir de Limete", 84, "d.ilunga@exemple.cd", "+243 82 555 0199", "Kinshasa", "Limete"],
    ["Lukusa", "Ntumba", "Kevin", "M", "Complexe scolaire Sainte-Trinité de Gombe", 86, "kevin.lukusa@exemple.cd", "+243 97 555 0113", "Kinshasa", "Gombe"],
  ];
  return base.map(([Nom, Postnom, Prénom, Sexe, École, Pourcentage, Email, Téléphone, Province, Commune]) => ({ Nom, Postnom, Prénom, Sexe, École, Section: "Scientifique", Pourcentage, Email, Téléphone, Province, Commune }));
}

interface Analyse {
  i: number;
  c: Partial<Candidat> & { nom: string; prenom: string; pourcentage_exetat: number };
  probleme: "" | "doublon_fichier" | "doublon_cohorte" | "sous_seuil" | "sans_nom";
  alerte: string;
}
const LIB: Record<string, [string, "rouge" | "ambre" | "gris"]> = { doublon_fichier: ["Doublon dans le fichier", "ambre"], doublon_cohorte: ["Déjà dans la cohorte", "ambre"], sous_seuil: ["Sous le seuil", "gris"], sans_nom: ["Nom manquant", "rouge"] };

/** Où en est une cohorte : étape la plus avancée atteinte par ses élèves encore dans le parcours. */
function avancement(liste: Candidat[]) {
  const n = (s: string[]) => liste.filter((c) => s.includes(c.statut)).length;
  const etape = Math.max(1, ...liste.filter((c) => statutInfo(c.statut).etape > 0 && c.statut !== "non_retenu").map((c) => statutInfo(c.statut).etape));
  return {
    etape,
    total: liste.length,
    inscrits: liste.filter((c) => c.inscrit_le).length,
    retenus: n(["selectionne", "induction", "stage", "termine"]),
    filles: liste.filter((c) => c.sexe === "F" && ["selectionne", "induction", "stage", "termine"].includes(c.statut)).length,
    stage: n(["stage"]),
    termines: n(["termine"]),
    sortis: n(["desiste", "exclu"]),
  };
}

export default function Cohortes() {
  const db = useStore((s) => s.db);
  const put = useStore((s) => s.put);
  const set = useStore((s) => s.set);
  const cohorte = useCohorte();
  const [lignes, setLignes] = useState<Ligne[] | null>(null);
  const [fichier, setFichier] = useState("");
  const [inviter, setInviter] = useState(true);
  const [nouvelle, setNouvelle] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const pivot = useMemo(() => db.cohortes.slice().sort((a, b) => b.annee - a.annee).map((k) => ({ k, a: avancement(db.candidats.filter((c) => c.cohorte_id === k.id)) })), [db]);
  const provincesDe = (id: string) => [...new Set(db.candidats.filter((c) => c.cohorte_id === id).map((c) => c.province))].length;

  const analyse = useMemo<Analyse[]>(() => {
    if (!lignes || !cohorte) return [];
    const cles = Object.keys(lignes[0] ?? {});
    const col = (champ: string) => cles.find((k) => COLONNES[champ].some((a) => normaliser(k) === normaliser(a))) ?? cles.find((k) => COLONNES[champ].some((a) => normaliser(k).startsWith(normaliser(a))));
    const map = Object.fromEntries(Object.keys(COLONNES).map((k) => [k, col(k)]));
    const cle = (nom: string, postnom: string, prenom: string, ecole: string) => normaliser(nom + postnom + prenom) + "|" + normaliser(ecole);
    const deLaCohorte = db.candidats.filter((c) => c.cohorte_id === cohorte.id);
    const existants = new Set(deLaCohorte.map((c) => cle(c.nom, c.postnom, c.prenom, c.ecole)));
    const mails = new Set(deLaCohorte.map((c) => (c.email ?? "").toLowerCase()).filter(Boolean));
    const vus = new Set<string>();
    return lignes.map((l, i) => {
      const v = (k: string) => String((map[k] && l[map[k]!]) ?? "").trim();
      const pct = parseFloat(v("pourcentage").replace(",", ".")) || 0;
      const email = v("email").toLowerCase();
      const k = cle(v("nom"), v("postnom"), v("prenom"), v("ecole"));
      const sexe = /^(f|fille|fem)/i.test(v("sexe")) ? "F" : "M";
      const com = COMMUNES.find((x) => normaliser(x.nom) === normaliser(v("commune")));
      const province = TOUTES_PROVINCES.find((p) => normaliser(p) === normaliser(v("province"))) ?? com?.province ?? v("province");
      let probleme: Analyse["probleme"] = "";
      if (!v("nom") || !v("prenom")) probleme = "sans_nom";
      else if (vus.has(k)) probleme = "doublon_fichier";
      else if (existants.has(k) || (email && mails.has(email))) probleme = "doublon_cohorte";
      else if (pct < cohorte.seuil_exetat) probleme = "sous_seuil";
      vus.add(k);
      return { i, probleme, alerte: !probleme && !/^\S+@\S+\.\S+$/.test(email) ? "Sans e-mail : à joindre par téléphone" : "", c: { nom: v("nom"), postnom: v("postnom"), prenom: v("prenom"), sexe, ecole: v("ecole"), section: v("section"), pourcentage_exetat: pct, email: email || null, telephone: v("telephone"), province, commune: com?.nom ?? v("commune") } };
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
    if (!cohorte) return;
    const depart = Math.max(0, ...db.candidats.filter((c) => c.cohorte_id === cohorte.id).map((c) => +c.code.split("-")[1] || 0));
    const t = new Date().toISOString();
    const jeton = () => (Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 8)).slice(0, 12);
    const nouveaux = bons.map((a, n): Candidat => ({
      id: uid(), cohorte_id: cohorte.id, code: `ELP${String(cohorte.annee).slice(2)}-${String(depart + n + 1).padStart(4, "0")}`, nom: a.c.nom, postnom: a.c.postnom ?? "", prenom: a.c.prenom, sexe: a.c.sexe ?? "M", date_naissance: null, telephone: a.c.telephone ?? "", email: a.c.email ?? null, ecole: a.c.ecole ?? "", section: a.c.section ?? "", pourcentage_exetat: a.c.pourcentage_exetat, province: a.c.province ?? "", commune: a.c.commune ?? "", adresse: "", lat: null, lng: null, universite: "", chapitre_id: null, statut: "invite", statut_depuis: t, parent_nom: "", parent_lien: "", parent_telephone: "", parent_email: "", parent_token: jeton(), token: jeton(), allergies: "", urgence_nom: "", urgence_telephone: "", consentement_le: null, invite_le: inviter ? t : null, inscrit_le: null, derniere_activite: null, relances: 0, contact_invalide: false, motif_sortie: "", sorti_le: null, chambre: null, compte_ouvert: false, note_interne: "", anonymise: false, rang_attente: null,
    }));
    put("candidats", nouveaux);
    journaliser(`Import de la liste Exetat : ${nouveaux.length} élèves ajoutés, ${compte("doublon_fichier") + compte("doublon_cohorte")} doublons et ${compte("sous_seuil")} sous le seuil écartés`, cohorte.nom);
    if (inviter) envoyer(nouveaux.filter((c) => c.email), "invitation", "email", { campagne: `Invitations ${cohorte.nom}` });
    toast(`${nouveaux.length} élèves importés${inviter ? " et invités par e-mail" : ""}.`);
    setLignes(null);
  };

  const creer = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const annee = +String(f.get("annee"));
    const k: Cohorte = { id: uid(), nom: String(f.get("nom")).trim() || `ELP ${annee}`, annee, seuil_exetat: 80, places: +String(f.get("places")) || 40, taille_attente: 10, quota_filles: 50, statut: "active", created_at: new Date().toISOString() };
    put("cohortes", k);
    set({ cohorteId: k.id });
    journaliser("Création d'une cohorte", k.nom);
    setNouvelle(false);
    toast(`${k.nom} créée. Importez maintenant la liste de l'Exetat.`);
  };
  const reglage = (patch: Partial<Cohorte>) => cohorte && put("cohortes", { ...cohorte, ...patch });

  return (
    <>
      <Entete titre="Cohortes" sous="Une cohorte ne remplace pas la précédente : toutes restent ouvertes et suivies. Choisissez-en une pour y travailler, ou regardez-les toutes ensemble.">
        <Btn onClick={() => setNouvelle(true)}><Plus className="size-4" /> Nouvelle cohorte</Btn>
      </Entete>

      <Card className="mb-5 overflow-hidden">
        <div className="scroll-fin overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-sand-50 text-left text-xs font-semibold text-muted">
              <tr><th className="px-5 py-3">Cohorte</th><th>Où elle en est</th><th className="text-right">Présélectionnés</th><th className="text-right">Inscrits</th><th className="text-right">Retenus</th><th className="text-right">En stage</th><th className="text-right">Terminés</th><th className="text-right">Sortis</th><th className="pr-5" /></tr>
            </thead>
            <tbody className="divide-y divide-sand-100">
              {pivot.map(({ k, a }) => (
                <tr key={k.id} className={cx(cohorte?.id === k.id && "bg-brand-50")}>
                  <td className="px-5 py-3"><p className="font-extrabold">{k.nom}</p><p className="text-xs text-muted">{k.places} places · {provincesDe(k.id)} province{provincesDe(k.id) > 1 ? "s" : ""}</p></td>
                  <td className="w-56">
                    <p className="text-xs font-bold">Étape {a.etape} · {ETAPES[a.etape - 1].titre}</p>
                    <div className="mt-1.5 flex gap-0.5">{ETAPES.map((e) => <span key={e.n} className={cx("h-1.5 flex-1 rounded-full", e.n <= a.etape ? "bg-brand-600" : "bg-sand-200")} />)}</div>
                  </td>
                  <td className="tabular text-right font-bold">{a.total}</td>
                  <td className="tabular text-right">{a.inscrits}</td>
                  <td className="tabular text-right">{a.retenus ? <>{a.retenus} <span className="text-xs text-muted">({a.filles} F)</span></> : "—"}</td>
                  <td className="tabular text-right">{a.stage || "—"}</td>
                  <td className="tabular text-right">{a.termines || "—"}</td>
                  <td className="tabular text-right text-muted">{a.sortis || "—"}</td>
                  <td className="pr-5 text-right">{cohorte?.id === k.id ? <Pastille ton="marque">Affichée</Pastille> : <Btn petit variante="secondaire" onClick={() => set({ cohorteId: k.id })}>Ouvrir</Btn>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-sand-200 px-5 py-3 text-xs text-muted">
          <span>{db.cohortes.length} cohortes · {db.candidats.length} dossiers conservés au total</span>
          {cohorte && <button className="font-bold text-brand-600" onClick={() => set({ cohorteId: TOUTES })}>Regarder toutes les cohortes ensemble</button>}
        </div>
      </Card>

      {!cohorte ? (
        <Card className="p-6 text-center text-sm text-muted">Ouvrez une cohorte ci-dessus pour régler ses paramètres ou y importer une liste d&apos;élèves.</Card>
      ) : (
        <>
          <Card className="mb-4 p-5 sm:p-6">
            <h2 className="mb-4 font-bold">Règles de {cohorte.nom}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Champ label="Nom"><input className={champ} defaultValue={cohorte.nom} key={cohorte.id} onBlur={(e) => e.target.value.trim() && reglage({ nom: e.target.value.trim() })} /></Champ>
              <Champ label="Seuil Exetat (%)"><input type="number" min={50} max={100} className={champ} value={cohorte.seuil_exetat} onChange={(e) => reglage({ seuil_exetat: +e.target.value })} /></Champ>
              <Champ label="Places" aide="Aucune limite : mettez le nombre voulu"><input type="number" min={1} className={champ} value={cohorte.places} onChange={(e) => reglage({ places: Math.max(1, +e.target.value) })} /></Champ>
              <Champ label="Liste d'attente"><input type="number" min={0} className={champ} value={cohorte.taille_attente} onChange={(e) => reglage({ taille_attente: Math.max(0, +e.target.value) })} /></Champ>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl bg-sand-100 p-4">
              <label className="flex items-center gap-2.5 text-sm font-semibold"><input type="checkbox" className="size-4 accent-brand-600" checked={cohorte.quota_filles != null} onChange={(e) => reglage({ quota_filles: e.target.checked ? 50 : null })} /> Réserver une part des places aux filles</label>
              {cohorte.quota_filles != null ? (
                <label className="flex flex-1 items-center gap-3 text-sm"><input type="range" min={0} max={100} step={5} value={cohorte.quota_filles} onChange={(e) => reglage({ quota_filles: +e.target.value })} className="min-w-40 flex-1 accent-brand-600" aria-label="Part des places réservée aux filles" /><b className="tabular w-56">{cohorte.quota_filles} % filles · {100 - cohorte.quota_filles} % garçons</b></label>
              ) : <span className="text-sm text-muted">Pas de quota : les places vont aux meilleures notes, filles et garçons confondus.</span>}
            </div>
          </Card>

          {!lignes ? (
            <Card className="p-5 sm:p-6">
              <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) void charger(f); }} className="flex flex-col items-center rounded-2xl border-2 border-dashed border-sand-300 bg-sand-50 px-6 py-12 text-center">
                <span className="grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-600"><FileSpreadsheet className="size-7" /></span>
                <p className="mt-4 text-lg font-bold">Déposez la liste Exetat de {cohorte.nom}</p>
                <p className="mt-1 max-w-lg text-sm text-muted">Fichier Excel ou CSV. Les colonnes sont reconnues toutes seules, dans n&apos;importe quel ordre : nom, postnom, prénom, sexe, école, pourcentage, e-mail, téléphone, province, commune.</p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  <Btn onClick={() => input.current?.click()}><Upload className="size-4" /> Choisir un fichier</Btn>
                  <Btn variante="secondaire" onClick={() => { setLignes(exemple()); setFichier("exemple-liste-exetat.xlsx"); }}>Essayer avec un exemple</Btn>
                  <Btn variante="discret" onClick={() => exporterExcel("modele-liste-exetat.xlsx", [{ nom: "Exetat", lignes: exemple().slice(0, 3) }])}><Download className="size-4" /> Modèle de fichier</Btn>
                </div>
                <p className="mt-4 text-xs text-muted">Notes, agences, mises à jour de dossiers : voir <Link href="/echanges" className="font-bold text-brand-600">Import et export</Link>.</p>
                <input ref={input} type="file" accept=".xlsx,.xls,.csv" hidden onChange={(e) => e.target.files?.[0] && charger(e.target.files[0])} />
              </div>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="flex flex-wrap items-center gap-3 border-b border-sand-200 p-5 sm:px-6">
                <div className="mr-auto"><p className="font-bold">{fichier}</p><p className="text-sm text-muted">{analyse.length} lignes lues · import dans {cohorte.nom}</p></div>
                <Pastille ton="vert"><CheckCircle2 className="size-3" /> {bons.length} à importer</Pastille>
                {compte("doublon_fichier") + compte("doublon_cohorte") > 0 && <Pastille ton="ambre"><AlertTriangle className="size-3" /> {compte("doublon_fichier") + compte("doublon_cohorte")} doublons</Pastille>}
                {compte("sous_seuil") > 0 && <Pastille>{compte("sous_seuil")} sous {cohorte.seuil_exetat} %</Pastille>}
                {bons.filter((b) => b.alerte).length > 0 && <Pastille ton="rouge">{bons.filter((b) => b.alerte).length} sans e-mail</Pastille>}
              </div>
              <div className="scroll-fin max-h-[52vh] overflow-auto">
                <table className="w-full min-w-[820px] text-sm">
                  <thead className="sticky top-0 bg-sand-50 text-left text-xs font-semibold text-muted"><tr><th className="px-5 py-2.5">Élève</th><th className="px-3">École</th><th className="px-3">Province</th><th className="px-3">Exetat</th><th className="px-3">E-mail</th><th className="px-3">Verdict</th></tr></thead>
                  <tbody className="divide-y divide-sand-100">
                    {analyse.map((a) => (
                      <tr key={a.i} className={cx(a.probleme && "bg-sand-50 text-muted")}>
                        <td className="px-5 py-2.5 font-semibold">{a.c.prenom} {a.c.nom} {a.c.postnom} <span className="font-normal text-muted">· {a.c.sexe}</span></td>
                        <td className="px-3">{a.c.ecole}</td>
                        <td className="px-3">{a.c.province}</td>
                        <td className="tabular px-3 font-bold">{a.c.pourcentage_exetat} %</td>
                        <td className="px-3">{a.c.email || "—"}</td>
                        <td className="px-3">{a.probleme ? <Pastille ton={LIB[a.probleme][1]}>{LIB[a.probleme][0]}</Pastille> : a.alerte ? <Pastille ton="rouge">{a.alerte}</Pastille> : <Pastille ton="vert">OK</Pastille>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center gap-4 border-t border-sand-200 p-5 sm:px-6">
                <label className="mr-auto flex items-center gap-2.5 text-sm font-semibold"><input type="checkbox" className="size-4 accent-brand-600" checked={inviter} onChange={(e) => setInviter(e.target.checked)} /> Envoyer l&apos;invitation par e-mail dès l&apos;import</label>
                <Btn variante="secondaire" onClick={() => setLignes(null)}>Annuler</Btn>
                <Btn disabled={!bons.length} onClick={importer}>Importer {bons.length} élèves</Btn>
              </div>
            </Card>
          )}
        </>
      )}

      <Modale ouvert={nouvelle} onClose={() => setNouvelle(false)} titre="Nouvelle cohorte">
        <form onSubmit={creer} className="space-y-4">
          <p className="text-sm text-muted">Les cohortes précédentes restent ouvertes : elles continuent d&apos;être suivies en parallèle.</p>
          <div className="grid grid-cols-2 gap-3">
            <Champ label="Année"><input name="annee" type="number" required className={champ} defaultValue={Math.max(new Date().getFullYear(), ...db.cohortes.map((c) => c.annee)) + 1} /></Champ>
            <Champ label="Places"><input name="places" type="number" min={1} className={champ} defaultValue={40} /></Champ>
          </div>
          <Champ label="Nom (facultatif)" aide="Par défaut : « ELP » suivi de l'année"><input name="nom" className={champ} placeholder="ELP 2028" /></Champ>
          <Btn className="w-full">Créer la cohorte</Btn>
        </form>
      </Modale>
    </>
  );
}
