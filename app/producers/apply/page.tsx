"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function ProducerApplyPage() {
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [uid, setUid] = useState<string | null>(auth.currentUser?.uid ?? null);

  const [loadingExisting, setLoadingExisting] = useState(true);
  const [existingStatus, setExistingStatus] = useState<string | null>(null);

  const [studioName, setStudioName] = useState("");
  const [location, setLocation] = useState("");
  const [genres, setGenres] = useState("");
  const [links, setLinks] = useState("");
  const [motivation, setMotivation] = useState("");

  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUid(u?.uid ?? null);
      setReady(true);
      if (!u) router.replace("/login");
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    async function loadExisting() {
      if (!uid) return;
      setLoadingExisting(true);

      const snap = await getDoc(doc(db, "producerApplications", uid));
      if (snap.exists()) {
        const d = snap.data() as any;
        setExistingStatus(d.status ?? "pending");
        setStudioName(d.studioName ?? "");
        setLocation(d.location ?? "");
        setGenres(Array.isArray(d.genres) ? d.genres.join(", ") : "");
        setLinks(Array.isArray(d.links) ? d.links.join("\n") : "");
        setMotivation(d.motivation ?? "");
      } else {
        setExistingStatus(null);
      }

      setLoadingExisting(false);
    }

    if (uid) loadExisting();
  }, [uid]);

  async function submit() {
    if (!uid) return;

    const cleanStudio = studioName.trim();
    const cleanMotivation = motivation.trim();
    if (!cleanStudio || !cleanMotivation) {
      setError("Bitte Studio-Name und Motivation ausfüllen.");
      return;
    }

    const cleanLinks = links
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);

    const cleanGenres = genres
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 10);

    setSending(true);
    setError(null);

    try {
      await setDoc(
        doc(db, "producerApplications", uid),
        {
          uid,
          displayName: auth.currentUser?.displayName ?? "",
          email: auth.currentUser?.email ?? "",
          photoURL: auth.currentUser?.photoURL ?? null,

          studioName: cleanStudio,
          location: location.trim(),
          genres: cleanGenres,
          links: cleanLinks,
          motivation: cleanMotivation,

          status: "pending",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      router.push("/profile");
    } catch (e: any) {
      setError(
        e?.code === "permission-denied"
          ? "Keine Berechtigung. Bitte einloggen."
          : "Bewerbung konnte nicht gesendet werden."
      );
    } finally {
      setSending(false);
    }
  }

  if (!ready || loadingExisting) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/70">
        Lade…
      </div>
    );
  }

  // ✅ Wenn schon approved: Hinweis + Link (FIX: /producers statt /producers/${uid})
  if (existingStatus === "approved") {
    return (
      <div className="space-y-3 rounded-3xl border border-white/10 bg-black/30 p-5">
        <div className="text-lg font-bold text-white">
          ✅ Du bist bereits Producer
        </div>
        <div className="text-sm text-white/70">
          Dein Producer-Profil ist freigegeben und in der Suche sichtbar.
        </div>
        <button
          onClick={() => router.push(`/producers`)}
          className="rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10"
        >
          Producer in Suche ansehen
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
        <div className="text-xl font-bold text-white">Producer Bewerbung</div>
        <div className="mt-1 text-sm text-white/60">
          Fülle das Formular aus. Du bekommst erst nach Freigabe ein offizielles
          Producer-Profil.
        </div>

        {existingStatus === "pending" && (
          <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-white/70">
            ⏳ Deine Bewerbung ist bereits eingereicht und wartet auf Prüfung. Du
            kannst sie hier noch anpassen und erneut speichern.
          </div>
        )}

        <div className="mt-4 grid gap-3">
          <div>
            <label className="text-sm font-semibold text-white">
              Studio / Producer Name *
            </label>
            <input
              value={studioName}
              onChange={(e) => setStudioName(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white outline-none"
              placeholder="z.B. Massi Studio"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-white">Ort</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white outline-none"
              placeholder="z.B. Zürich"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-white">
              Genres (Komma-separiert)
            </label>
            <input
              value={genres}
              onChange={(e) => setGenres(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white outline-none"
              placeholder="HipHop, Pop, EDM"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-white">
              Links (1 pro Zeile)
            </label>
            <textarea
              value={links}
              onChange={(e) => setLinks(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white outline-none"
              placeholder={"https://soundcloud.com/...\nhttps://instagram.com/..."}
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-white">
              Motivation / Erfahrung *
            </label>
            <textarea
              value={motivation}
              onChange={(e) => setMotivation(e.target.value)}
              rows={5}
              className="mt-1 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white outline-none"
              placeholder="Kurz erklären, was du machst und was dich motiviert."
            />
          </div>

          {error && <div className="text-sm text-red-400">{error}</div>}

          <button
            onClick={submit}
            disabled={sending}
            className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-black hover:opacity-95 disabled:opacity-60"
          >
            {sending ? "Sende…" : "Bewerbung senden"}
          </button>
        </div>
      </div>
    </div>
  );
}
