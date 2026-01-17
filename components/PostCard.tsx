"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { deletePost } from "@/lib/posts";
import InlineCommentComposer from "@/components/InlineCommentComposer";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  deleteDoc,
} from "firebase/firestore";

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

function handleOf(postedBy: any) {
  const u = String(postedBy?.username ?? "").trim();
  if (u) return `@${u}`;
  const dn = String(postedBy?.displayName ?? "").trim();
  if (dn) return `@${dn}`;
  return null;
}

export function PostCard({ post }: { post: any }) {
  const router = useRouter();
  const a = post.author;
  const uid = auth.currentUser?.uid;

  const [isBandAdmin, setIsBandAdmin] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const postedByHandle = useMemo(() => handleOf(post?.postedBy), [post?.postedBy]);

  // Live Zeit
  const [, forceTick] = useState(0);
  useEffect(() => {
    forceTick((t) => t + 1);
    const id = setInterval(() => forceTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  // ✅ Hauptnavigation bleibt: Band -> Bandseite, Musiker -> Musiker, Producer -> Producer
  const goAuthor = () => {
    if (a?.type === "musician") router.push(`/musicians/${a.uid}`);
    if (a?.type === "band") router.push(`/bands/${a.bandId}`);
    if (a?.type === "producer") router.push(`/producers/${a.uid}`);
  };

  // ✅ Member-Profil (nur wenn Band-Post durch Member)
  const goPostedBy = () => {
    if (!post?.postedBy?.uid) return;
    router.push(`/musicians/${post.postedBy.uid}`);
  };

  const canDeleteMusicianPost = useMemo(
    () => !!uid && a?.type === "musician" && a?.uid === uid,
    [uid, a]
  );

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

  // -----------------------------
  // 💬 Kommentare
  // -----------------------------
  const [comments, setComments] = useState<any[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [commentSending, setCommentSending] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) {
      setComments([]);
      setCommentsLoading(false);
      return;
    }

    setCommentsLoading(true);
    const q = query(
      collection(db, "posts", post.id, "comments"),
      orderBy("createdAt", "desc"),
      limit(10)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setComments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setCommentsLoading(false);
      },
      () => {
        setCommentsLoading(false);
        setCommentError("Kommentare konnten nicht geladen werden.");
      }
    );

    return () => unsub();
  }, [post.id, uid]);

  async function submitComment(text: string) {
    if (!uid) return;
    const clean = commentText.trim();
    if (!clean) return;

    setCommentSending(true);
    setCommentError(null);

    try {
      await addDoc(collection(db, "posts", post.id, "comments"), {
        authorId: uid,
        authorName: auth.currentUser?.displayName ?? "",
        authorPhotoURL: auth.currentUser?.photoURL ?? "",
        text: clean,
        createdAt: serverTimestamp(),
        editedAt: null,
      });
      setCommentText("");
    } catch {
      setCommentError("Kommentar konnte nicht gesendet werden.");
    } finally {
      setCommentSending(false);
    }
  }

  async function deleteComment(commentId: string) {
    if (!uid) return;
    if (!window.confirm("Kommentar wirklich löschen?")) return;

    try {
      await deleteDoc(doc(db, "posts", post.id, "comments", commentId));
    } catch (err: any) {
      setCommentError(
        err?.code === "permission-denied"
          ? "Keine Berechtigung zum Löschen."
          : "Kommentar konnte nicht gelöscht werden."
      );
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* 🟣 Band/Musiker/Producer Avatar bleibt author */}
          <button onClick={goAuthor}>
            <img
              src={a?.photoURL ?? "/default-avatar.png"}
              className="h-10 w-10 rounded-full object-cover"
              alt={a?.displayName ?? "Author"}
            />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              {/* Band/Musiker/Producer Name */}
              <button
                onClick={goAuthor}
                className="font-semibold hover:underline truncate"
              >
                {a?.displayName ?? "Unbekannt"}
              </button>

              {/* 🟢 Member Avatar + @Name (klickbar) wenn Band-Post durch Member */}
              {a?.type === "band" && post?.postedBy?.uid && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    goPostedBy();
                  }}
                  className="flex items-center gap-1 hover:opacity-90"
                  title="Zum Member-Profil"
                >
                  <img
                    src={post.postedBy.photoURL ?? "/default-avatar.png"}
                    className="h-6 w-6 rounded-full object-cover border border-white/10"
                    alt={postedByHandle ?? "Member"}
                  />
                  {postedByHandle && (
                    <span className="text-sm text-white/60 hover:text-white hover:underline truncate">
                      {postedByHandle}
                    </span>
                  )}
                </button>
              )}
            </div>

            <div className="text-xs text-white/50">
              {formatPostTime(post.createdAt)}
            </div>
          </div>
        </div>

        {canDelete && (
          <button
            onClick={onDelete}
            disabled={deleting}
            className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm hover:bg-white/10"
          >
            🗑️
          </button>
        )}
      </div>

      {/* Content */}
      <div className="mt-3 whitespace-pre-wrap text-white/90">{post.content}</div>

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

      {/* 💬 Kommentare + Counter */}
      <div className="mt-4 border-t border-white/10 pt-3">
        <div className="flex items-center justify-between">
  <span className="text-sm text-white/70"></span>
  <span className="text-xs text-white/40"></span>
</div>

        <div className="mt-3">
          {!uid ? (
            <div className="text-xs text-white/50">
              Bitte einloggen, um zu kommentieren.
            </div>
          ) : (
            <>
              <InlineCommentComposer
  count={post.commentCount ?? 0}
  disabled={!uid || commentSending}
  onSubmit={async (text) => {
    await submitComment(text);
  }}
/>


              {commentError && (
                <div className="mt-2 text-xs text-red-400">{commentError}</div>
              )}

              <div className="mt-3 space-y-2">
                {commentsLoading ? (
                  <div className="text-xs text-white/50">Lade Kommentare…</div>
                ) : comments.length === 0 ? (
                  <div className="text-xs text-white/50">
                    
                  </div>
                ) : (
                  comments.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-xl border border-white/10 bg-black/25 p-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <img
                            src={c.authorPhotoURL || "/default-avatar.png"}
                            alt={c.authorName || "User"}
                            className="h-6 w-6 rounded-full object-cover"
                          />
                          <div className="text-xs text-white/70">
                            <span className="font-medium text-white/80">
                              {c.authorName || "User"}
                            </span>
                          </div>
                        </div>

                        {uid && c.authorId === uid && (
                          <button
                            onClick={() => deleteComment(c.id)}
                            className="text-xs text-white/60 hover:text-white"
                            title="Kommentar löschen"
                          >
                            🗑️
                          </button>
                        )}
                      </div>

                      <div className="mt-1 whitespace-pre-wrap text-sm text-white/90">
                        {c.text}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
