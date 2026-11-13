"use client";
import { CheckCircle2, Download, FileSpreadsheet, Upload } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { telecharger } from "@/components/commun";
import { Btn, Card, Entete, Pastille, cx, toast } from "@/components/ui";
import { COMMUNES, TOUTES_PROVINCES, position } from "@/lib/geo";
import { normaliser } from "@/lib/logic";
import { journaliser, majCandidat, saisirNote } from "@/lib/ops";
import { exporterCandidats, exporterTout, lignesCandidats } from "@/lib/exports";
import { uid, useCohorte, useStore, useVue } from "@/lib/store";
import { exporterExcel, lireFichier, type Ligne } from "@/lib/tableur";
import type { Agence, Candidat } from "@/lib/types";

type Sorte = "notes" | "maj" | "agences";

/** Trouve une valeur dans une ligne, quel que soit l'intitulé exact de la colonne. */
function lire(l: Ligne, noms: string[]): string {
  const k = Object.keys(l).find((x) => noms.some((n) => normaliser(x) === normaliser(n))) ?? Object.keys(l).find((x) => noms.some((n) => normaliser(x).startsWith(normaliser(n))));
  return k == null || l[k] == null ? "" : String(l[k]).trim();
}
const nombre = (v: string) => parseFloat(v.replace(",", "."));

interface Apercu { sorte: Sorte; fichier: string; lignes: Ligne[]; ok: number; ignores: string[]; appliquer: () => string }

