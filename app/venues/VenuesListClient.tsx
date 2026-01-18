// app/venues/VenuesListClient.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";

// ✅ Passe Import an
import { db } from "@/lib/firebase";

type Venue = {
  id: string;
  name?: string;
  slug?: string;
  avatarURL?: string;
  location?: { city?: string; country?: string };
  verified?: boolean;
  published?: boolean;
};

export default function VenuesListClient() {
  const [items, setItems] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [qText, setQText] = useState("");

  async function load() {
    setErr(null);
    setLoading(true);
    try {
      // ✅ Public list: nur verified + published
      const q = query(
        collection(db, "venues"),
        where("verified", "==", true),
        where("published", "==", true),
        orderBy("name", "asc"),
        limit(100)
      );

      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Venue[];
      setItems(list);
    } catch (e: any) {
      setErr(e?.message ?? "Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const t = qText.trim().toLowerCase();
    if (!t) return items;
    return items.filter((v) => (v.name ?? "").toLowerCase().includes(t));
  }, [items, qText]);

  return (
    <div className="pb-28 space-y-4">
      {/* Title */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-white">Venues</h1>
          <p className="mt-1 text-sm text-white/60">
            Entdecke Veranstaltungsorte für Gigs, Sessions und Events.
          </p>
        </div>

        <Link
          href="/venues/apply"
          className="
            shrink-0 rounded-xl
            border border-white/10
            bg-white/10
            px-3 py-1.5
            text-xs font-semibold text-white
            transition hover:bg-white/20
          "
        >
          Venue bewerben
        </Link>
      </div>

      {/* Search */}
      <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
        <input
          value={qText}
          onChange={(e) => setQText(e.target.value)}
          placeholder="Venue suchen…"
          className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none placeholder:text-white/40"
        />
      </div>

      {/* States */}
      {err && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {err}
          <div className="mt-3">
            <button
              onClick={load}
              className="rounded-xl bg-white/90 px-3 py-1.5 text-xs font-semibold text-black"
            >
              Erneut versuchen
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
          Lade…
        </div>
      )}

      {!loading && !err && filtered.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
          Keine Venues gefunden.
        </div>
      )}

      {/* List */}
      <div className="grid gap-3">
        {filtered.map((v) => (
          <Link
            key={v.id}
            href={`/venues/${v.id}`}
            className="
              flex items-center gap-4 rounded-2xl
              border border-white/10
              bg-black/30 p-4
              transition
              hover:bg-white/5
              active:scale-[0.99]
            "
          >
            {/* Avatar */}
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-white/10 bg-black/40 text-lg overflow-hidden">
              {v.avatarURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={v.avatarURL}
                  alt={v.name ?? "Venue"}
                  className="h-full w-full object-cover"
                />
              ) : (
                "🏟️"
              )}
            </div>

            {/* Text */}
            <div className="min-w-0">
              <div className="text-base font-semibold text-white">
                {v.name ?? "Venue"}
              </div>
              <div className="mt-0.5 text-sm text-white/60">
                {(v.location?.city ?? "").trim()}
                {v.location?.country ? `, ${v.location.country}` : ""}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Index hint (nur Info, nicht nötig für UI) */}
      {!loading && !err && (
        <div className="text-[11px] text-white/40">
        </div>
      )}
    </div>
  );
}
