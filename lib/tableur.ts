"use client";
// Lecture et écriture de fichiers Excel / CSV (bibliothèque chargée à la demande).
export type Ligne = Record<string, string | number | null>;

export async function lireFichier(f: File): Promise<Ligne[]> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(await f.arrayBuffer(), { type: "array" });
  return XLSX.utils.sheet_to_json<Ligne>(wb.Sheets[wb.SheetNames[0]], { defval: null, raw: false });
}

export async function exporterExcel(nom: string, feuilles: { nom: string; lignes: Ligne[] }[]): Promise<void> {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  for (const f of feuilles) {
    const ws = XLSX.utils.json_to_sheet(f.lignes);
    const cles = Object.keys(f.lignes[0] ?? {});
    ws["!cols"] = cles.map((k) => ({ wch: Math.min(40, Math.max(k.length, ...f.lignes.slice(0, 50).map((l) => String(l[k] ?? "").length)) + 2) }));
    XLSX.utils.book_append_sheet(wb, ws, f.nom.slice(0, 31));
  }
  XLSX.writeFile(wb, nom);
}
