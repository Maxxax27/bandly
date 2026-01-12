"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { addDoc, collection, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

import { db, storage } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { KANTON_LABELS } from "@/lib/cantons";

export default function NewBandPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [region, setRegion] = useState("");
  const [zip, setZip] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [genresRaw, setGenresRaw] = useState(""); // comma separated

  // ✅ Bandbild (Logo)
  const [bandImageFile, setBandImageFile] = useState<File | null>(null);
  const [bandImagePreview, setBandImagePreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const can = useMemo(() => !loading && !!user, [loading, user]);

  async function uploadBandImage(bandId: string, file: File) {
    const storageRef = ref(storage, `bands/${bandId}/photo`);
    await uploadBytes(storageRef, file, { contentType: file.type });
    return await getDownloadURL(storageRef);
  }

  async function submit() {
    if (!user) return router.push("/login");
    if (!name.trim()) return alert("Bitte Bandname eingeben.");

    const genres = genresRaw
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 12);

    setSaving(true);
    try {
      const uid = user.uid;

      // ✅ 1) Band zuerst erstellen (ohne Bild-URL)
      const docRef = await addDoc(collection(db, "bands"), {
        name: name.trim(),
        region: region ? region.trim().toUpperCase() : "",
        zip: zip.trim(),
        location: location.trim(),

        bio: bio.trim(),
        genres,

        photoURL: null, // wird danach gesetzt, wenn Bild ausgewählt

        members: {
          [uid]: {
            role: "admin",
            displayName: user.displayName ?? user.email ?? "User",
            photoURL: user.photoURL ?? null,
            joinedAt: serverTimestamp(),
          },
        },

        memberUids: [uid],
        memberCount: 1,

        search: {
          name: name.trim().toLowerCase(),
        },

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const bandId = docRef.id;

      // ✅ 2) Falls Bild gewählt: hochladen + photoURL im Band-Doc speichern
      let photoURL: string | null = null;

      if (bandImageFile) {
        if (!bandImageFile.type.startsWith("image/")) {
          alert("Bitte wähle ein Bild aus (JPG/PNG/WebP).");
        } else if (bandImageFile.size > 6 * 1024 * 1024) {
          alert("Bild zu gross (max. 6 MB).");
        } else {
          photoURL = await uploadBandImage(bandId, bandImageFile);

          await setDoc(
            doc(db, "bands", bandId),
            { photoURL, updatedAt: serverTimestamp() },
            { merge: true }
          );
        }
      }

      // ✅ 3) Profil direkt verknüpfen (Ersteller bekommt sofort Badge)
      await setDoc(
        doc(db, "profiles", uid),
        {
          band: {
            bandId,
            name: name.trim(),
            logoURL: photoURL ?? null, // Profil-Badge nutzt logoURL
            joinedAt: serverTimestamp(),
          },
          status: "Band",
          bandName: name.trim(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      router.push(`/bands/${bandId}`);
    } catch (e: any) {
      console.error(e);
      alert(`Speichern fehlgeschlagen: ${e?.message ?? e}`);
    } finally {
      setSaving(false);
    }
  }

  if (!can) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
        Lade…
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/bands" className="text-sm hover:underline">
        ← Zurück
      </Link>

      <div className="rounded-2xl bg-zinc-900 text-white p-6 md:p-7 shadow-lg border border-zinc-800/60 space-y-5">
        <h1 className="text-2xl font-bold">Bandprofil erstellen</h1>

        {/* ✅ Bandbild Upload */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm font-semibold text-zinc-100">Bandbild (optional)</div>
          <p className="text-xs text-zinc-400 mt-1">
            Dieses Bild wird als Band-Logo verwendet und auf Mitglieder-Profilen angezeigt.
          </p>

          <div className="mt-3 flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl overflow-hidden border border-white/10 bg-white/10 flex items-center justify-center">
              {bandImagePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={bandImagePreview} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xl">🎵</span>
              )}
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setBandImageFile(f);
                if (f) setBandImagePreview(URL.createObjectURL(f));
                else setBandImagePreview(null);
              }}
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={saving}
                className="rounded-xl bg-white text-zinc-900 px-4 py-2 text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
              >
                Bild wählen…
              </button>

              <button
                type="button"
                onClick={() => {
                  setBandImageFile(null);
                  setBandImagePreview(null);
                  if (fileRef.current) fileRef.current.value = "";
                }}
                disabled={saving}
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-100 hover:bg-white/10 transition disabled:opacity-50"
              >
                Entfernen
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="text-sm font-semibold text-zinc-100">Bandname</label>
            <input
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/10 text-white px-4 py-2 text-sm outline-none"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Aldebaran"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-zinc-100">Kanton</label>
            <select
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/10 text-white px-4 py-2 text-sm outline-none"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            >
              <option value="" className="text-zinc-900">
                —
              </option>
              {Object.keys(KANTON_LABELS)
                .sort()
                .map((c) => (
                  <option key={c} value={c} className="text-zinc-900">
                    {c}: {KANTON_LABELS[c as keyof typeof KANTON_LABELS]}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold text-zinc-100">PLZ (optional)</label>
            <input
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/10 text-white px-4 py-2 text-sm outline-none"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              placeholder="z.B. 6003"
              inputMode="numeric"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-semibold text-zinc-100">Ort (optional)</label>
            <input
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/10 text-white px-4 py-2 text-sm outline-none"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="z.B. Luzern"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-semibold text-zinc-100">Genres (Komma-getrennt)</label>
            <input
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/10 text-white px-4 py-2 text-sm outline-none"
              value={genresRaw}
              onChange={(e) => setGenresRaw(e.target.value)}
              placeholder="Rock, Metal, Hard Rock…"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-semibold text-zinc-100">Bio (optional)</label>
            <textarea
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/10 text-white px-4 py-2 text-sm outline-none min-h-28"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Kurz: Stil, Proben, Ziele, Einflüsse…"
            />
          </div>
        </div>

        <button
          onClick={submit}
          disabled={saving}
          className="rounded-xl bg-white text-zinc-900 px-5 py-2.5 text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
        >
          {saving ? "Speichere…" : "Bandprofil erstellen"}
        </button>
      </div>
    </div>
  );
}
