"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../../lib/firebase";
import CantonCoat from "@/components/CantonCoat";
import { KANTON_LABELS } from "@/lib/cantons";

// ✅ CH Kantone mit Anzeige-Label (dein gewünschtes Format)
const CANTONS: Array<{ code: string; label: string }> = [
  { code: "PLZ", label: "PLZ (Schweiz)" }, // ✅ “Reiter” Default
  { code: "AG", label: "AG: Aargau (z.B. 5000 Aarau)" },
  { code: "AI", label: "AI: Appenzell Innerrhoden (z.B. 9050 Appenzell)" },
  { code: "AR", label: "AR: Appenzell Ausserrhoden (z.B. 9043 Trogen)" },
  { code: "BE", label: "BE: Bern (z.B. 3000 Bern)" },
  { code: "BL", label: "BL: Basel-Landschaft (z.B. 4410 Liestal)" },
  { code: "BS", label: "BS: Basel-Stadt (z.B. 4000 Basel)" },
  { code: "FR", label: "FR: Freiburg (z.B. 1700 Freiburg)" },
  { code: "GE", label: "GE: Genf (z.B. 1200 Genf)" },
  { code: "GL", label: "GL: Glarus (z.B. 8750 Glarus)" },
  { code: "GR", label: "GR: Graubünden (z.B. 7000 Chur)" },
  { code: "JU", label: "JU: Jura (z.B. 2800 Delémont)" },
  { code: "LU", label: "LU: Luzern (z.B. 6000 Luzern)" },
  { code: "NE", label: "NE: Neuenburg (z.B. 2000 Neuenburg)" },
  { code: "NW", label: "NW: Nidwalden (z.B. 6370 Stans)" },
  { code: "OW", label: "OW: Obwalden (z.B. 6060 Sarnen)" },
  { code: "SG", label: "SG: St. Gallen (z.B. 9000 St. Gallen)" },
  { code: "SH", label: "SH: Schaffhausen (z.B. 8200 Schaffhausen)" },
  { code: "SO", label: "SO: Solothurn (z.B. 4500 Solothurn)" },
  { code: "SZ", label: "SZ: Schwyz (z.B. 6430 Schwyz)" },
  { code: "TG", label: "TG: Thurgau (z.B. 8500 Frauenfeld)" },
  { code: "TI", label: "TI: Tessin (z.B. 6500 Bellinzona)" },
  { code: "UR", label: "UR: Uri (z.B. 6460 Altdorf)" },
  { code: "VD", label: "VD: Waadt (z.B. 1000 Lausanne)" },
  { code: "VS", label: "VS: Wallis (z.B. 1950 Sion)" },
  { code: "ZG", label: "ZG: Zug (z.B. 6300 Zug)" },
  { code: "ZH", label: "ZH: Zürich (z.B. 8000 Zürich)" },
];

const INSTRUMENT_SUGGESTIONS = ["Gitarre", "Bass", "Drums", "Vocal", "Keys", "Violin", "DJ"];

