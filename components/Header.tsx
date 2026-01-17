"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useAuth } from "@/lib/auth-context";
import { useUnreadCount } from "@/lib/useUnreadCount";
import ProducerRoleSwitch from "@/components/ProducerRoleSwitch";

export default function Header() {
  const { user } = useAuth();
  const unread = useUnreadCount(user?.uid ?? null);

  // ✅ Admin Claim
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

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/80 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-lg text-white">
          <span className="text-xl">🎸</span>
          Bandly
        </Link>

        {/* -------- Desktop Navigation -------- */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-white/70">
          <Link href="/listings" className="hover:text-white transition">
            Inserate
          </Link>

          <Link href="/musicians" className="hover:text-white transition">
            Musiker
          </Link>

          <Link href="/bands" className="hover:text-white transition">
            Bands
          </Link>

          <Link href="/events" className="hover:text-white transition">
            Events
          </Link>

          {/* Nachrichten */}
          <Link href="/messages" className="relative inline-flex items-center gap-2 hover:text-white transition">
            <span>Nachrichten</span>

            {unread > 0 && (
              <span
                className="min-w-[18px] h-[18px] px-1 rounded-full
                           bg-red-600 text-white text-[11px] font-bold
                           inline-flex items-center justify-center"
              >
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </Link>

          {/* ✅ Admin Inbox (nur Admin) */}
          {isAdmin && (
            <Link
              href="/admin/inbox"
              className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 text-white/80 hover:bg-white/10 transition"
              title="Admin Inbox"
            >
              📩 Admin
            </Link>
          )}

          <Link
            href="/profile"
            className="rounded-xl border border-white/20 bg-black/40 px-3 py-1.5 text-white hover:bg-black/60 transition"
          >
            Profil
          </Link>
        </nav>

        {/* -------- Mobile: Icons -------- */}
        <div className="md:hidden flex items-center gap-2">
          {/* Nachrichten */}
          <Link
            href="/messages"
            className="relative inline-flex items-center justify-center rounded-xl p-2 text-white/80 hover:text-white shrink-0"
            aria-label="Nachrichten"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
            </svg>

            {unread > 0 && (
              <span
                className="absolute -top-1 -right-1 min-w-[18px] h-[18px]
                           rounded-full bg-red-600 text-white text-[11px]
                           font-bold flex items-center justify-center"
              >
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </Link>

          {/* ✅ Producer Switch (Mobile) */}
          <div className="shrink-0">
            <ProducerRoleSwitch />
          </div>

          {/* ✅ Admin Inbox (Mobile, nur Admin) */}
          {isAdmin && (
            <Link
              href="/admin/inbox"
              className="inline-flex items-center justify-center rounded-xl p-2 text-white/80 hover:text-white shrink-0"
              aria-label="Admin Inbox"
              title="Admin Inbox"
            >
              📩
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
