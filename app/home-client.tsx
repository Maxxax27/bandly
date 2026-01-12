"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";

import { Feed } from "@/components/Feed";
import { PostComposer } from "@/components/PostComposer";

export default function HomeClient() {
  const [myProfile, setMyProfile] = useState<any | null>(null);
  const uid = auth.currentUser?.uid;

  useEffect(() => {
    if (!uid) {
      setMyProfile(null);
      return;
    }

    const ref = doc(db, "profiles", uid);
    const unsub = onSnapshot(ref, (snap) => {
      setMyProfile(snap.exists() ? { uid, ...snap.data() } : null);
    });

    return () => unsub();
  }, [uid]);

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Hero */}
      <section className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="text-4xl font-bold">🎸 Schweizer Bandbörse</h1>
        <p className="mt-4 text-white/70">Bands · Musiker · Community</p>
      </section>

      {/* Composer (nur wenn eingeloggt + Profil geladen) */}
      <section className="mx-auto max-w-3xl px-4">
        {uid && myProfile ? (
          <PostComposer myProfile={myProfile} />
        ) : (
          <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-white/70">
            Logge dich ein, um einen Post zu erstellen.
          </div>
        )}
      </section>

      {/* Feed */}
      <section className="mx-auto max-w-3xl px-4 pb-24 pt-6">
        <h2 className="mb-4 text-lg font-semibold text-white/80">📰 Artist Feed</h2>
        <Feed pageSize={10} />
      </section>
    </main>
  );
}
