"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function ProducersPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "producers"), orderBy("createdAt", "desc"));

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

  return (
    <div className="pb-28 space-y-4">
      {/* Title */}
      <div>
        <h1 className="text-lg font-semibold text-white">Producer</h1>
        <p className="mt-1 text-sm text-white/60">
          Entdecke freigegebene Producer.
        </p>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-sm text-white/60">Lade Producer…</div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/70">
          Noch keine Producer freigegeben.
        </div>
      ) : (
        <div className="grid gap-3">
          {rows.map((p) => (
            <div
              key={p.id}
              className="
                flex items-center gap-4 rounded-2xl
                border border-white/10
                bg-black/30 p-4
              "
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

              {/* Optional: später Detailseite */}
              <div className="text-xs text-white/40">🎚️</div>
            </div>
          ))}
        </div>
      )}

      {/* Optional Hint (später) */}
      <div className="text-xs text-white/40">
        Hinweis: Detailansicht kommt später – aktuell siehst du alle freigegebenen Producer.
      </div>
    </div>
  );
}
