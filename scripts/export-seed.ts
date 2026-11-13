// Génère le fichier seed.sql du dépôt backend à partir des mêmes données
// fictives que la démo :  npx tsx scripts/export-seed.ts 3 > ../ELP-HUB-BAKEND/supabase/seed.sql
import { buildDemo } from "../lib/seed";
import { TABLES } from "../lib/types";

const etape = Number(process.argv[2] ?? 3);
const db = buildDemo(etape);
const lignes = [`-- Données 100 % fictives (cohorte de démonstration, étape ${etape}). Généré par ELP-HUB/scripts/export-seed.ts`, "begin;", "set local search_path to elp, extensions, public;"];
for (const t of TABLES) {
  const rows = (db[t] as unknown as Record<string, unknown>[]).map((r) => (t === "documents" ? { ...r, otp: null } : r));
  if (!rows.length) continue;
  for (let i = 0; i < rows.length; i += 200)
    lignes.push(`insert into ${t} select * from jsonb_populate_recordset(null::${t}, $elp$${JSON.stringify(rows.slice(i, i + 200))}$elp$::jsonb);`);
}
lignes.push("commit;");
console.log(lignes.join("\n"));
