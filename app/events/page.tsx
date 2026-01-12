"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import CantonCoat from "@/components/CantonCoat";
import { KANTON_LABELS } from "@/lib/cantons";

type EventItem = {
  id: string;
  title: string;
  date: any; // Firestore Timestamp
  venue?: string;
  city?: string;
  region?: string;
  link?: string;
  description?: string;

  ownerUid: string;
  ownerName: string;
  ownerPhotoURL?: string | null;
};

function fmtDate(ts: any) {
  try {
    const d: Date = ts?.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString("de-CH", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function EventsPage() {
  const [all, setAll] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [region, setRegion] = useState<string>("");

  useEffect(() => {
    async function load() {
      const qy = query(collection(db, "events"), orderBy("date", "asc"));
      const snap = await getDocs(qy);

      const data: EventItem[] = snap.docs.map((d) => {
        const x = d.data() as any;
        return {
          id: d.id,
          title: x.title ?? "",
          date: x.date,
          venue: x.venue ?? "",
          city: x.city ?? "",
          region: x.region ?? "",
          link: x.link ?? "",
          description: x.description ?? "",
          ownerUid: x.ownerUid ?? "",
          ownerName: x.ownerName ?? "Unbekannt",
          ownerPhotoURL: x.ownerPhotoURL ?? null,
        };
      });

      setAll(data);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((e) => {
      const regionOk = !region || (e.region ?? "") === region;
      const text = `${e.title} ${e.venue ?? ""} ${e.city ?? ""} ${e.description ?? ""}`.toLowerCase();
      const textOk = !q || text.includes(q);
      return regionOk && textOk;
    });
  }, [all, search, region]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-zinc-900">Events</h1>
          <p className="text-sm text-zinc-600 mt-1">Teile Konzerte, Gigs & Auftritte.</p>
        </div>

        <Link
          href="/events/new"
          className="inline-flex items-center justify-center rounded-xl bg-zinc-900 text-white px-4 py-2 text-sm font-semibold hover:bg-zinc-800 transition"
        >
          + Event erstellen
        </Link>
      </div>

      {/* Filter */}
      <div className="rounded-2xl bg-zinc-900 text-white border border-zinc-800/60 shadow-lg p-4 md:p-5">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <input
            type="text"
            placeholder="Suche nach Titel, Venue, Ort…"
            className="w-full md:w-[28rem] rounded-xl bg-white/10 text-white placeholder:text-zinc-400 border border-white/10 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-white/10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            className="rounded-xl bg-white/10 text-white border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/10 md:ml-auto"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          >
            <option value="" className="text-zinc-900">Alle Kantone</option>
            {Object.keys(KANTON_LABELS).sort().map((c) => (
              <option key={c} value={c} className="text-zinc-900">
                {c}: {KANTON_LABELS[c as keyof typeof KANTON_LABELS]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
          Lade Events…
        </div>
      )}

      {/* Liste */}
      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((e) => (
          <div key={e.id} className="rounded-2xl bg-zinc-900 text-white p-6 shadow-lg border border-zinc-800/60">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                {e.ownerPhotoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={e.ownerPhotoURL} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-lg">🎤</span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-lg font-semibold tracking-tight truncate">{e.title}</div>

                <div className="mt-1 text-sm text-zinc-300">
                  <span className="text-zinc-200">{fmtDate(e.date)}</span>
                  {e.venue ? ` · ${e.venue}` : ""}
                </div>

                <div className="mt-2 flex items-center gap-2 text-xs text-zinc-400">
                  <CantonCoat code={e.region} size={18} className="h-[18px] w-[18px]" />
                  <span className="truncate">
                    {e.region ? (KANTON_LABELS[e.region as keyof typeof KANTON_LABELS] ?? e.region) : "—"}
                    {e.city ? ` · ${e.city}` : ""}
                  </span>
                </div>

                {e.description ? (
                  <p className="mt-3 text-sm text-zinc-200 line-clamp-3">{e.description}</p>
                ) : null}

                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm font-semibold text-zinc-100">{e.ownerName}</div>

                  {e.link ? (
                    <a
                      href={e.link}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl bg-white text-zinc-900 px-3 py-1.5 text-xs font-bold hover:opacity-90 transition"
                    >
                      Link
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {!loading && filtered.length === 0 && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
          Keine Events gefunden.
        </div>
      )}
    </div>
  );
}
