"use client";
import { ArrowLeft, Camera, CameraOff, CheckCircle2, Keyboard, XCircle } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@/components/commun";
import { BandeauDemo, Outils } from "@/components/Shell";
import { Btn, Logo, champ, cx } from "@/components/ui";
import { jourISO, nomComplet } from "@/lib/logic";
import { fmtHeure } from "@/lib/modeles";
import { emarger, type ResultatScan } from "@/lib/ops";
import { useStore } from "@/lib/store";

type Detecteur = { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> };

export default function Scan() {
  const q0 = useQuery();
  const db = useStore((s) => s.db);
  const role = useStore((s) => s.role);
  const [contexte, setContexte] = useState<"test" | "induction">(q0.get("contexte") === "induction" ? "induction" : "test");
  const [camera, setCamera] = useState(false);
  const [erreurCam, setErreurCam] = useState("");
  const [code, setCode] = useState("");
  const [res, setRes] = useState<ResultatScan | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const dernier = useRef({ code: "", t: 0 });
  const ctx = useRef(contexte);
  useEffect(() => { ctx.current = contexte; }, [contexte]);

  const traiter = useCallback((valeur: string, methode: "qr" | "manuel") => {
    const now = Date.now();
    if (valeur === dernier.current.code && now - dernier.current.t < 4000) return; // même QR resté devant la caméra
    dernier.current = { code: valeur, t: now };
    const r = emarger(valeur, ctx.current, methode);
    setRes(r);
    navigator.vibrate?.(r.ok ? 80 : [60, 60, 60]);
  }, []);

  useEffect(() => {
    if (!camera) return;
    let flux: MediaStream | null = null;
    let actif = true;
    let timer = 0;
    (async () => {
      try {
        flux = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (!actif || !video.current) return;
        video.current.srcObject = flux;
        await video.current.play();
        const BD = (window as unknown as { BarcodeDetector?: new (o: object) => Detecteur }).BarcodeDetector;
        const natif = BD ? new BD({ formats: ["qr_code"] }) : null;
        const jsQR = natif ? null : (await import("jsqr")).default;
        const canvas = document.createElement("canvas");
        const tic = async () => {
          const v = video.current;
          if (!actif || !v) return;
          if (v.readyState >= 2) {
            if (natif) {
              const codes = await natif.detect(v).catch(() => []);
              if (codes[0]) traiter(codes[0].rawValue, "qr");
            } else if (jsQR) {
              canvas.width = v.videoWidth;
              canvas.height = v.videoHeight;
              const c2 = canvas.getContext("2d", { willReadFrequently: true })!;
              c2.drawImage(v, 0, 0);
              const img = c2.getImageData(0, 0, canvas.width, canvas.height);
              const qr = jsQR(img.data, img.width, img.height);
              if (qr?.data) traiter(qr.data, "qr");
            }
          }
          timer = window.setTimeout(tic, 280);
        };
        void tic();
      } catch {
        setErreurCam("Caméra indisponible ou refusée. Utilisez la saisie du code.");
        setCamera(false);
      }
    })();
    return () => {
      actif = false;
      clearTimeout(timer);
      flux?.getTracks().forEach((t) => t.stop());
    };
  }, [camera, traiter]);

  const jour = jourISO();
  const { scannes, attendus, suivant } = useMemo(() => {
    const p = db.presences.filter((x) => x.contexte === contexte && x.jour === jour).sort((a, b) => b.horodatage.localeCompare(a.horodatage));
    const ids = new Set(p.map((x) => x.candidat_id));
    const liste = contexte === "test" ? db.candidats.filter((c) => db.convocations.some((k) => k.candidat_id === c.id && !k.present)) : db.candidats.filter((c) => c.statut === "induction");
    return { scannes: p, attendus: liste.length + (contexte === "test" ? p.length : 0), suivant: liste.find((c) => !ids.has(c.id)) };
  }, [db, contexte, jour]);
  const parId = useMemo(() => new Map(db.candidats.map((c) => [c.id, c])), [db.candidats]);

  return (
    <div className="min-h-dvh bg-brand-950 text-white">
      <BandeauDemo />
      <div className="mx-auto max-w-md px-4 pb-10">
        <header className="flex items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-2.5">
            <Link href={role === "encadreur" || role === "admin" ? "/tests" : "/"} aria-label="Retour" className="rounded-lg p-1.5 hover:bg-white/10"><ArrowLeft className="size-5" /></Link>
            <Logo taille={32} />
            <span className="text-sm font-extrabold">Émargement</span>
          </div>
          <Outils clair />
        </header>

        <div className="flex rounded-xl bg-white/10 p-1">
          {(["test", "induction"] as const).map((k) => <button key={k} aria-pressed={contexte === k} onClick={() => { setContexte(k); setRes(null); }} className={cx("flex-1 rounded-lg py-2 text-sm font-bold", contexte === k ? "bg-surface text-ink" : "text-white/70")}>{k === "test" ? "Entrée au test" : "Présence induction"}</button>)}
        </div>

        <div className="relative mt-4 aspect-square overflow-hidden rounded-3xl bg-black/50 ring-1 ring-white/15">
          <video ref={video} playsInline muted className={cx("size-full object-cover", !camera && "hidden")} />
          {camera ? <div className="pointer-events-none absolute inset-10 rounded-2xl border-2 border-white/80 shadow-[0_0_0_999px_rgb(0_0_0/0.35)]" /> : (
            <div className="flex size-full flex-col items-center justify-center gap-4 p-6 text-center">
              <Camera className="size-12 text-white/50" />
              <Btn variante="or" onClick={() => { setErreurCam(""); setCamera(true); }}>Activer la caméra</Btn>
              <p className="text-xs text-white/60">{erreurCam || "Le scan fonctionne sans connexion : les présences sont envoyées au retour du réseau."}</p>
            </div>
          )}
          {camera && <button aria-label="Arrêter la caméra" onClick={() => setCamera(false)} className="absolute top-3 right-3 rounded-full bg-black/60 p-2"><CameraOff className="size-4" /></button>}
        </div>

        {res && (
          <div role="status" className={cx("animate-in mt-4 flex items-center gap-3 rounded-2xl p-4", res.ok ? "bg-emerald-600" : "bg-rose-600")}>
            {res.ok ? <CheckCircle2 className="size-9 shrink-0" /> : <XCircle className="size-9 shrink-0" />}
            <div><p className="text-lg leading-tight font-extrabold">{res.titre}</p><p className="text-sm text-white/85">{res.detail}</p></div>
          </div>
        )}

        <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (code.trim()) { dernier.current.code = ""; traiter(code.includes("-") ? code : `ELP27-${code.padStart(4, "0")}`, "manuel"); setCode(""); } }}>
          <div className="relative flex-1"><Keyboard className="absolute top-3 left-3.5 size-4 text-muted" /><input className={cx(champ, "pl-10 text-ink")} placeholder="Code ou numéro (ex. 42)" value={code} onChange={(e) => setCode(e.target.value)} aria-label="Saisir un code" /></div>
          <Btn variante="or">Valider</Btn>
        </form>
        {suivant && <button className="mt-2 w-full rounded-xl border border-dashed border-white/25 py-2 text-xs font-semibold text-white/70 hover:bg-white/5" onClick={() => { dernier.current.code = ""; traiter(`ELP:${suivant.code}`, "qr"); }}>Démonstration : simuler le scan de {suivant.prenom} {suivant.nom}</button>}

        <div className="mt-6 flex items-end justify-between"><p className="text-sm font-bold">Scannés aujourd&apos;hui</p><p className="tabular text-2xl font-extrabold">{scannes.length}<span className="text-sm text-white/50"> / {attendus}</span></p></div>
        <div className="mt-2 h-1.5 rounded-full bg-white/15"><div className="h-full rounded-full bg-gold-400 transition-all" style={{ width: `${attendus ? (scannes.length / attendus) * 100 : 0}%` }} /></div>
        <ul className="mt-3 divide-y divide-white/10">
          {scannes.slice(0, 25).map((p) => { const c = parId.get(p.candidat_id); return <li key={p.id} className="flex items-center justify-between py-2.5 text-sm"><span className="font-semibold">{c ? nomComplet(c) : "?"} <span className="tabular text-xs text-white/50">· {c?.code}</span></span><span className="tabular text-xs text-white/60">{fmtHeure(p.horodatage)} · {p.methode === "qr" ? "QR" : "saisie"}</span></li>; })}
        </ul>
      </div>
    </div>
  );
}
