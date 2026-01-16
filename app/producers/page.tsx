"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

function norm(s: any) {
  return String(s ?? "").trim().toLowerCase();
}

export default function ProducersPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 🔎 Search inputs
  const [qText, setQText] = useState(""); // name/studio/label
  const [qLocation, setQLocation] = useState(""); // ort

  useEffect(() => {
    const q = query(
      collection(db, "producers"),
      where("verified", "==", true),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      () => setLoading(false)
    );

    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    const t = norm(qText);
    const loc = norm(qLocation);

    if (!t && !loc) return rows;

    return rows.filter((p) => {
      const name = norm(p.displayName);
      const studio = norm(p.studioName);
      const label = norm(p.label); // optional (falls du es später ergänzt)
      const location = norm(p.location);

      const matchText = !t || name.includes(t) || studio.includes(t) || label.includes(t);
      const matchLoc = !loc || location.includes(loc);

      return matchText && matchLoc;
    });
  }, [rows, qText, qLocation]);

  return (
    <div className="pb-28 space-y-4">
      {/* Title + CTA */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-white">Producer</h1>
          <p className="mt-1 text-sm text-white/60">
            Suche nach Producer (Studio/Name/Label) und Ort.
          </p>
        </div>

        <Link
          href="/producers/apply"
          className="shrink-0 rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-black hover:opacity-95"
        >
          Producer Profil aktivieren
        </Link>
      </div>

      {/* Search Box */}
      <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-sm font-semibold text-white">
              Name / Studio / Label
            </label>
            <input
              value={qText}
              onChange={(e) => setQText(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white outline-none"
              placeholder="z.B. Red Studio, Universal, Label…"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-white">Ort</label>
            <input
              value={qLocation}
              onChange={(e) => setQLocation(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white outline-none"
              placeholder="z.B. Zürich"
            />
          </div>
        </div>

        {(qText.trim() || qLocation.trim()) && (
          <div className="mt-3 flex items-center justify-between">
            <div className="text-xs text-white/50">
              Treffer: <span className="text-white/80">{filtered.length}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setQText("");
                setQLocation("");
              }}
              className="rounded-xl border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10"
            >
              Filter zurücksetzen
            </button>
          </div>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="text-sm text-white/60">Lade Producer…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/70">
          Keine passenden Producer gefunden.
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/30 p-4"
            >
              {/* Avatar */}
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/10 bg-black/40">
                <img
                  src={p.photoURL ?? "/default-avatar.png"}
                  alt={p.studioName || p.displayName || "Producer"}
                  className="h-full w-full object-cover"
                />
              </div>

              {/* Text */}
              <div className="min-w-0 flex-1">
                <div className="text-base font-semibold text-white truncate">
                  {p.studioName || p.displayName || "Producer"}
                </div>

                <div className="mt-0.5 text-sm text-white/60 truncate">
                  {p.location ? p.location : "—"}
                </div>

                {Array.isArray(p.genres) && p.genres.length > 0 && (
                  <div className="mt-1 text-xs text-white/50 truncate">
                    {p.genres.slice(0, 3).join(" • ")}
                    {p.genres.length > 3 ? " …" : ""}
                  </div>
                )}
              </div>

              <div className="text-xs text-white/40">🎚️</div>
            </div>
          ))}
        </div>
      )}

      <div className="text-xs text-white/40">
        Hinweis: Es werden nur freigegebene Producer angezeigt (verified).
      </div>
    </div>
  );
}
