"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      try {
        const tok = await u.getIdTokenResult(true);
        setIsAdmin(tok?.claims?.admin === true);
      } catch {
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  if (loading) {
    return <div className="p-6 text-sm text-white/70">Lade Admin…</div>;
  }

  if (!isAdmin) {
    return (
      <div className="p-6 space-y-3">
        <div className="text-sm text-white/70">Kein Zugriff.</div>
        <Link
          href="/"
          className="inline-block rounded-xl border border-white/10 px-4 py-2 text-sm text-white/80 hover:bg-white/5"
        >
          ← Zurück
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-lg font-semibold text-white">Admin</h1>

      <div className="grid gap-3">
        <Link
          href="/admin/inbox"
          className="rounded-2xl border border-white/10 bg-black/30 p-4 text-white/80 hover:bg-white/5"
        >
          📩 Inbox (Producer Bewerbungen)
        </Link>

        <Link
          href="/admin/producer-requests"
          className="rounded-2xl border border-white/10 bg-black/30 p-4 text-white/80 hover:bg-white/5"
        >
          ✅ Producer Requests Review
        </Link>
      </div>

      <div className="text-xs text-white/40">Admin Panel</div>
    </div>
  );
}
