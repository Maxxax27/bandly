"use client";

import { useMemo } from "react";

// ✅ akzeptiert dein VenueMembership aus useVenueMemberships (name optional)
export type VenueMembership = {
  venueId: string;
  name?: string;
  avatarURL?: string;
  verified?: boolean;
  published?: boolean;
  role?: string;
};

type ProfileLike = {
  activeVenueId?: string | null;
};

type VenueDocLike = {
  name?: string;
  avatarURL?: string;
  coverURL?: string;
  location?: any;
  openingHours?: any;
  contact?: any;
  published?: boolean;
  verified?: boolean;
};

export function useActiveVenue(
  profile: ProfileLike | null,
  venues: VenueMembership[]
): { venueId: string | null; venue: VenueDocLike | null; membership: VenueMembership | null } {
  const venueId = useMemo(() => {
    const pid = profile?.activeVenueId ?? null;

    // if activeVenueId exists and is in list
    if (pid && venues.some((v) => v.venueId === pid)) return pid;

    // fallback: first venue
    return venues[0]?.venueId ?? null;
  }, [profile?.activeVenueId, venues]);

  const membership = useMemo(() => {
    if (!venueId) return null;
    return venues.find((v) => v.venueId === venueId) ?? null;
  }, [venues, venueId]);

  // ✅ falls du hier bisher ein Firestore-VenueDoc reinreichst:
  // im EditClient holen wir das Doc direkt per getDoc.
  // Deshalb geben wir hier nur "membership" als venue-ähnliche Info zurück.
  const venue = useMemo(() => {
    if (!membership) return null;
    return {
      name: membership.name ?? "Venue",
      avatarURL: membership.avatarURL ?? "",
    } as VenueDocLike;
  }, [membership]);

  return { venueId, venue, membership };
}
