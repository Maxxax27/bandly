"use client";

import { useMemo, useState } from "react";
import { createPost, PostAuthor } from "@/lib/posts";
import { auth, storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

type Attachment = {
  type: "image" | "audio" | "document";
  url: string;
  path: string;
  name: string;
  size: number;
  contentType: string;
};

function detectType(file: File): Attachment["type"] {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("audio/")) return "audio";
  return "document";
}

function formatMB(bytes: number) {
  return (bytes / 1024 / 1024).toFixed(2) + " MB";
}

export function PostComposer({
  myProfile,
  onPosted,
}: {
  myProfile: any; // dein profiles/{uid} doc
  onPosted?: () => void; // ✅ NEU: optionaler Callback (z.B. Modal schließen)
}) {
  const [content, setContent] = useState("");
  const [mode, setMode] = useState<"musician" | "band">("musician");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [files, setFiles] = useState<File[]>([]);

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

  function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = "";

    // Limits (anpassbar)
    const MAX_FILES = 5;
    const MAX_SIZE = 20 * 1024 * 1024; // 20MB

    const valid: File[] = [];
    for (const f of picked) {
      if (f.size > MAX_SIZE) {
        setErr(`"${f.name}" ist zu groß (max. 20MB).`);
        continue;
      }
      valid.push(f);
    }

    setFiles((prev) => {
      const merged = [...prev, ...valid].slice(0, MAX_FILES);
      if (merged.length < prev.length + valid.length) {
        setErr(`Maximal ${MAX_FILES} Anhänge pro Post.`);
      }
      return merged;
    });
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function uploadAttachments(uid: string): Promise<Attachment[]> {
    if (files.length === 0) return [];

    const uploaded: Attachment[] = [];

    for (const file of files) {
      const type = detectType(file);
      const safeName = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `posts/${uid}/${Date.now()}_${safeName}`;

      const r = ref(storage, path);
      await uploadBytes(r, file, {
        contentType: file.type || "application/octet-stream",
      });

      const url = await getDownloadURL(r);

      uploaded.push({
        type,
        url,
        path,
        name: file.name,
        size: file.size,
        contentType: file.type || "application/octet-stream",
      });
    }

    return uploaded;
  }

  async function onPost() {
    setErr(null);
    setBusy(true);

    try {
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error("Bitte einloggen, um zu posten.");

      // Upload zuerst
      const attachments = await uploadAttachments(uid);

      // Band-Post: zusätzlich "postedBy" mitsenden
      if (author.type === "band") {
        await createPost({
          content,
          author,
          postedBy: {
            uid,
            displayName: myProfile.displayName,
            photoURL: myProfile.photoURL ?? null,
          },
          attachments, // ✅ NEU
        } as any);
      } else {
        await createPost({
          content,
          author,
          attachments, // ✅ NEU
        } as any);
      }

      setContent("");
      setFiles([]);

      onPosted?.(); // ✅ NEU: z.B. Modal schließen
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

      {/* Attachments list */}
      {files.length > 0 && (
        <div className="mt-3 space-y-2">
          {files.map((f, idx) => (
            <div
              key={`${f.name}-${idx}`}
              className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/30 px-3 py-2"
            >
              <div className="min-w-0">
                <div className="truncate text-sm text-white/90">{f.name}</div>
                <div className="text-xs text-white/50">
                  {detectType(f)} · {formatMB(f.size)}
                </div>
              </div>

              <button
                type="button"
                onClick={() => removeFile(idx)}
                className="rounded-xl px-2 py-1 text-xs text-white/70 hover:text-white"
              >
                Entfernen
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="text-xs text-white/50">{content.length}/2000</div>

          <label className="cursor-pointer rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white/80 hover:bg-black/40">
            Anhang
            <input
              type="file"
              className="hidden"
              multiple
              accept="image/*,audio/*,application/pdf,.doc,.docx,.txt"
              onChange={onPickFiles}
            />
          </label>
        </div>

        <button
          onClick={onPost}
          disabled={busy || (!content.trim() && files.length === 0)}
          className="rounded-2xl bg-white px-4 py-2 text-black disabled:opacity-40"
        >
          {busy ? "Posting..." : "Posten"}
        </button>
      </div>

      {err && <div className="mt-2 text-sm text-red-400">{err}</div>}
    </div>
  );
}
