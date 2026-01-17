"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";

export default function AdminInboxPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.replace("/login");
        return;
      }

      // ✅ Claim prüfen (und Token refresh erzwingen)
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

    setLoading(true);

    const q = query(
      collection(db, "adminMessages"),
      where("type", "==", "producer_application"),
      where("status", "==", "open"),
      orderBy("createdAt", "desc")
    );

    return onSnapshot(
      q,
      (snap) => {
        setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      () => setLoading(false)
    );
  }, [ready, isAdmin]);

  if (!ready) {
    return (
      <div className="p-6 text-sm text-white/70">
        Lade Admin Inbox…
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white">📩 Admin Inbox</h1>
        <p className="text-sm text-white/60">
          Producer-Anfragen (adminMessages).
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-white/60">Lade Anfragen…</div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/70">
          Keine offenen Anfragen.
        </div>
      ) : (
        <div className="grid gap-3">
          {rows.map((m) => (
            <div
              key={m.id}
              className="rounded-2xl border border-white/10 bg-black/30 p-4"
            >
              <div className="flex items-center gap-3">
                <img
                  src={m.fromPhotoURL ?? "/default-avatar.png"}
                  className="h-10 w-10 rounded-full object-cover border border-white/10"
                  alt={m.fromName ?? "User"}
                />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-white truncate">
                    {m.fromName ?? "User"}
                  </div>
                  <div className="text-sm text-white/60 truncate">
                    {m.studioName ?? "Producer Bewerbung"}
                    {m.location ? ` · ${m.location}` : ""}
                  </div>
                </div>

                <Link
                  href={`/admin/producer-requests?uid=${m.applicationUid}`}
                  className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
                >
                  Öffnen
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
