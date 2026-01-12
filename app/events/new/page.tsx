"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  addDoc,
  collection,
  serverTimestamp,
  Timestamp,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { KANTON_LABELS } from "@/lib/cantons";

function isValidUrl(s: string) {
  if (!s) return true;
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export default function NewEventPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [dateLocal, setDateLocal] = useState(""); // yyyy-mm-ddThh:mm
  const [venue, setVenue] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [link, setLink] = useState("");
  const [description, setDescription] = useState("");

  // ✅ NEU: Cross-Post in Feed
  const [postToFeed, setPostToFeed] = useState(true);
  const [postMode, setPostMode] = useState<"musician" | "band">("musician");

  const can = useMemo(() => !loading && !!user, [loading, user]);

  const canPostAsBand = useMemo(async () => {
    // (wir checken Bandfähigkeit später über Profile)
    return true;
  }, []);

  async function submit() {
    if (!user) return router.push("/login");

    if (!title.trim()) return alert("Bitte Titel eingeben.");
    if (!dateLocal) return alert("Bitte Datum/Uhrzeit wählen.");
    if (!isValidUrl(link)) return alert("Link ist ungültig (nur http/https).");

    const dt = new Date(dateLocal);
    if (Number.isNaN(dt.getTime())) return alert("Datum ist ungültig.");

    setSaving(true);
    try {
      // 1) Event erstellen
      const eventRef = await addDoc(collection(db, "events"), {
        title: title.trim(),
        date: Timestamp.fromDate(dt),
        venue: venue.trim(),
        city: city.trim(),
        region: region ? region.trim().toUpperCase() : "",
        link: link.trim(),
        description: description.trim(),

        ownerUid: user.uid,
        ownerName: user.displayName ?? user.email ?? "User",
        ownerPhotoURL: user.photoURL ?? null,

        createdAt: serverTimestamp(),
      });

      // 2) Optional: auch in Feed posten
      if (postToFeed) {
        const uid = auth.currentUser?.uid;
        if (!uid) throw new Error("Bitte einloggen, um zu posten.");

        // Profil laden (für Band-Mode + postedBy)
        const profileSnap = await getDoc(doc(db, "profiles", uid));
        const profile = profileSnap.exists() ? (profileSnap.data() as any) : null;

        // Author bestimmen
        let author: any = {
          type: "musician",
          uid,
          displayName: profile?.displayName ?? user.displayName ?? "Musiker",
          photoURL: profile?.photoURL ?? user.photoURL ?? null,
        };

        let postedBy: any = null;

        // Wenn Band-Mode gewählt und Profil hat band
        if (postMode === "band" && profile?.band?.bandId) {
          author = {
            type: "band",
            bandId: profile.band.bandId,
            displayName: profile.band.name ?? "Band",
            photoURL: profile.band.logoURL ?? null,
          };

          postedBy = {
            uid,
            displayName: profile?.displayName ?? user.displayName ?? "User",
            photoURL: profile?.photoURL ?? user.photoURL ?? null,
          };
        }

        const postText =
          `📅 Neues Event: ${title.trim()}` +
          (city.trim() ? ` · ${city.trim()}` : "") +
          (venue.trim() ? ` @ ${venue.trim()}` : "");

        const postRef = await addDoc(collection(db, "posts"), {
          type: "event",
          content: postText,
          ref: { id: eventRef.id },

          author,
          ...(postedBy ? { postedBy } : {}),

          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        // optional: feedPostId zurück ins Event (praktisch)
        await updateDoc(eventRef, { feedPostId: postRef.id });
      }

      router.push("/events");
    } catch (e: any) {
      console.error(e);
      alert(`Speichern fehlgeschlagen: ${e?.message ?? e}`);
    } finally {
      setSaving(false);
    }
  }

  if (!can) {
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

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
        <div className="flex items-center justify-between">
          <Link href="/events" className="text-sm text-white/70 hover:underline">
            ← Zurück
          </Link>
        </div>

        <div className="rounded-2xl bg-zinc-900 text-white p-6 md:p-7 shadow-lg border border-zinc-800/60 space-y-5">
          <h1 className="text-2xl font-bold">Event erstellen</h1>

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
                  <option value="band">Band</option>
                </select>
                <span className="text-xs text-white/50">
                  (Band funktioniert nur, wenn du im Profil eine Band verknüpft hast)
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-sm font-semibold text-zinc-100">Titel</label>
              <input
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/10 text-white px-4 py-2 text-sm outline-none"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="z.B. Aldebaran Live @ Schüür"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-zinc-100">
                Datum & Uhrzeit
              </label>
              <input
                type="datetime-local"
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/10 text-white px-4 py-2 text-sm outline-none"
                value={dateLocal}
                onChange={(e) => setDateLocal(e.target.value)}
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
              <label className="text-sm font-semibold text-zinc-100">
                Venue (optional)
              </label>
              <input
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/10 text-white px-4 py-2 text-sm outline-none"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="z.B. Schüür"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-zinc-100">
                Ort/Stadt (optional)
              </label>
              <input
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/10 text-white px-4 py-2 text-sm outline-none"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="z.B. Luzern"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-semibold text-zinc-100">
                Link (optional)
              </label>
              <input
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/10 text-white px-4 py-2 text-sm outline-none"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://ticket/instagram/facebook…"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-semibold text-zinc-100">
                Beschreibung (optional)
              </label>
              <textarea
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/10 text-white px-4 py-2 text-sm outline-none min-h-28"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Lineup, Startzeit, Support, Eintritt…"
              />
            </div>
          </div>

          <button
            onClick={submit}
            disabled={saving}
            className="rounded-xl bg-white text-zinc-900 px-5 py-2.5 text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
          >
            {saving ? "Speichere…" : "Event veröffentlichen"}
          </button>
        </div>
      </div>
    </main>
  );
}
