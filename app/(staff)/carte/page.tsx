"use client";
import { useMemo, useState } from "react";
import { useQuery } from "@/components/commun";
import { MapView, esc, type Point } from "@/components/MapView";
import { Card, Entete, cx } from "@/components/ui";
import { position } from "@/lib/geo";
import { nomComplet } from "@/lib/logic";
import { useStore } from "@/lib/store";
import { STATUTS, statutInfo, type Statut } from "@/lib/types";

function Case({ label, coche, onChange }: { label: string; coche: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2.5 text-sm font-semibold">
      <input type="checkbox" className="size-4 accent-brand-600" checked={coche} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

export default function Carte() {
  const q0 = useQuery();
  const db = useStore((s) => s.db);
  const [couches, setCouches] = useState({ eleves: true, agences: true, centres: true, chaleur: false, liens: q0.get("liens") === "1" });
  const [masques, setMasques] = useState<Set<Statut>>(new Set(["non_retenu", "desiste"]));

  const { points, lignes, chaleur, communes, sansGps } = useMemo(() => {
    const pts: Point[] = [];
    const occ: Record<string, number> = {};
    for (const a of db.affectations) occ[a.agence_id] = (occ[a.agence_id] ?? 0) + 1;
    const visibles = db.candidats.filter((c) => !c.anonymise && !masques.has(c.statut));
    if (couches.eleves)
      for (const c of visibles) {
        const p = position(c);
        if (!p) continue;
        const s = statutInfo(c.statut);
        // Sans GPS, on disperse légèrement autour du centre de la commune pour que les points restent visibles.
        const j = c.lat == null ? [(parseInt(c.id.slice(0, 4), 16) / 65535 - 0.5) * 0.012, (parseInt(c.id.slice(4, 8), 16) / 65535 - 0.5) * 0.012] : [0, 0];
        pts.push({ lat: p[0] + j[0], lng: p[1] + j[1], couleur: s.couleur, type: "eleve", html: `<b>${esc(nomComplet(c))}</b><br>${esc(s.label)} · ${esc(c.commune)}${c.lat == null ? "<br><i>Position estimée (GPS manquant)</i>" : ""}<br><a href="/candidats/${c.id}" style="color:#a32a29;font-weight:700">Ouvrir le dossier</a>` });
      }
    if (couches.agences)
      for (const a of db.agences) {
        const n = occ[a.id] ?? 0;
        pts.push({ lat: a.lat, lng: a.lng, couleur: n >= a.capacite ? "#1d1513" : "#a32a29", type: "agence", texte: `${n}/${a.capacite}`, html: `<b>Agence ${esc(a.nom)}</b><br>${esc(a.adresse)}<br>${n} stagiaire(s) pour ${a.capacite} places<br>Chef d'agence : ${esc(a.chef_nom)}${a.position_verifiee ? "" : "<br><i>Position à vérifier</i>"}` });
      }
    if (couches.centres)
      for (const c of db.centres) pts.push({ lat: c.lat, lng: c.lng, couleur: c.type === "hotel" ? "#c8963e" : "#7c3aed", type: c.type === "hotel" ? "hotel" : "centre", texte: c.type === "hotel" ? "H" : "T", html: `<b>${esc(c.nom)}</b><br>${esc(c.adresse)}<br>${c.capacite} places` });
    const parId = new Map(db.candidats.map((c) => [c.id, c]));
    const ls: [number, number, number, number][] = [];
    if (couches.liens)
      for (const a of db.affectations) {
        const c = parId.get(a.candidat_id);
        const ag = db.agences.find((x) => x.id === a.agence_id);
        const p = c && position(c);
        if (p && ag) ls.push([p[0], p[1], ag.lat, ag.lng]);
      }
    const parCommune = new Map<string, number>();
    for (const c of visibles) parCommune.set(c.commune, (parCommune.get(c.commune) ?? 0) + 1);
    return {
      points: pts,
      lignes: ls,
      chaleur: couches.chaleur ? db.candidats.filter((c) => c.inscrit_le).map((c) => position(c)).filter(Boolean) as [number, number][] : null,
      communes: [...parCommune.entries()].sort((a, b) => b[1] - a[1]),
      sansGps: visibles.filter((c) => c.lat == null).length,
    };
  }, [db, couches, masques]);

  return (
    <>
      <Entete titre="Carte" sous="Tous les ELP, les agences, les centres de test et l'hôtel sur une seule carte de Kinshasa." />
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <Card className="overflow-hidden p-1.5">
          <MapView points={points} lignes={lignes} chaleur={chaleur} className="h-[70vh] min-h-[440px] w-full rounded-xl" />
        </Card>
        <div className="space-y-4">
          <Card className="space-y-3 p-5">
            <h2 className="font-bold">Couches</h2>
            <Case label="Élèves, colorés par statut" coche={couches.eleves} onChange={(v) => setCouches({ ...couches, eleves: v })} />
            <Case label="Agences et places occupées" coche={couches.agences} onChange={(v) => setCouches({ ...couches, agences: v })} />
            <Case label="Centres de test et hôtel" coche={couches.centres} onChange={(v) => setCouches({ ...couches, centres: v })} />
            <Case label="Carte de chaleur des inscriptions" coche={couches.chaleur} onChange={(v) => setCouches({ ...couches, chaleur: v })} />
            <Case label="Trajets domicile → agence" coche={couches.liens} onChange={(v) => setCouches({ ...couches, liens: v })} />
          </Card>
          <Card className="p-5">
            <h2 className="mb-3 font-bold">Statuts affichés</h2>
            <div className="flex flex-wrap gap-1.5">
              {STATUTS.map((s) => {
                const n = db.candidats.filter((c) => c.statut === s.id).length;
                if (!n) return null;
                const cache = masques.has(s.id);
                return (
                  <button key={s.id} aria-pressed={!cache} onClick={() => setMasques((m) => { const x = new Set(m); if (cache) x.delete(s.id); else x.add(s.id); return x; })} className={cx("flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition", cache ? "border-sand-200 text-muted opacity-60" : "border-transparent bg-sand-100")}>
                    <span className="size-2 rounded-full" style={{ background: s.couleur }} />{s.court} <span className="tabular text-muted">{n}</span>
                  </button>
                );
              })}
            </div>
            {sansGps > 0 && <p className="mt-3 text-xs text-muted">{sansGps} élèves sans GPS sont placés au centre de leur commune.</p>}
          </Card>
          <Card className="p-5">
            <h2 className="mb-3 font-bold">Par commune</h2>
            <ul className="space-y-2">
              {communes.slice(0, 9).map(([nom, n]) => (
                <li key={nom} className="text-[13px]">
                  <div className="flex justify-between font-semibold"><span>{nom}</span><span className="tabular">{n}</span></div>
                  <div className="mt-1 h-1.5 rounded-full bg-sand-200"><div className="h-full rounded-full bg-brand-500" style={{ width: `${(n / communes[0][1]) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
