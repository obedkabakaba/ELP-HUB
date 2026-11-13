"use client";
import { ArrowLeft, ArrowRight, Camera, Check, CheckCircle2, ChevronRight, FileUp, LocateFixed, MapPin, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { QR, useQuery } from "@/components/commun";
import { MapView } from "@/components/MapView";
import { BandeauDemo, Outils } from "@/components/Shell";
import { Avatar, Barre, Btn, Champ, Logo, Pastille, StatutBadge, champ, cx, toast } from "@/components/ui";
import { COMMUNES } from "@/lib/geo";
import { INDEMNITE_JOUR_USD, completude, nomComplet, normaliser } from "@/lib/logic";
import { fmtDate, fmtHeure, fmtQuand } from "@/lib/modeles";
import { deposerDocument, envoyer, finaliserInscription, majCandidat, miniature, pointer, repondreSms } from "@/lib/ops";
import { PROGRAMME } from "@/lib/programme";
import { SUPABASE_ACTIF, useStore } from "@/lib/store";
import { ETAPES, statutInfo, type Candidat, type TypeDocument } from "@/lib/types";

const SECTIONS = ["Scientifique (Math-Physique)", "Scientifique (Biochimie)", "Commerciale et Gestion", "Littéraire", "Pédagogie générale", "Technique (Électricité)", "Autre"];
const LIENS = ["Mère", "Père", "Oncle", "Tante", "Grand frère", "Grande sœur", "Tuteur"];
const PIECES: { type: TypeDocument; label: string; aide: string }[] = [
  { type: "photo", label: "Photo d'identité", aide: "Visage bien visible, fond clair" },
  { type: "bulletin", label: "Bulletin de l'Exetat", aide: "Photo nette ou PDF" },
  { type: "identite", label: "Pièce d'identité", aide: "Carte d'élève ou d'électeur" },
];

export default function Moi() {
  const q0 = useQuery();
  const db = useStore((s) => s.db);
  const moiId = useStore((s) => s.moiId);
  const set = useStore((s) => s.set);
  const [q, setQ] = useState("");
  const [edition, setEdition] = useState(false);
  const jeton = q0.get("t");
  const c = jeton ? db.candidats.find((x) => x.token === jeton) : db.candidats.find((x) => x.id === moiId);

  if (!c)
    return (
      <Cadre>
        <div className="px-5 py-6">
          <h1 className="text-2xl font-extrabold">Espace candidat</h1>
          <p className="mt-1 text-sm text-muted">{jeton ? "Ce lien n'est plus valable. Demande un nouveau lien à ton encadreur." : "En vrai, l'élève arrive ici par le lien reçu par SMS. Pour la démonstration, choisissez un élève."}</p>
          {!jeton && (
            <>
              <div className="relative mt-4"><Search className="absolute top-3 left-3.5 size-4 text-muted" /><input className={cx(champ, "pl-10")} placeholder="Chercher un élève" value={q} onChange={(e) => setQ(e.target.value)} /></div>
              <ul className="mt-3 space-y-2">
                {(q ? db.candidats.filter((x) => normaliser(nomComplet(x)).includes(normaliser(q))) : [...new Map(db.candidats.filter((x) => !x.anonymise).map((x) => [x.statut, x])).values()]).slice(0, 12).map((x) => (
                  <li key={x.id}><button onClick={() => set({ moiId: x.id })} className="flex w-full items-center gap-3 rounded-2xl border border-sand-200 bg-white p-3 text-left shadow-card"><Avatar nom={`${x.prenom} ${x.nom}`} sexe={x.sexe} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{nomComplet(x)}</span><span className="text-xs text-muted">{x.commune}</span></span><StatutBadge statut={x.statut} /><ChevronRight className="size-4 text-muted" /></button></li>
                ))}
              </ul>
            </>
          )}
        </div>
      </Cadre>
    );

  const k = completude(c, db.documents);
  const enInscription = !c.inscrit_le || edition;
  return (
    <Cadre retour={!jeton ? () => { set({ moiId: null }); setEdition(false); } : undefined}>
      {enInscription ? <Inscription key={c.id} c={c} fin={() => setEdition(false)} /> : <Accueil key={c.id} c={c} manquants={k.manquants} pct={k.pct} completer={() => setEdition(true)} />}
    </Cadre>
  );
}

function Cadre({ children, retour }: { children: React.ReactNode; retour?: () => void }) {
  return (
    <div className="min-h-dvh bg-sand-100">
      <BandeauDemo />
      <div className="mx-auto min-h-dvh max-w-md bg-sand-50 shadow-pop">
        <header className="motif-toit flex items-center justify-between gap-3 bg-brand-950 px-4 py-3 text-white">
          <div className="flex items-center gap-2.5">
            {retour ? <button aria-label="Changer d'élève" onClick={retour} className="rounded-lg p-1.5 hover:bg-white/10"><ArrowLeft className="size-5" /></button> : !SUPABASE_ACTIF && <Link href="/" aria-label="Accueil" className="rounded-lg p-1.5 hover:bg-white/10"><ArrowLeft className="size-5" /></Link>}
            <Logo taille={32} />
            <span className="text-sm font-extrabold">ELP Hub</span>
          </div>
          <Outils clair />
        </header>
        {children}
      </div>
    </div>
  );
}

/* ---------- Inscription en 5 étapes, sauvegarde automatique ---------- */

function Inscription({ c, fin }: { c: Candidat; fin: () => void }) {
  const documents = useStore((s) => s.db.documents);
  const [etape, setEtape] = useState(0);
  const [f, setF] = useState(c);
  const [sauve, setSauve] = useState<string | null>(null);
  const [consent, setConsent] = useState(!!c.consentement_le);
  const [gps, setGps] = useState<"" | "cherche" | "refus">("");
  const docs = documents.filter((d) => d.candidat_id === c.id);

  const maj = (p: Partial<Candidat>) => setF((x) => ({ ...x, ...p }));
  const sauver = (extra: Partial<Candidat> = {}) => {
    const n = majCandidat({ ...f, ...extra }, {});
    setF(n);
    setSauve(new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
    return n;
  };
  const txt = (cle: keyof Candidat, type = "text", extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => <input type={type} className={champ} value={(f[cle] as string) ?? ""} onChange={(e) => maj({ [cle]: e.target.value } as Partial<Candidat>)} onBlur={() => sauver()} {...extra} />;

  const localiser = () => {
    if (!navigator.geolocation) return setGps("refus");
    setGps("cherche");
    navigator.geolocation.getCurrentPosition(
      (p) => { sauver({ lat: +p.coords.latitude.toFixed(5), lng: +p.coords.longitude.toFixed(5) }); setGps(""); toast("Position enregistrée."); },
      () => setGps("refus"),
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };
  const fichier = async (type: TypeDocument, file?: File) => {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) return toast("Fichier trop lourd (8 Mo au maximum).", "erreur");
    deposerDocument(c, type, file.name, await miniature(file).catch(() => null));
    toast("Pièce enregistrée.");
  };

  const TITRES = ["Qui es-tu ?", "Ton école", "Où habites-tu ?", "Ton parent ou tuteur", "Tes pièces"];
  const valide = [!!f.date_naissance && !!f.telephone, !!f.ecole && !!f.section, !!f.commune && !!f.adresse, !!f.parent_nom && !!f.parent_telephone && !!f.urgence_nom && !!f.urgence_telephone, consent][etape];

  return (
    <div className="px-5 pt-5 pb-28">
      <div className="flex items-center justify-between text-xs font-semibold text-muted"><span>Étape {etape + 1} sur 5</span>{sauve && <span className="flex items-center gap-1 text-emerald-700"><Check className="size-3.5" /> Enregistré à {sauve}</span>}</div>
      <div className="mt-2 flex gap-1.5">{TITRES.map((_, i) => <span key={i} className={cx("h-1.5 flex-1 rounded-full", i <= etape ? "bg-brand-600" : "bg-sand-200")} />)}</div>
      <h1 className="mt-5 text-2xl font-extrabold">{TITRES[etape]}</h1>
      <p className="mt-1 text-sm text-muted">{["Vérifie ce que nous savons déjà et complète le reste.", "Ces informations viennent de la liste de l'Exetat.", "Ton adresse sert à te trouver une agence de stage près de chez toi.", "Il ou elle recevra un SMS pour signer ton autorisation.", "Tu peux les prendre en photo avec ton téléphone."][etape]}</p>

      <div className="mt-5 space-y-4">
        {etape === 0 && (<>
          <div className="grid grid-cols-2 gap-3"><Champ label="Prénom">{txt("prenom", "text", { autoComplete: "given-name" })}</Champ><Champ label="Nom">{txt("nom", "text", { autoComplete: "family-name" })}</Champ></div>
          <Champ label="Postnom">{txt("postnom")}</Champ>
          <Champ label="Date de naissance">{txt("date_naissance", "date", { max: "2012-12-31" })}</Champ>
          <Champ label="Ton numéro de téléphone" aide="Nous t'écrivons par SMS sur ce numéro.">{txt("telephone", "tel", { autoComplete: "tel", inputMode: "tel" })}</Champ>
          <Champ label="E-mail (facultatif)">{txt("email", "email", { autoComplete: "email" })}</Champ>
        </>)}
        {etape === 1 && (<>
          <Champ label="École">{txt("ecole")}</Champ>
          <Champ label="Section"><select className={champ} value={f.section} onChange={(e) => sauver({ section: e.target.value })}><option value="">Choisir</option>{[...new Set([f.section, ...SECTIONS])].filter(Boolean).map((s) => <option key={s}>{s}</option>)}</select></Champ>
          <div className="rounded-2xl bg-brand-50 p-4"><p className="text-xs font-semibold text-brand-700">Résultat à l&apos;Exetat</p><p className="tabular text-3xl font-extrabold text-brand-700">{f.pourcentage_exetat} %</p><p className="text-xs text-muted">Une erreur ? Signale-la à ton encadreur.</p></div>
        </>)}
        {etape === 2 && (<>
          <Champ label="Commune"><select className={champ} value={f.commune} onChange={(e) => sauver({ commune: e.target.value })}><option value="">Choisir</option>{COMMUNES.map((x) => <option key={x.nom}>{x.nom}</option>)}</select></Champ>
          <Champ label="Adresse" aide="Numéro, avenue, quartier">{txt("adresse", "text", { autoComplete: "street-address" })}</Champ>
          <div>
            <p className="mb-1.5 text-[13px] font-semibold">Position de ta maison</p>
            <Btn type="button" variante="secondaire" className="w-full" onClick={localiser} disabled={gps === "cherche"}><LocateFixed className="size-4" /> {gps === "cherche" ? "Recherche du GPS…" : f.lat != null ? "Mettre à jour ma position" : "Utiliser ma position actuelle"}</Btn>
            <p className={cx("mt-2 text-xs", gps === "refus" ? "font-semibold text-amber-700" : "text-muted")}>{gps === "refus" ? "GPS indisponible. Touche la carte pour placer ta maison." : "Ou touche la carte à l'endroit de ta maison."}</p>
            <MapView className="mt-2 h-52 w-full rounded-2xl" points={f.lat != null ? [{ lat: f.lat, lng: f.lng!, couleur: "#a32a29", html: "Ma maison" }] : []} onPick={(lat, lng) => sauver({ lat: +lat.toFixed(5), lng: +lng.toFixed(5) })} />
            {f.lat != null && <p className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-emerald-700"><MapPin className="size-3.5" /> Position enregistrée</p>}
          </div>
        </>)}
        {etape === 3 && (<>
          <Champ label="Nom complet du parent ou tuteur">{txt("parent_nom")}</Champ>
          <div className="grid grid-cols-2 gap-3">
            <Champ label="Lien"><select className={champ} value={f.parent_lien} onChange={(e) => sauver({ parent_lien: e.target.value })}><option value="">Choisir</option>{LIENS.map((l) => <option key={l}>{l}</option>)}</select></Champ>
            <Champ label="Son téléphone">{txt("parent_telephone", "tel", { inputMode: "tel" })}</Champ>
          </div>
          <label className="flex items-center gap-2.5 text-sm font-semibold"><input type="checkbox" className="size-4 accent-brand-600" checked={!!f.parent_nom && f.urgence_nom === f.parent_nom} onChange={(e) => sauver(e.target.checked ? { urgence_nom: f.parent_nom, urgence_telephone: f.parent_telephone } : { urgence_nom: "", urgence_telephone: "" })} /> C&apos;est aussi la personne à prévenir en cas d&apos;urgence</label>
          {f.urgence_nom !== f.parent_nom && <div className="grid grid-cols-2 gap-3"><Champ label="Contact d'urgence">{txt("urgence_nom")}</Champ><Champ label="Son téléphone">{txt("urgence_telephone", "tel", { inputMode: "tel" })}</Champ></div>}
          <Champ label="Allergies ou problème de santé à connaître (facultatif)" aide="Utile pour la semaine d'induction à l'hôtel. Vu seulement par les encadreurs.">{txt("allergies")}</Champ>
        </>)}
        {etape === 4 && (<>
          {PIECES.map((p) => {
            const d = docs.find((x) => x.type === p.type);
            return (
              <label key={p.type} className={cx("flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-3.5 transition", d && d.statut !== "rejete" ? "border-emerald-200 bg-emerald-50" : "border-dashed border-sand-300 bg-white")}>
                {d?.apercu ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={d.apercu} alt="" className="size-12 rounded-xl object-cover" />
                ) : <span className={cx("grid size-12 place-items-center rounded-xl", d ? "bg-emerald-100 text-emerald-700" : "bg-sand-100 text-muted")}>{d ? <CheckCircle2 className="size-6" /> : p.type === "photo" ? <Camera className="size-5" /> : <FileUp className="size-5" />}</span>}
                <span className="min-w-0 flex-1"><span className="block text-sm font-bold">{p.label}</span><span className="block truncate text-xs text-muted">{d?.statut === "rejete" ? `Refusée : ${d.motif_rejet}. Envoie-la à nouveau.` : d ? d.nom_fichier : p.aide}</span></span>
                <span className="text-xs font-bold text-brand-600">{d ? "Changer" : "Ajouter"}</span>
                <input type="file" accept={p.type === "bulletin" ? "image/*,application/pdf" : "image/*"} hidden onChange={(e) => fichier(p.type, e.target.files?.[0])} />
              </label>
            );
          })}
          <label className="flex gap-3 rounded-2xl bg-sand-100 p-4 text-[13px] leading-relaxed"><input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-brand-600" checked={consent} onChange={(e) => setConsent(e.target.checked)} /><span>J&apos;accepte que la Fondation Equity utilise ces informations <b>uniquement pour le programme ELP</b>. Je peux demander à les corriger ou à les supprimer. Si j&apos;ai moins de 18 ans, mon parent ou tuteur donnera aussi son accord.</span></label>
        </>)}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-md gap-2 border-t border-sand-200 bg-white/95 p-4 backdrop-blur">
        {(etape > 0 || c.inscrit_le) && <Btn variante="secondaire" onClick={() => { sauver(); if (etape === 0) fin(); else setEtape(etape - 1); }}><ArrowLeft className="size-4" /></Btn>}
        {etape < 4 ? (
          <Btn className="flex-1" disabled={!valide} onClick={() => { sauver(); setEtape(etape + 1); window.scrollTo(0, 0); }}>Continuer <ArrowRight className="size-4" /></Btn>
        ) : (
          <Btn className="flex-1" disabled={!consent} onClick={() => { finaliserInscription(sauver()); toast("Dossier envoyé. Tu recevras un SMS pour la suite."); fin(); window.scrollTo(0, 0); }}>{c.inscrit_le ? "Enregistrer mon dossier" : "Envoyer mon inscription"}</Btn>
        )}
      </div>
    </div>
  );
}

/* ---------- Accueil de l'élève : où j'en suis, que dois-je faire ---------- */

function Accueil({ c, pct, manquants, completer }: { c: Candidat; pct: number; manquants: string[]; completer: () => void }) {
  const db = useStore((s) => s.db);
  const [msgPointage, setMsgPointage] = useState("");
  const x = useMemo(() => {
    const conv = db.convocations.find((k) => k.candidat_id === c.id);
    const session = conv && db.sessions_test.find((s) => s.id === conv.session_id);
    const aff = db.affectations.find((a) => a.candidat_id === c.id && a.statut === "validee");
    return {
      conv, session, centre: session && db.centres.find((k) => k.id === session.centre_id),
      auto: db.documents.find((d) => d.candidat_id === c.id && d.type === "autorisation"),
      aff, agence: aff && db.agences.find((a) => a.id === aff.agence_id),
      hotel: db.centres.find((k) => k.type === "hotel"),
      jours: db.presences.filter((p) => p.candidat_id === c.id && p.contexte === "stage"),
      messages: db.messages.filter((m) => m.candidat_id === c.id && m.destinataire === "candidat" && m.modele !== "reponse").slice(-3).reverse(),
    };
  }, [db, c.id]);
  const etape = statutInfo(c.statut).etape;

  const pointerIci = () => {
    if (!navigator.geolocation) return setMsgPointage(pointer(c, null, null).message);
    navigator.geolocation.getCurrentPosition((p) => setMsgPointage(pointer(c, p.coords.latitude, p.coords.longitude).message), () => setMsgPointage(pointer(c, null, null).message), { enableHighAccuracy: true, timeout: 10000 });
  };

  return (
    <div className="space-y-4 px-5 py-5">
      <div className="rounded-3xl bg-gradient-to-br from-brand-600 to-brand-900 p-5 text-white shadow-pop">
        <p className="text-sm text-white/70">Bonjour</p>
        <h1 className="text-2xl font-extrabold">{c.prenom} {c.nom}</h1>
        <p className="tabular mt-0.5 text-xs text-white/60">{c.code}</p>
        <div className="mt-4 flex gap-1">{ETAPES.map((e) => <span key={e.n} className={cx("h-1.5 flex-1 rounded-full", e.n <= etape ? "bg-gold-400" : "bg-white/20")} />)}</div>
        <p className="mt-2 text-sm font-bold">{etape ? `Étape ${etape} sur 7 · ` : ""}{statutInfo(c.statut).label}</p>
      </div>

      {pct < 100 && !["non_retenu", "desiste"].includes(c.statut) && (
        <Bloc titre="Ton dossier est incomplet" ton="ambre">
          <Barre pct={pct} className="my-2 h-2" />
          <p className="text-[13px] text-muted">Il manque : {manquants.join(", ")}.</p>
          <Btn className="mt-3 w-full" onClick={completer}>Compléter mon dossier</Btn>
        </Bloc>
      )}

      {c.statut === "inscrit" && pct === 100 && <Bloc titre="Dossier complet, bravo !"><p className="text-[13px] text-muted">Tu recevras ta convocation au test par SMS, avec le lieu, la date et l&apos;heure.</p></Bloc>}

      {c.statut === "convoque" && x.conv && x.session && (
        <Bloc titre="Ta convocation au test">
          <p className="text-lg font-extrabold first-letter:uppercase">{fmtDate(x.session.date_heure)}</p>
          <p className="text-sm font-semibold">{fmtHeure(x.session.date_heure)} · {x.centre?.nom}</p>
          <p className="text-xs text-muted">{x.centre?.adresse}, {x.centre?.commune}</p>
          <div className="my-4 flex flex-col items-center rounded-2xl bg-white p-4 ring-1 ring-sand-200"><QR valeur={`ELP:${c.code}`} taille={170} /><p className="tabular mt-2 text-sm font-bold">{c.code}</p><p className="text-xs text-muted">À présenter à l&apos;entrée, même sans connexion</p></div>
          {x.conv.present === false ? <Pastille ton="rouge">Absence enregistrée : contacte ton encadreur</Pastille> : x.conv.confirme == null ? (
            <div className="flex gap-2"><Btn className="flex-1" onClick={() => repondreSms(c, "1")}>Je serai là</Btn><Btn variante="secondaire" className="flex-1" onClick={() => repondreSms(c, "2")}>J&apos;ai un empêchement</Btn></div>
          ) : <Pastille ton={x.conv.confirme ? "vert" : "ambre"}>{x.conv.confirme ? "Présence confirmée" : "Empêchement signalé : un encadreur va t'appeler"}</Pastille>}
          <Link href={`/doc/convocation/${c.id}`} className="mt-3 block text-center text-xs font-bold text-brand-600">Télécharger la convocation (PDF)</Link>
        </Bloc>
      )}

      {c.statut === "teste" && <Bloc titre="Test passé"><p className="text-[13px] text-muted">Merci d&apos;être venu(e). Les résultats te seront envoyés par SMS dès que la sélection sera validée.</p></Bloc>}
      {c.statut === "attente" && <Bloc titre={`Liste d'attente · rang ${c.rang_attente}`} ton="ambre"><p className="text-[13px] text-muted">Si une place se libère, tu es prévenu(e) aussitôt par SMS. Garde ton téléphone allumé.</p></Bloc>}
      {c.statut === "non_retenu" && <Bloc titre="Merci d'avoir participé"><p className="text-[13px] text-muted">Tu n&apos;es pas retenu(e) cette année. Être présélectionné(e) parmi les meilleurs résultats du pays est déjà une réussite : continue.</p></Bloc>}

      {(c.statut === "selectionne" || c.statut === "induction") && x.auto && (
        <Bloc titre="Autorisation parentale" ton={x.auto.statut === "signe" ? "vert" : "ambre"}>
          {x.auto.statut === "signe" ? <p className="text-[13px] text-muted">Signée par {x.auto.signe_par} le {fmtQuand(x.auto.signe_le!)}.</p> : (<>
            <p className="text-[13px] text-muted">{c.parent_nom} doit signer en ligne avant l&apos;induction. Le lien lui a été envoyé par SMS au {c.parent_telephone}.</p>
            <Btn variante="secondaire" className="mt-3 w-full" onClick={() => { envoyer([c], "relance_autorisation", "sms", { campagne: "Lien renvoyé par l'élève" }); toast(`Lien renvoyé à ${c.parent_nom}.`); }}>Renvoyer le lien à mon parent</Btn>
          </>)}
        </Bloc>
      )}
      {c.statut === "selectionne" && <Bloc titre="Félicitations, tu es sélectionné(e) !" ton="vert"><p className="text-[13px] text-muted">Prochaine étape : une semaine d&apos;induction à l&apos;hôtel. Tu recevras la date et ta chambre par SMS.</p></Bloc>}

      {c.statut === "induction" && (
        <Bloc titre="Semaine d'induction">
          <p className="text-sm font-semibold">{x.hotel?.nom} · chambre {c.chambre ?? "à venir"}</p>
          <div className="my-3 flex items-center gap-4 rounded-2xl bg-white p-3 ring-1 ring-sand-200"><QR valeur={`ELP:${c.code}`} taille={84} /><p className="text-xs text-muted">Ton badge : fais-le scanner chaque matin à l&apos;entrée de la salle.</p></div>
          <ol className="space-y-1.5 text-[13px]">{PROGRAMME.map((p) => <li key={p.jour} className="flex gap-2"><b className="w-16 shrink-0">{p.jour}</b><span className="text-muted">{p.theme}</span></li>)}</ol>
        </Bloc>
      )}

      {c.statut === "stage" && x.agence && x.aff && (
        <Bloc titre="Ton stage">
          <p className="text-lg font-extrabold">Agence {x.agence.nom}</p>
          <p className="text-xs text-muted">{x.agence.adresse} · à {x.aff.distance_km} km de chez toi · {x.agence.chef_nom}</p>
          <Btn className="mt-4 w-full py-3.5" onClick={pointerIci}><LocateFixed className="size-4" /> Pointer mon arrivée</Btn>
          {msgPointage && <p role="status" className="mt-2 rounded-xl bg-white p-3 text-[13px] font-medium ring-1 ring-sand-200">{msgPointage}</p>}
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-white p-2.5 ring-1 ring-sand-200"><p className="tabular text-xl font-extrabold">{x.jours.length}</p><p className="text-[10px] font-semibold text-muted">jours pointés</p></div>
            <div className="rounded-xl bg-white p-2.5 ring-1 ring-sand-200"><p className="tabular text-xl font-extrabold">{x.jours.filter((j) => j.valide).length * INDEMNITE_JOUR_USD} $</p><p className="text-[10px] font-semibold text-muted">indemnité estimée</p></div>
            <div className="rounded-xl bg-white p-2.5 ring-1 ring-sand-200"><p className="text-xl font-extrabold">{c.compte_ouvert ? "Oui" : "Non"}</p><p className="text-[10px] font-semibold text-muted">compte ouvert</p></div>
          </div>
        </Bloc>
      )}

      {x.messages.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-bold tracking-wide text-muted uppercase">Derniers messages</p>
          <ul className="space-y-2">{x.messages.map((m) => <li key={m.id} className="rounded-2xl bg-white p-3.5 text-[13px] leading-relaxed shadow-card ring-1 ring-sand-200"><p>{m.contenu}</p><p className="mt-1 text-[11px] text-muted">{fmtQuand(m.created_at)}</p></li>)}</ul>
        </div>
      )}
      {pct === 100 && <button onClick={completer} className="block w-full py-2 text-center text-xs font-bold text-muted">Modifier mes informations</button>}
    </div>
  );
}

function Bloc({ titre, children, ton }: { titre: string; children: React.ReactNode; ton?: "vert" | "ambre" }) {
  return (
    <section className={cx("rounded-3xl border p-5", ton === "vert" ? "border-emerald-200 bg-emerald-50" : ton === "ambre" ? "border-amber-200 bg-amber-50" : "border-sand-200 bg-sand-100")}>
      <h2 className="mb-1 font-extrabold">{titre}</h2>
      {children}
    </section>
  );
}
