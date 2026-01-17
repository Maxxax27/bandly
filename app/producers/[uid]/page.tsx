"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

type Service = {
  title: string;
  priceFrom?: number;
  unit?: string; // "h" | "track" | ...
  note?: string;
};

type Release = {
  title: string;
  url?: string;
  platform?: string;
  year?: number;
};

type Producer = {
  displayName?: string;
  studioName?: string;
  location?: string;
  photoURL?: string;
  genres?: string[];
  languages?: string[];
  verified?: boolean;

  bio?: string;

  services?: Service[];

  studio?: {
    name?: string;
    addressLine?: string;
    city?: string;
    roomSize?: string;
    gearHighlights?: string[];
  };

  contact?: {
    email?: string;
    instagram?: string; // handle oder url
    website?: string;
  };

  releases?: Release[];
};

type Post = {
  id: string;
  content: string;
  createdAt?: any;
  attachments?: {
    type: "image" | "audio" | "document";
    url: string;
    name: string;
  }[];
  author?: {
    type?: "musician" | "band" | "producer";
    uid?: string;
    bandId?: string;
    displayName?: string;
    photoURL?: string | null;
  };
};


function norm(s: any) {
  return String(s ?? "").trim();
}

function isUrl(s?: string) {
  if (!s) return false;
  return /^https?:\/\//i.test(s);
}

function igToUrl(s?: string) {
  if (!s) return "";
  const v = s.trim();
  if (!v) return "";
  if (isUrl(v)) return v;
  const handle = v.startsWith("@") ? v.slice(1) : v;
  return `https://instagram.com/${handle}`;
}

