"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  serverTimestamp,
  setDoc,
  doc,
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

      // 1) Venue Application
      const ref = await addDoc(collection(db, "venueApplications"), {
        applicantUid: uid,
        venueName: venueName.trim(),
        proposedLocation,
        links,
        status: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // 2) ✅ Admin Inbox Message (damit es in /admin/inbox auftaucht)
      await setDoc(doc(db, "adminMessages", ref.id), {
        type: "venue_application",
        status: "open",

        applicationId: ref.id,

        fromUid: uid,
        fromName: auth.currentUser?.displayName ?? "",
        fromPhotoURL: auth.currentUser?.photoURL ?? "",
        fromEmail: auth.currentUser?.email ?? "",

        venueName: venueName.trim(),
        proposedLocation,
        links,

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setDoneId(ref.id);
      setVenueName("");
      setCity("");
      setAddress("");
      setWebsite("");
      setInstagram("");
      setGoogleMaps("");
    } catch (e: any) {
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
