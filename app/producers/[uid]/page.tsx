"use client";

import Link from "next/link";
import RequestProducerModal from "@/components/RequestProducerModal";
import { use, useEffect, useMemo, useState } from "react"; // ✅ use hinzugefügt
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

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
  uid?: string;

  displayName?: string;
  studioName?: string;
  location?: string;
  photoURL?: string | null;
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

function parseCommaList(v: string, max = 10) {
  return v
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, max);
}

export default function ProducerProfilePage({
  params,
}: {
  params: Promise<{ uid: string }>;
}) {
  // ✅ Next.js: params ist Promise -> unwrap mit use()
  const { uid } = use(params);

  const [me, setMe] = useState<string | null>(auth.currentUser?.uid ?? null);

  const [producer, setProducer] = useState<Producer | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);

  const [edit, setEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // ---- Form state (edit) ----
  const [studioName, setStudioName] = useState("");
  const [location, setLocation] = useState("");
  const [genresText, setGenresText] = useState("");
  const [languagesText, setLanguagesText] = useState("");

  const [bio, setBio] = useState("");

  const [studioInfoName, setStudioInfoName] = useState("");
  const [studioAddress, setStudioAddress] = useState("");
  const [studioCity, setStudioCity] = useState("");
  const [studioRoomSize, setStudioRoomSize] = useState("");
  const [studioGearText, setStudioGearText] = useState("");

  const [email, setEmail] = useState("");
  const [instagram, setInstagram] = useState("");
  const [website, setWebsite] = useState("");

  const isOwner = useMemo(() => !!me && me === uid, [me, uid]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setMe(u?.uid ?? null));
    return () => unsub();
  }, []);

  useEffect(() => {
    async function loadProducer() {
      setErr(null);
      setNotFound(false);
      setLoading(true);

      try {
        const ref = doc(db, "producers", uid);
        const snap = await getDoc(ref);

        const data = snap.exists() ? (snap.data() as Producer) : null;

        if (!data) {
          setNotFound(true);
          setProducer(null);
        } else if (data.verified !== true && !isOwner) {
          setNotFound(true);
          setProducer(null);
        } else {
          setProducer(data);

          const [openReq, setOpenReq] = useState(false);

{!isOwner && (
  <>
    <button
      onClick={() => setOpenReq(true)}
      className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-black hover:opacity-95"
    >
      Producer anfragen
    </button>

    <RequestProducerModal
      open={openReq}
      onClose={() => setOpenReq(false)}
      toProducerUid={uid}
      toProducerName={title}
      fromType="musician"
      fromUid={me ?? ""}
      fromName={"(dein Name aus profiles)"} // hier am besten aus profiles/{me} holen
      fromPhotoURL={undefined}
    />
  </>
)}

          // init form
          setStudioName(data.studioName ?? data.displayName ?? "");
          setLocation(data.location ?? "");
          setGenresText(Array.isArray(data.genres) ? data.genres.join(", ") : "");
          setLanguagesText(Array.isArray(data.languages) ? data.languages.join(", ") : "");

          setBio(data.bio ?? "");

          setStudioInfoName(data.studio?.name ?? "");
          setStudioAddress(data.studio?.addressLine ?? "");
          setStudioCity(data.studio?.city ?? "");
          setStudioRoomSize(data.studio?.roomSize ?? "");
          setStudioGearText(
            Array.isArray(data.studio?.gearHighlights)
              ? data.studio!.gearHighlights!.join(", ")
              : ""
          );

          setEmail(data.contact?.email ?? "");
          setInstagram(data.contact?.instagram ?? "");
          setWebsite(data.contact?.website ?? "");
        }
      } catch {
        setNotFound(true);
        setProducer(null);
      } finally {
        setLoading(false);
      }
    }

    loadProducer();
  }, [uid, isOwner]);

  useEffect(() => {
    async function loadPosts() {
      try {
        setPostsLoading(true);

        const q = query(
          collection(db, "posts"),
          where("author.uid", "==", uid),
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

  async function save() {
    if (!isOwner) return;
    setSaving(true);
    setErr(null);

    try {
      await updateDoc(doc(db, "producers", uid), {
        studioName: norm(studioName),
        location: norm(location),
        genres: parseCommaList(genresText, 10),
        languages: parseCommaList(languagesText, 10),

        bio: bio ?? "",

        studio: {
          name: norm(studioInfoName),
          addressLine: norm(studioAddress),
          city: norm(studioCity),
          roomSize: norm(studioRoomSize),
          gearHighlights: parseCommaList(studioGearText, 20),
        },

        contact: {
          email: norm(email),
          instagram: norm(instagram),
          website: norm(website),
        },

        updatedAt: serverTimestamp(),
      });

      const snap = await getDoc(doc(db, "producers", uid));
      if (snap.exists()) setProducer(snap.data() as Producer);

      setEdit(false);
    } catch (e: any) {
      setErr(
        e?.code === "permission-denied"
          ? "Keine Berechtigung (Rules: producers Owner update)."
          : "Speichern fehlgeschlagen."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-6 text-sm text-white/60">Lade Producer-Profil…</div>;
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
        <Link href="/producers" className="text-sm text-white/70 hover:text-white">
          ← Producer
        </Link>

        <div className="flex items-center gap-2">
          {isOwner &&
            (edit ? (
              <>
                <button
                  onClick={() => {
                    setEdit(false);
                    setErr(null);
                  }}
                  disabled={saving}
                  className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/80 hover:bg-white/5 disabled:opacity-60"
                >
                  Abbrechen
                </button>
                <button
                  onClick={save}
                  disabled={saving}
                  className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:opacity-95 disabled:opacity-60"
                >
                  {saving ? "Speichere…" : "Speichern"}
                </button>
              </>
            ) : (
              <button
                onClick={() => setEdit(true)}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/80 hover:bg-white/5"
              >
                Profil bearbeiten
              </button>
            ))}

          <Link href="/profile" className="text-sm text-white/60 hover:text-white">
            Profil
          </Link>
        </div>
      </div>

      {/* Header Card */}
      <div className="flex items-start gap-5 rounded-3xl border border-white/10 bg-black/30 p-6">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border border-white/10 bg-black/40">
          <img
            src={producer.photoURL ?? "/default-avatar.png"}
            alt={title}
            className="h-full w-full object-cover"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-white truncate">{title}</h1>
            <span className="rounded-md bg-blue-500/15 px-2 py-0.5 text-[11px] font-semibold text-blue-400">
              PRODUCER
            </span>
          </div>

          {!!locationLine && <div className="mt-1 text-sm text-white/60">{locationLine}</div>}

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

      {/* ... dein restlicher JSX bleibt wie gehabt ... */}

      {err && <div className="text-sm text-red-400">{err}</div>}
      <div className="text-xs text-white/40">Producer-Profil</div>
    </div>
  );
}