export default function ProducerProfilePage({
  params,
}: {
  params: { uid: string };
}) {
  const { uid } = params;

  const [producer, setProducer] = useState<Producer | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);

  useEffect(() => {
    async function loadProducer() {
      try {
        const ref = doc(db, "producers", uid);
        const snap = await getDoc(ref);

        const data = snap.exists() ? (snap.data() as Producer) : null;
        if (!data || data.verified !== true) {
          setNotFound(true);
        } else {
          setProducer(data);
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    loadProducer();
  }, [uid]);

  useEffect(() => {
    async function loadPosts() {
      try {
        setPostsLoading(true);
        const q = query(
          collection(db, "posts"),
          where("authorId", "==", uid),
          orderBy("createdAt", "desc"),
          limit(10)
        );
        const snap = await getDocs(q);
        setPosts(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      } catch {
        setPosts([]);
      } finally {
        setPostsLoading(false);
      }
    }

    loadPosts();
  }, [uid]);

  const title = useMemo(() => {
    if (!producer) return "Producer";
    return producer.studioName || producer.displayName || "Producer";
  }, [producer]);

  const locationLine = useMemo(() => {
    if (!producer) return "";
    const loc = norm(producer.location);
    const city = norm(producer.studio?.city);
    if (loc && city && loc.toLowerCase() !== city.toLowerCase()) {
      return `${loc} • ${city}`;
    }
    return loc || city || "";
  }, [producer]);

  if (loading) {
    return (
      <div className="p-6 text-sm text-white/60">Lade Producer-Profil…</div>
    );
  }

  if (notFound || !producer) {
    return (
      <div className="p-6 space-y-4">
        <p className="text-sm text-white/70">
          Producer-Profil nicht gefunden oder nicht freigegeben.
        </p>
        <Link
          href="/producers"
          className="inline-block rounded-xl border border-white/10 px-4 py-2 text-sm text-white/80 hover:bg-white/5"
        >
          ← Zurück zur Producer-Übersicht
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-28 space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/producers"
          className="text-sm text-white/70 hover:text-white"
        >
          ← Producer
        </Link>

        {/* Optional: Link zum allgemeinen User-Profil (falls du das hast) */}
        <Link
          href={`/profile/${uid}`}
          className="text-sm text-white/60 hover:text-white"
        >
          User-Profil
        </Link>
      </div>

      {/* Header Card */}
      <div className="flex items-start gap-5 rounded-3xl border border-white/10 bg-black/30 p-6">
        {/* Avatar */}
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border border-white/10 bg-black/40">
          <img
            src={producer.photoURL ?? "/default-avatar.png"}
            alt={title}
            className="h-full w-full object-cover"
          />
        </div>

        {/* Name + meta */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-white truncate">{title}</h1>

            {/* Producer Badge */}
            <span className="rounded-md bg-blue-500/15 px-2 py-0.5 text-[11px] font-semibold text-blue-400">
              PRODUCER
            </span>
          </div>

          {!!locationLine && (
            <div className="mt-1 text-sm text-white/60">{locationLine}</div>
          )}

          {/* Mini tags */}
          <div className="mt-3 flex flex-wrap gap-2">
            {Array.isArray(producer.genres) &&
              producer.genres.slice(0, 4).map((g) => (
                <span
                  key={g}
                  className="rounded-xl border border-white/10 bg-black/40 px-3 py-1 text-xs text-white/80"
                >
                  {g}
                </span>
              ))}

            {Array.isArray(producer.languages) &&
              producer.languages.slice(0, 3).map((l) => (
                <span
                  key={l}
                  className="rounded-xl border border-white/10 bg-black/40 px-3 py-1 text-xs text-white/60"
                >
                  {l}
                </span>
              ))}
          </div>
        </div>

        <div className="text-xs text-white/40">🎚️</div>
      </div>

      {/* Bio */}
      {norm(producer.bio) && (
        <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
          <h2 className="mb-2 text-sm font-semibold text-white">Über mich</h2>
          <p className="text-sm text-white/70 whitespace-pre-line">
            {producer.bio}
          </p>
        </div>
      )}

      {/* Studio / Infos */}
      {(producer.studio?.name ||
        producer.studio?.addressLine ||
        producer.studio?.city ||
        (Array.isArray(producer.studio?.gearHighlights) &&
          producer.studio!.gearHighlights!.length > 0)) && (
        <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
          <h2 className="mb-3 text-sm font-semibold text-white">
            Studio / Infos
          </h2>

          <div className="space-y-2 text-sm text-white/70">
            {producer.studio?.name && (
              <div>
                <span className="text-white/50">Studio:</span>{" "}
                {producer.studio.name}
              </div>
            )}

            {(producer.studio?.addressLine || producer.studio?.city) && (
              <div>
                <span className="text-white/50">Ort:</span>{" "}
                {[producer.studio?.addressLine, producer.studio?.city]
                  .filter(Boolean)
                  .join(", ")}
              </div>
            )}

            {producer.studio?.roomSize && (
              <div>
                <span className="text-white/50">Raum:</span>{" "}
                {producer.studio.roomSize}
              </div>
            )}
          </div>

          {Array.isArray(producer.studio?.gearHighlights) &&
            producer.studio!.gearHighlights!.length > 0 && (
              <>
                <div className="mt-4 text-xs font-semibold text-white/60">
                  Gear Highlights
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {producer.studio!.gearHighlights!.slice(0, 8).map((x) => (
                    <span
                      key={x}
                      className="rounded-xl border border-white/10 bg-black/40 px-3 py-1 text-xs text-white/80"
                    >
                      {x}
                    </span>
                  ))}
                </div>
              </>
            )}
        </div>
      )}

      {/* Services */}
      {Array.isArray(producer.services) && producer.services.length > 0 && (
        <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
          <h2 className="mb-3 text-sm font-semibold text-white">Services</h2>

          <div className="space-y-2">
            {producer.services.map((s, idx) => (
              <div
                key={`${s.title}-${idx}`}
                className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-black/40 p-4"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white truncate">
                    {s.title}
                  </div>
                  {s.note && (
                    <div className="mt-1 text-xs text-white/60">
                      {s.note}
                    </div>
                  )}
                </div>

                {(typeof s.priceFrom === "number" || s.unit) && (
                  <div className="shrink-0 text-right">
                    <div className="text-sm text-white">
                      {typeof s.priceFrom === "number" ? `ab ${s.priceFrom}` : ""}
                      {s.unit ? ` / ${s.unit}` : ""}
                    </div>
                    <div className="text-xs text-white/40">Richtpreis</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Kontakt */}
      {(producer.contact?.email ||
        producer.contact?.instagram ||
        producer.contact?.website) && (
        <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
          <h2 className="mb-3 text-sm font-semibold text-white">Kontakt</h2>

          <div className="flex flex-wrap gap-2">
            {producer.contact?.email && (
              <a
                href={`mailto:${producer.contact.email}`}
                className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-black hover:opacity-95"
              >
                📩 E-Mail
              </a>
            )}

            {producer.contact?.instagram && (
              <a
                href={igToUrl(producer.contact.instagram)}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white/80 hover:bg-white/5"
              >
                📷 Instagram
              </a>
            )}

            {producer.contact?.website && (
              <a
                href={producer.contact.website}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white/80 hover:bg-white/5"
              >
                🌐 Website
              </a>
            )}
          </div>

          <div className="mt-3 text-xs text-white/40">
            Hinweis: Bitte keine sensitiven Daten posten. Kontaktinfos sind öffentlich sichtbar.
          </div>
        </div>
      )}

      {/* Releases */}
      {Array.isArray(producer.releases) && producer.releases.length > 0 && (
        <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
          <h2 className="mb-3 text-sm font-semibold text-white">Releases</h2>

          <div className="space-y-2">
            {producer.releases.slice(0, 12).map((r, idx) => {
              const label = [r.platform, r.year].filter(Boolean).join(" • ");
              return (
                <div
                  key={`${r.title}-${idx}`}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/40 p-4"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white truncate">
                      {r.title}
                    </div>
                    {label && (
                      <div className="mt-1 text-xs text-white/60">{label}</div>
                    )}
                  </div>

                  {r.url ? (
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-white/80 hover:bg-white/5"
                    >
                      Anhören →
                    </a>
                  ) : (
                    <span className="shrink-0 text-xs text-white/40">—</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Posts */}
      <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Posts</h2>
          <Link
            href={`/posts?author=${uid}`}
            className="text-xs text-white/60 hover:text-white"
          >
            Alle anzeigen →
          </Link>
        </div>

        {postsLoading ? (
          <div className="mt-3 text-sm text-white/60">Lade Posts…</div>
        ) : posts.length === 0 ? (
          <div className="mt-3 text-sm text-white/60">
            Noch keine Posts vorhanden.
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {posts.map((p) => (
  <Link
    key={p.id}
    href={`/blog/${p.id}`}
    className="block rounded-2xl border border-white/10 bg-black/40 p-4 hover:bg-white/5 transition"
  >
    <div className="text-sm text-white/80 line-clamp-2">
      {p.content}
    </div>
  </Link>
))}
          </div>
        )}
      </div>

      <div className="text-xs text-white/40">Verifiziertes Producer-Profil</div>
    </div>
  );
}
