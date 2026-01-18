"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { doc, onSnapshot, updateDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { useVenueMemberships } from "@/lib/useVenueMemberships";

type Profile = {
  activeRole?: "musician" | "producer" | "venue";
  activeVenueId?: string | null;
};

export default function VenueRoleSwitch() {
  const router = useRouter();
  const { uid, venues, loading } = useVenueMemberships();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const popRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    function onDown(e: MouseEvent) {
      const el = popRef.current;
      if (!open || !el) return;
      if (!el.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  const safeVenues = useMemo(() => (Array.isArray(venues) ? venues : []), [venues]);
  const verifiedVenues = useMemo(() => safeVenues.filter((v) => v?.verified === true), [safeVenues]);

  const canShow = useMemo(() => {
    if (!uid) return false;
    if (loading) return false; // ✅ wichtig: kein UI solange memberships laden
    return verifiedVenues.length > 0;
  }, [uid, loading, verifiedVenues.length]);

  const isVenueMode = useMemo(() => profile?.activeRole === "venue", [profile?.activeRole]);

  const currentVenueId = useMemo(() => {
    const pid = profile?.activeVenueId ?? null;
    if (pid && verifiedVenues.some((v) => v.venueId === pid)) return pid;
    return verifiedVenues[0]?.venueId ?? null;
  }, [profile?.activeVenueId, verifiedVenues]);

  const currentVenueName = useMemo(() => {
    const v = verifiedVenues.find((x) => x.venueId === currentVenueId);
    return v?.name ?? "Venue";
  }, [verifiedVenues, currentVenueId]);

  async function setVenueMode(venueId: string | null) {
    if (!uid) return;
    setBusy(true);
    try {
      await updateDoc(doc(db, "profiles", uid), {
        activeRole: "venue",
        activeVenueId: venueId,
        updatedAt: serverTimestamp(),
      });

      // ✅ danach ins Dashboard
      router.push("/venues/dashboard");
    } finally {
      setBusy(false);
      setOpen(false);
    }
  }

  async function setMusicianMode() {
    if (!uid) return;
    setBusy(true);
    try {
      await updateDoc(doc(db, "profiles", uid), {
        activeRole: "musician",
        updatedAt: serverTimestamp(),
      });
      router.push("/");
    } finally {
      setBusy(false);
      setOpen(false);
    }
  }

  if (!canShow) return null;

  return (
    <div className="relative" ref={popRef}>
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          if (!isVenueMode) {
            void setVenueMode(currentVenueId);
            return;
          }
          setOpen((v) => !v);
        }}
        className={[
          "inline-flex items-center gap-2 rounded-2xl border px-3 py-1.5 text-xs font-semibold transition backdrop-blur",
          busy ? "opacity-60" : "hover:bg-white/10",
          isVenueMode
            ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-200"
            : "border-white/10 bg-white/5 text-zinc-200",
        ].join(" ")}
      >
        <span className="text-sm">🏟️</span>
        <span className="max-w-[140px] truncate">{isVenueMode ? currentVenueName : "Venue Mode"}</span>
        <span className={["ml-1 inline-block h-2 w-2 rounded-full", isVenueMode ? "bg-emerald-400" : "bg-white/25"].join(" ")} />
        {isVenueMode && <span className="ml-1 text-[10px] opacity-80">▾</span>}
      </button>

      {open && isVenueMode && (
        <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-white/10 bg-black/90 shadow-xl">
          <div className="px-3 py-2 text-[11px] text-white/50">Aktive Venue auswählen</div>

          <div className="max-h-64 overflow-auto">
            {verifiedVenues.map((v) => {
              const vid = v.venueId;
              const name = v?.name ?? "Venue";
              const selected = vid === currentVenueId;

              return (
                <button
                  key={vid}
                  type="button"
                  disabled={busy}
                  onClick={() => void setVenueMode(vid)}
                  className={[
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition",
                    selected ? "bg-white/10" : "hover:bg-white/5",
                  ].join(" ")}
                >
                  <span className="text-sm">🏟️</span>
                  <span className="min-w-0 flex-1 truncate text-white/90">{name}</span>
                  {selected && <span className="text-[11px] text-emerald-300">aktiv</span>}
                </button>
              );
            })}
          </div>

          <div className="border-t border-white/10" />

          <button
            type="button"
            disabled={busy}
            onClick={() => void setMusicianMode()}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-white/80 hover:bg-white/5"
          >
            <span className="text-sm">🎸</span>
            Zurück zu Musiker
          </button>
        </div>
      )}
    </div>
  );
}

