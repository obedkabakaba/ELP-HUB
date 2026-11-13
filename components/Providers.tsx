"use client";
import { useEffect, useState, type ReactNode } from "react";
import { demarrerSync } from "@/lib/sync";
import { useStore } from "@/lib/store";
import { Boite } from "./Boite";
import { FicheELP } from "./FicheELP";
import { Logo, Toasts } from "./ui";

export function Providers({ children }: { children: ReactNode }) {
  const pret = useStore((s) => s.pret);
  const theme = useStore((s) => s.theme);
  useEffect(() => {
    void useStore.persist.rehydrate();
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") navigator.serviceWorker.register("/sw.js").catch(() => {});
    return demarrerSync();
  }, []);
  useEffect(() => {
    // Thème : choix de l'utilisateur, sinon celui de l'appareil.
    const systeme = window.matchMedia("(prefers-color-scheme: dark)");
    const appliquer = () => document.documentElement.classList.toggle("dark", theme === "sombre" || (theme === "auto" && systeme.matches));
    appliquer();
    systeme.addEventListener("change", appliquer);
    return () => systeme.removeEventListener("change", appliquer);
  }, [theme]);
  if (!pret)
    return (
      <div className="grid min-h-dvh place-items-center">
        <div className="flex flex-col items-center gap-4">
          <Logo taille={64} />
          <div className="h-1 w-28 overflow-hidden rounded-full bg-sand-200">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-brand-600" />
          </div>
        </div>
      </div>
    );
  return (
    <>
      {children}
      <FicheELP />
      <Boite />
      <Toasts />
    </>
  );
}

export function useEnLigne() {
  const [enLigne, setEnLigne] = useState(true);
  useEffect(() => {
    const maj = () => setEnLigne(navigator.onLine);
    maj();
    window.addEventListener("online", maj);
    window.addEventListener("offline", maj);
    return () => {
      window.removeEventListener("online", maj);
      window.removeEventListener("offline", maj);
    };
  }, []);
  return enLigne;
}
