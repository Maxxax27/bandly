"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

import { db } from "../../../lib/firebase";
import { useAuth } from "../../../lib/auth-context";

type Listing = {
  title: string;
  text: string;
  region: string;
  instrument: string;
  genres: string[];
  ownerUid: string;
  ownerName: string;
  ownerPhotoURL: string | null;
  ownerLocation: string;
};

export default function ListingDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [listing, setListing] = useState<Listing | null>(null);

  useEffect(() => {
    async function load() {
      if (!id) return;

      setLoading(true);
      const ref = doc(db, "listings", id);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        setListing(null);
        setLoading(false);
        return;
      }

      const d = snap.data() as any;
      setListing({
        title: d.title ?? "",
        text: d.text ?? "",
        region: d.region ?? "",
        instrument: d.instrument ?? "",
        genres: Array.isArray(d.genres) ? d.genres : [],
        ownerUid: d.ownerUid ?? "",
        ownerName: d.ownerName ?? "Unbekannt",
        ownerPhotoURL: d.ownerPhotoURL ?? null,
        ownerLocation: d.ownerLocation ?? "",
      });

      setLoading(false);
    }

    load();
  }, [id]);

  async function startChat() {
    if (!id || !listing) return;

    if (!user) {
      router.push("/login");
      return;
    }

    if (listing.ownerUid === user.uid) {
      alert("Das ist dein eigenes Inserat 🙂");
      return;
    }

    const [a, b] = [user.uid, listing.ownerUid].sort();
    const convId = `${id}__${a}_${b}`;
    const convRef = doc(db, "conversations", convId);

    await setDoc(
      convRef,
      {
        participants: [a, b],
        participantsKey: `${a}_${b}`,
        listingId: id,
        listingTitle: listing.title,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessage: "",
        lastSenderUid: "",
        unreadFor: { [a]: 0, [b]: 0 },
      },
      { merge: true }
    );

    router.push(`/messages/${convId}`);
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-10">
        {/* Loading */}
        {loading && (
          <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-white/70">
            Lade Inserat…
          </div>
        )}

        {/* Not found */}
        {!loading && !listing && (
          <div className="space-y-4">
            <Link href="/listings" className="text-sm text-white/70 hover:underline">
              ← Zurück
            </Link>

            <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-white/70">
              Inserat nicht gefunden.
            </div>
          </div>
        )}

        {/* Content */}
        {!loading && listing && (
          <>
            {/* Top row */}
            <div className="flex items-center justify-between gap-4">
              <Link href="/listings" className="text-sm text-white/70 hover:underline">
                ← Zurück
              </Link>

              <Link
                href="/listings"
                className="text-sm rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 text-white/80 hover:bg-white/10 transition"
              >
                Alle Inserate
              </Link>
            </div>

            {/* Listing Card */}
            <div className="rounded-2xl bg-zinc-900 text-white p-6 md:p-7 shadow-lg border border-zinc-800/60 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                  {listing.title}
                </h1>

                <div className="shrink-0 text-xs text-zinc-300 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  {listing.region}
                </div>
              </div>

              <div className="text-sm text-zinc-300">
                Region: <span className="text-zinc-200">{listing.region}</span> · Instrument:{" "}
                <span className="text-zinc-200">{listing.instrument}</span>
              </div>

              {listing.genres.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {listing.genres.slice(0, 10).map((g) => (
                    <span
                      key={g}
                      className="rounded-full bg-white/10 px-3 py-1 text-xs text-zinc-200 border border-white/10"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              )}

              <div className="pt-4 border-t border-white/10 whitespace-pre-wrap text-zinc-200 leading-relaxed">
                {listing.text}
              </div>
            </div>

            {/* Owner Card */}
            <div className="rounded-2xl bg-zinc-900 text-white p-6 shadow-lg border border-zinc-800/60">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                  {listing.ownerPhotoURL ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={listing.ownerPhotoURL}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-lg">🎸</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-zinc-100 truncate">
                    {listing.ownerName}
                  </div>
                  {listing.ownerLocation ? (
                    <div className="text-sm text-zinc-300 truncate">
                      {listing.ownerLocation}
                    </div>
                  ) : (
                    <div className="text-sm text-zinc-400">—</div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={startChat}
                  className="rounded-xl bg-white text-zinc-900 px-4 py-2 text-sm font-semibold hover:opacity-90 transition"
                >
                  Nachricht senden
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
