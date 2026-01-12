"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  getDoc,
  increment,
} from "firebase/firestore";
import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";

import { db, storage } from "../../../lib/firebase";
import { useAuth } from "../../../lib/auth-context";

type Attachment = {
  url: string;
  path: string;
  type: "image" | "audio" | "video" | "file";
  name: string;
  size: number;
};

type Message = {
  id: string;
  text: string;
  senderUid: string;
  attachments?: Attachment[];
};

export default function ChatPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const { user, loading } = useAuth();

  const [title, setTitle] = useState("Chat");

  // ✅ Gegenüber (Header)
  const [otherName, setOtherName] = useState("Kontakt");
  const [otherPhotoURL, setOtherPhotoURL] = useState<string | null>(null);
  const [otherAge, setOtherAge] = useState<number | null>(null); // ✅ öffentliches Alter (birthday bleibt privat)

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  // ✅ Beim Öffnen: unread für mich zurücksetzen
  useEffect(() => {
    if (!user || !id) return;

    updateDoc(doc(db, "conversations", id), {
      [`unreadFor.${user.uid}`]: 0,
    }).catch(() => {});
  }, [user, id]);

  useEffect(() => {
    if (!user || !id) return;

    const convRef = doc(db, "conversations", id);

    const unsubConv = onSnapshot(convRef, async (snap) => {
      const d = snap.data() as any;

      // Listing-Chat Titel
      setTitle(d?.listingTitle ?? "Chat");

      // ✅ Gegenüber bestimmen
      const participants: string[] = Array.isArray(d?.participants) ? d.participants : [];
      const otherUid = participants.find((x) => x !== user.uid) ?? null;

      // 1) participantSnapshot (falls vorhanden)
      const snapInfo = otherUid ? d?.participantSnapshot?.[otherUid] : null;

      if (snapInfo?.name) setOtherName(snapInfo.name);
      if (snapInfo?.photoURL !== undefined) setOtherPhotoURL(snapInfo.photoURL ?? null);

      // ✅ öffentliches Alter aus Snapshot (wenn du es dort speicherst)
      if (typeof snapInfo?.agePublic === "number") setOtherAge(snapInfo.agePublic);

      // 2) fallback -> profiles (nur public Felder wie displayName/photoURL/agePublic)
      if (
        otherUid &&
        (!snapInfo?.name ||
          snapInfo?.photoURL === undefined ||
          typeof snapInfo?.agePublic !== "number")
      ) {
        try {
          const ps = await getDoc(doc(db, "profiles", otherUid));
          const px = ps.data() as any;

          if (px?.displayName) setOtherName(px.displayName);
          if (px?.photoURL !== undefined) setOtherPhotoURL(px.photoURL ?? null);

          // ✅ öffentliches Alter (birthday NICHT laden!)
          if (typeof px?.agePublic === "number") setOtherAge(px.agePublic);
        } catch {}
      }
    });

    const msgsRef = collection(db, "conversations", id, "messages");
    const q = query(msgsRef, orderBy("createdAt", "asc"));

    const unsubMsgs = onSnapshot(q, (snap) => {
      const data: Message[] = snap.docs.map((d) => {
        const x = d.data() as any;
        return {
          id: d.id,
          text: x.text ?? "",
          senderUid: x.senderUid ?? "",
          attachments: Array.isArray(x.attachments) ? x.attachments : [],
        };
      });

      setMessages(data);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    });

    return () => {
      unsubConv();
      unsubMsgs();
    };
  }, [user, id]);

  const canSend = useMemo(() => text.trim().length > 0 && !sending, [text, sending]);

  async function uploadFiles(files: FileList): Promise<Attachment[]> {
    if (!id || !user) return [];

    const out: Attachment[] = [];
    const list = Array.from(files);

    for (const f of list) {
      const mime = f.type || "";
      const type: Attachment["type"] =
        mime.startsWith("image/") ? "image" : mime.startsWith("audio/") ? "audio" : mime.startsWith("video/") ? "video" : "file";

      const safeName = f.name.replace(/[^\w.\-() ]+/g, "_");
      const path = `uploads/${id}/${Date.now()}_${safeName}`;

      const r = storageRef(storage, path);
      await uploadBytes(r, f);
      const url = await getDownloadURL(r);

      out.push({
        url,
        path,
        type,
        name: f.name,
        size: f.size,
      });
    }

    return out;
  }

  async function sendMessage(attachments: Attachment[] = []) {
    if (!user || !id) return;

    const t = text.trim();
    if (!t && attachments.length === 0) return;

    setSending(true);
    setText("");

    try {
      // 1) Message speichern
      await addDoc(collection(db, "conversations", id, "messages"), {
        text: t,
        senderUid: user.uid,
        attachments,
        createdAt: serverTimestamp(),
      });

      // 2) Conversation laden (participants)
      const convRef = doc(db, "conversations", id);
      const convSnap = await getDoc(convRef);
      const conv = convSnap.data() as any;

      const participants: string[] = Array.isArray(conv?.participants) ? conv.participants : [];
      const otherUid = participants.find((uid) => uid !== user.uid) ?? null;

      // 3) Conversation updaten + unread
      const preview = attachments.length > 0 ? `📎 ${attachments.length} Datei(en)` : t;

      const updates: Record<string, any> = {
        lastMessage: preview,
        lastSenderUid: user.uid,
        updatedAt: serverTimestamp(),
        [`unreadFor.${user.uid}`]: 0,
      };

      if (otherUid) updates[`unreadFor.${otherUid}`] = increment(1);

      await updateDoc(convRef, updates);
    } catch (err: any) {
      console.error("❌ SEND FAILED", err);
      alert(`Senden fehlgeschlagen: ${err?.code ?? ""} ${err?.message ?? err}`);
    } finally {
      setSending(false);
    }
  }

  async function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return;

    try {
      setSending(true);
      const attachments = await uploadFiles(e.target.files);
      e.target.value = "";
      await sendMessage(attachments);
    } finally {
      setSending(false);
    }
  }

  if (loading)
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
        Lade…
      </div>
    );

  if (!user) return null;

  return (
    <div className="space-y-5">
      {/* Header mit Profilbild + Name + Alter */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-zinc-900 border border-zinc-700 overflow-hidden flex items-center justify-center">
            {otherPhotoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={otherPhotoURL} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-zinc-300">🎸</span>
            )}
          </div>

          <div>
            <div className="text-sm text-zinc-600">Chat mit</div>

            <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 mt-1 flex items-baseline gap-2 flex-wrap">
              <span>{otherName || title}</span>

              {typeof otherAge === "number" && otherAge > 0 && (
                <span className="text-sm font-semibold text-zinc-600">· {otherAge} Jahre</span>
              )}
            </h1>
          </div>
        </div>

        <Link
          href="/messages"
          className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 transition"
        >
          Alle Chats
        </Link>
      </div>

      {/* Chatbox (Dark Card) */}
      <div className="rounded-2xl bg-zinc-900 text-white border border-zinc-800/60 shadow-lg h-[70vh] overflow-hidden">
        {/* Scroll area */}
        <div className="h-full overflow-auto">
          <div className="p-4 md:p-6 space-y-3">
            {messages.map((m) => {
              const mine = m.senderUid === user.uid;

              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={[
                      "max-w-[85%] md:max-w-[70%]",
                      "rounded-2xl px-4 py-2 text-sm leading-relaxed",
                      "border",
                      mine ? "bg-white text-zinc-900 border-white/20" : "bg-white/10 text-zinc-100 border-white/10",
                    ].join(" ")}
                  >
                    {!!m.text && <div className="whitespace-pre-wrap">{m.text}</div>}

                    {/* Attachments anzeigen */}
                    {Array.isArray(m.attachments) && m.attachments.length > 0 && (
                      <div className="mt-3 space-y-3">
                        {m.attachments.map((a, idx) => (
                          <div key={idx}>
                            {a.type === "image" && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={a.url}
                                alt={a.name}
                                className="rounded-xl border border-white/10 max-h-72 object-cover"
                              />
                            )}

                            {a.type === "audio" && (
                              <audio controls className="w-full">
                                <source src={a.url} />
                              </audio>
                            )}

                            {a.type === "video" && (
                              <video controls className="w-full rounded-xl border border-white/10 max-h-72">
                                <source src={a.url} />
                              </video>
                            )}

                            {a.type === "file" && (
                              <a
                                href={a.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sm underline text-zinc-200"
                              >
                                📎 {a.name}
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {messages.length === 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-200">
                Noch keine Nachrichten. Schreib die erste Nachricht 👇
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Sticky Composer */}
          <div className="sticky bottom-0 border-t border-white/10 bg-zinc-900/95 backdrop-blur">
            <div className="p-3 md:p-4 flex flex-col md:flex-row gap-3">
              <textarea
                rows={2}
                className="flex-1 resize-none rounded-xl bg-white/10 text-white placeholder:text-zinc-400 border border-white/10 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white/10"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Nachricht schreiben… (Enter = senden, Shift+Enter = Zeile)"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                disabled={sending}
              />

              {/* Hidden file input */}
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                multiple
                accept="image/*,audio/*,video/*"
                onChange={onPickFiles}
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={sending}
                  className="rounded-xl bg-white/10 border border-white/10 px-4 py-3 text-sm font-semibold hover:bg-white/15 transition disabled:opacity-50"
                  title="Anhang"
                >
                  📎
                </button>

                <button
                  type="button"
                  onClick={() => sendMessage()}
                  disabled={!canSend}
                  className="rounded-xl bg-white text-zinc-900 px-5 py-3 text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
                >
                  {sending ? "…" : "Senden"}
                </button>
              </div>
            </div>

            <div className="px-4 pb-3 text-xs text-zinc-400">
              Enter sendet · Shift+Enter macht einen Zeilenumbruch · 📎 für Anhänge
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
