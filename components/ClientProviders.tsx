"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import ProducerModeGlow from "@/components/ProducerModeGlow";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";

type Role = "musician" | "producer";

export default function ClientProviders({ children }: { children: ReactNode }) {
  const prevRole = useRef<Role | null>(null);
  const [glow, setGlow] = useState(false);

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        prevRole.current = "musician";
        if (unsubProfile) unsubProfile();
        return;
      }

      const ref = doc(db, "profiles", user.uid);

      unsubProfile = onSnapshot(ref, (snap) => {
        const role: Role =
          snap.exists() && snap.data().activeRole === "producer"
            ? "producer"
            : "musician";

        // 🔵 Glow nur beim Wechsel → Producer
        if (prevRole.current && prevRole.current !== role && role === "producer") {
          setGlow(true);
          setTimeout(() => setGlow(false), 900);
        }

        prevRole.current = role;
      });
    });

    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  return (
    <>
      <ProducerModeGlow active={glow} />
      {children}
    </>
  );
}
