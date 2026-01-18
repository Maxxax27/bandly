"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, onSnapshot, updateDoc, serverTimestamp } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { useVenueMemberships } from "@/lib/useVenueMemberships";

type Profile = {
  activeRole?: "musician" | "producer" | "venue";
  activeVenueId?: string | null;
};

export default function VenueEditClient() {
  const router = useRouter();
  const { uid, venues } = useVenueMemberships();

  const [profile, setProfile] = useState<Profile | null>(null);

  // ✅ live profile
  useEffect(() => {
    if (!uid) {
      setProfile(null);
      return;
    }
    const unsub = onSnapshot(doc(db, "profiles", uid), (snap) => {
      setProfile((snap.data() as any) ?? null);
    });
    return () => unsub();
  }, [uid]);

  // ✅ GUARD (hier ist er richtig!)
  useEffect(() => {
    if (!uid) return;

    // 1) keine Venue Membership -> apply
    if (!Array.isArray(venues) || venues.length === 0) {
      router.replace("/venues/apply");
      return;
    }

    // 2) hat Venues, aber activeVenueId fehlt -> automatisch setzen
    if (!profile?.activeVenueId) {
      const firstVenueId = venues[0]?.venueId ?? null;

      if (!firstVenueId) {
        router.replace("/venues/apply");
        return;
      }

      updateDoc(doc(db, "profiles", uid), {
        activeRole: "venue",
        activeVenueId: firstVenueId,
        updatedAt: serverTimestamp(),
      }).catch(() => {});
    }
  }, [uid, venues, profile?.activeVenueId, router]);

  // ✅ optional: solange profile noch lädt, nicht rendern
  if (!uid) return null;
  if (!profile) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/70">
        Lade…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
        <div className="text-lg font-semibold text-white">Venue bearbeiten</div>
        <div className="mt-1 text-sm text-white/60">
          (Als nächstes bauen wir hier: Avatar, Titelbild, Adresse, Öffnungszeiten, etc.)
        </div>
      </div>

      {/* TODO: hier kommt dein echtes Edit-Form */}
    </div>
  );
}
