"use client";
// Éléments communs aux documents imprimables (format A4, toujours sur fond clair).
import { QR } from "./commun";
import { Logo } from "./ui";

/** En-tête : le logo EquityBCDC est posé sur la page, aligné à gauche, sans cadre. */
export function Tete({ titre, sous }: { titre: string; sous: string }) {
  return (
    <header className="flex items-end justify-between gap-6 border-b-2 border-[#a6282d] pb-4">
      <Logo nu taille={58} />
      <div className="text-right">
        <p className="text-[10px] font-bold tracking-widest text-[#a6282d] uppercase">Equity Leaders Program</p>
        <h1 className="text-[22px] leading-tight font-extrabold">{titre}</h1>
        <p className="text-xs text-muted">{sous}</p>
      </div>
    </header>
  );
}

export const Pied = ({ texte }: { texte?: string }) => <p className="mt-8 border-t border-sand-200 pt-3 text-[10px] text-muted">{texte ?? "Document de démonstration généré par ELP Hub à partir de données fictives. Sans valeur officielle."}</p>;

export interface DonneesAutorisation {
  prenom: string;
  nom: string;
  postnom: string;
  code: string;
  ecole: string;
  parent_nom: string;
  parent_lien: string;
  cohorte: string;
  code_verification: string;
}

const ENGAGEMENTS = [
  "la participation de mon enfant à l'Equity Leaders Program d'EquityBCDC ;",
  "son séjour d'une semaine à l'hôtel pour la formation d'induction, sous la responsabilité des encadreurs ;",
  "un stage de deux mois dans une agence EquityBCDC proche de notre domicile ;",
  "l'utilisation des informations de son dossier pour les seuls besoins du programme.",
];

const Trait = ({ largeur = "100%" }: { largeur?: string }) => <span className="inline-block border-b border-dotted border-[#75695f] align-bottom" style={{ width: largeur, height: "1.2em" }} />;

/** L'autorisation parentale à imprimer, signer à la main, puis photographier. */
export function FeuilleAutorisation({ d }: { d: DonneesAutorisation }) {
  return (
    <div className="feuille clair flex flex-col text-[13.5px] leading-relaxed">
      <Tete titre="Autorisation parentale" sous={d.cohorte} />
      <p className="mt-8">
        Je soussigné(e) {d.parent_nom ? <b>{d.parent_nom}</b> : <Trait largeur="62mm" />}, {d.parent_lien ? d.parent_lien.toLowerCase() : "parent ou tuteur"} de <b>{d.prenom} {d.nom} {d.postnom}</b> (dossier {d.code}), élève de {d.ecole}, autorise :
      </p>
      <ol className="mt-4 list-decimal space-y-2 pl-6">{ENGAGEMENTS.map((e) => <li key={e}>{e}</li>)}</ol>
      <p className="mt-4">Je reconnais avoir été informé(e) du déroulement du programme et pouvoir joindre les encadreurs à tout moment.</p>

      <div className="mt-8 grid grid-cols-2 gap-x-10 gap-y-5">
        <p>Fait à <Trait largeur="46mm" /></p>
        <p>le <Trait largeur="46mm" /></p>
        <p className="col-span-2">Téléphone du parent ou tuteur : <Trait largeur="70mm" /></p>
      </div>

      <div className="mt-8 grid grid-cols-[1fr_auto] items-end gap-8">
        <div>
          <p className="text-xs font-semibold">Nom, date et signature du parent ou tuteur</p>
          <p className="text-[11px] text-muted">précédés de la mention manuscrite « lu et approuvé »</p>
          <div className="mt-2 h-[38mm] rounded-md border border-[#75695f]" />
        </div>
        <div className="text-center">
          <QR valeur={`ELP:${d.code}`} taille={104} />
          <p className="tabular mt-1 text-xs font-extrabold">{d.code_verification || d.code}</p>
          <p className="text-[9px] text-muted">Référence du dossier</p>
        </div>
      </div>

      <div className="mt-8 rounded-md bg-sand-100 p-4 text-[12px]">
        <p className="font-bold">Comment renvoyer ce document</p>
        <p className="mt-1">1. Imprimez cette page. 2. Signez-la à la main. 3. Prenez-la en photo, bien à plat et bien éclairée. 4. Déposez la photo depuis le lien reçu par e-mail, ou depuis l&apos;espace de votre enfant. En cas de difficulté, remettez le papier à l&apos;encadreur.</p>
      </div>
      <div className="mt-auto"><Pied /></div>
    </div>
  );
}
