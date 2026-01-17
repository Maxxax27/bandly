"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

type ProducerRow = {
  id: string;
  uid?: string;

  verified?: boolean;

  displayName?: string;
  studioName?: string;
  location?: string;
  photoURL?: string | null;
  genres?: string[];

  updatedAt?: any;
  createdAt?: any;

  badges?: {
    producer?: boolean;
  };
};

function norm(s: any) {
  return String(s ?? "").trim().toLowerCase();
}

function toMillis(ts: any): number {
  try {
    if (ts?.toMillis) return ts.toMillis();
    if (ts instanceof Date) return ts.getTime();
    if (typeof ts === "number") return ts;
    return 0;
  } catch {
    return 0;
  }
}

export default function ProducersPage() {
  const [rows, setRows] = useState<ProducerRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [qText, setQText] = useState("");
  const [qLocation, setQLocation] = useState("");

  useEffect(() => {
    let unsub: (() => void) | null = null;

    const q1 = query(
      collection(db, "producers"),
      where("verified", "==", true),
      orderBy("updatedAt", "desc")
    );

    const q2 = query(collection(db, "producers"), where("verified", "==", true));

    unsub = onSnapshot(
      q1,
      (snap) => {
        const items: ProducerRow[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<ProducerRow, "id">),
        }));
        setRows(items);
        setLoading(false);
      },
      (error) => {
        console.error("❌ Producer query failed (index building):", error);

        unsub?.();
        unsub = onSnapshot(
          q2,
          (snap2) => {
            const items: ProducerRow[] = snap2.docs.map((d) => ({
              id: d.id,
              ...(d.data() as Omit<ProducerRow, "id">),
            }));

            items.sort((a, b) => toMillis(b.updatedAt) - toMillis(a.updatedAt));
            setRows(items);
            setLoading(false);
          },
          (error2) => {
            console.error("❌ Producer fallback query failed:", error2);
            setLoading(false);
          }
        );
      }
    );

    return () => unsub?.();
  }, []);

  const filtered = useMemo(() => {
    const t = norm(qText);
    const loc = norm(qLocation);

    if (!t && !loc) return rows;

    return rows.filter((p) => {
      const name = norm(p.displayName);
      const studio = norm(p.studioName);
      const location = norm(p.location);

      const matchText = !t || name.includes(t) || studio.includes(t);
      const matchLoc = !loc || location.includes(loc);

      return matchText && matchLoc;
    });
  }, [rows, qText, qLocation]);

  return (
    <div className="pb-28 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-white">Producer</h1>
          <p className="mt-1 text-sm text-white/60">
            Suche nach Producer (Studio / Name) und Ort.
          </p>
        </div>

        <Link
          href="/producers/apply"
          className="shrink-0 rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-black hover:opacity-95"
        >
          Producer Profil aktivieren
        </Link>
      </div>

      <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-sm font-semibold text-white">Name / Studio</label>
            <input
              value={qText}
              onChange={(e) => setQText(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white outline-none"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-white">Ort</label>
            <input
              value={qLocation}
              onChange={(e) => setQLocation(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white outline-none"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-white/60">Lade Producer…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/70">
          Keine passenden Producer gefunden.
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((p) => {
            const hrefUid = p.id; // ✅ doc id
            const name = p.studioName || p.displayName || "Producer";

            return (
              <Link
                key={p.id}
                href={`/producers/${encodeURIComponent(hrefUid)}`}
                className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/30 p-4 hover:bg-white/5 transition"
              >
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/10 bg-black/40">
                  <img
                    src={p.photoURL || "/default-avatar.png"}
                    alt={name}
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-base font-semibold text-white truncate">{name}</span>
                    {p.badges?.producer && (
                      <span className="rounded-md bg-blue-500/15 px-2 py-0.5 text-[10px] font-semibold text-blue-400">
                        PRODUCER
                      </span>
                    )}
                  </div>

                  <div className="mt-0.5 text-sm text-white/60 truncate">{p.location || "—"}</div>

                  {Array.isArray(p.genres) && p.genres.length > 0 && (
                    <div className="mt-1 text-xs text-white/50 truncate">
                      {p.genres.slice(0, 3).join(" • ")}
                      {p.genres.length > 3 ? " …" : ""}
                    </div>
                  )}
                </div>

                <div className="text-xs text-white/40">🎚️</div>
              </Link>
            );
          })}
        </div>
      )}

      <div className="text-xs text-white/40">Hinweis: Es werden nur freigegebene Producer angezeigt (verified).</div>
    </div>
  );
}
