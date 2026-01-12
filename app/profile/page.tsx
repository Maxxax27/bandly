"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

import { auth, db, storage } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { KANTON_LABELS } from "@/lib/cantons";

const REGIONS = [
  "LU",
  "ZH",
  "BE",
  "BS",
  "SG",
  "AG",
  "TG",
  "GR",
  "VS",
  "TI",
  "BL",
  "AI",
  "AR",
  "FR",
  "GE",
  "GL",
  "JU",
  "NE",
  "NW",
  "OB",
  "SH",
  "SO",
  "SZ",
  "VD",
  "ZG",
  "UR",
];

const ROLES = ["Singer", "Gitarre", "Lead Guitar", "Rhythm Guitar", "Bass", "Drums", "Keys", "DJ", "Violin"];
const GENRES = ["Rock", "Hard Rock", "Metal", "Blues", "Pop", "Indie", "Punk", "Jazz"];
const STATUSES: Array<"Band" | "Solo" | "Suchend"> = ["Band", "Solo", "Suchend"];

type Experience = {
  name: string;
  role: string;
  from: string;
  to: string;
  link?: string;
};

type ActiveBand = {
  bandId: string;
  name: string;
  logoURL?: string | null;
};

function safeLower(x: string) {
  return (x ?? "").trim().toLowerCase();
}

