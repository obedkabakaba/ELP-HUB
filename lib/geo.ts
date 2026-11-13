// Géographie de Kinshasa : centres approximatifs des communes (pour la démo).

export interface Commune {
  nom: string;
  lat: number;
  lng: number;
  poids: number; // poids dans le tirage des domiciles fictifs
}

export const COMMUNES: Commune[] = [
  { nom: "Gombe", lat: -4.303, lng: 15.303, poids: 3 },
  { nom: "Barumbu", lat: -4.317, lng: 15.325, poids: 3 },
  { nom: "Kinshasa", lat: -4.325, lng: 15.312, poids: 3 },
  { nom: "Lingwala", lat: -4.322, lng: 15.298, poids: 3 },
  { nom: "Kintambo", lat: -4.329, lng: 15.272, poids: 4 },
  { nom: "Ngaliema", lat: -4.365, lng: 15.245, poids: 9 },
  { nom: "Bandalungwa", lat: -4.343, lng: 15.283, poids: 5 },
  { nom: "Kasa-Vubu", lat: -4.34, lng: 15.305, poids: 4 },
  { nom: "Kalamu", lat: -4.348, lng: 15.318, poids: 6 },
  { nom: "Ngiri-Ngiri", lat: -4.35, lng: 15.298, poids: 3 },
  { nom: "Bumbu", lat: -4.372, lng: 15.297, poids: 4 },
  { nom: "Makala", lat: -4.38, lng: 15.31, poids: 3 },
  { nom: "Selembao", lat: -4.385, lng: 15.285, poids: 4 },
  { nom: "Mont-Ngafula", lat: -4.445, lng: 15.255, poids: 5 },
  { nom: "Lemba", lat: -4.385, lng: 15.335, poids: 8 },
  { nom: "Ngaba", lat: -4.378, lng: 15.322, poids: 3 },
  { nom: "Limete", lat: -4.36, lng: 15.345, poids: 8 },
  { nom: "Matete", lat: -4.385, lng: 15.36, poids: 5 },
  { nom: "Kisenso", lat: -4.41, lng: 15.35, poids: 3 },
  { nom: "Ndjili", lat: -4.395, lng: 15.385, poids: 7 },
  { nom: "Masina", lat: -4.385, lng: 15.405, poids: 9 },
  { nom: "Kimbanseke", lat: -4.42, lng: 15.41, poids: 7 },
  { nom: "Nsele", lat: -4.375, lng: 15.495, poids: 2 },
  { nom: "Maluku", lat: -4.05, lng: 15.55, poids: 0 },
];

export const KINSHASA: [number, number] = [-4.365, 15.33];

export function commune(nom: string): Commune | undefined {
  return COMMUNES.find((c) => c.nom === nom);
}

export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Position utilisable d'un candidat : son GPS, sinon le centre de sa commune. */
export function position(c: { lat: number | null; lng: number | null; commune: string }): [number, number] | null {
  if (c.lat != null && c.lng != null) return [c.lat, c.lng];
  const k = commune(c.commune);
  return k ? [k.lat, k.lng] : null;
}
