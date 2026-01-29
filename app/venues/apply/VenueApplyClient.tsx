"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  serverTimestamp,
  setDoc,
  doc,
  writeBatch,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

// ✅ Passe diese Imports an dein Projekt an
import { auth, db } from "@/lib/firebase";

type ProposedLocation = {
  country: string;
  city: string;
  address?: string;
};

export default function VenueApplyClient() {
  const [uid, setUid] = useState<string | null>(null);

  const [venueName, setVenueName] = useState("");
  const [country, setCountry] = useState("Switzerland");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");

  const [website, setWebsite] = useState("");
  const [instagram, setInstagram] = useState("");
  const [googleMaps, setGoogleMaps] = useState("");

  const [loading, setLoading] = useState(false);
  const [doneId, setDoneId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null));
  }, []);

  const canSubmit = useMemo(() => {
    return !!uid && venueName.trim().length > 0 && city.trim().length > 0 && !loading;
  }, [uid, venueName, city, loading]);

  async function submit() {
    setError(null);
    setDoneId(null);

    if (!uid) {
      setError("Bitte zuerst einloggen.");
      return;
    }
    if (!venueName.trim() || !city.trim()) {
      setError("Venue Name und Stadt sind Pflicht.");
      return;
    }

    setLoading(true);
    try {
      const proposedLocation: ProposedLocation = {
        country: country.trim(),
        city: city.trim(),
        ...(address.trim() ? { address: address.trim() } : {}),
      };

      const links = {
        ...(website.trim() ? { website: website.trim() } : {}),
        ...(instagram.trim() ? { instagram: instagram.trim() } : {}),
        ...(googleMaps.trim() ? { googleMaps: googleMaps.trim() } : {}),
      };

      // ✅ Alles atomar: Application + AdminMessage + (optional) Draft Venue + Membership + Profile Update
      const batch = writeBatch(db);

      // IDs vorab erstellen (ohne addDoc)
      const appRef = doc(collection(db, "venueApplications"));
      const venueRef = doc(collection(db, "venues")); // Draft Venue ID

      // 1) Venue Application (pending)
      batch.set(appRef, {
        applicantUid: uid,
        venueName: venueName.trim(),
        proposedLocation,
        links,
        status: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        // ✅ Verbindung zur Draft Venue
        draftVenueId: venueRef.id,
      });

      // 2) Admin Inbox Message (damit es in /admin/inbox auftaucht)
      batch.set(doc(db, "adminMessages", appRef.id), {
        type: "venue_application",
        status: "open",

        applicationId: appRef.id,

        fromUid: uid,
        fromName: auth.currentUser?.displayName ?? "",
        fromPhotoURL: auth.currentUser?.photoURL ?? "",
        fromEmail: auth.currentUser?.email ?? "",

        venueName: venueName.trim(),
        proposedLocation,
        links,

        // ✅ Verbindung zur Draft Venue
        draftVenueId: venueRef.id,

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // 3) ✅ Draft Venue anlegen (NICHT öffentlich!)
      //    => so kannst du sofort Edit + Upload machen, aber niemand sieht es in /venues
      batch.set(venueRef, {
        name: venueName.trim(),
        bio: "",
        avatarURL: "",
        coverURL: "",

        location: {
          country: proposedLocation.country,
          city: proposedLocation.city,
          ...(proposedLocation.address ? { address: proposedLocation.address } : {}),
        },

        // optional (dein PublicClient unterstützt links)
        links,

        verified: false,
        published: false,

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),

        // optional ownership hint
        ownerUid: uid,
        applicationId: appRef.id,
      });

      // 4) ✅ Membership erstellen (damit Storage Rules Upload erlauben)
      batch.set(doc(db, "venueMemberships", uid, "venues", venueRef.id), {
        venueId: venueRef.id,
        role: "owner",
        name: venueName.trim(),
        // ✅ membership ist "verified" als membership (du bist Owner),
        //    die Venue selbst bleibt verified=false, published=false
        verified: true,
        published: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // 5) ✅ Profile setzen (damit Edit / BottomNav nicht auf apply redirected)
      batch.set(
        doc(db, "profiles", uid),
        {
          activeRole: "venue",
          activeVenueId: venueRef.id,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      await batch.commit();

      setDoneId(appRef.id);
      setVenueName("");
      setCity("");
      setAddress("");
      setWebsite("");
      setInstagram("");
      setGoogleMaps("");
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl p-4">
      <h1 className="text-2xl font-semibold">Venue Bewerbung</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Bewirb dich als Venue, damit Bands/Musiker dich für Auftritte anfragen können.
      </p>

      <div className="mt-6 space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div>
          <label className="text-sm text-zinc-300">Venue Name *</label>
          <input
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 outline-none"
            value={venueName}
            onChange={(e) => setVenueName(e.target.value)}
            placeholder="z.B. Rockhouse Luzern"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="text-sm text-zinc-300">Land</label>
            <input
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 outline-none"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-zinc-300">Stadt *</label>
            <input
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 outline-none"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Luzern"
            />
          </div>
        </div>

        <div>
          <label className="text-sm text-zinc-300">Adresse (optional)</label>
          <input
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 outline-none"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Straße, Nr."
          />
        </div>

        <div className="pt-2">
          <div className="text-sm font-medium text-zinc-200">Links (optional)</div>

          <div className="mt-3 space-y-3">
            <input
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 outline-none"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="Website"
            />
            <input
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 outline-none"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="Instagram"
            />
            <input
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 outline-none"
              value={googleMaps}
              onChange={(e) => setGoogleMaps(e.target.value)}
              placeholder="Google Maps Link"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        {doneId && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            Bewerbung gesendet ✅ (ID: {doneId})
            <div className="mt-1 text-xs text-emerald-200/70">
              Du kannst dein Venue-Profil bereits bearbeiten (noch nicht öffentlich sichtbar).
            </div>
          </div>
        )}

        <button
          onClick={submit}
          disabled={!canSubmit}
          className="w-full rounded-xl bg-white/90 px-4 py-2 text-sm font-semibold text-black disabled:opacity-40"
        >
          {loading ? "Sende..." : "Bewerbung abschicken"}
        </button>
      </div>
    </div>
  );
}
