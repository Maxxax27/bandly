"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useUnreadCount } from "@/lib/useUnreadCount";

export default function Header() {
  const { user } = useAuth();
  const unread = useUnreadCount(user?.uid ?? null);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/80 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
        
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-lg text-white"
        >
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

          {/* Nachrichten (Desktop) */}
          <Link
            href="/messages"
            className="relative inline-flex items-center gap-2 hover:text-white transition"
          >
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

          <Link
            href="/profile"
            className="rounded-xl border border-white/20 bg-black/40 px-3 py-1.5 text-white hover:bg-black/60 transition"
          >
            Profil
          </Link>
        </nav>

        {/* -------- Mobile: Messages Icon only -------- */}
        <div className="md:hidden">
          <Link
            href="/messages"
            className="relative inline-flex items-center justify-center rounded-xl p-2 text-white/80 hover:text-white"
            aria-label="Nachrichten"
          >
            {/* Icon */}
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

            {/* Badge */}
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
        </div>
      </div>
    </header>
  );
}
