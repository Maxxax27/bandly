"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

export default function RequestProducerModal({
  open,
  onClose,
  toProducerUid,
  toProducerName,
  fromType, // "band" | "musician"
  fromUid,  // bandId oder userUid (je nachdem)
  fromName,
  fromPhotoURL,
}: {
  open: boolean;
  onClose: () => void;
  toProducerUid: string;
  toProducerName?: string;

  fromType: "band" | "musician";
  fromUid: string;
  fromName: string;
  fromPhotoURL?: string;
}) {
  const [me, setMe] = useState<string | null>(auth.currentUser?.uid ?? null);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setMe(u?.uid ?? null));
    return () => unsub();
  }, []);

  if (!open) return null;

  async function submit() {
    if (!me) {
      setErr("Bitte einloggen.");
      return;
    }

    const msg = text.trim();
    if (msg.length < 5) {
      setErr("Bitte eine kurze Nachricht schreiben (min. 5 Zeichen).");
      return;
    }

    setSaving(true);
    setErr(null);

    try {
      await addDoc(collection(db, "producerRequests"), {
        toProducerUid,
        fromType,
        fromUid: me, // ✅ sender ist immer aktueller user (Rules verlangen fromUid == auth.uid)
        fromName,
        fromPhotoURL: fromPhotoURL ?? null,

        message: msg,
        status: "open",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setText("");
      onClose();
    } catch (e: any) {
      setErr(e?.code === "permission-denied" ? "Keine Berechtigung (Rules)." : "Senden fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 md:items-center">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-black/90 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-base font-semibold text-white">Producer anfragen</div>
            <div className="mt-1 text-sm text-white/60">
              Anfrage an: <span className="text-white/80">{toProducerName || toProducerUid}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border border-white/10 px-3 py-1.5 text-xs text-white/70 hover:bg-white/5"
          >
            Schließen
          </button>
        </div>

        <div className="mt-4">
          <label className="text-sm font-semibold text-white">Nachricht</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            className="mt-1 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white outline-none"
            placeholder="Hi! Wir suchen Mixing/Mastering für..."
          />
        </div>

        {err && <div className="mt-3 text-sm text-red-400">{err}</div>}

        <button
          onClick={submit}
          disabled={saving}
          className="mt-4 w-full rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-black hover:opacity-95 disabled:opacity-60"
        >
          {saving ? "Sende…" : "Anfrage senden"}
        </button>
      </div>
    </div>
  );
}
