"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db, storage } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

type Service = {
  title: string;
  priceFrom?: number;
  unit?: string;
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
  verified?: boolean;

  displayName?: string;
  photoURL?: string | null;

  studioName?: string;
  location?: string;
  genres?: string[];
  languages?: string[];

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
    instagram?: string;
    website?: string;
  };

  releases?: Release[];
};

function norm(s: any) {
  return String(s ?? "").trim();
}

function splitComma(s: string) {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function splitLines(s: string) {
  return s
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
}

export default function ProducerEditPage() {
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [uid, setUid] = useState<string | null>(auth.currentUser?.uid ?? null);

  const [loading, setLoading] = useState(true);
  const [producer, setProducer] = useState<Producer | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // photo upload
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // form states
  const [studioName, setStudioName] = useState("");
  const [location, setLocation] = useState("");
  const [genres, setGenres] = useState("");
  const [languages, setLanguages] = useState("");
  const [bio, setBio] = useState("");

  const [contactEmail, setContactEmail] = useState("");
  const [contactInstagram, setContactInstagram] = useState("");
  const [contactWebsite, setContactWebsite] = useState("");

  const [studioInfoName, setStudioInfoName] = useState("");
  const [studioAddress, setStudioAddress] = useState("");
  const [studioCity, setStudioCity] = useState("");
  const [studioRoomSize, setStudioRoomSize] = useState("");
  const [gearHighlights, setGearHighlights] = useState("");

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUid(u?.uid ?? null);
      setReady(true);
      if (!u) router.replace("/login");
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    async function load() {
      if (!uid) return;
      setLoading(true);
      setErr(null);

      try {
        const refDoc = doc(db, "producers", uid);
        const snap = await getDoc(refDoc);

        if (!snap.exists()) {
          setErr("Du hast noch kein Producer-Profil (noch nicht freigeschaltet).");
          setProducer(null);
          return;
        }

        const data = snap.data() as Producer;

        if (data.verified !== true) {
          setErr("Dein Producer-Profil ist noch nicht freigeschaltet.");
          setProducer(null);
          return;
        }

        setProducer(data);

        // init form
        setStudioName(data.studioName ?? "");
        setLocation(data.location ?? "");
        setGenres(Array.isArray(data.genres) ? data.genres.join(", ") : "");
        setLanguages(Array.isArray(data.languages) ? data.languages.join(", ") : "");
        setBio(data.bio ?? "");

        setContactEmail(data.contact?.email ?? "");
        setContactInstagram(data.contact?.instagram ?? "");
        setContactWebsite(data.contact?.website ?? "");

        setStudioInfoName(data.studio?.name ?? "");
        setStudioAddress(data.studio?.addressLine ?? "");
        setStudioCity(data.studio?.city ?? "");
        setStudioRoomSize(data.studio?.roomSize ?? "");
        setGearHighlights(
          Array.isArray(data.studio?.gearHighlights)
            ? data.studio!.gearHighlights!.join("\n")
            : ""
        );
      } catch (e: any) {
        setErr("Konnte Producer-Profil nicht laden.");
      } finally {
        setLoading(false);
      }
    }

    if (uid) load();
  }, [uid]);

  const profileHref = useMemo(() => (uid ? `/producers/${uid}` : "/producers"), [uid]);

  const producerAvatarSrc = useMemo(() => {
    const base = producer?.photoURL ?? "/default-avatar.png";

    // optional cache bust: wenn du in producer doc updatedAt hast
    // (wir setzen updatedAt bei Foto-Upload)
    const anyProd: any = producer as any;
    const v =
      anyProd?.updatedAt?.seconds ??
      anyProd?.updatedAt?.toMillis?.() ??
      anyProd?.updatedAt?.toDate?.()?.getTime?.();

    return v ? `${base}?v=${String(v)}` : base;
  }, [producer]);

  async function onPickProducerPhoto(file: File | null) {
    if (!file || !uid) return;

    setUploadingPhoto(true);
    setErr(null);
    setSaved(false);

    try {
      // optional: simple type check
      if (!file.type.startsWith("image/")) {
        setErr("Bitte ein Bild (PNG/JPG/WebP) auswählen.");
        return;
      }

      // Upload path
      const fileRef = ref(storage, `producerAvatars/${uid}/avatar_${Date.now()}`);
      await uploadBytes(fileRef, file, { contentType: file.type });
      const url = await getDownloadURL(fileRef);

      // Save to producer doc
      await updateDoc(doc(db, "producers", uid), {
        photoURL: url,
        updatedAt: serverTimestamp(),
      });

      // Update local state (so UI updates instantly)
      setProducer((prev) => ({ ...(prev ?? {}), photoURL: url } as Producer));
      setSaved(true);
    } catch (e: any) {
      setErr(
        e?.code === "permission-denied"
          ? "Keine Berechtigung (Storage Rules / producers update)."
          : "Bild-Upload fehlgeschlagen."
      );
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function save() {
    if (!uid) return;
    setSaving(true);
    setSaved(false);
    setErr(null);

    try {
      await updateDoc(doc(db, "producers", uid), {
        studioName: norm(studioName),
        location: norm(location),
        genres: splitComma(genres).slice(0, 12),
        languages: splitComma(languages).slice(0, 8),
        bio: bio ?? "",

        contact: {
          email: norm(contactEmail),
          instagram: norm(contactInstagram),
          website: norm(contactWebsite),
        },

        studio: {
          name: norm(studioInfoName),
          addressLine: norm(studioAddress),
          city: norm(studioCity),
          roomSize: norm(studioRoomSize),
          gearHighlights: splitLines(gearHighlights).slice(0, 20),
        },

        updatedAt: serverTimestamp(),
      });

      setSaved(true);
      // optional: direkt zurück
      // router.push(profileHref);
    } catch (e: any) {
      setErr(
        e?.code === "permission-denied"
          ? "Keine Berechtigung (Rules: producers update)."
          : "Speichern fehlgeschlagen."
      );
    } finally {
      setSaving(false);
    }
  }

  if (!ready || loading) {
    return <div className="p-6 text-sm text-white/70">Lade…</div>;
  }

  return (
    <div className="pb-28 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-white">Producer Profil bearbeiten</h1>
          <p className="mt-1 text-sm text-white/60">Änderungen sind öffentlich sichtbar.</p>
        </div>

        <button
          onClick={() => router.push(profileHref)}
          className="shrink-0 rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10"
        >
          Zur Profilseite
        </button>
      </div>

      {err && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
          {err}
        </div>
      )}

      {!producer ? null : (
        <div className="space-y-4">
          {/* Producer Photo */}
          <div className="rounded-3xl border border-white/10 bg-black/30 p-5 space-y-3">
            <div className="text-sm font-semibold text-white">Bild (Studio / Producer)</div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                  <img
                    src={producerAvatarSrc}
                    alt="Producer/Studio"
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white">Producer / Studio Foto</div>
                  <div className="text-xs text-white/50">
                    Wird im Producer Profil & Dashboard angezeigt.
                  </div>
                </div>
              </div>

              <label className="shrink-0 inline-flex items-center justify-center rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white/80 hover:bg-white/5 cursor-pointer">
                {uploadingPhoto ? "Lade hoch…" : "Bild ändern"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingPhoto}
                  onChange={(e) => onPickProducerPhoto(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
          </div>

          {/* Basic */}
          <div className="rounded-3xl border border-white/10 bg-black/30 p-5 space-y-3">
            <div className="text-sm font-semibold text-white">Basis</div>

            <div>
              <label className="text-sm font-semibold text-white">Studio / Name</label>
              <input
                value={studioName}
                onChange={(e) => setStudioName(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white outline-none"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-white">Ort</label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white outline-none"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-white">Genres (Komma)</label>
              <input
                value={genres}
                onChange={(e) => setGenres(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white outline-none"
                placeholder="HipHop, Pop, EDM"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-white">Sprachen (Komma)</label>
              <input
                value={languages}
                onChange={(e) => setLanguages(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white outline-none"
                placeholder="DE, EN"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-white">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={5}
                className="mt-1 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white outline-none"
              />
            </div>
          </div>

          {/* Studio */}
          <div className="rounded-3xl border border-white/10 bg-black/30 p-5 space-y-3">
            <div className="text-sm font-semibold text-white">Studio / Infos</div>

            <div>
              <label className="text-sm font-semibold text-white">Studio Name</label>
              <input
                value={studioInfoName}
                onChange={(e) => setStudioInfoName(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white outline-none"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-white">Adresse</label>
              <input
                value={studioAddress}
                onChange={(e) => setStudioAddress(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white outline-none"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-sm font-semibold text-white">Stadt</label>
                <input
                  value={studioCity}
                  onChange={(e) => setStudioCity(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-white">Raumgröße</label>
                <input
                  value={studioRoomSize}
                  onChange={(e) => setStudioRoomSize(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-white">
                Gear Highlights (1 pro Zeile)
              </label>
              <textarea
                value={gearHighlights}
                onChange={(e) => setGearHighlights(e.target.value)}
                rows={5}
                className="mt-1 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white outline-none"
                placeholder={"Neumann U87\nSSL Bus Comp\nApollo x8p"}
              />
            </div>
          </div>

          {/* Contact */}
          <div className="rounded-3xl border border-white/10 bg-black/30 p-5 space-y-3">
            <div className="text-sm font-semibold text-white">Kontakt</div>

            <div>
              <label className="text-sm font-semibold text-white">E-Mail</label>
              <input
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white outline-none"
                placeholder="mail@..."
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-white">Instagram</label>
              <input
                value={contactInstagram}
                onChange={(e) => setContactInstagram(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white outline-none"
                placeholder="@handle oder https://..."
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-white">Website</label>
              <input
                value={contactWebsite}
                onChange={(e) => setContactWebsite(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white outline-none"
                placeholder="https://..."
              />
            </div>
          </div>

          {saved && (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
              ✅ Gespeichert!
            </div>
          )}

          <button
            onClick={save}
            disabled={saving || (!!err && !producer)}
            className="w-full rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-black hover:opacity-95 disabled:opacity-60"
          >
            {saving ? "Speichere…" : "Änderungen speichern"}
          </button>
        </div>
      )}
    </div>
  );
}
