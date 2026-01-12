"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";

const REGIONS = [
  "LU","ZH","BE","BS","SG","AG","TG","GR","VS","TI","BL","AI","AR","FR","GE","GL","JU","NE","NW","OB","SH","SO","SZ","VD","ZG","UR"
];
const INSTRUMENTS = ["Gitarre", "Bass", "Drums", "Vocal", "Keys", "Violin", "DJ"];
const GENRES = ["Rock", "Hard Rock", "Metal", "Blues", "Pop", "Indie", "Punk", "Jazz"];

export default function NewListingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [region, setRegion] = useState("LU");
  const [instrument, setInstrument] = useState("Gitarre");
  const [genres, setGenres] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // ✅ NEU: Cross-Post in Feed
  const [postToFeed, setPostToFeed] = useState(true);
  const [postMode, setPostMode] = useState<"musician" | "band">("musician");

  // ✅ Profil laden (für Band-Option + Namen/Foto)
  const [profile, setProfile] = useState<any | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    async function loadProfile() {
      if (!user) return;
      const psnap = await getDoc(doc(db, "profiles", user.uid));
      setProfile(psnap.exists() ? psnap.data() : null);
    }
    if (!loading && user) loadProfile();
  }, [loading, user]);

  const canShow = useMemo(() => !loading && !!user, [loading, user]);
  const canPostAsBand = !!profile?.band?.bandId;

  if (loading || !canShow) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-white/70">
            Lade…
          </div>
        </div>
      </main>
    );
  }
  if (!user) return null;

  function toggleGenre(g: string) {
    setGenres((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  }

  async function createListing() {
    if (!user) return;
    if (!title.trim()) return alert("Titel fehlt");
    if (!text.trim()) return alert("Beschreibung fehlt");

    setSaving(true);

    try {
      // Profil-Daten (falls noch nicht geladen: fallback fetch)
      let pdata = profile;
      if (!pdata) {
        const psnap = await getDoc(doc(db, "profiles", user.uid));
        pdata = psnap.exists() ? (psnap.data() as any) : {};
        setProfile(pdata);
      }

      const ownerName =
        (pdata?.displayName as string) ||
        user.displayName ||
        (user.email ?? "Unbekannt");

      const ownerPhotoURL =
        (pdata?.photoURL as string) || user.photoURL || null;

      const ownerLocation = `${(pdata?.locationText as string) || ""} ${(pdata?.region as string) || ""}`.trim();

      // 1) Listing erstellen
      const listingRef = await addDoc(collection(db, "listings"), {
        title: title.trim(),
        text: text.trim(),
        region,
        instrument,
        genres,
        createdAt: serverTimestamp(),
        ownerUid: user.uid,
        ownerName,
        ownerPhotoURL,
        ownerLocation,
      });

      // 2) Optional: auch im Feed posten
      if (postToFeed) {
        const uid = auth.currentUser?.uid;
        if (!uid) throw new Error("Bitte einloggen, um zu posten.");

        // Author bestimmen
        let author: any = {
          type: "musician",
          uid,
          displayName: pdata?.displayName ?? user.displayName ?? "Musiker",
          photoURL: pdata?.photoURL ?? user.photoURL ?? null,
        };

        let postedBy: any = null;

        if (postMode === "band" && pdata?.band?.bandId) {
          author = {
            type: "band",
            bandId: pdata.band.bandId,
            displayName: pdata.band.name ?? "Band",
            photoURL: pdata.band.logoURL ?? null,
          };

          postedBy = {
            uid,
            displayName: pdata?.displayName ?? user.displayName ?? "User",
            photoURL: pdata?.photoURL ?? user.photoURL ?? null,
          };
        }

        const postText =
          `📝 Neues Inserat: ${title.trim()}` +
          (instrument ? ` · ${instrument}` : "") +
          (region ? ` · ${region}` : "");

        const postRef = await addDoc(collection(db, "posts"), {
          type: "listing",
          content: postText,
          ref: { id: listingRef.id },

          author,
          ...(postedBy ? { postedBy } : {}),

          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        // optional: feedPostId zurück ins Listing
        await updateDoc(listingRef, { feedPostId: postRef.id });
      }

      router.push(`/listings/${listingRef.id}`);
    } catch (e: any) {
      console.error(e);
      alert(`Speichern fehlgeschlagen: ${e?.message ?? e}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Inserat erstellen</h1>
            <p className="text-sm text-white/60 mt-1">
              Erstelle ein Inserat, das in der Inserate-Liste angezeigt wird.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/listings")}
            className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10 transition"
          >
            Zurück
          </button>
        </div>

        {/* Main Dark Card */}
        <div className="rounded-2xl bg-zinc-900 text-white p-6 md:p-7 shadow-lg border border-zinc-800/60 space-y-6">
          {/* ✅ NEU: Cross-Post Optionen */}
          <div className="rounded-2xl border border-white/10 bg-black/30 p-4 space-y-3">
            <label className="flex items-center gap-3 text-sm text-white/80">
              <input
                type="checkbox"
                checked={postToFeed}
                onChange={(e) => setPostToFeed(e.target.checked)}
                className="h-4 w-4"
              />
              Auch im Feed posten
            </label>

            {postToFeed && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-white/60">Posten als</span>
                <select
                  value={postMode}
                  onChange={(e) => setPostMode(e.target.value as any)}
                  className="rounded-xl border border-white/10 bg-black px-3 py-1 text-white"
                >
                  <option value="musician">Musiker</option>
                  <option value="band" disabled={!canPostAsBand}>
                    Band
                  </option>
                </select>

                {!canPostAsBand && (
                  <span className="text-xs text-white/50">
                    (Band nur möglich, wenn du im Profil eine Band verknüpft hast)
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Titel */}
          <div>
            <label className="text-sm font-semibold text-zinc-100">Titel</label>
            <input
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/10 text-white placeholder:text-zinc-400 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-white/10"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. Rockband sucht Drummer (LU)"
            />
          </div>

          {/* Region + Instrument */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-zinc-100">Kanton</label>
              <select
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/10 text-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-white/10"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              >
                {REGIONS.map((r) => (
                  <option key={r} value={r} className="text-zinc-900">
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-zinc-100">Gesuchtes Instrument</label>
              <select
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/10 text-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-white/10"
                value={instrument}
                onChange={(e) => setInstrument(e.target.value)}
              >
                {INSTRUMENTS.map((i) => (
                  <option key={i} value={i} className="text-zinc-900">
                    {i}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Genres */}
          <div>
            <div className="text-sm font-semibold text-zinc-100 mb-2">Genres</div>
            <div className="flex flex-wrap gap-2">
              {GENRES.map((g) => {
                const active = genres.includes(g);
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => toggleGenre(g)}
                    className={[
                      "rounded-full px-3 py-1 text-sm border transition",
                      active
                        ? "bg-white text-zinc-900 border-white/20 font-semibold"
                        : "bg-white/10 text-zinc-100 border-white/10 hover:bg-white/15",
                    ].join(" ")}
                  >
                    {g}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Beschreibung */}
          <div>
            <label className="text-sm font-semibold text-zinc-100">Beschreibung</label>
            <textarea
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/10 text-white placeholder:text-zinc-400 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white/10 min-h-44"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Probetage, Ziele (Gigs/Studio), Level, Einflüsse, Kontakt…"
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col md:flex-row gap-3">
            <button
              onClick={createListing}
              disabled={saving}
              className="rounded-xl bg-white text-zinc-900 px-5 py-2.5 text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
              type="button"
            >
              {saving ? "Speichere…" : "Inserat veröffentlichen"}
            </button>

            <button
              type="button"
              onClick={() => router.push("/listings")}
              className="rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-zinc-100 hover:bg-white/10 transition"
              disabled={saving}
            >
              Abbrechen
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
