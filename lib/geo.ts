// Géographie de démonstration : provinces, villes et centres approximatifs des communes.

export interface Commune {
  nom: string;
  province: string;
  lat: number;
  lng: number;
  poids: number; // poids dans le tirage des domiciles fictifs
}

export const PROVINCES: { nom: string; ville: string; lat: number; lng: number; zoom: number }[] = [
  { nom: "Kinshasa", ville: "Kinshasa", lat: -4.365, lng: 15.33, zoom: 12 },
  { nom: "Haut-Katanga", ville: "Lubumbashi", lat: -11.665, lng: 27.48, zoom: 13 },
  { nom: "Nord-Kivu", ville: "Goma", lat: -1.675, lng: 29.225, zoom: 13 },
  { nom: "Kongo-Central", ville: "Matadi", lat: -5.825, lng: 13.46, zoom: 13 },
];
/** Autres provinces proposées dans les listes (sans données de démonstration). */
export const AUTRES_PROVINCES = ["Sud-Kivu", "Lualaba", "Tshopo", "Kasaï-Central", "Kasaï-Oriental", "Ituri", "Équateur", "Kwilu", "Maniema", "Tanganyika"];
export const TOUTES_PROVINCES = [...PROVINCES.map((p) => p.nom), ...AUTRES_PROVINCES];

const K = "Kinshasa";
export const COMMUNES: Commune[] = [
  { nom: "Gombe", province: K, lat: -4.303, lng: 15.303, poids: 3 },
  { nom: "Barumbu", province: K, lat: -4.317, lng: 15.325, poids: 3 },
  { nom: "Kinshasa", province: K, lat: -4.325, lng: 15.312, poids: 3 },
  { nom: "Lingwala", province: K, lat: -4.322, lng: 15.298, poids: 3 },
  { nom: "Kintambo", province: K, lat: -4.329, lng: 15.272, poids: 4 },
  { nom: "Ngaliema", province: K, lat: -4.365, lng: 15.245, poids: 9 },
  { nom: "Bandalungwa", province: K, lat: -4.343, lng: 15.283, poids: 5 },
  { nom: "Kasa-Vubu", province: K, lat: -4.34, lng: 15.305, poids: 4 },
  { nom: "Kalamu", province: K, lat: -4.348, lng: 15.318, poids: 6 },
  { nom: "Ngiri-Ngiri", province: K, lat: -4.35, lng: 15.298, poids: 3 },
  { nom: "Bumbu", province: K, lat: -4.372, lng: 15.297, poids: 4 },
  { nom: "Makala", province: K, lat: -4.38, lng: 15.31, poids: 3 },
  { nom: "Selembao", province: K, lat: -4.385, lng: 15.285, poids: 4 },
  { nom: "Mont-Ngafula", province: K, lat: -4.445, lng: 15.255, poids: 5 },
  { nom: "Lemba", province: K, lat: -4.385, lng: 15.335, poids: 8 },
  { nom: "Ngaba", province: K, lat: -4.378, lng: 15.322, poids: 3 },
  { nom: "Limete", province: K, lat: -4.36, lng: 15.345, poids: 8 },
  { nom: "Matete", province: K, lat: -4.385, lng: 15.36, poids: 5 },
  { nom: "Kisenso", province: K, lat: -4.41, lng: 15.35, poids: 3 },
  { nom: "Ndjili", province: K, lat: -4.395, lng: 15.385, poids: 7 },
  { nom: "Masina", province: K, lat: -4.385, lng: 15.405, poids: 9 },
  { nom: "Kimbanseke", province: K, lat: -4.42, lng: 15.41, poids: 7 },
  { nom: "Nsele", province: K, lat: -4.375, lng: 15.495, poids: 2 },
  { nom: "Maluku", province: K, lat: -4.05, lng: 15.55, poids: 0 },
  { nom: "Lubumbashi", province: "Haut-Katanga", lat: -11.664, lng: 27.482, poids: 5 },
  { nom: "Kenya", province: "Haut-Katanga", lat: -11.69, lng: 27.48, poids: 4 },
  { nom: "Katuba", province: "Haut-Katanga", lat: -11.7, lng: 27.455, poids: 4 },
  { nom: "Kampemba", province: "Haut-Katanga", lat: -11.66, lng: 27.52, poids: 5 },
  { nom: "Kamalondo", province: "Haut-Katanga", lat: -11.675, lng: 27.475, poids: 2 },
  { nom: "Ruashi", province: "Haut-Katanga", lat: -11.625, lng: 27.55, poids: 3 },
  { nom: "Annexe", province: "Haut-Katanga", lat: -11.62, lng: 27.44, poids: 3 },
  { nom: "Goma", province: "Nord-Kivu", lat: -1.679, lng: 29.228, poids: 6 },
  { nom: "Karisimbi", province: "Nord-Kivu", lat: -1.655, lng: 29.215, poids: 7 },
  { nom: "Matadi", province: "Kongo-Central", lat: -5.825, lng: 13.455, poids: 5 },
  { nom: "Nzanza", province: "Kongo-Central", lat: -5.835, lng: 13.47, poids: 4 },
  { nom: "Mvuzi", province: "Kongo-Central", lat: -5.845, lng: 13.445, poids: 4 },
];

export const KINSHASA: [number, number] = [-4.365, 15.33];

export function commune(nom: string, province?: string): Commune | undefined {
  return COMMUNES.find((c) => c.nom === nom && (!province || c.province === province)) ?? COMMUNES.find((c) => c.nom === nom);
}
export const communesDe = (province: string) => COMMUNES.filter((c) => c.province === province);

export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Position utilisable d'un candidat : son GPS, sinon le centre de sa commune, sinon sa ville. */
export function position(c: { lat: number | null; lng: number | null; commune: string; province?: string }): [number, number] | null {
  if (c.lat != null && c.lng != null) return [c.lat, c.lng];
  const k = commune(c.commune, c.province);
  if (k) return [k.lat, k.lng];
  const p = PROVINCES.find((x) => x.nom === c.province);
  return p ? [p.lat, p.lng] : null;
}
