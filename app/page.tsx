"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";

import { db, auth } from "@/lib/firebase";
import { Feed } from "@/components/Feed";
import { PostComposer } from "@/components/PostComposer";

export default function Home() {
  const [myProfile, setMyProfile] = useState<any | null>(null);
  const uid = auth.currentUser?.uid;

  useEffect(() => {
    if (!uid) {
      setMyProfile(null);
      return;
    }

    const ref = doc(db, "profiles", uid);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setMyProfile({ uid, ...snap.data() });
      } else {
        setMyProfile(null);
      }
    });

    return () => unsub();
  }, [uid]);

  return (
    <main className="min-h-screen bg-black text-white">
      {/* MOBILE APP CONTAINER (auch auf Desktop) */}
      <div className="mx-auto w-full max-w-md">

        {/* Hero */}
        <section className="px-4 py-12 text-center">
          <h1 className="text-3xl font-bold">
            🎸 Schweizer Bandbörse
          </h1>
          <p className="mt-3 text-sm text-white/70">
            Bands · Musiker · Community
          </p>
        </section>

        {/* Post Composer */}
        <section className="px-4">
          {uid && myProfile ? (
            <PostComposer myProfile={myProfile} />
          ) : (
            <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-white/60">
              Melde dich an, um einen Beitrag zu erstellen.
            </div>
          )}
        </section>

        {/* Feed */}
        <section className="px-4 pb-28 pt-6">
          <Feed pageSize={10} />
        </section>

      </div>
    </main>
  );
}
