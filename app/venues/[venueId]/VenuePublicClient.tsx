// app/venues/[venueId]/VenuePublicClient.tsx
"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { addDoc, collection, doc, getDoc, serverTimestamp } from "firebase/firestore";

import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";

type Venue = {
  name?: string;
  bio?: string;

  avatarURL?: string;
  coverURL?: string;

  photos?: string[];

  location?: {
    city?: string;
    country?: string;
    address?: string;
    postalCode?: string;
  };

  openingHours?: {
    mon?: string;
    tue?: string;
    wed?: string;
    thu?: string;
    fri?: string;
    sat?: string;
    sun?: string;
  };

  contact?: {
    phone?: string;
    email?: string;
    website?: string;
    instagram?: string;
  };

  capacity?: number;
  equipment?: string[];
  genres?: string[];

  verified?: boolean;
  published?: boolean;

  // bleibt kompatibel zu deinem alten schema
  links?: { website?: string; instagram?: string; googleMaps?: string };
};

function val(v: any) {
  return String(v ?? "").trim();
}

export default function VenuePublicClient() {
  const params = useParams<{ venueId: string }>();
  const venueId = params?.venueId;

  const router = useRouter();
  const { user } = useAuth();

  const [venue, setVenue] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Request modal state
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [fromBandId, setFromBandId] = useState(""); // optional
  const [sending, setSending] = useState(false);
  const [sentId, setSentId] = useState<string | null>(null);

  useEffect(() => {
    if (!venueId) return;

    async function load() {
      setErr(null);
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, "venues", venueId));
        if (!snap.exists()) {
          setVenue(null);
          setErr("Venue nicht gefunden.");
          return;
        }

        const data = snap.data() as Venue;

        // Public guard (Rules lassen evtl. auch Member/Admin lesen)
        if (data.verified !== true || data.published !== true) {
          setVenue(null);
          setErr("Diese Venue ist nicht öffentlich.");
          return;
        }

        setVenue(data);
      } catch (e: any) {
        setErr(e?.message ?? "Fehler beim Laden");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [venueId]);

  const title = venue?.name ?? "Venue";

  const canRequest = useMemo(() => {
    return !!user?.uid && !!venueId && !sending;
  }, [user?.uid, venueId, sending]);

  async function sendRequest() {
    setSentId(null);
    if (!user?.uid) {
      router.push("/login");
      return;
    }
    if (!venueId) return;

    const txt = message.trim();
    if (!txt) return;

    setSending(true);
    try {
      const payload: any = {
        venueId,
        fromUid: user.uid,
        message: txt,
        status: "open",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // optional band
      if (fromBandId.trim()) payload.fromBandId = fromBandId.trim();

      const ref = await addDoc(collection(db, "venueRequests"), payload);
      setSentId(ref.id);
      setMessage("");
      setFromBandId("");
    } catch (e: any) {
      setErr(e?.message ?? "Senden fehlgeschlagen");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="pb-28">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
          Lade…
        </div>
      </div>
    );
  }

  if (!venue || err) {
    return (
      <div className="pb-28 space-y-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm text-white/80">{err ?? "Nicht verfügbar."}</div>
          <div className="mt-3">
            <Link
              href="/venues"
              className="rounded-xl border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
            >
              Zurück zu Venues
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const loc = venue.location ?? {};
  const oh = venue.openingHours ?? {};
  const c = venue.contact ?? {};

  // Priorität: contact.website/instagram (neu) -> links.website/instagram (alt)
  const website = val(c.website) || val(venue.links?.website);
  const instagram = val(c.instagram) || val(venue.links?.instagram);
  const maps = val(venue.links?.googleMaps);

  return (
    <div className="pb-28 space-y-4">
      {/* Cover */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
        <div className="aspect-[16/6] w-full bg-black/40">
          {venue.coverURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={venue.coverURL} alt="Cover" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full place-items-center text-sm text-white/40">
              Kein Titelbild
            </div>
          )}
        </div>

        {/* Header Content */}
        <div className="p-4">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-black/40 text-xl">
              {venue.avatarURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={venue.avatarURL} alt={title} className="h-full w-full object-cover" />
              ) : (
                "🏟️"
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-semibold text-white">{title}</h1>

              <div className="mt-1 text-sm text-white/60">
                {val(loc.address) ? `${val(loc.address)} • ` : ""}
                {val(loc.postalCode) ? `${val(loc.postalCode)} ` : ""}
                {val(loc.city)}
                {val(loc.country) ? `, ${val(loc.country)}` : ""}
              </div>

              {venue.capacity ? (
                <div className="mt-2 text-xs text-white/60">Kapazität: {venue.capacity}</div>
              ) : null}
            </div>

            <button
              onClick={() => setOpen(true)}
              disabled={!canRequest}
              className="shrink-0 rounded-xl bg-white/90 px-3 py-2 text-xs font-semibold text-black disabled:opacity-40"
            >
              Anfrage senden
            </button>
          </div>

          {venue.bio ? (
            <p className="mt-4 whitespace-pre-wrap text-sm text-white/80">{venue.bio}</p>
          ) : (
            <p className="mt-4 text-sm text-white/50">Keine Beschreibung vorhanden.</p>
          )}

          {/* Tags */}
          <div className="mt-4 flex flex-wrap gap-2">
            {(venue.genres ?? []).slice(0, 10).map((g) => (
              <span
                key={g}
                className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/70"
              >
                {g}
              </span>
            ))}
          </div>

          {/* Links */}
          <div className="mt-4 flex flex-wrap gap-2">
            {website ? (
              <a
                href={website}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/10"
              >
                Website
              </a>
            ) : null}
            {instagram ? (
              <a
                href={instagram}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/10"
              >
                Instagram
              </a>
            ) : null}
            {maps ? (
              <a
                href={maps}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/10"
              >
                Maps
              </a>
            ) : null}
          </div>
        </div>
      </div>

      {/* Öffnungszeiten */}
      <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
        <div className="text-sm font-semibold text-white">Öffnungszeiten</div>
        <div className="mt-3 grid gap-2 text-sm text-white/70">
          {[
            ["Mo", oh.mon],
            ["Di", oh.tue],
            ["Mi", oh.wed],
            ["Do", oh.thu],
            ["Fr", oh.fri],
            ["Sa", oh.sat],
            ["So", oh.sun],
          ].map(([d, v]) => (
            <div
              key={d}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2"
            >
              <span className="text-white/60">{d}</span>
              <span className="text-white">{val(v) ? val(v) : "—"}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Kontakt */}
      {(val(c.phone) || val(c.email) || website || instagram) && (
        <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
          <div className="text-sm font-semibold text-white">Kontakt</div>
          <div className="mt-3 space-y-1 text-sm text-white/70">
            {val(c.phone) ? <div>📞 {val(c.phone)}</div> : null}
            {val(c.email) ? <div>✉️ {val(c.email)}</div> : null}
            {website ? <div>🌐 {website}</div> : null}
            {instagram ? <div>📷 {instagram}</div> : null}
          </div>
        </div>
      )}

      {/* Photos */}
      {(venue.photos ?? []).length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
          <div className="text-sm font-semibold text-white">Fotos</div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {(venue.photos ?? []).slice(0, 9).map((url) => (
              <div key={url} className="overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="Venue photo" className="h-28 w-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Request Modal */}
      {open && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => {
              if (!sending) setOpen(false);
            }}
          />
          <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-black/90 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-white">Anfrage an {title}</div>
              <button
                onClick={() => !sending && setOpen(false)}
                className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/80 hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs text-white/60">
                  Band ID (optional – nur wenn du als Band anfragst)
                </label>
                <input
                  value={fromBandId}
                  onChange={(e) => setFromBandId(e.target.value)}
                  placeholder="bandId"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm text-white outline-none placeholder:text-white/40"
                />
              </div>

              <div>
                <label className="text-xs text-white/60">Nachricht *</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Hi! Wir würden gerne einen Gig planen…"
                  className="mt-1 h-28 w-full resize-none rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm text-white outline-none placeholder:text-white/40"
                />
                <div className="mt-1 text-[11px] text-white/40">{message.trim().length}/2000</div>
              </div>

              {sentId && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                  Anfrage gesendet ✅ (ID: {sentId})
                </div>
              )}

              {err && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {err}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => !sending && setOpen(false)}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white/80 hover:bg-white/10"
                >
                  Abbrechen
                </button>
                <button
                  onClick={sendRequest}
                  disabled={
                    !canRequest || message.trim().length === 0 || message.trim().length > 2000
                  }
                  className="flex-1 rounded-xl bg-white/90 px-3 py-2 text-sm font-semibold text-black disabled:opacity-40"
                >
                  {sending ? "Sende..." : "Senden"}
                </button>
              </div>

              {!user?.uid && (
                <div className="text-xs text-white/50">
                  Du musst eingeloggt sein, um eine Anfrage zu senden.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
