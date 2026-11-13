"use client";
import QRCode from "qrcode";
import { useEffect, useMemo, useState } from "react";
import { completude, nomComplet } from "@/lib/logic";
import { COUT_USD, MODELES, modele, remplir, segments } from "@/lib/modeles";
import { construireMessage, envoyer } from "@/lib/ops";
import { useStore } from "@/lib/store";
import type { Canal, Candidat } from "@/lib/types";
import { Btn, Champ, Modale, champ, cx, toast } from "./ui";

/** Paramètres d'URL lus une seule fois (les pages ne sont rendues que dans le navigateur). */
export function useQuery(): URLSearchParams {
  return useState(() => new URLSearchParams(typeof window === "undefined" ? "" : window.location.search))[0];
}

export function QR({ valeur, taille = 160, className }: { valeur: string; taille?: number; className?: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    QRCode.toDataURL(valeur, { margin: 1, width: taille * 2, errorCorrectionLevel: "M", color: { dark: "#1d1513", light: "#ffffff" } }).then(setSrc);
  }, [valeur, taille]);
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} width={taille} height={taille} alt={`QR code ${valeur}`} className={className} /> : <div style={{ width: taille, height: taille }} className={cx("animate-pulse rounded-lg bg-sand-200", className)} />;
}

export function useCompletudes() {
  const candidats = useStore((s) => s.db.candidats);
  const documents = useStore((s) => s.db.documents);
  return useMemo(() => new Map(candidats.map((c) => [c.id, completude(c, documents)])), [candidats, documents]);
}

/** Composer un message pour un ou plusieurs élèves, avec aperçu et coût estimé. */
export function EnvoiModale({ cibles, onClose, modeleInitial = "libre" }: { cibles: Candidat[] | null; onClose: () => void; modeleInitial?: string }) {
  return cibles ? <Composer cibles={cibles} onClose={onClose} modeleInitial={modeleInitial} /> : null;
}

function Composer({ cibles, onClose, modeleInitial }: { cibles: Candidat[]; onClose: () => void; modeleInitial: string }) {
  const [modeleId, setModeleId] = useState(modeleInitial);
  const [canal, setCanal] = useState<Canal>("sms");
  const [texte, setTexte] = useState(modele(modeleInitial).texte);
  const m = modele(modeleId);
  const joignables = cibles.filter((c) => (m.destinataire === "parent" ? !!c.parent_telephone : !!c.telephone));
  const apercu = joignables[0] ? construireMessage(joignables[0], modeleId, canal, {}, texte).contenu : remplir(texte, {});
  const seg = canal === "sms" ? segments(apercu) : 1;
  const cout = joignables.length * seg * COUT_USD[canal];
  return (
    <Modale ouvert onClose={onClose} titre={`Message à ${cibles.length} ${cibles.length > 1 ? "élèves" : "élève"}`}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Champ label="Modèle">
            <select className={champ} value={modeleId} onChange={(e) => { setModeleId(e.target.value); setTexte(modele(e.target.value).texte); }}>
              {MODELES.filter((x) => x.destinataire !== "agence" && x.id !== "otp").map((x) => (
                <option key={x.id} value={x.id}>{x.nom}</option>
              ))}
            </select>
          </Champ>
          <Champ label="Canal">
            <select className={champ} value={canal} onChange={(e) => setCanal(e.target.value as Canal)}>
              <option value="sms">SMS</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="email">E-mail</option>
            </select>
          </Champ>
        </div>
        <Champ label={`Texte · envoyé ${m.destinataire === "parent" ? "au parent ou tuteur" : "à l'élève"}`} aide="Variables : {prenom} {nom} {lien} {date} {heure} {centre} {agence} {manquants}">
          <textarea className={cx(champ, "min-h-28")} value={texte} onChange={(e) => setTexte(e.target.value)} />
        </Champ>
        <div className="rounded-2xl bg-sand-100 p-4">
          <p className="mb-1 text-[11px] font-bold tracking-wide text-muted uppercase">Aperçu{joignables[0] ? ` · ${nomComplet(joignables[0])}` : ""}</p>
          <p className="text-sm leading-relaxed">{apercu || <span className="text-muted">Écrivez votre message…</span>}</p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
          <span>
            {joignables.length} destinataires joignables{joignables.length < cibles.length ? ` (${cibles.length - joignables.length} sans numéro)` : ""}
            {canal === "sms" && ` · ${apercu.length} caractères, ${seg} segment${seg > 1 ? "s" : ""}`} · coût estimé {cout.toFixed(2)} $
          </span>
          <Btn
            disabled={!texte.trim() || !joignables.length}
            onClick={() => {
              const n = envoyer(joignables, modeleId, canal, { texte, campagne: modeleId === "libre" ? "Message libre" : undefined });
              toast(`${n} message${n > 1 ? "s" : ""} envoyé${n > 1 ? "s" : ""} par ${canal.toUpperCase()}.`);
              onClose();
            }}
          >
            Envoyer
          </Btn>
        </div>
      </div>
    </Modale>
  );
}