export default function Echanges() {
  const vue = useVue();
  const db = useStore((s) => s.db);
  const put = useStore((s) => s.put);
  const cohorte = useCohorte();
  const [apercu, setApercu] = useState<Apercu | null>(null);
  const inputs = { notes: useRef<HTMLInputElement>(null), maj: useRef<HTMLInputElement>(null), agences: useRef<HTMLInputElement>(null) };
  const parCode = new Map(db.candidats.map((c) => [c.code.toUpperCase(), c]));

  const analyser = async (sorte: Sorte, f: File) => {
    let lignes: Ligne[];
    try { lignes = await lireFichier(f); } catch { return toast("Impossible de lire ce fichier (.xlsx, .xls ou .csv).", "erreur"); }
    const ignores: string[] = [];
    if (sorte === "notes") {
      const valides = lignes.filter((l, i) => {
        const c = parCode.get(lire(l, ["code", "dossier"]).toUpperCase());
        const e = nombre(lire(l, ["écrit", "ecrit"])), o = nombre(lire(l, ["entretien", "oral"]));
        if (!c) ignores.push(`Ligne ${i + 2} : code inconnu`);
        else if (isNaN(e) || isNaN(o) || e < 0 || e > 60 || o < 0 || o > 40) ignores.push(`Ligne ${i + 2} : notes invalides (écrit sur 60, entretien sur 40)`);
        else return true;
        return false;
      });
      setApercu({ sorte, fichier: f.name, lignes, ok: valides.length, ignores, appliquer: () => { for (const l of valides) saisirNote(parCode.get(lire(l, ["code", "dossier"]).toUpperCase())!.id, nombre(lire(l, ["écrit", "ecrit"])), nombre(lire(l, ["entretien", "oral"]))); journaliser(`Import de ${valides.length} notes`, f.name); return `${valides.length} notes enregistrées.`; } });
    }
    if (sorte === "maj") {
      const CHAMPS: [keyof Candidat, string[]][] = [["email", ["email", "e-mail", "courriel"]], ["telephone", ["téléphone", "telephone", "tel"]], ["adresse", ["adresse"]], ["province", ["province"]], ["commune", ["commune"]], ["ecole", ["école", "ecole"]], ["section", ["section"]], ["universite", ["université", "universite"]], ["parent_nom", ["parent ou tuteur", "parent"]], ["parent_telephone", ["téléphone du parent", "telephone du parent"]], ["parent_email", ["email du parent"]]];
      const maj: [Candidat, Partial<Candidat>][] = [];
      lignes.forEach((l, i) => {
        const c = parCode.get(lire(l, ["code", "dossier"]).toUpperCase());
        if (!c) return void ignores.push(`Ligne ${i + 2} : code inconnu`);
        const patch: Partial<Candidat> = {};
        for (const [cle, noms] of CHAMPS) { const v = lire(l, noms); if (v && v !== String(c[cle] ?? "")) (patch as Record<string, string>)[cle] = cle === "email" || cle === "parent_email" ? v.toLowerCase() : v; }
        const chap = lire(l, ["chapitre"]);
        if (chap) { const k = db.chapitres.find((x) => normaliser(x.nom) === normaliser(chap)); if (k && k.id !== c.chapitre_id) patch.chapitre_id = k.id; else if (!k) ignores.push(`Ligne ${i + 2} : chapitre « ${chap} » inconnu (à créer d'abord)`); }
        if (Object.keys(patch).length) maj.push([c, patch]);
      });
      setApercu({ sorte, fichier: f.name, lignes, ok: maj.length, ignores, appliquer: () => { for (const [c, p] of maj) majCandidat(c, { ...p, ...(p.email ? { contact_invalide: false } : {}) }); journaliser(`Mise à jour de ${maj.length} dossiers par fichier`, f.name); return `${maj.length} dossiers mis à jour.`; } });
    }
    if (sorte === "agences") {
      const rows: Agence[] = [];
      lignes.forEach((l, i) => {
        const nom = lire(l, ["agence", "nom"]);
        const lat = nombre(lire(l, ["latitude", "lat"])), lng = nombre(lire(l, ["longitude", "lng", "lon"]));
        const com = COMMUNES.find((x) => normaliser(x.nom) === normaliser(lire(l, ["commune"])));
        const province = TOUTES_PROVINCES.find((p) => normaliser(p) === normaliser(lire(l, ["province"]))) ?? com?.province ?? "";
        const pos = !isNaN(lat) && !isNaN(lng) ? [lat, lng] : com ? position({ lat: null, lng: null, commune: com.nom, province: com.province }) : null;
        if (!nom) return void ignores.push(`Ligne ${i + 2} : nom de l'agence manquant`);
        if (!pos) return void ignores.push(`Ligne ${i + 2} : ni coordonnées ni commune connue`);
        const existante = db.agences.find((a) => normaliser(a.nom) === normaliser(nom));
        rows.push({ id: existante?.id ?? uid(), nom, province, commune: com?.nom ?? lire(l, ["commune"]), adresse: lire(l, ["adresse"]), lat: pos[0], lng: pos[1], capacite: Math.max(0, Math.round(nombre(lire(l, ["places", "capacité", "capacite"])) || 3)), chef_nom: lire(l, ["chef d'agence", "chef"]), chef_email: lire(l, ["email du chef", "email"]).toLowerCase(), chef_telephone: lire(l, ["téléphone du chef", "téléphone", "telephone"]), position_verifiee: !isNaN(lat) });
      });
      setApercu({ sorte, fichier: f.name, lignes, ok: rows.length, ignores, appliquer: () => { put("agences", rows); journaliser(`Import de ${rows.length} agences`, f.name); return `${rows.length} agences ajoutées ou mises à jour.`; } });
    }
  };

  const modeles: Record<Sorte, () => void> = {
    notes: () => exporterExcel("modele-notes.xlsx", [{ nom: "Notes", lignes: vue.candidats.filter((c) => db.convocations.some((k) => k.candidat_id === c.id && k.present)).slice(0, 400).map((c) => ({ Code: c.code, Élève: `${c.prenom} ${c.nom}`, Écrit: null, Entretien: null })) }]),
    maj: () => exporterCandidats("dossiers-a-completer.xlsx", vue.candidats, db),
    agences: () => exporterExcel("agences.xlsx", [{ nom: "Agences", lignes: db.agences.map((a) => ({ Agence: a.nom, Province: a.province, Commune: a.commune, Adresse: a.adresse, Latitude: a.lat, Longitude: a.lng, Places: a.capacite, "Chef d'agence": a.chef_nom, "Email du chef": a.chef_email, "Téléphone du chef": a.chef_telephone })) }]),
  };

  const IMPORTS: { sorte: Sorte; titre: string; detail: string; modele: string }[] = [
    { sorte: "notes", titre: "Notes du test", detail: "Colonnes : Code, Écrit (sur 60), Entretien (sur 40). Le modèle est pré-rempli avec les candidats émargés.", modele: "Modèle pré-rempli" },
    { sorte: "maj", titre: "Mise à jour de dossiers", detail: "Exportez la liste, corrigez ou complétez dans Excel (e-mail, téléphone, adresse, université, chapitre…), puis réimportez : seules les cases modifiées sont prises en compte.", modele: "Exporter la liste à modifier" },
    { sorte: "agences", titre: "Agences EquityBCDC", detail: "Colonnes : Agence, Province, Commune, Adresse, Latitude, Longitude, Places, Chef d'agence, Email du chef. Une agence au même nom est mise à jour.", modele: "Exporter les agences" },
  ];

  return (
    <>
      <Entete titre="Import et export" sous="Tout se fait en Excel : exportez, travaillez dans le tableur, réimportez. Les colonnes sont reconnues même si leur ordre ou leur intitulé change un peu." />

      <h2 className="mb-3 text-sm font-bold tracking-wide text-muted uppercase">Exporter</h2>
      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { t: "Classeur complet", d: "Candidats, cohortes, notes, stages, agences, chapitres et présences, une feuille chacun.", f: () => exporterTout(`elp-hub-${new Date().toISOString().slice(0, 10)}.xlsx`, vue) },
          { t: "Liste des candidats", d: `${vue.candidats.length} dossiers de la vue actuelle${cohorte ? ` (${cohorte.nom})` : ""}.`, f: () => exporterCandidats("candidats.xlsx", vue.candidats, vue) },
          { t: "CSV pour un autre outil", d: "Même liste en CSV (séparateur point-virgule, accents conservés), pour Google Sheets ou un autre logiciel.", f: () => { const l = lignesCandidats(vue.candidats, vue); const cles = Object.keys(l[0] ?? {}); telecharger("candidats.csv", "﻿" + [cles.join(";"), ...l.map((x) => cles.map((k) => `"${String(x[k] ?? "").replace(/"/g, '""')}"`).join(";"))].join("\n"), "text/csv"); } },
          { t: "Sauvegarde complète", d: "Toutes les données en un fichier JSON, pour archivage ou transfert vers la base de production.", f: () => telecharger(`elp-hub-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(db), "application/json") },
        ].map((x) => (
          <Card key={x.t} className="flex flex-col p-5">
            <FileSpreadsheet className="size-5 text-brand-600" />
            <p className="mt-3 font-bold">{x.t}</p>
            <p className="mt-1 flex-1 text-[13px] text-muted">{x.d}</p>
            <Btn petit variante="secondaire" className="mt-4" onClick={() => { void x.f(); journaliser(`Export : ${x.t}`, cohorte?.nom ?? "Toutes les cohortes"); }}><Download className="size-3.5" /> Télécharger</Btn>
          </Card>
        ))}
      </div>

      <h2 className="mb-3 text-sm font-bold tracking-wide text-muted uppercase">Importer</h2>
      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="flex flex-col p-5">
          <p className="font-bold">Liste de l&apos;Exetat</p>
          <p className="mt-1 flex-1 text-[13px] text-muted">Nouveaux élèves d&apos;une cohorte, avec repérage des doublons et du seuil avant toute invitation.</p>
          <Link href="/cohortes" className="mt-4"><Btn petit className="w-full"><Upload className="size-3.5" /> Aller à l&apos;import Exetat</Btn></Link>
        </Card>
        {IMPORTS.map((x) => (
          <Card key={x.sorte} className="flex flex-col p-5">
            <p className="font-bold">{x.titre}</p>
            <p className="mt-1 flex-1 text-[13px] text-muted">{x.detail}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Btn petit onClick={() => inputs[x.sorte].current?.click()}><Upload className="size-3.5" /> Importer</Btn>
              <Btn petit variante="discret" onClick={() => void modeles[x.sorte]()}><Download className="size-3.5" /> {x.modele}</Btn>
            </div>
            <input ref={inputs[x.sorte]} type="file" accept=".xlsx,.xls,.csv" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void analyser(x.sorte, f); e.target.value = ""; }} />
          </Card>
        ))}
      </div>

      {apercu && (
        <Card className="animate-in mt-6 p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-3">
            <p className="mr-auto font-bold">{apercu.fichier} <span className="font-normal text-muted">· {apercu.lignes.length} lignes lues</span></p>
            <Pastille ton="vert"><CheckCircle2 className="size-3" /> {apercu.ok} à appliquer</Pastille>
            {apercu.ignores.length > 0 && <Pastille ton="ambre">{apercu.ignores.length} lignes ignorées</Pastille>}
          </div>
          {apercu.ignores.length > 0 && <ul className={cx("scroll-fin mt-3 max-h-40 space-y-1 overflow-y-auto rounded-xl bg-sand-100 p-3 text-xs text-muted")}>{apercu.ignores.slice(0, 100).map((x) => <li key={x}>{x}</li>)}</ul>}
          <div className="mt-4 flex justify-end gap-2">
            <Btn variante="secondaire" onClick={() => setApercu(null)}>Annuler</Btn>
            <Btn disabled={!apercu.ok} onClick={() => { toast(apercu.appliquer()); setApercu(null); }}>Appliquer</Btn>
          </div>
        </Card>
      )}
    </>
  );
}
