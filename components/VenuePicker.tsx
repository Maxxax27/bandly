"use client";

import { doc, updateDoc } from "firebase/firestore";
import { useMemo } from "react";

// ✅ Passe Import an
import { db } from "@/lib/firebase";
import { VenueMembership } from "@/lib/useVenueMemberships";

export default function VenuePicker({
  uid,
  activeVenueId,
  venues,
}: {
  uid: string;
  activeVenueId: string | null | undefined;
  venues: VenueMembership[];
}) {
  const options = useMemo(() => venues ?? [], [venues]);

  async function setActive(venueId: string) {
    await updateDoc(doc(db, "profiles", uid), {
      activeVenueId: venueId,
      updatedAt: new Date(),
    });
  }

  if (!options.length) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-zinc-400">Venue</span>
      <select
        className="rounded-xl border border-white/10 bg-black/40 px-2 py-1 text-sm outline-none"
        value={activeVenueId ?? options[0].venueId}
        onChange={(e) => setActive(e.target.value)}
      >
        {options.map((v) => (
          <option key={v.venueId} value={v.venueId}>
            {v.name}
          </option>
        ))}
      </select>
    </div>
  );
}
