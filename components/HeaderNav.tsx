"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";

function lowerEmail(s: string) {
  return (s ?? "").trim().toLowerCase();
}

export default function HeaderNav() {
  const { user, loading } = useAuth();

  const [dmUnread, setDmUnread] = useState(0);
  const [bandInvitesPending, setBandInvitesPending] = useState(0);

  // ---- Unread DMs zählen ----
  useEffect(() => {
    if (!user) {
      setDmUnread(0);
      return;
    }

    const qy = query(
      collection(db, "conversations"),
      where("participants", "array-contains", user.uid),
      orderBy("updatedAt", "desc")
    );

    const unsub = onSnapshot(qy, (snap) => {
      const total = snap.docs.reduce((sum, d) => {
        const x = d.data() as any;
        const unreadFor = x?.unreadFor ?? {};
        return sum + (unreadFor?.[user.uid] ?? 0);
      }, 0);

      setDmUnread(total);
    });

    return () => unsub();
  }, [user]);

  // ---- Pending Band-Invites zählen ----
  useEffect(() => {
    if (!user?.email) {
      setBandInvitesPending(0);
      return;
    }

    const myEmail = lowerEmail(user.email);

    const qy = query(
      collection(db, "bandInvites"),
      where("inviteeEmailLower", "==", myEmail),
      where("status", "==", "pending"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(
      qy,
      (snap) => setBandInvitesPending(snap.size),
      () => setBandInvitesPending(0)
    );

    return () => unsub();
  }, [user?.email]);

  const msgBadge = dmUnread;
  const bandBadge = bandInvitesPending;

  const badge = (n: number) =>
    n > 0 ? (
      <span className="ml-2 inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-zinc-900 text-white">
        {n > 99 ? "99+" : n}
      </span>
    ) : null;

  return (
    <nav className="flex items-center gap-6 text-sm font-medium text-zinc-600">
      <Link href="/listings" className="hover:text-black transition">
        Inserate
      </Link>

      <Link href="/musicians" className="hover:text-black transition">
        Musiker
      </Link>

      <Link href="/messages" className="hover:text-black transition inline-flex items-center">
        Nachrichten
        {badge(msgBadge)}
      </Link>

      <Link href="/bands" className="hover:text-black transition inline-flex items-center">
        Bands
        {badge(bandBadge)}
      </Link>

      <Link
        href="/profile"
        className="rounded-xl border border-zinc-300 bg-white px-3 py-1.5 text-zinc-800 hover:bg-zinc-50 transition"
      >
        Profil
      </Link>
    </nav>
  );
}
