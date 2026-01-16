"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { onAuthStateChanged, getAuth } from "firebase/auth";
import { db } from "@/lib/firebase";

export function Comments({ postId }: { postId: string }) {
  const [user, setUser] = useState<any>(null);
  const [userReady, setUserReady] = useState(false);

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(getAuth(), (u) => {
      setUser(u);
      setUserReady(true);
    });
    return () => unsub();
  }, []);

  // Comments live
  useEffect(() => {
    if (!userReady) return;
    if (!user) {
      setComments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErr(null);

    const q = query(
      collection(db, "posts", postId, "comments"),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setComments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (e) => {
        setLoading(false);
        setErr(e?.code === "permission-denied" ? "Keine Berechtigung." : "Fehler beim Laden.");
      }
    );

    return () => unsub();
  }, [postId, userReady, user]);

  async function submit() {
    if (!user) return;
    const clean = text.trim();
    if (!clean) return;

    setSending(true);
    setErr(null);
    try {
      await addDoc(collection(db, "posts", postId, "comments"), {
        authorId: user.uid,
        authorName: user.displayName ?? "",
        authorPhotoURL: user.photoURL ?? "",
        text: clean,
        createdAt: serverTimestamp(),
        editedAt: null,
      });
      setText("");
    } catch (e: any) {
      setErr(e?.code === "permission-denied" ? "Keine Berechtigung." : "Senden fehlgeschlagen.");
    } finally {
      setSending(false);
    }
  }

  if (!userReady) return <div className="text-white/50 text-sm">Kommentare laden…</div>;
  if (!user) return <div className="text-white/50 text-sm">Zum Kommentieren bitte einloggen.</div>;

  return (
    <div className="space-y-2">
      {/* Input */}
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Kommentar schreiben…"
          className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none"
          maxLength={500}
        />
        <button
          onClick={submit}
          disabled={sending || text.trim().length === 0}
          className="rounded-lg px-3 py-2 text-sm bg-white/10 hover:bg-white/15 disabled:opacity-50"
        >
          {sending ? "…" : "Senden"}
        </button>
      </div>

      {err && <div className="text-red-400 text-sm">{err}</div>}

      {/* Liste */}
      {loading ? (
        <div className="text-white/50 text-sm">Lade Kommentare…</div>
      ) : comments.length === 0 ? (
        <div className="text-white/50 text-sm">Noch keine Kommentare.</div>
      ) : (
        <div className="space-y-2">
          {comments.map((c) => (
            <div key={c.id} className="rounded-lg bg-white/5 border border-white/10 p-2">
              <div className="text-xs text-white/60">
                {c.authorName || "User"} •{" "}
                {c.createdAt?.toDate ? c.createdAt.toDate().toLocaleString() : ""}
              </div>
              <div className="text-sm text-white">{c.text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
