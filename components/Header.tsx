 "use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useUnreadCount } from "@/lib/useUnreadCount";

export default function Header() {
  const { user } = useAuth();
  const unread = useUnreadCount(user?.uid ?? null);

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/80 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
        
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-lg text-zinc-900"
        >
          <span className="text-xl">🎸</span>
          Bandly
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-6 text-sm font-medium text-zinc-600">
          <Link href="/listings" className="hover:text-black transition">
            Inserate
          </Link>

          <Link href="/musicians" className="hover:text-black transition">
            Musiker
          </Link>

          <Link href="/bands" className="hover:text-black transition">
  Bands
</Link>
          <Link href="/events" className="hover:text-black transition">
  Events
</Link>


          {/* 🔔 Nachrichten mit Badge */}
          <Link
            href="/messages"
            className="relative inline-flex items-center gap-2 hover:text-black transition"
          >
            <span>Nachrichten</span>

            {unread > 0 && (
              <span
                className="min-w-[18px] h-[18px] px-1 rounded-full
                           bg-red-600 text-white text-[11px] font-bold
                           inline-flex items-center justify-center"
                title={`${unread} ungelesene Nachrichten`}
              >
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </Link>

          <Link
            href="/profile"
            className="rounded-xl border border-zinc-300 bg-white px-3 py-1.5 text-zinc-800 hover:bg-zinc-50 transition"
          >
            Profil
          </Link>
        </nav>
      </div>
    </header>
  );
}