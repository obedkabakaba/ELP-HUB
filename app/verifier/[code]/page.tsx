"use client";
import { BadgeCheck, ShieldAlert } from "lucide-react";
import { useParams } from "next/navigation";
import { Logo } from "@/components/ui";
import { fmtDate } from "@/lib/modeles";
import { useStore } from "@/lib/store";

/** Page ouverte en scannant le QR code d'une autorisation : le document est-il authentique ? */
export default function Verifier() {
  const { code } = useParams<{ code: string }>();
  const db = useStore((s) => s.db);
  const d = db.documents.find((x) => x.code_verification && x.code_verification === decodeURIComponent(code).toUpperCase());
  const c = d && db.candidats.find((x) => x.id === d.candidat_id);
  const initiales = (s: string) => s.split(" ").filter(Boolean).map((m) => m[0] + "•••").join(" ");
  return (
    <div className="grid min-h-dvh place-items-center bg-sand-100 p-5">
      <div className="w-full max-w-sm rounded-3xl bg-white p-7 text-center shadow-pop">
        <Logo taille={48} className="mx-auto" />
        {d && c ? (
          <>
            <BadgeCheck className="mx-auto mt-6 size-16 text-emerald-600" />
            <h1 className="mt-3 text-xl font-extrabold">Document authentique</h1>
            <p className="mt-1 text-sm text-muted">Autorisation parentale ELP</p>
            <dl className="mt-5 space-y-2 rounded-2xl bg-sand-100 p-4 text-left text-sm">
              <div className="flex justify-between gap-3"><dt className="text-muted">Élève</dt><dd className="font-bold">{c.prenom} {c.nom[0]}.</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">Signataire</dt><dd className="font-bold">{initiales(d.signe_par)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">Signé le</dt><dd className="font-bold">{fmtDate(d.signe_le!)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">Code</dt><dd className="tabular font-bold">{d.code_verification}</dd></div>
            </dl>
            <p className="mt-3 text-xs text-muted">Les noms sont masqués : cette page est publique.</p>
          </>
        ) : (
          <>
            <ShieldAlert className="mx-auto mt-6 size-16 text-rose-600" />
            <h1 className="mt-3 text-xl font-extrabold">Code inconnu</h1>
            <p className="mt-1 text-sm text-muted">Aucun document signé ne correspond au code « {decodeURIComponent(code)} ». Ne vous fiez pas à ce document.</p>
          </>
        )}
      </div>
    </div>
  );
}
