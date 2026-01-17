"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, limit, query, where } from "firebase/firestore";

function norm(v: any) {
  return String(v ?? "").trim();
}

export default function AdminInboxPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.replace("/login");
        return;
      }
      const tok = await u.getIdTokenResult(true);
      const admin = tok?.claims?.admin === true;
      setIsAdmin(admin);
      setReady(true);
      if (!admin) router.replace("/");
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (!ready || !isAdmin) return;

    async function load() {
      setLoading(true);
      setErr(null);

      try {
        // ✅ Kein orderBy -> kein Index nötig
        const q = query(
          collection(db, "producerApplications"),
          where("status", "==", "pending"),
          limit(50)
        );

        const snap = await getDocs(q);
        setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e: any) {
        const msg =
          e?.code === "permission-denied"
            ? "Keine Berechtigung (Admin Claim / Rules)."
            : e?.code === "failed-precondition"
            ? "Firestore Index fehlt (failed-precondition)."
            : "Konnte Anfragen nicht anzeigen.";

        // ✅ Debug damit du sofort siehst was Firestore wirklich sagt:
        console.error("AdminInbox load error:", e);

        setErr(msg);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [ready, isAdmin]);

  if (!ready) {
    return <div className="p-6 text-sm text-white/70">Lade Admin Inbox…</div>;
  }
  if (!isAdmin) return null;

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white">📩 Admin Inbox</h1>
        <p className="text-sm text-white/60">Pending Producer-Bewerbungen.</p>
      </div>

      {loading ? (
        <div className="text-sm text-white/60">Lade Anfragen…</div>
      ) : err ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
          {err}
          <div className="mt-2 text-xs text-red-200/70">
            (Details im Browser-Console Log)
          </div>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/70">
          Keine pending Anfragen.
        </div>
      ) : (
        <div className="grid gap-3">
          {rows.map((m) => {
            const uid = m.uid ?? m.id;
            const title = norm(m.studioName) || norm(m.displayName) || uid;

            return (
              <div
                key={uid}
                className="rounded-2xl border border-white/10 bg-black/30 p-4"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={m.photoURL ?? "/default-avatar.png"}
                    className="h-10 w-10 rounded-full object-cover border border-white/10"
                    alt={title}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-white truncate">{title}</div>
                    <div className="text-sm text-white/60 truncate">
                      {m.location ? m.location : "—"}
                    </div>
                  </div>

                  <Link
                    href={`/admin/producer-requests?uid=${uid}`}
                    className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
                  >
                    Öffnen
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
