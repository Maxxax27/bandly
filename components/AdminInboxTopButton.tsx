"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function AdminInboxTopButton() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setIsAdmin(false);
        return;
      }
      try {
        const tok = await u.getIdTokenResult(true);
        setIsAdmin(tok?.claims?.admin === true);
      } catch {
        setIsAdmin(false);
      }
    });

    return () => unsub();
  }, []);

  if (!isAdmin) return null;

  return (
    <Link
      href="/admin/inbox"
      className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white/80 hover:bg-white/10"
      title="Admin Inbox"
      aria-label="Admin Inbox"
    >
      📩 Admin
    </Link>
  );
}
