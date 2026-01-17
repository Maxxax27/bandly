"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onIdTokenChanged, type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

type ProfileDoc = {
  photoURL?: string | null;
  activeRole?: "user" | "producer";
  updatedAt?: any;
};

type ProducerDoc = {
  verified?: boolean;
};

type UserDataState = {
  user: User | null;
  uid: string | null;
  profile: ProfileDoc | null;
  producer: ProducerDoc | null;
  isVerifiedProducer: boolean;
  activeRole: "user" | "producer";
  avatarSrc: string;
};

const Ctx = createContext<UserDataState | null>(null);

export function UserDataProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [uid, setUid] = useState<string | null>(auth.currentUser?.uid ?? null);
  const [profile, setProfile] = useState<ProfileDoc | null>(null);
  const [producer, setProducer] = useState<ProducerDoc | null>(null);

  // Auth + Token changes (claims safe)
  useEffect(() => {
    let alive = true;
    const unsub = onIdTokenChanged(auth, (u) => {
      if (!alive) return;
      setUser(u);
      setUid(u?.uid ?? null);
      if (!u) {
        setProfile(null);
        setProducer(null);
      }
    });
    return () => {
      alive = false;
      unsub();
    };
  }, []);

  // Profile listener (only once per uid)
  useEffect(() => {
    if (!uid) return;

    const ref = doc(db, "profiles", uid);
    const unsub = onSnapshot(
      ref,
      (snap) => setProfile(snap.exists() ? (snap.data() as ProfileDoc) : null),
      () => setProfile(null)
    );

    return () => unsub();
  }, [uid]);

  // Producer listener (only once per uid)
  useEffect(() => {
    if (!uid) return;

    const ref = doc(db, "producers", uid);
    const unsub = onSnapshot(
      ref,
      (snap) => setProducer(snap.exists() ? (snap.data() as ProducerDoc) : null),
      () => setProducer(null)
    );

    return () => unsub();
  }, [uid]);

  const isVerifiedProducer = producer?.verified === true;

  const activeRole: "user" | "producer" =
    profile?.activeRole === "producer" && isVerifiedProducer ? "producer" : "user";

  const avatarSrc = useMemo(() => {
    const base = profile?.photoURL ?? user?.photoURL ?? "/default-avatar.png";
    const v =
      profile?.updatedAt?.seconds ??
      profile?.updatedAt?.toMillis?.() ??
      profile?.updatedAt?.toDate?.()?.getTime?.();
    return v ? (base.includes("?") ? `${base}&v=${String(v)}` : `${base}?v=${String(v)}`) : base;
  }, [profile?.photoURL, profile?.updatedAt, user?.photoURL]);

  const value = useMemo<UserDataState>(
    () => ({
      user,
      uid,
      profile,
      producer,
      isVerifiedProducer,
      activeRole,
      avatarSrc,
    }),
    [user, uid, profile, producer, isVerifiedProducer, activeRole, avatarSrc]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUserData() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useUserData must be used within UserDataProvider");
  return v;
}
