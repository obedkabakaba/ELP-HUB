"use client";
import { useEffect, useRef } from "react";

/** Zone de signature au doigt ou à la souris. `onChange` reçoit l'image (PNG) ou null si vide. */
export function Signature({ onChange }: { onChange: (png: string | null) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const trace = useRef(false);
  useEffect(() => {
    const c = ref.current!;
    const r = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * r;
    c.height = c.offsetHeight * r;
    const ctx = c.getContext("2d")!;
    ctx.scale(r, r);
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1d1513";
  }, []);
  const pos = (e: React.PointerEvent) => {
    const b = ref.current!.getBoundingClientRect();
    return [e.clientX - b.left, e.clientY - b.top] as const;
  };
  return (
    <div>
      <canvas
        ref={ref}
        aria-label="Zone de signature"
        className="h-40 w-full touch-none rounded-2xl border-2 border-dashed border-sand-300 bg-white"
        onPointerDown={(e) => { trace.current = true; e.currentTarget.setPointerCapture(e.pointerId); const ctx = ref.current!.getContext("2d")!; const [x, y] = pos(e); ctx.beginPath(); ctx.moveTo(x, y); }}
        onPointerMove={(e) => { if (!trace.current) return; const ctx = ref.current!.getContext("2d")!; const [x, y] = pos(e); ctx.lineTo(x, y); ctx.stroke(); }}
        onPointerUp={() => { if (!trace.current) return; trace.current = false; const c = ref.current!; const petit = document.createElement("canvas"); petit.width = 360; petit.height = Math.round((360 * c.height) / c.width); petit.getContext("2d")!.drawImage(c, 0, 0, petit.width, petit.height); onChange(petit.toDataURL("image/png")); }}
      />
      <button type="button" className="mt-1.5 text-xs font-bold text-brand-600" onClick={() => { const c = ref.current!; c.getContext("2d")!.clearRect(0, 0, c.width, c.height); onChange(null); }}>
        Effacer et recommencer
      </button>
    </div>
  );
}
