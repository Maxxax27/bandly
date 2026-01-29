"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, onSnapshot, serverTimestamp, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

import { db, storage } from "@/lib/firebase";
import { useVenueMemberships } from "@/lib/useVenueMemberships";
import { useActiveVenue } from "@/lib/useActiveVenue";

type Profile = {
  activeRole?: "musician" | "producer" | "venue";
  activeVenueId?: string | null;
};

type VenueDoc = {
  name?: string;
  bio?: string;

  avatarURL?: string;
  coverURL?: string;

  location?: {
    country?: string;
    city?: string;
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

  published?: boolean;
  updatedAt?: any;
};

function cls(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

async function uploadImage(file: File, path: string) {
  const r = ref(storage, path);
  await uploadBytes(r, file, { contentType: file.type });
  return await getDownloadURL(r);
}

export default function VenueEditClient() {
  const router = useRouter();

  // ✅ WICHTIG: loading benutzen, sonst redirect-race
  const { uid, venues, loading: membershipsLoading } = useVenueMemberships();
  const safeVenues = useMemo(() => (Array.isArray(venues) ? venues : []), [venues]);

  const [profile, setProfile] = useState<Profile | null>(null);

  // Form/UI
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // venue pick via helper
  const { venueId, venue } = useActiveVenue(profile, safeVenues);

  const [form, setForm] = useState<VenueDoc>({
    name: "",
    bio: "",
    avatarURL: "",
    coverURL: "",
    location: { country: "Switzerland", city: "", address: "", postalCode: "" },
    openingHours: { mon: "", tue: "", wed: "", thu: "", fri: "", sat: "", sun: "" },
    contact: { phone: "", email: "", website: "", instagram: "" },
    published: true,
  });

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  // ✅ Profile live (damit activeVenueId sauber kommt)
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

  // ✅ GUARD (HARD FIX)
  // - solange membershipsLoading -> NIE redirect
  // - wenn keine venue -> apply
  // - wenn activeVenueId fehlt -> setzen (OHNE activeRole zu ändern)
  useEffect(() => {
    if (!uid) return;
    if (membershipsLoading) return;

    const firstVenueId = safeVenues[0]?.venueId ?? null;

    if (!firstVenueId) {
      router.replace("/venues/apply");
      return;
    }

    if (!profile?.activeVenueId) {
      updateDoc(doc(db, "profiles", uid), {
        activeVenueId: firstVenueId,
        updatedAt: serverTimestamp(),
      }).catch(() => {});
    }
  }, [uid, membershipsLoading, safeVenues, profile?.activeVenueId, router]);

  // Load venue doc
  useEffect(() => {
    let alive = true;

    async function loadVenue() {
      setErr(null);
      setOk(null);

      if (!uid) {
        setLoading(false);
        return;
      }

      if (membershipsLoading) {
        setLoading(true);
        return;
      }

      if (safeVenues.length === 0) {
        setLoading(false);
        return;
      }

      // venueId kann kurz null sein, bis profile.activeVenueId gesetzt ist
      if (!venueId) {
        setLoading(true);
        return;
      }

      setLoading(true);
      try {
        const snap = await getDoc(doc(db, "venues", venueId));
        if (!alive) return;

        const d = (snap.data() as VenueDoc) ?? {};

        setForm({
          name: d.name ?? "",
          bio: d.bio ?? "",
          avatarURL: d.avatarURL ?? "",
          coverURL: d.coverURL ?? "",
          location: {
            country: d.location?.country ?? "Switzerland",
            city: d.location?.city ?? "",
            address: d.location?.address ?? "",
            postalCode: d.location?.postalCode ?? "",
          },
          openingHours: {
            mon: d.openingHours?.mon ?? "",
            tue: d.openingHours?.tue ?? "",
            wed: d.openingHours?.wed ?? "",
            thu: d.openingHours?.thu ?? "",
            fri: d.openingHours?.fri ?? "",
            sat: d.openingHours?.sat ?? "",
            sun: d.openingHours?.sun ?? "",
          },
          contact: {
            phone: d.contact?.phone ?? "",
            email: d.contact?.email ?? "",
            website: d.contact?.website ?? "",
            instagram: d.contact?.instagram ?? "",
          },
          published: d.published ?? true,
        });
      } catch (e: any) {
        console.error(e);
        setErr(
          e?.code === "permission-denied"
            ? "Keine Berechtigung (Firestore Rules / Venue)."
            : "Konnte Venue Profil nicht laden."
        );
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    loadVenue();
    return () => {
      alive = false;
    };
  }, [uid, membershipsLoading, safeVenues.length, venueId]);

  function setField<K extends keyof VenueDoc>(key: K, value: VenueDoc[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setLocation(key: keyof NonNullable<VenueDoc["location"]>, value: string) {
    setForm((prev) => ({
      ...prev,
      location: { ...(prev.location ?? {}), [key]: value },
    }));
  }

  function setHours(key: keyof NonNullable<VenueDoc["openingHours"]>, value: string) {
    setForm((prev) => ({
      ...prev,
      openingHours: { ...(prev.openingHours ?? {}), [key]: value },
    }));
  }

  function setContact(key: keyof NonNullable<VenueDoc["contact"]>, value: string) {
    setForm((prev) => ({
      ...prev,
      contact: { ...(prev.contact ?? {}), [key]: value },
    }));
  }

  async function save() {
    setErr(null);
    setOk(null);

    if (!uid) return setErr("Bitte einloggen.");
    if (membershipsLoading) return setErr("Bitte warten… (Venues laden)");
    if (!venueId) return setErr("Keine aktive Venue gefunden.");

    const cleanName = String(form.name ?? "").trim();
    if (!cleanName) return setErr("Name ist Pflicht.");

    setSaving(true);
    try {
      let nextAvatarURL = form.avatarURL ?? "";
      let nextCoverURL = form.coverURL ?? "";

      if (avatarFile) nextAvatarURL = await uploadImage(avatarFile, `venues/${venueId}/avatar.jpg`);
      if (coverFile) nextCoverURL = await uploadImage(coverFile, `venues/${venueId}/cover.jpg`);

      await updateDoc(doc(db, "venues", venueId), {
        name: cleanName,
        bio: String(form.bio ?? "").trim(),

        avatarURL: nextAvatarURL,
        coverURL: nextCoverURL,

        location: {
          country: String(form.location?.country ?? "").trim(),
          city: String(form.location?.city ?? "").trim(),
          address: String(form.location?.address ?? "").trim(),
          postalCode: String(form.location?.postalCode ?? "").trim(),
        },

        openingHours: {
          mon: String(form.openingHours?.mon ?? "").trim(),
          tue: String(form.openingHours?.tue ?? "").trim(),
          wed: String(form.openingHours?.wed ?? "").trim(),
          thu: String(form.openingHours?.thu ?? "").trim(),
          fri: String(form.openingHours?.fri ?? "").trim(),
          sat: String(form.openingHours?.sat ?? "").trim(),
          sun: String(form.openingHours?.sun ?? "").trim(),
        },

        contact: {
          phone: String(form.contact?.phone ?? "").trim(),
          email: String(form.contact?.email ?? "").trim(),
          website: String(form.contact?.website ?? "").trim(),
          instagram: String(form.contact?.instagram ?? "").trim(),
        },

        published: !!form.published,
        updatedAt: serverTimestamp(),
      });

      setField("avatarURL", nextAvatarURL);
      setField("coverURL", nextCoverURL);
      setAvatarFile(null);
      setCoverFile(null);
      setOk("Gespeichert ✅");
    } catch (e: any) {
      console.error(e);
      setErr(
        e?.code === "permission-denied"
          ? "Keine Berechtigung (Firestore Rules oder Storage Rules)."
          : "Speichern fehlgeschlagen."
      );
    } finally {
      setSaving(false);
    }
  }

  const headerTitle = venue?.name ?? "Venue Profil bearbeiten";

  if (membershipsLoading) {
    return (
      <div className="mx-auto max-w-3xl p-4">
        <div className="rounded-3xl border border-white/10 bg-black/30 p-4 text-sm text-white/70">
          Lade Venue Memberships…
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl p-4">
        <div className="rounded-3xl border border-white/10 bg-black/30 p-4 text-sm text-white/70">
          Lade…
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-white">{headerTitle}</h1>
          <p className="mt-1 text-sm text-white/60">Profilfoto, Titelbild, Adresse & Öffnungszeiten.</p>
        </div>

        <button
          onClick={() => router.push("/venues/dashboard")}
          className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm font-semibold text-white/80 hover:bg-white/10"
        >
          Zurück
        </button>
      </div>

      {err && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
          {err}
        </div>
      )}
      {ok && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          {ok}
        </div>
      )}

      {/* Cover */}
      <div className="rounded-3xl border border-white/10 bg-black/30 p-4 space-y-3">
        <div className="text-sm font-semibold text-white">Titelbild</div>

        <div className="aspect-[16/6] w-full overflow-hidden rounded-2xl border border-white/10 bg-black/40">
          {form.coverURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.coverURL} alt="Cover" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full place-items-center text-sm text-white/40">Kein Titelbild</div>
          )}
        </div>

        <input
          type="file"
          accept="image/*"
          onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-white/70"
        />
        <div className="text-xs text-white/40">Wird gespeichert unter: venues/{venueId}/cover.jpg</div>
      </div>

      {/* Avatar + Basics */}
      <div className="rounded-3xl border border-white/10 bg-black/30 p-4 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 overflow-hidden rounded-2xl border border-white/10 bg-black/40">
            {form.avatarURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.avatarURL} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full place-items-center text-white/40">—</div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-white">Profilfoto</div>
            <div className="text-xs text-white/40">venues/{venueId}/avatar.jpg</div>
          </div>
        </div>

        <input
          type="file"
          accept="image/*"
          onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-white/70"
        />

        <div>
          <label className="text-sm text-white/80">Name *</label>
          <input
            value={form.name ?? ""}
            onChange={(e) => setField("name", e.target.value)}
            className="mt-1 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white outline-none"
            placeholder="z.B. Rockhouse Luzern"
          />
        </div>

        <div>
          <label className="text-sm text-white/80">Beschreibung</label>
          <textarea
            value={form.bio ?? ""}
            onChange={(e) => setField("bio", e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white outline-none"
            placeholder="Kurzbeschreibung, Stil, Technik, Bühne, etc."
          />
        </div>
      </div>

      {/* Adresse */}
      <div className="rounded-3xl border border-white/10 bg-black/30 p-4 space-y-3">
        <div className="text-sm font-semibold text-white">Adresse</div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-sm text-white/80">Land</label>
            <input
              value={form.location?.country ?? ""}
              onChange={(e) => setLocation("country", e.target.value)}
              className="mt-1 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white outline-none"
              placeholder="Switzerland"
            />
          </div>
          <div>
            <label className="text-sm text-white/80">Stadt</label>
            <input
              value={form.location?.city ?? ""}
              onChange={(e) => setLocation("city", e.target.value)}
              className="mt-1 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white outline-none"
              placeholder="Luzern"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-sm text-white/80">Adresse</label>
            <input
              value={form.location?.address ?? ""}
              onChange={(e) => setLocation("address", e.target.value)}
              className="mt-1 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white outline-none"
              placeholder="Straße, Nr."
            />
          </div>
          <div>
            <label className="text-sm text-white/80">PLZ</label>
            <input
              value={form.location?.postalCode ?? ""}
              onChange={(e) => setLocation("postalCode", e.target.value)}
              className="mt-1 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white outline-none"
              placeholder="6003"
            />
          </div>
        </div>
      </div>

      {/* Öffnungszeiten */}
      <div className="rounded-3xl border border-white/10 bg-black/30 p-4 space-y-3">
        <div className="text-sm font-semibold text-white">Öffnungszeiten</div>
        <div className="text-xs text-white/40">Format z.B. “18:00–02:00” oder “geschlossen”</div>

        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ["mon", "Montag"],
              ["tue", "Dienstag"],
              ["wed", "Mittwoch"],
              ["thu", "Donnerstag"],
              ["fri", "Freitag"],
              ["sat", "Samstag"],
              ["sun", "Sonntag"],
            ] as const
          ).map(([k, label]) => (
            <div key={k}>
              <label className="text-sm text-white/80">{label}</label>
              <input
                value={(form.openingHours as any)?.[k] ?? ""}
                onChange={(e) => setHours(k, e.target.value)}
                className="mt-1 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white outline-none"
                placeholder="z.B. 18:00–02:00"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Kontakt */}
      <div className="rounded-3xl border border-white/10 bg-black/30 p-4 space-y-3">
        <div className="text-sm font-semibold text-white">Kontakt</div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-sm text-white/80">Telefon</label>
            <input
              value={form.contact?.phone ?? ""}
              onChange={(e) => setContact("phone", e.target.value)}
              className="mt-1 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white outline-none"
              placeholder="+41 ..."
            />
          </div>
          <div>
            <label className="text-sm text-white/80">E-Mail</label>
            <input
              value={form.contact?.email ?? ""}
              onChange={(e) => setContact("email", e.target.value)}
              className="mt-1 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white outline-none"
              placeholder="booking@venue.ch"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-sm text-white/80">Website</label>
            <input
              value={form.contact?.website ?? ""}
              onChange={(e) => setContact("website", e.target.value)}
              className="mt-1 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white outline-none"
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="text-sm text-white/80">Instagram</label>
            <input
              value={form.contact?.instagram ?? ""}
              onChange={(e) => setContact("instagram", e.target.value)}
              className="mt-1 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white outline-none"
              placeholder="https://instagram.com/..."
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-2">
          <label className="flex items-center gap-2 text-sm text-white/80">
            <input
              type="checkbox"
              checked={!!form.published}
              onChange={(e) => setField("published", e.target.checked)}
            />
            In Suche sichtbar (published)
          </label>

          <button
            onClick={save}
            disabled={saving}
            className={cls(
              "rounded-2xl px-4 py-2 text-sm font-semibold transition",
              saving ? "bg-white/60 text-black" : "bg-white text-black hover:opacity-95"
            )}
          >
            {saving ? "Speichere…" : "Speichern"}
          </button>
        </div>
      </div>
    </div>
  );
}
