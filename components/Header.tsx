"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onIdTokenChanged } from "firebase/auth";
import { useAuth } from "@/lib/auth-context";
import { useUnreadCount } from "@/lib/useUnreadCount";
import ProducerRoleSwitch from "@/components/ProducerRoleSwitch";

export default function Header() {
  const { user } = useAuth();
  const unread = useUnreadCount(user?.uid ?? null);

  // ✅ Admin Claim
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let alive = true;

    // ✅ fires on sign-in/out AND claim refresh
    const unsub = onIdTokenChanged(auth, async (u) => {
      if (!alive) return;

      if (!u) {
        setIsAdmin(false);
        return;
      }

      try {
        // ❗️kein force refresh → verhindert Firestore race
        const tok = await u.getIdTokenResult();
        if (!alive) return;

        setIsAdmin(tok?.claims?.admin === true);
      } catch {
        if (!alive) return;
        setIsAdmin(false);
      }
    });

    return () => {
      alive = false;
      unsub();
    };
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
          <Link href="/listings" className="hover:text-white transition">Inserate</Link>
          <Link href="/musicians" className="hover:text-white transition">Musiker</Link>
          <Link href="/bands" className="hover:text-white transition">Bands</Link>
          <Link href="/events" className="hover:text-white transition">Events</Link>

          {/* Nachrichten */}
          <Link
            href="/messages"
            className="relative inline-flex items-center gap-2 hover:text-white transition"
          >
            {/* Modernes Message Icon */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="4" y="5" width="16" height="12" rx="3" />
              <path d="M8 17l-3 3v-3" />
            </svg>

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

          {/* Admin */}
          {isAdmin && (
            <Link
              href="/admin/inbox"
              className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 text-white/80 hover:bg-white/10 transition"
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

          <ProducerRoleSwitch />
        </nav>

        {/* -------- Mobile -------- */}
        <div className="md:hidden flex items-center gap-2">
          {/* Nachrichten (modern icon statt 💬) */}
          <Link
            href="/messages"
            aria-label="Nachrichten"
            className="relative inline-flex items-center justify-center rounded-xl p-2 text-white/80 hover:text-white"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="4" y="5" width="16" height="12" rx="3" />
              <path d="M8 17l-3 3v-3" />
            </svg>

            {unread > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-600 text-white text-[11px] font-bold flex items-center justify-center">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </Link>

          <ProducerRoleSwitch />

          {isAdmin && (
            <Link href="/admin/inbox" className="p-2 text-white/80 hover:text-white">
              📩
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
