"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import CantonCoat from "@/components/CantonCoat";
import { KANTON_LABELS } from "@/lib/cantons";

type Band = {
  id: string;
  name: string;
  region: string;
  zip?: string;
  location?: string;
  genres: string[];
  bio?: string;
  memberCount?: number;
  photoURL?: string | null;
};

export default function BandsPage() {
  const [all, setAll] = useState<Band[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("");

  useEffect(() => {
    async function load() {
      const qy = query(collection(db, "bands"), orderBy("updatedAt", "desc"));
      const snap = await getDocs(qy);
      const data: Band[] = snap.docs.map((d) => {
        const x = d.data() as any;
        return {
          id: d.id,
          name: x.name ?? "",
          region: x.region ?? "",
          zip: x.zip ?? "",
          location: x.location ?? "",
          genres: Array.isArray(x.genres) ? x.genres : [],
          bio: x.bio ?? "",
          memberCount: x.memberCount ?? 0,
          photoURL: x.photoURL ?? null,
        };
      });
      setAll(data);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((b) => {
      const regionOk = !region || b.region === region;
      const text = `${b.name} ${(b.bio ?? "")} ${(b.location ?? "")}`.toLowerCase();
      const textOk = !q || text.includes(q);
      return regionOk && textOk;
    });
  }, [all, search, region]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white-900">Bands</h1>
          <p className="text-sm text-zinc-600 mt-1">Finde Bands – oder erstelle euer Bandprofil.</p>
        </div>

        <Link
          href="/bands/new"
          className="inline-flex items-center justify-center rounded-xl bg-zinc-900 text-white px-4 py-2 text-sm font-semibold hover:bg-zinc-800 transition"
        >
          + Bandprofil erstellen
        </Link>
      </div>

      <div className="rounded-2xl bg-zinc-900 text-white border border-zinc-800/60 shadow-lg p-4 md:p-5">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <input
            type="text"
            placeholder="Suche Bandname…"
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
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700">Lade Bands…</div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((b) => (
          <Link
            key={b.id}
            href={`/bands/${b.id}`}
            className="group rounded-2xl bg-zinc-900 text-white p-6 shadow-lg hover:bg-zinc-800 transition border border-zinc-800/60"
          >
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                {b.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.photoURL} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-lg">🎸</span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-lg font-semibold tracking-tight truncate">{b.name}</div>

                <div className="mt-2 flex items-center gap-2 text-xs text-zinc-400">
                  <CantonCoat code={b.region} size={18} className="h-[18px] w-[18px]" />
                  <span className="truncate">
                    {b.region ? (KANTON_LABELS[b.region as keyof typeof KANTON_LABELS] ?? b.region) : "—"}
                    {b.zip ? ` · PLZ ${b.zip}` : ""}
                    {b.location ? ` · ${b.location}` : ""}
                  </span>
                </div>

                {b.genres?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {b.genres.slice(0, 6).map((g) => (
                      <span
                        key={g}
                        className="rounded-full bg-white/10 px-3 py-1 text-xs text-zinc-200 border border-white/10"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-zinc-300">
                    Mitglieder: <span className="text-zinc-100 font-semibold">{b.memberCount ?? 0}</span> / 6
                  </div>
                  <div className="text-sm font-semibold text-zinc-100">Profil ansehen →</div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {!loading && filtered.length === 0 && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
          Keine Bands gefunden.
        </div>
      )}
    </div>
  );
}
