"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";

type ProfileDoc = {
  activeRole?: "musician" | "producer";
};

type ProducerDoc = {
  verified?: boolean;
};

export default function ProducerRoleSwitch() {
  const router = useRouter();

  const [uid, setUid] = useState<string | null>(auth.currentUser?.uid ?? null);
  const [verifiedProducer, setVerifiedProducer] = useState(false);
  const [activeRole, setActiveRole] = useState<"musician" | "producer">("musician");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null));
    return () => unsub();
  }, []);

  useEffect(() => {
    async function load(myUid: string) {
      setLoading(true);

      // ✅ producer verified?
      const prodSnap = await getDoc(doc(db, "producers", myUid));
      const prod = prodSnap.exists() ? (prodSnap.data() as ProducerDoc) : null;
      const isVerified = prod?.verified === true;
      setVerifiedProducer(isVerified);

      // ✅ profile role
      const profRef = doc(db, "profiles", myUid);
      const profSnap = await getDoc(profRef);

      if (!profSnap.exists()) {
        await setDoc(
          profRef,
          { activeRole: "musician", updatedAt: serverTimestamp() },
          { merge: true }
        );
        setActiveRole("musician");
      } else {
        const p = profSnap.data() as ProfileDoc;
        setActiveRole(p.activeRole === "producer" ? "producer" : "musician");
      }

      setLoading(false);
    }

    const myUid = auth.currentUser?.uid;
    if (!myUid) {
      setVerifiedProducer(false);
      setActiveRole("musician");
      setLoading(false);
      return;
    }

    load(myUid);
  }, [uid]); // uid triggert reload bei auth change

  if (loading) return null;
  if (!uid) return null;
  if (!verifiedProducer) return null;

  async function toggle() {
    const myUid = auth.currentUser?.uid;
    if (!myUid) return;

    const nextRole: "musician" | "producer" =
      activeRole === "producer" ? "musician" : "producer";

    setActiveRole(nextRole);

    await updateDoc(doc(db, "profiles", myUid), {
      activeRole: nextRole,
      updatedAt: serverTimestamp(),
    });

    router.push(nextRole === "producer" ? "/producers/dashboard" : "/");
  }

  const isProducerMode = activeRole === "producer";

  return (
    <button
      type="button"
      onClick={toggle}
      title={isProducerMode ? "Zu Musiker-Modus wechseln" : "Zu Producer-Modus wechseln"}
      className={`relative inline-flex items-center justify-center rounded-xl border border-white/10 px-3 py-2 text-sm hover:bg-white/5 ${
        isProducerMode ? "text-blue-300" : "text-white/70"
      }`}
    >
      <span className="mr-1">🎚️</span>
      <span className="hidden sm:inline">
        {isProducerMode ? "Producer" : "Musiker"}
      </span>

      {isProducerMode && (
        <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-blue-400" />
      )}
    </button>
  );
}
