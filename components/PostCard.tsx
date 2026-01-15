"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { deletePost } from "@/lib/posts";
import { doc, getDoc } from "firebase/firestore";

// ⏱️ Zeitformatierung
function formatPostTime(timestamp: any) {
  if (!timestamp?.toDate) return "";

  const date = timestamp.toDate();
  const now = new Date();

  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);

  if (diffMinutes < 1) return "gerade eben";
  if (diffMinutes < 60)
    return `vor ${diffMinutes} Minute${diffMinutes === 1 ? "" : "n"}`;
  if (diffHours < 24)
    return `vor ${diffHours} Stunde${diffHours === 1 ? "" : "n"}`;

  return date.toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function PostCard({ post }: { post: any }) {
  const router = useRouter();
  const a = post.author;
  const uid = auth.currentUser?.uid;

  const [isBandAdmin, setIsBandAdmin] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ✅ Live-Update Zeit
  const [, forceTick] = useState(0);
  useEffect(() => {
    forceTick((t) => t + 1);
    const id = setInterval(() => forceTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const goAuthor = () => {
    if (a.type === "musician") router.push(`/musicians/${a.uid}`);
    if (a.type === "band") router.push(`/bands/${a.bandId}`);
  };

  const canDeleteMusicianPost = useMemo(() => {
    return !!uid && a?.type === "musician" && a?.uid === uid;
  }, [uid, a]);

  useEffect(() => {
    async function checkAdmin() {
      setIsBandAdmin(false);
      if (!uid || a?.type !== "band" || !a?.bandId) return;

      const snap = await getDoc(doc(db, "bands", a.bandId));
      if (!snap.exists()) return;

      setIsBandAdmin(snap.data()?.members?.[uid]?.role === "admin");
    }

    checkAdmin();
  }, [uid, a?.type, a?.bandId]);

  const canDelete = canDeleteMusicianPost || (a?.type === "band" && isBandAdmin);

  async function onDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!canDelete) return;
    if (!window.confirm("Post wirklich löschen?")) return;

    try {
      setDeleting(true);
      await deletePost(post.id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={goAuthor} className="shrink-0">
            <img
              src={a.photoURL ?? "/default-avatar.png"}
              alt={a.displayName}
              className="h-10 w-10 rounded-full object-cover"
            />
          </button>

          <div className="min-w-0">
            {/* Name */}
            <button onClick={goAuthor} className="font-semibold hover:underline">
              {a.displayName}
            </button>

            {/* 👤 gepostet von @Name (nur bei Band) */}
            {a.type === "band" && post.postedBy?.uid && (
              <div className="mt-1 flex items-center gap-2 text-xs text-white/70">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/musicians/${post.postedBy.uid}`);
                  }}
                >
                  <img
                    src={post.postedBy.photoURL || "/default-avatar.png"}
                    alt={post.postedBy.displayName}
                    className="h-5 w-5 rounded-full object-cover border border-white/30"
                  />
                </button>

                <span>
                  gepostet von{" "}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/musicians/${post.postedBy.uid}`);
                    }}
                    className="font-medium text-white hover:underline"
                  >
                    @{post.postedBy.displayName}
                  </button>
                </span>
              </div>
            )}

            {/* ⏱️ Zeit */}
            <div className="text-xs text-white/50">
              {formatPostTime(post.createdAt)}
            </div>
          </div>
        </div>

        {canDelete && (
          <button
            onClick={onDelete}
            disabled={deleting}
            className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white/80 hover:bg-white/10 disabled:opacity-40"
          >
            🗑️
          </button>
        )}
      </div>

      {/* Content */}
      <div className="mt-3 whitespace-pre-wrap text-white/90">
        {post.content}
      </div>

      {/* ✅ Attachments (Bilder / Audio / Dokumente) */}
      {Array.isArray(post.attachments) && post.attachments.length > 0 && (
        <div className="mt-3 space-y-3">
          {post.attachments.map((att: any, idx: number) => {
            // 🖼️ Image
            if (att.type === "image") {
              return (
                <img
                  key={`${att.path ?? att.url}-${idx}`}
                  src={att.url}
                  alt={att.name ?? "Bild"}
                  loading="lazy"
                  className="w-full max-h-[460px] rounded-2xl border border-white/10 object-cover bg-black/30"
                />
              );
            }

            // 🎵 Audio
            if (att.type === "audio") {
              return (
                <div
                  key={`${att.path ?? att.url}-${idx}`}
                  className="rounded-2xl border border-white/10 bg-black/30 p-3"
                >
                  <div className="mb-2 truncate text-sm text-white/80">
                    🎵 {att.name ?? "Audio"}
                  </div>
                  <audio controls src={att.url} className="w-full" />
                </div>
              );
            }

            // 📄 Document (default)
            return (
              <a
                key={`${att.path ?? att.url}-${idx}`}
                href={att.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-3 py-3 text-sm text-white/80 hover:bg-black/40"
              >
                <span className="shrink-0">📎</span>
                <span className="min-w-0 truncate">
                  {att.name ?? "Datei öffnen"}
                </span>
              </a>
            );
          })}
        </div>
      )}

      {/* 🔗 Inserat / Event Verlinkung */}
      {post.type === "listing" && post.ref?.id && (
        <div className="mt-3">
          <button
            onClick={() => router.push(`/listings/${post.ref.id}`)}
            className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
          >
            👉 Inserat ansehen
          </button>
        </div>
      )}

      {post.type === "event" && post.ref?.id && (
        <div className="mt-3">
          <button
            onClick={() => router.push(`/events/${post.ref.id}`)}
            className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
          >
            👉 Event ansehen
          </button>
        </div>
      )}
    </div>
  );
}
