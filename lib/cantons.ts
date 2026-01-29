// lib/cantons.ts

/** Anzeigenamen + PLZ-Beispiel */
export const KANTON_LABELS: Record<string, string> = {
  AG: "Aargau",
  AI: "Appenzell Innerrhoden",
  AR: "Appenzell Ausserrhoden",
  BE: "Bern (z.B. 3000 Bern)",
  BL: "Basel-Landschaft",
  BS: "Basel-Stadt",
  FR: "Freiburg",
  GE: "Genf",
  GL: "Glarus",
  GR: "Graubünden",
  JU: "Jura",
  LU: "Luzern",
  NE: "Neuenburg",
  NW: "Nidwalden",
  OW: "Obwalden",
  SG: "St. Gallen",
  SH: "Schaffhausen",
  SO: "Solothurn",
  SZ: "Schwyz",
  TG: "Thurgau",
  TI: "Tessin",
  UR: "Uri",
  VD: "Waadt",
  VS: "Wallis",
  ZG: "Zug",
  ZH: "Zürich",
};

/** Pfade zu den SVG-Wappen (public/cantons/kantone/*.svg) */
export const CANTON_COATS: Record<string, string> = {
  AG: "/cantons/ag.svg",
  AI: "/cantons/ai.svg",
  AR: "/cantons/ar.svg",
  BE: "/cantons/be.svg",
  BL: "/cantons/bl.svg",
  BS: "/cantons/bs.svg",
  FR: "/cantons/fr.svg",
  GE: "/cantons/ge.svg",
  GL: "/cantons/gl.svg",
  GR: "/cantons/gr.svg",
  JU: "/cantons/ju.svg",
  LU: "/cantons/lu.svg",
  NE: "/cantons/ne.svg",
  NW: "/cantons/nw.svg",
  OW: "/cantons/ow.svg",
  SG: "/cantons/sg.svg",
  SH: "/cantons/sh.svg",
  SO: "/cantons/so.svg",
  SZ: "/cantons/sz.svg",
  TG: "/cantons/tg.svg",
  TI: "/cantons/ti.svg",
  UR: "/cantons/ur.svg",
  VD: "/cantons/vd.svg",
  VS: "/cantons/vs.svg",
  ZG: "/cantons/zg.svg",
  ZH: "/cantons/zh.svg",

};
export function kantonWappen(code: string): string | null {
  const c = (code ?? "").toUpperCase().trim();
  return CANTON_COATS[c] ?? null;
}
