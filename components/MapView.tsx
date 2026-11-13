"use client";
import "leaflet/dist/leaflet.css";
import type { LayerGroup, Map as LMap } from "leaflet";
import { useEffect, useRef, useState } from "react";
import { KINSHASA } from "@/lib/geo";

export interface Point {
  lat: number;
  lng: number;
  couleur: string;
  html: string; // contenu de l'infobulle, déjà échappé
  type?: "eleve" | "agence" | "centre" | "hotel";
  texte?: string;
}

export const esc = (s: string | number | null | undefined) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

type Carte = { map: LMap; calque: LayerGroup; L: typeof import("leaflet") };

export function MapView({ points, lignes, chaleur = null, className, onPick }: { points: Point[]; lignes?: [number, number, number, number][]; chaleur?: [number, number][] | null; className?: string; onPick?: (lat: number, lng: number) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const pick = useRef(onPick);
  const [carte, setCarte] = useState<Carte | null>(null);

  useEffect(() => {
    pick.current = onPick;
  }, [onPick]);

  useEffect(() => {
    let annule = false;
    let map: LMap | null = null;
    (async () => {
      const L = (await import("leaflet")).default;
      (window as unknown as { L: unknown }).L = L;
      await import("leaflet.heat");
      if (annule || !el.current) return;
      map = L.map(el.current).setView(KINSHASA, 12);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "© OpenStreetMap" }).addTo(map);
      map.on("click", (e) => pick.current?.(e.latlng.lat, e.latlng.lng));
      setCarte({ map, calque: L.layerGroup().addTo(map), L });
    })();
    return () => {
      annule = true;
      map?.remove();
      setCarte(null);
    };
  }, []);

  useEffect(() => {
    if (!carte) return;
    const { L, calque } = carte;
    calque.clearLayers();
    if (chaleur?.length) {
      const heatLayer = (L as unknown as { heatLayer: (p: [number, number, number][], o: object) => import("leaflet").Layer }).heatLayer;
      calque.addLayer(heatLayer(chaleur.map(([a, b]) => [a, b, 0.6]), { radius: 28, blur: 22, maxZoom: 13, gradient: { 0.3: "#e2b662", 0.6: "#cd6c65", 1: "#862020" } }));
    }
    for (const [a, b, c, d] of lignes ?? []) calque.addLayer(L.polyline([[a, b], [c, d]], { color: "#a32a29", weight: 2, opacity: 0.7, dashArray: "4 4" }));
    for (const p of points) {
      const gros = p.type && p.type !== "eleve";
      const t = gros ? 30 : 14;
      const icon = L.divIcon({ className: "", iconSize: [t, t], iconAnchor: [t / 2, t / 2], html: `<div class="pin ${gros ? "pin-carre" : ""}" style="width:${t}px;height:${t}px;background:${p.couleur}">${esc(p.texte ?? "")}</div>` });
      calque.addLayer(L.marker([p.lat, p.lng], { icon, zIndexOffset: gros ? 500 : 0 }).bindPopup(p.html));
    }
  }, [carte, points, lignes, chaleur]);

  return <div ref={el} className={className} />;
}
