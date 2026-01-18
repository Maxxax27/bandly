"use client";

import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";
import { onIdTokenChanged } from "firebase/auth";


// ✅ Passe Import an
import { auth, db } from "@/lib/firebase";

export type VenueMembership = {
  venueId: string; // ✅ kommt von doc.id
  role?: "owner" | "manager" | "staff" | string;
  name?: string;
  avatarURL?: string;
  verified?: boolean;
  published?: boolean;
};

export function useVenueMemberships() {
  const [uid, setUid] = useState<string | null>(auth.currentUser?.uid ?? null);
  const [venues, setVenues] = useState<VenueMembership[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ stabiler als onAuthStateChanged (weniger race bei Navigation)
  useEffect(() => {
    const unsub = onIdTokenChanged(auth, (u) => {
      setUid(u?.uid ?? null);
      // ✅ beim Logout sofort resetten
      if (!u) {
        setVenues([]);
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    // ✅ wenn uid noch nicht gesetzt ist: weiter "loading", NICHT false setzen
    // (sonst feuert dein Guard zu früh und schickt dich auf /venues/apply)
    if (!uid) {
      setLoading(true);
      setVenues([]);
      return;
    }

    setLoading(true);

    const q = query(
      collection(db, "venueMemberships", uid, "venues"),
      orderBy("name", "asc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
       const list = snap.docs.map((d) => {
  const data = d.data() as any;

  return {
    venueId: d.id,
    ...data,
    // ✅ garantiert string, verhindert TS-Probleme überall
    name: String(data?.name ?? "Venue"),
  } as VenueMembership;
});


        // ✅ NICHT hart filtern -> sonst ist venues.length===0 oft falsch
        setVenues(list);
        setLoading(false);
      },
      () => {
        setVenues([]);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [uid]);

  return { uid, venues, loading };
}