function norm(s: string) {
  return (s ?? "")
    .toLowerCase()
    .trim()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const INSTRUMENT_SYNONYMS: Record<string, string[]> = {
  gitarre: [
    "gitarre",
    "gitarrist",
    "gitarristin",
    "guitar",
    "guitarist",
    "e-gitarre",
    "egitarre",
    "electric guitar",
    "akustikgitarre",
    "acoustic guitar",
    "leadguitar",
    "lead guitar",
    "leadgitarre",
    "lead gitarre",
    "solo guitar",
    "rhythm guitar",
    "rhythmusgitarre",
    "rythmusgitarre",
    "rythmguitar",
    "rhythmguitar",
    "second guitar",
    "2nd guitar",
    "zweite gitarre",
    "riff",
    "riffing",
    "metal guitar",
    "hardrock guitar",
    "shred",
    "shredding",
  ],
  bass: [
    "bass",
    "bassist",
    "bassistin",
    "bassplayer",
    "bass player",
    "e-bass",
    "ebass",
    "electric bass",
    "kontrabass",
    "double bass",
    "rhythm section",
    "low end",
    "lowend",
  ],
  drums: [
    "drums",
    "drummer",
    "drum",
    "schlagzeug",
    "schlagzeuger",
    "schlagzeugerin",
    "perc",
    "percussion",
    "percussionist",
    "doublebass",
    "double bass",
    "blastbeat",
    "blast beat",
    "blastbeats",
    "groove",
  ],
  vocal: [
    "vocal",
    "vocals",
    "gesang",
    "saenger",
    "sänger",
    "saengerin",
    "sängerin",
    "singer",
    "lead vocals",
    "lead vocal",
    "frontman",
    "frontfrau",
    "backing vocals",
    "backing vocal",
    "chor",
    "clean vocals",
    "clean vocal",
    "clean singer",
    "shouter",
    "shout",
    "scream",
    "screamer",
    "harsh vocals",
    "growl",
    "growler",
    "guttural",
    "death vocals",
    "metal vocals",
  ],
  keys: [
    "keys",
    "keyboard",
    "keyboards",
    "piano",
    "pianist",
    "pianistin",
    "synth",
    "synthesizer",
    "organ",
    "orgel",
    "pad",
    "pads",
  ],
  violin: ["violin", "geige", "geiger", "geigerin", "fiddle", "viola", "bratsche", "cello", "cellist"],
  dj: ["dj", "deejay", "turntable", "turntables", "producer", "produzent", "beatmaker", "beat maker", "mixing"],
};

function instrumentKeyFromInput(inputRaw: string): string | null {
  const q = norm(inputRaw);
  if (!q) return null;

  const keys = Object.keys(INSTRUMENT_SYNONYMS);
  if (keys.includes(q)) return q;

  for (const k of keys) {
    if (INSTRUMENT_SYNONYMS[k].some((w) => norm(w) === q)) return k;
  }
  for (const k of keys) {
    const list = INSTRUMENT_SYNONYMS[k].map(norm);
    if (list.some((w) => w.includes(q) || q.includes(w))) return k;
  }
  return null;
}

function matchesInstrument(listingText: string, instrumentQuery: string) {
  const q = norm(instrumentQuery);
  if (!q) return true;

  const key = instrumentKeyFromInput(q);
  const hay = norm(listingText);

  if (key) {
    const words = INSTRUMENT_SYNONYMS[key].map(norm);
    return words.some((w) => w && hay.includes(w));
  }
  return hay.includes(q);
}

type Listing = {
  id: string;
  title: string;
  text?: string;
  region: string; // bei dir steht hier z.B. "ZH", "LU", etc.
  instrument: string;
  genres: string[];
  ownerName: string;
  ownerPhotoURL: string | null;
  ownerLocation: string;
};

export default function ListingsPage() {
  const [all, setAll] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ Default ist "PLZ" (nicht "Alle")
  // Bedeutet: kein Filter aktiv, nur “Reiter/Label” ist PLZ
  const [canton, setCanton] = useState("PLZ");

  const [instrumentQuery, setInstrumentQuery] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      const qy = query(collection(db, "listings"), orderBy("createdAt", "desc"));
      const snap = await getDocs(qy);

      const data: Listing[] = snap.docs.map((d) => {
        const x = d.data() as any;
        return {
          id: d.id,
          title: x.title ?? "",
          text: x.text ?? "",
          region: x.region ?? "",
          instrument: x.instrument ?? "",
          genres: Array.isArray(x.genres) ? x.genres : [],
          ownerName: x.ownerName ?? "Unbekannt",
          ownerPhotoURL: x.ownerPhotoURL ?? null,
          ownerLocation: x.ownerLocation ?? "",
        };
      });

      setAll(data);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    return all.filter((l) => {
      // ✅ PLZ-Filter: nur aktiv, wenn ein Kanton gewählt wurde (nicht "PLZ")
      const regionOk = canton === "PLZ" || l.region === canton;

      const instrumentHay = `${l.instrument} ${l.title} ${l.text ?? ""}`;
      const instOk = matchesInstrument(instrumentHay, instrumentQuery);

      const q = norm(search);
      const textOk =
        !q || norm(l.title).includes(q) || norm(l.text ?? "").includes(q) || norm(l.instrument).includes(q);

      return regionOk && instOk && textOk;
    });
  }, [all, canton, instrumentQuery, search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white-900">Inserate</h1>
          <p className="text-sm text-zinc-600 mt-1">Öffentliche Musiker- & Bandinserate aus der Schweiz.</p>
        </div>

        <Link
          href="/listings/new"
          className="inline-flex items-center justify-center rounded-xl bg-zinc-900 text-white px-4 py-2 text-sm font-semibold hover:bg-zinc-800 transition"
        >
          + Inserat erstellen
        </Link>
      </div>

      {/* Suche & Filter (DARK wie Listings) */}
      <div className="rounded-2xl bg-zinc-900 text-white border border-zinc-800/60 shadow-lg p-4 md:p-5">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          {/* Suche Titel/Text */}
          <input
            type="text"
            placeholder="Suche nach Titel oder Text…"
            className="w-full md:w-[28rem] rounded-xl bg-white/10 text-white placeholder:text-zinc-400
                       border border-white/10 px-4 py-2 text-sm outline-none
                       focus:ring-2 focus:ring-white/10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            {/* ✅ Reiter heisst PLZ, Optionen zeigen Kanton + Beispiel-PLZ */}
            <select
              className="rounded-xl bg-white/10 text-white border border-white/10 px-3 py-2 text-sm outline-none
                         focus:ring-2 focus:ring-white/10"
              value={canton}
              onChange={(e) => setCanton(e.target.value)}
            >
              {CANTONS.map((c) => (
                <option key={c.code} value={c.code} className="text-zinc-900">
                  {c.label}
                </option>
              ))}
            </select>

            {/* Position Freitext */}
            <input
              type="text"
              placeholder='Position (z.B. "Leadguitar", "Growls", "Drummer")…'
              className="w-full sm:w-[20rem] rounded-xl bg-white/10 text-white placeholder:text-zinc-400
                         border border-white/10 px-4 py-2 text-sm outline-none
                         focus:ring-2 focus:ring-white/10"
              value={instrumentQuery}
              onChange={(e) => setInstrumentQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Quick-Chips + Reset */}
        <div className="mt-3 flex flex-wrap gap-2">
          {INSTRUMENT_SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setInstrumentQuery(s)}
              className="rounded-full bg-white/10 px-3 py-1 text-xs text-zinc-200 border border-white/10 hover:bg-white/15 transition"
            >
              {s}
            </button>
          ))}

          {(search || canton !== "PLZ" || instrumentQuery) && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setCanton("PLZ");
                setInstrumentQuery("");
              }}
              className="rounded-full bg-white text-zinc-900 px-3 py-1 text-xs font-semibold hover:opacity-90 transition"
            >
              Filter zurücksetzen
            </button>
          )}
        </div>

        <div className="mt-3 text-xs text-zinc-400">
          Beispiele: „Gitarre“ findet Guitar/Guitarist/Leadguitar/Rhythmusgitarre · „Vocal“ findet Sänger/Screams/Growls/Clean Vocals · „Drums“ findet Schlagzeug/Blastbeats/Doublebass
        </div>
      </div>

      {/* Status */}
      {loading && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
          Lade Inserate…
        </div>
      )}

      {/* Liste (DARK CARDS) */}
      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((l) => (
          <Link
            key={l.id}
            href={`/listings/${l.id}`}
            className="group rounded-2xl bg-zinc-900 text-white p-6 shadow-lg hover:bg-zinc-800 transition border border-zinc-800/60"
          >
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                {l.ownerPhotoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.ownerPhotoURL} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-lg">🎸</span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-lg font-semibold tracking-tight truncate">{l.title}</div>
                    <div className="text-sm text-zinc-300 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
  {/* Region + Wappen */}
  <span className="inline-flex items-center gap-2">
    <CantonCoat code={l.region} size={18} className="h-[18px] w-[18px]" />
    <span>
      Region:{" "}
      <span className="text-zinc-200">
        {KANTON_LABELS[l.region as keyof typeof KANTON_LABELS] ?? l.region}
      </span>
    </span>
  </span>

  {/* Instrument */}
  <span>
    · Instrument: <span className="text-zinc-200">{l.instrument}</span>
  </span>
</div>

                  </div>

                  <div className="text-right text-sm shrink-0">
                    <div className="font-semibold text-zinc-100">{l.ownerName}</div>
                    <div className="text-zinc-300">{l.ownerLocation}</div>
                  </div>
                </div>

                {l.genres?.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {l.genres.slice(0, 6).map((g) => (
                      <span
                        key={g}
                        className="rounded-full bg-white/10 px-3 py-1 text-xs text-zinc-200 border border-white/10"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-5 text-sm font-semibold text-zinc-100 flex items-center gap-2">
                  Inserat ansehen
                  <span className="opacity-70 group-hover:opacity-100 transition">→</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {!loading && filtered.length === 0 && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
          Keine Inserate gefunden.
        </div>
      )}
    </div>
  );
}
