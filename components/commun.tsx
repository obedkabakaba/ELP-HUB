"use client";
import QRCode from "qrcode";
import { useEffect, useMemo, useState } from "react";
import { completude, nomComplet } from "@/lib/logic";
import { COUT_USD, MODELES, NOM_CANAL, modele, segments } from "@/lib/modeles";
import { construireMessage, envoyer } from "@/lib/ops";
import { useStore } from "@/lib/store";
import { CANAUX_ACTIFS, type Canal, type Candidat } from "@/lib/types";
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

/** Télécharge un petit fichier produit dans le navigateur (CSV, JSON…). */
export function telecharger(nom: string, contenu: string, type = "text/plain") {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([contenu], { type: `${type};charset=utf-8` }));
  a.download = nom;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export function useCompletudes() {
  const candidats = useStore((s) => s.db.candidats);
  const documents = useStore((s) => s.db.documents);
  return useMemo(() => {
    const par = new Map<string, typeof documents>();
    for (const d of documents) par.set(d.candidat_id, [...(par.get(d.candidat_id) ?? []), d]);
    return new Map(candidats.map((c) => [c.id, completude(c, par.get(c.id) ?? [])]));
  }, [candidats, documents]);
}

/** Composer un message pour un ou plusieurs élèves, avec aperçu et coût estimé. */
export function EnvoiModale({ cibles, onClose, modeleInitial = "libre" }: { cibles: Candidat[] | null; onClose: () => void; modeleInitial?: string }) {
  return cibles ? <Composer cibles={cibles} onClose={onClose} modeleInitial={modeleInitial} /> : null;
}

function Composer({ cibles, onClose, modeleInitial }: { cibles: Candidat[]; onClose: () => void; modeleInitial: string }) {
  const [modeleId, setModeleId] = useState(modeleInitial);
  const [canal, setCanal] = useState<Canal>(CANAUX_ACTIFS[0]);
  const [objet, setObjet] = useState(modele(modeleInitial).objet);
  const [texte, setTexte] = useState(modele(modeleInitial).texte);
  const m = modele(modeleId);
  const parent = m.destinataire === "parent";
  const joignables = cibles.filter((c) => (canal === "email" ? (parent ? !!c.parent_email : !!c.email && !c.contact_invalide) : parent ? !!c.parent_telephone : !!c.telephone));
  const exemple = joignables[0] ? construireMessage(joignables[0], modeleId, canal, {}, texte, undefined, objet) : null;
  return (
    <Modale ouvert onClose={onClose} titre={`Message à ${cibles.length} ${cibles.length > 1 ? "personnes" : "personne"}`}>
      <div className="space-y-4">
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <Champ label="Modèle">
            <select className={champ} value={modeleId} onChange={(e) => { setModeleId(e.target.value); setTexte(modele(e.target.value).texte); setObjet(modele(e.target.value).objet); }}>
              {MODELES.filter((x) => x.destinataire !== "agence").map((x) => (
                <option key={x.id} value={x.id}>{x.nom}</option>
              ))}
            </select>
          </Champ>
          <Champ label="Canal">
            <select className={champ} value={canal} onChange={(e) => setCanal(e.target.value as Canal)}>
              {(["email", "sms", "whatsapp"] as Canal[]).map((k) => <option key={k} value={k} disabled={!CANAUX_ACTIFS.includes(k)}>{NOM_CANAL[k]}{CANAUX_ACTIFS.includes(k) ? "" : " (bientôt)"}</option>)}
            </select>
          </Champ>
        </div>
        <Champ label="Objet"><input className={champ} value={objet} onChange={(e) => setObjet(e.target.value)} /></Champ>
        <Champ label={`Texte · envoyé ${parent ? "au parent ou tuteur" : "à l'élève"}`} aide="Variables : {prenom} {nom} {lien} {date} {heure} {centre} {agence} {manquants}">
          <textarea className={cx(champ, "min-h-28")} value={texte} onChange={(e) => setTexte(e.target.value)} />
        </Champ>
        <div className="rounded-2xl bg-sand-100 p-4">
          <p className="mb-1 text-[11px] font-bold tracking-wide text-muted uppercase">Aperçu{joignables[0] ? ` · ${nomComplet(joignables[0])}` : ""}</p>
          <p className="text-sm font-bold">{exemple?.objet ?? objet}</p>
          <p className="mt-1 text-sm leading-relaxed">{exemple?.contenu || <span className="text-muted">Écrivez votre message…</span>}</p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
          <span>{joignables.length} destinataires joignables{joignables.length < cibles.length ? ` · ${cibles.length - joignables.length} sans adresse valide` : ""}{canal !== "email" ? ` · coût estimé ${(joignables.length * (canal === "sms" ? segments(exemple?.contenu ?? "") : 1) * COUT_USD[canal]).toFixed(2)} $` : ""}</span>
          <Btn
            disabled={!texte.trim() || !joignables.length}
            onClick={() => {
              const n = envoyer(joignables, modeleId, canal, { texte, objet, campagne: modeleId === "libre" ? "Message libre" : undefined });
              toast(`${n} ${NOM_CANAL[canal].toLowerCase()}${n > 1 ? "s" : ""} envoyé${n > 1 ? "s" : ""}.`);
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