function isValidUrl(s: string) {
  if (!s) return true;
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function clampText(s: string, max = 140) {
  const t = (s ?? "").trim();
  if (!t) return "";
  if (t.length <= max) return t;
  return t.slice(0, max - 1) + "…";
}

function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "dark" | "ghost";
}) {
  const cls =
    tone === "dark"
      ? "bg-zinc-900 text-white border-zinc-900"
      : tone === "ghost"
      ? "bg-white text-zinc-900 border-zinc-200"
      : "bg-white text-zinc-700 border-zinc-200";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${cls}`}>
      {children}
    </span>
  );
}

/** ✅ NEU: schöner Band-Chip (ersetzt das “ovale” Logo-Layout) */
function BandChip({
  bandId,
  name,
  logoURL,
}: {
  bandId: string;
  name: string;
  logoURL?: string | null;
}) {
  return (
    <Link
      href={`/bands/${bandId}`}
      className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-2.5 py-1.5 hover:bg-zinc-50 transition"
      title="Zur Band"
    >
      <span className="h-7 w-7 rounded-full overflow-hidden border border-zinc-200 bg-zinc-100 flex items-center justify-center shrink-0">
        {logoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoURL} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-[11px]">🎵</span>
        )}
      </span>

      <span className="min-w-0">
        <span className="block text-xs font-semibold text-zinc-900 truncate max-w-[160px]">{name}</span>
        <span className="block text-[11px] text-zinc-500 leading-4 -mt-0.5">Mitglied</span>
      </span>
    </Link>
  );
}

function SectionCard({
  title,
  subtitle,
  defaultOpen,
  children,
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      className="group rounded-3xl border border-zinc-200 bg-white shadow-sm overflow-hidden"
      open={defaultOpen}
    >
      <summary className="cursor-pointer list-none select-none px-5 py-4 hover:bg-zinc-50 transition">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-bold text-zinc-900">{title}</div>
            {subtitle ? <div className="text-xs text-zinc-500 mt-0.5">{subtitle}</div> : null}
          </div>
          <div className="mt-0.5 rounded-full border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-600 group-open:hidden">
            Öffnen
          </div>
          <div className="mt-0.5 rounded-full border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-600 hidden group-open:inline-flex">
            Schliessen
          </div>
        </div>
      </summary>

      <div className="px-5 pb-5 pt-2">{children}</div>
    </details>
  );
}

/**
 * Aufräumen oben rechts:
 * - Primary: Speichern
 * - Secondary: In Suche ansehen
 * - Overflow (⋯): Profilbild / Titelbild / Logout
 * -> Schwarz-Weiss Schema, kein "glassy" Look
 */
function OverflowMenu({
  disabled,
  onAvatarPick,
  onAvatarRemove,
  onCoverPick,
  onCoverRemove,
  coverEnabled,
  avatarEnabled,
  onLogout,
}: {
  disabled?: boolean;
  onAvatarPick: () => void;
  onAvatarRemove: () => void;
  onCoverPick: () => void;
  onCoverRemove: () => void;
  coverEnabled: boolean;
  avatarEnabled: boolean;
  onLogout: () => void;
}) {
  return (
    <details className="relative">
      <summary
        className={`list-none cursor-pointer select-none rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 transition ${
          disabled ? "opacity-60 pointer-events-none" : ""
        }`}
        aria-label="Mehr"
        title="Mehr"
      >
        ⋯
      </summary>

      <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-zinc-200 bg-white shadow-lg overflow-hidden z-20">
        <div className="px-3 py-2 text-xs font-semibold text-zinc-500 border-b border-zinc-200">Aktionen</div>

        <button
          type="button"
          onClick={() => onAvatarPick()}
          className="w-full text-left px-3 py-2 text-sm text-zinc-900 hover:bg-zinc-50 transition"
        >
          Profilbild ändern…
        </button>
        <button
          type="button"
          onClick={() => onAvatarRemove()}
          disabled={!avatarEnabled}
          className={`w-full text-left px-3 py-2 text-sm hover:bg-zinc-50 transition ${
            avatarEnabled ? "text-zinc-900" : "text-zinc-400 cursor-not-allowed"
          }`}
        >
          Profilbild entfernen
        </button>

        <div className="h-px bg-zinc-200" />

        <button
          type="button"
          onClick={() => onCoverPick()}
          className="w-full text-left px-3 py-2 text-sm text-zinc-900 hover:bg-zinc-50 transition"
        >
          Titelbild ändern…
        </button>
        <button
          type="button"
          onClick={() => onCoverRemove()}
          disabled={!coverEnabled}
          className={`w-full text-left px-3 py-2 text-sm hover:bg-zinc-50 transition ${
            coverEnabled ? "text-zinc-900" : "text-zinc-400 cursor-not-allowed"
          }`}
        >
          Titelbild entfernen
        </button>

        <div className="h-px bg-zinc-200" />

        <button
          type="button"
          onClick={() => onLogout()}
          className="w-full text-left px-3 py-2 text-sm text-zinc-900 hover:bg-zinc-50 transition"
        >
          Logout
        </button>
      </div>
    </details>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const uid = user?.uid ?? null;

  const [saving, setSaving] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Basis
  const [displayName, setDisplayName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [bio, setBio] = useState("");

  // Standort
  const [region, setRegion] = useState("LU");
  const [zip, setZip] = useState("");
  const [location, setLocation] = useState("");

  // Musiker-Infos
  const [status, setStatus] = useState<"Band" | "Solo" | "Suchend">("Suchend");
  const [bandName, setBandName] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [genres, setGenres] = useState<string[]>([]);

  // ✅ Active Band Verknüpfung (Chip oben)
  const [activeBand, setActiveBand] = useState<ActiveBand | null>(null);

  // Equipment
  const [equipment, setEquipment] = useState("");

  // Erfahrungen
  const [experiences, setExperiences] = useState<Experience[]>([]);

  // Social Links
  const [instagram, setInstagram] = useState("");
  const [youtube, setYoutube] = useState("");
  const [spotify, setSpotify] = useState("");
  const [soundcloud, setSoundcloud] = useState("");
  const [website, setWebsite] = useState("");

  // Avatar
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarFileRef = useRef<HTMLInputElement | null>(null);

  // Cover
  const [coverURL, setCoverURL] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverFileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    async function load() {
      if (!uid) return;
      setLoadingProfile(true);

      const refDoc = doc(db, "profiles", uid);
      const snap = await getDoc(refDoc);

      if (snap.exists()) {
        const d = snap.data() as any;

        setDisplayName(d.displayName ?? user?.displayName ?? "");
        setBirthday(d.birthday ?? "");
        setBio(d.bio ?? "");

        setRegion(((d.region ?? "LU") as string).toUpperCase().trim());
        setZip(d.zip ?? "");
        setLocation(d.location ?? "");

        const rawStatus = d.status ?? "Suchend";
        const normalizedStatus =
          rawStatus === "in_band"
            ? "Band"
            : rawStatus === "solo"
            ? "Solo"
            : rawStatus === "suchend"
            ? "Suchend"
            : rawStatus;

        setStatus(normalizedStatus);

        setBandName(d.bandName ?? "");
        setRoles(Array.isArray(d.roles) ? d.roles : []);
        setGenres(Array.isArray(d.genres) ? d.genres : []);

        // ✅ Band-Verknüpfung laden (wenn vorhanden)
        setActiveBand(d.band?.bandId ? (d.band as ActiveBand) : null);

        setEquipment(d.equipment ?? "");
        setExperiences(Array.isArray(d.experiences) ? d.experiences : []);

        const links = d.links ?? {};
        setInstagram(links.instagram ?? "");
        setYoutube(links.youtube ?? "");
        setSpotify(links.spotify ?? "");
        setSoundcloud(links.soundcloud ?? "");
        setWebsite(links.website ?? "");

        setPhotoURL(d.photoURL ?? null);
        setCoverURL(d.coverURL ?? null);
      } else {
        setDisplayName(user?.displayName ?? "");
        setPhotoURL(user?.photoURL ?? null);
        setCoverURL(null);
      }

      setLoadingProfile(false);
    }

    if (uid) load();
  }, [uid, user?.displayName, user?.photoURL]);

  const canShow = useMemo(() => !loading && !!user, [loading, user]);
  if (loading || !canShow) {
    return <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700">Lade…</div>;
  }
  if (!user) return null;

  const isBusy = saving || loadingProfile || uploadingAvatar || uploadingCover;

  function toggle(setter: (v: string[]) => void, current: string[], value: string) {
    if (current.includes(value)) setter(current.filter((x) => x !== value));
    else setter([...current, value]);
  }

  function addExperience() {
    setExperiences((prev) => [...prev, { name: "", role: "", from: "", to: "", link: "" }]);
  }

  function updateExperience(i: number, patch: Partial<Experience>) {
    setExperiences((prev) => prev.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }

  function removeExperience(i: number) {
    setExperiences((prev) => prev.filter((_, idx) => idx !== i));
  }

  function normalizeExperiences(xs: Experience[]) {
    return xs
      .map((x) => ({
        name: (x.name ?? "").trim(),
        role: (x.role ?? "").trim(),
        from: (x.from ?? "").trim(),
        to: (x.to ?? "").trim(),
        link: (x.link ?? "").trim(),
      }))
      .filter((x) => x.name.length > 0);
  }

  async function saveProfile(extra?: { photoURL?: string | null; coverURL?: string | null }) {
    if (!user || !uid) return;

    const linksOk =
      isValidUrl(instagram) &&
      isValidUrl(youtube) &&
      isValidUrl(spotify) &&
      isValidUrl(soundcloud) &&
      isValidUrl(website);

    if (!linksOk) {
      alert("Mindestens ein Link ist ungültig. Bitte nur https:// Links verwenden.");
      return;
    }

    setSaving(true);

    const name = displayName.trim();
    const band = bandName.trim();
    const loc = location.trim();
    const plz = zip.trim();

    const exp = normalizeExperiences(experiences);

    await setDoc(
      doc(db, "profiles", uid),
      {
        uid,
        email: user.email ?? null,

        displayName: name,
        birthday: birthday || null,
        bio: bio.trim(),

        region,
        zip: plz,
        location: loc,

        status,
        bandName: band,
        roles,
        genres,

        // ✅ wichtig: Band-Verknüpfung beim Speichern behalten
        band: activeBand ?? null,

        equipment: equipment.trim(),
        experiences: exp,

        links: {
          instagram: instagram.trim(),
          youtube: youtube.trim(),
          spotify: spotify.trim(),
          soundcloud: soundcloud.trim(),
          website: website.trim(),
        },

        photoURL: extra?.photoURL !== undefined ? extra.photoURL : photoURL ?? null,
        coverURL: extra?.coverURL !== undefined ? extra.coverURL : coverURL ?? null,

        search: {
          name: safeLower(name),
          band: safeLower(band),
        },

        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    setSaving(false);
    alert("Profil gespeichert ✅");
  }

  async function uploadImageTo(path: string, file: File) {
    const fileStorageRef = ref(storage, path);
    await uploadBytes(fileStorageRef, file, { contentType: file.type });
    return await getDownloadURL(fileStorageRef);
  }

  async function onPickAvatar(file: File) {
    if (!uid) return;
    setUploadingAvatar(true);

    try {
      if (!file.type.startsWith("image/")) {
        alert("Bitte wähle ein Bild aus (JPG/PNG/WebP).");
        return;
      }
      if (file.size > 6 * 1024 * 1024) {
        alert("Bild zu gross (max. 6 MB).");
        return;
      }

      const url = await uploadImageTo(`profiles/${uid}/avatar`, file);
      setPhotoURL(url);
      await saveProfile({ photoURL: url });

      if (avatarFileRef.current) avatarFileRef.current.value = "";
    } catch (e: any) {
      console.error(e);
      alert(`Upload fehlgeschlagen: ${e?.message ?? e}`);
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function removeAvatar() {
    if (!uid) return;
    setUploadingAvatar(true);

    try {
      await deleteObject(ref(storage, `profiles/${uid}/avatar`)).catch(() => {});
      setPhotoURL(null);
      await saveProfile({ photoURL: null });
      if (avatarFileRef.current) avatarFileRef.current.value = "";
    } catch (e: any) {
      console.error(e);
      alert(`Entfernen fehlgeschlagen: ${e?.message ?? e}`);
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function onPickCover(file: File) {
    if (!uid) return;
    setUploadingCover(true);

    try {
      if (!file.type.startsWith("image/")) {
        alert("Bitte wähle ein Bild aus (JPG/PNG/WebP).");
        return;
      }
      if (file.size > 8 * 1024 * 1024) {
        alert("Titelbild zu gross (max. 8 MB).");
        return;
      }

      const url = await uploadImageTo(`profiles/${uid}/cover`, file);
      setCoverURL(url);
      await saveProfile({ coverURL: url });

      if (coverFileRef.current) coverFileRef.current.value = "";
    } catch (e: any) {
      console.error(e);
      alert(`Upload fehlgeschlagen: ${e?.message ?? e}`);
    } finally {
      setUploadingCover(false);
    }
  }

  async function removeCover() {
    if (!uid) return;
    setUploadingCover(true);

    try {
      await deleteObject(ref(storage, `profiles/${uid}/cover`)).catch(() => {});
      setCoverURL(null);
      await saveProfile({ coverURL: null });
      if (coverFileRef.current) coverFileRef.current.value = "";
    } catch (e: any) {
      console.error(e);
      alert(`Entfernen fehlgeschlagen: ${e?.message ?? e}`);
    } finally {
      setUploadingCover(false);
    }
  }

  const cantonCode = (region ?? "").trim().toLowerCase();
  const cantonSrc = cantonCode ? `/cantons/${cantonCode}.svg` : null;

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-zinc-900">Dein Profil</h1>
        </div>
      </div>

      {/* MAIN WRAP */}
      <div className="rounded-3xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        {/* COVER */}
        <div className="relative">
          <div className="h-56 md:h-72 w-full bg-zinc-900">
            {coverURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverURL} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-700" />
            )}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />

          <input
            ref={coverFileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onPickCover(f);
            }}
          />
        </div>

        {/* HEADER CARD */}
        <div className="-mt-10 md:-mt-12 px-5 md:px-7">
          <div className="rounded-3xl border border-zinc-200 bg-white shadow-sm p-4 md:p-5">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              {/* Avatar + identity */}
              <div className="flex items-center gap-4 min-w-0">
                <div className="h-20 w-20 md:h-24 md:w-24 rounded-3xl bg-white border border-zinc-200 overflow-hidden shadow-sm flex items-center justify-center shrink-0">
                  {photoURL ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoURL} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-3xl">🎸</span>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="text-lg md:text-2xl font-bold text-zinc-900 leading-tight truncate">
                    {displayName || "Dein Name"}
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge tone="dark">{status}</Badge>
                    <Badge>{KANTON_LABELS[region] ?? region}</Badge>
                    {location ? <Badge>{location}</Badge> : null}

                    {/* ✅ NEU: schöner BandChip statt komischem Logo-Block */}
                    {activeBand?.bandId ? (
                      <BandChip
                        bandId={activeBand.bandId}
                        name={activeBand.name}
                        logoURL={activeBand.logoURL ?? null}
                      />
                    ) : null}
                  </div>

                  <div className="mt-2 text-sm text-zinc-600">
                    {genres.length ? genres.slice(0, 3).join(" • ") : "Wähle Genres für bessere Matches."}
                  </div>
                </div>
              </div>

              {/* ACTIONS */}
              <div className="flex flex-wrap gap-2 md:ml-auto">
                <button
                  onClick={() => saveProfile()}
                  disabled={isBusy}
                  className="rounded-xl bg-zinc-900 text-white px-4 py-2 text-sm font-semibold hover:opacity-95 transition disabled:opacity-60"
                >
                  {saving ? "Speichere…" : "Speichern"}
                </button>

                <Link
                  href="/musicians"
                  className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 transition"
                >
                  In Suche ansehen
                </Link>

                <input
                  ref={avatarFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onPickAvatar(f);
                  }}
                />

                <OverflowMenu
                  disabled={isBusy}
                  onAvatarPick={() => avatarFileRef.current?.click()}
                  onAvatarRemove={() => removeAvatar()}
                  onCoverPick={() => coverFileRef.current?.click()}
                  onCoverRemove={() => removeCover()}
                  coverEnabled={!!coverURL}
                  avatarEnabled={!!photoURL}
                  onLogout={async () => {
                    await signOut(auth);
                    router.push("/");
                  }}
                />
              </div>
            </div>

            {/* Bio preview */}
            <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4">
              <div className="text-xs font-semibold text-zinc-700">Bio Vorschau</div>
              <div className="mt-1 text-sm text-zinc-700 leading-relaxed">
                {bio?.trim() ? clampText(bio, 220) : <span className="text-zinc-500">Noch keine Bio.</span>}
              </div>
            </div>
          </div>
        </div>

        {/* CONTENT GRID */}
        <div className="px-5 md:px-7 pb-7">
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT */}
            <aside className="lg:col-span-4 space-y-4">
              <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold text-zinc-900">Quick Facts</div>
                  {cantonSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={cantonSrc}
                      alt={KANTON_LABELS[region] ?? region}
                      className="h-7 w-7 object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : null}
                </div>

                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Status</span>
                    <span className="font-semibold text-zinc-900">{status}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Rollen</span>
                    <span className="font-semibold text-zinc-900">{roles.length ? roles.length : "—"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Genres</span>
                    <span className="font-semibold text-zinc-900">{genres.length ? genres.length : "—"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Band/Projekt</span>
                    <span className="font-semibold text-zinc-900">{bandName?.trim() ? bandName.trim() : "—"}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Mitglied in</span>
                    <span className="font-semibold text-zinc-900">{activeBand?.name ? activeBand.name : "—"}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Ort</span>
                    <span className="font-semibold text-zinc-900">{location?.trim() ? location.trim() : "—"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">PLZ</span>
                    <span className="font-semibold text-zinc-900">{zip?.trim() ? zip.trim() : "—"}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="text-sm font-bold text-zinc-900">Sichtbarkeit-Check</div>
                <p className="mt-2 text-sm text-zinc-600">
                  In der Suche wirken Profile am besten mit 1–2 Rollen, 1–2 Genres und einer kurzen Bio.
                </p>
              </div>
            </aside>

            {/* RIGHT: Editor */}
            <main className="lg:col-span-8 space-y-5">
              <SectionCard title="Basis" subtitle="Name, Status, Standort" defaultOpen>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-sm font-semibold text-zinc-900">Künstlername / Name</label>
                    <input
                      className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-200"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="z.B. Maxxax"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-zinc-900">Geburtsdatum (privat)</label>
                    <input
                      type="date"
                      className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-200"
                      value={birthday}
                      onChange={(e) => setBirthday(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-zinc-900">Status</label>
                    <select
                      className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-200"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-zinc-500 mt-1">Band = aktiv · Solo = Solo-Artist · Suchend = sucht</p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-zinc-900">Region (Kanton)</label>
                    <select
                      className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-200"
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                    >
                      {REGIONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-zinc-900">PLZ</label>
                    <input
                      className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-200"
                      value={zip}
                      onChange={(e) => setZip(e.target.value)}
                      placeholder="z.B. 6003"
                      inputMode="numeric"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-zinc-900">Ort (optional)</label>
                    <input
                      className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-200"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="z.B. Luzern"
                    />
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="Musik" subtitle="Band/Projekt, Equipment, Rollen & Genres">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-zinc-900">Aktuelle Band / Projekt (optional)</label>
                    <input
                      className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-200"
                      value={bandName}
                      onChange={(e) => setBandName(e.target.value)}
                      placeholder="z.B. Aldebaran"
                    />
                    <p className="text-xs text-zinc-500 mt-1">Wenn du Solo bist, trag hier deinen Projektname ein.</p>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-zinc-900">Equipment (kurz)</label>
                    <input
                      className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-200"
                      value={equipment}
                      onChange={(e) => setEquipment(e.target.value)}
                      placeholder="z.B. Gibson Les Paul · Helix · SM58"
                    />
                  </div>
                </div>

                <div className="mt-5">
                  <div className="text-sm font-semibold text-zinc-900 mb-2">Rollen</div>
                  <div className="flex flex-wrap gap-2">
                    {ROLES.map((r) => {
                      const active = roles.includes(r);
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => toggle(setRoles, roles, r)}
                          className={[
                            "rounded-full px-3 py-1 text-sm border transition",
                            active
                              ? "bg-zinc-900 text-white border-zinc-900 font-semibold"
                              : "bg-white text-zinc-900 border-zinc-200 hover:bg-zinc-50",
                          ].join(" ")}
                        >
                          {r}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-5">
                  <div className="text-sm font-semibold text-zinc-900 mb-2">Genres</div>
                  <div className="flex flex-wrap gap-2">
                    {GENRES.map((g) => {
                      const active = genres.includes(g);
                      return (
                        <button
                          key={g}
                          type="button"
                          onClick={() => toggle(setGenres, genres, g)}
                          className={[
                            "rounded-full px-3 py-1 text-sm border transition",
                            active
                              ? "bg-zinc-900 text-white border-zinc-900 font-semibold"
                              : "bg-white text-zinc-900 border-zinc-200 hover:bg-zinc-50",
                          ].join(" ")}
                        >
                          {g}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </SectionCard>

              {/* ... Rest bleibt wie bei dir (Projekte, Links, Bio, Footer Actions) ... */}

              <div className="flex flex-col md:flex-row gap-3 pt-1">
                <button
                  onClick={() => saveProfile()}
                  disabled={isBusy}
                  className="rounded-xl bg-zinc-900 text-white px-5 py-2.5 text-sm font-semibold hover:opacity-95 transition disabled:opacity-60"
                >
                  {saving ? "Speichere…" : "Profil speichern"}
                </button>

                <Link
                  href="/musicians"
                  className="rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 transition text-center"
                >
                  In Suche ansehen
                </Link>
              </div>

              {loadingProfile ? <div className="text-sm text-zinc-600">Profil wird geladen…</div> : null}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
