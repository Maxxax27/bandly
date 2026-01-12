export type Listing = {
  id: string;
  title: string;
  region: string; // z.B. "LU"
  instrument: string; // z.B. "Bass"
  genres: string[];
  description: string;
};

export const listings: Listing[] = [
  {
    id: "1",
    title: "Rockband sucht Bassist:in",
    region: "LU",
    instrument: "Bass",
    genres: ["Rock", "Hard Rock"],
    description:
      "Wir proben 1x/Woche in Luzern. Eigene Songs + Covers. Ziel: Gigs 2026. Alter egal, Hauptsache zuverlässig.",
  },
  {
    id: "2",
    title: "Gitarrist sucht Band (Blues/Rock)",
    region: "ZH",
    instrument: "Gitarre",
    genres: ["Blues", "Rock"],
    description:
      "Ich suche eine Band für regelmäßige Proben und gelegentliche Auftritte. Influences: Gary Moore, SRV, GNR.",
  },
];
