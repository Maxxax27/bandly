"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  limit,
  doc,
} from "firebase/firestore";
import { onAuthStateChanged, getAuth } from "firebase/auth";
import { db } from "@/lib/firebase";
import { PostCard } from "@/components/PostCard";
import { PostComposerFab } from "@/components/PostComposerFab"; // ✅ NEU

export function Feed({ pageSize = 20 }: { pageSize?: number }) {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [userReady, setUserReady] = useState(false);
  const [user, setUser] = useState<any>(null);

  const [myProfile, setMyProfile] = useState<any>(null); // ✅ NEU
  const [profileReady, setProfileReady] = useState(false); // ✅ NEU

  const [error, setError] = useState<string | null>(null);

  // 1) Auth-Status abwarten
  useEffect(() => {
    const unsub = onAuthStateChanged(getAuth(), (u) => {
      setUser(u);
      setUserReady(true);
    });
    return () => unsub();
  }, []);

  // 1.5) myProfile laden (live), sobald User da ist
  useEffect(() => {
    if (!userReady) return;

    // nicht eingeloggt => reset
    if (!user) {
      setMyProfile(null);
      setProfileReady(true);
      return;
    }

    setProfileReady(false);

    const ref = doc(db, "profiles", user.uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setMyProfile(snap.exists() ? { id: snap.id, ...snap.data() } : null);
        setProfileReady(true);
      },
      () => {
        setMyProfile(null);
        setProfileReady(true);
      }
    );

    return () => unsub();
  }, [userReady, user]);

  // 2) Posts nur laden, wenn User da ist
  useEffect(() => {
    if (!userReady) return;

    // nicht eingeloggt => nichts subscriben
    if (!user) {
      setPosts([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const q = query(
      collection(db, "posts"),
      orderBy("createdAt", "desc"),
      limit(pageSize)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        if (err?.code === "permission-denied") {
          setError("Bitte einloggen, um den Feed zu sehen.");
        } else {
          setError("Feed konnte nicht geladen werden.");
        }
      }
    );

    return () => unsub();
  }, [pageSize, userReady, user]);

  if (!userReady) return <div className="text-white/60">Prüfe Login…</div>;
  if (!user) return <div className="text-white/60">Bitte einloggen, um den Feed zu sehen.</div>;
  if (loading) return <div className="text-white/60">Feed lädt…</div>;
  if (error) return <div className="text-red-400">{error}</div>;

  return (
    <>
      <div className="space-y-3">
        {posts.map((p) => (
          <PostCard key={p.id} post={p} />
        ))}
      </div>

      {/* ✅ Floating + Button zum Posten (erst anzeigen wenn Profile ready) */}
      {profileReady && myProfile && <PostComposerFab myProfile={myProfile} />}
    </>
  );
}
