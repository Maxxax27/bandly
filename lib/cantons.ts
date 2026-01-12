// lib/cantons.ts

/** Anzeigenamen + PLZ-Beispiel */
export const KANTON_LABELS: Record<string, string> = {
  AG: "Aargau (z.B. 5000 Aarau)",
  AI: "Appenzell Innerrhoden (z.B. 9050 Appenzell)",
  AR: "Appenzell Ausserrhoden (z.B. 9043 Trogen)",
  BE: "Bern (z.B. 3000 Bern)",
  BL: "Basel-Landschaft (z.B. 4410 Liestal)",
  BS: "Basel-Stadt (z.B. 4000 Basel)",
  FR: "Freiburg (z.B. 1700 Freiburg)",
  GE: "Genf (z.B. 1200 Genf)",
  GL: "Glarus (z.B. 8750 Glarus)",
  GR: "Graubünden (z.B. 7000 Chur)",
  JU: "Jura (z.B. 2800 Delémont)",
  LU: "Luzern (z.B. 6000 Luzern)",
  NE: "Neuenburg (z.B. 2000 Neuenburg)",
  NW: "Nidwalden (z.B. 6370 Stans)",
  OW: "Obwalden (z.B. 6060 Sarnen)",
  SG: "St. Gallen (z.B. 9000 St. Gallen)",
  SH: "Schaffhausen (z.B. 8200 Schaffhausen)",
  SO: "Solothurn (z.B. 4500 Solothurn)",
  SZ: "Schwyz (z.B. 6430 Schwyz)",
  TG: "Thurgau (z.B. 8500 Frauenfeld)",
  TI: "Tessin (z.B. 6500 Bellinzona)",
  UR: "Uri (z.B. 6460 Altdorf)",
  VD: "Waadt (z.B. 1000 Lausanne)",
  VS: "Wallis (z.B. 1950 Sion)",
  ZG: "Zug (z.B. 6300 Zug)",
  ZH: "Zürich (z.B. 8000 Zürich)",
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
