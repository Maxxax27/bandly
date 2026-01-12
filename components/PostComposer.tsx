"use client";

import { useMemo, useState } from "react";
import { createPost, PostAuthor } from "@/lib/posts";
import { auth } from "@/lib/firebase";

export function PostComposer({
  myProfile,
}: {
  myProfile: any; // dein profiles/{uid} doc
}) {
  const [content, setContent] = useState("");
  const [mode, setMode] = useState<"musician" | "band">("musician");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canPostAsBand = !!myProfile?.band?.bandId;

  const author: PostAuthor = useMemo(() => {
    if (mode === "band" && canPostAsBand) {
      return {
        type: "band",
        bandId: myProfile.band.bandId,
        displayName: myProfile.band.name,
        photoURL: myProfile.band.logoURL ?? null,
      };
    }

    return {
      type: "musician",
      // UID IMMER aus Auth, nicht aus Profile doc
      uid: auth.currentUser?.uid ?? "",
      displayName: myProfile.displayName,
      photoURL: myProfile.photoURL ?? null,
    };
  }, [mode, canPostAsBand, myProfile]);

  async function onPost() {
    setErr(null);
    setBusy(true);

    try {
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error("Bitte einloggen, um zu posten.");

      // Band-Post: zusätzlich "postedBy" mitsenden
      if (author.type === "band") {
        await createPost({
          content,
          author,
          postedBy: {
            uid,
            displayName: myProfile.displayName,
            photoURL: myProfile.photoURL ?? null,
            // optional, falls du später usernames hast:
            // username: myProfile.username ?? null,
          },
        });
      } else {
        // Musiker-Post: normal
        await createPost({ content, author });
      }

      setContent("");
    } catch (e: any) {
      setErr(e.message ?? "Fehler beim Posten");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-white/70">Neuer Post</div>

        <div className="flex items-center gap-2 text-sm">
          <label className="text-white/60">Posten als</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as any)}
            className="rounded-xl border border-white/10 bg-black px-3 py-1"
          >
            <option value="musician">Musiker</option>
            <option value="band" disabled={!canPostAsBand}>
              Band
            </option>
          </select>
        </div>
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Was möchtest du teilen?"
        className="mt-3 w-full rounded-2xl border border-white/10 bg-black/30 p-3 outline-none"
        rows={4}
        maxLength={2000}
      />

      <div className="mt-3 flex items-center justify-between">
        <div className="text-xs text-white/50">{content.length}/2000</div>
        <button
          onClick={onPost}
          disabled={busy || !content.trim()}
          className="rounded-2xl bg-white px-4 py-2 text-black disabled:opacity-40"
        >
          Posten
        </button>
      </div>

      {err && <div className="mt-2 text-sm text-red-400">{err}</div>}
    </div>
  );
}
