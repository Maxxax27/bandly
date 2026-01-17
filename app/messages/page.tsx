"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  where,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../../lib/firebase";
import { useAuth } from "../../lib/auth-context";

type Conversation = {
  id: string;
  listingTitle: string;
  lastMessage: string;
  participants: string[];
  unreadFor?: Record<string, number>;
  updatedAt?: any;
};

type ProfileMini = {
  displayName: string;
  photoURL: string | null;
  location?: string;
};

type Invite = {
  id: string;
  bandId: string;
  bandName: string;
  inviterName: string;
  status: "pending" | "accepted" | "revoked";
  createdAt?: any;
  expiresAt?: any;
};

function lowerEmail(s: string) {
  return (s ?? "").trim().toLowerCase();
}

function isExpired(expiresAt: any) {
  try {
    const d: Date = expiresAt?.toDate ? expiresAt.toDate() : new Date(expiresAt);
    return d.getTime() < Date.now();
  } catch {
    return false;
  }
}

export default function MessagesPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [tab, setTab] = useState<"chats" | "invites">("chats");

  const [convs, setConvs] = useState<Conversation[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileMini>>({});

  // Invites
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const myEmail = user?.email ? lowerEmail(user.email) : null;

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  // Conversations realtime
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "conversations"),
      where("participants", "array-contains", user.uid),
      orderBy("updatedAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => {
        const x = d.data() as any;
        return {
          id: d.id,
          listingTitle: x.listingTitle ?? "Inserat",
          lastMessage: x.lastMessage ?? "",
          participants: Array.isArray(x.participants) ? x.participants : [],
          unreadFor: x.unreadFor ?? {},
          updatedAt: x.updatedAt,
        } as Conversation;
      });

      setConvs(data);
    });

    return () => unsub();
  }, [user]);

  // Profiles vom "anderen" laden (cached)
  useEffect(() => {
    if (!user) return;

    const otherUids = Array.from(
      new Set(
        convs
          .map((c) => c.participants.find((p) => p !== user.uid))
          .filter(Boolean) as string[]
      )
    );

    const missing = otherUids.filter((uid) => !profiles[uid]);
    if (missing.length === 0) return;

    (async () => {
      const additions: Record<string, ProfileMini> = {};

      for (const uid of missing) {
        try {
          const snap = await getDoc(doc(db, "profiles", uid));
          const p = (snap.data() as any) ?? {};
          additions[uid] = {
            displayName: p.displayName ?? "Unbekannt",
            photoURL: p.photoURL ?? null,
            location: p.location ?? "",
          };
        } catch {
          additions[uid] = { displayName: "Unbekannt", photoURL: null };
        }
      }

      setProfiles((prev) => ({ ...prev, ...additions }));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convs, user]);

  const totalUnread = useMemo(() => {
    if (!user) return 0;
    return convs.reduce((sum, c) => sum + (c.unreadFor?.[user.uid] ?? 0), 0);
  }, [convs, user]);

  // ---- Invites loader (on demand) ----
  async function loadInvites() {
    if (!myEmail) {
      setInvites([]);
      return;
    }
    setLoadingInvites(true);

    const qy = query(
      collection(db, "bandInvites"),
      where("inviteeEmailLower", "==", myEmail),
      orderBy("createdAt", "desc")
    );

    const snap = await getDocs(qy);

    setInvites(
      snap.docs.map((d) => {
        const x = d.data() as any;
        return {
          id: d.id,
          bandId: x.bandId ?? "",
          bandName: x.bandName ?? "Band",
          inviterName: x.inviterName ?? "—",
          status: x.status ?? "pending",
          createdAt: x.createdAt,
          expiresAt: x.expiresAt,
        } as Invite;
      })
    );

    setLoadingInvites(false);
  }

  // Auto-load invites when switching tab
  useEffect(() => {
    if (!user) return;
    if (tab === "invites") loadInvites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, myEmail, user?.uid]);

  const pendingInvitesCount = useMemo(() => {
    return invites.filter((i) => i.status === "pending" && !isExpired(i.expiresAt)).length;
  }, [invites]);

  async function acceptInvite(inv: Invite) {
    if (!user) return router.push("/login");
    if (inv.status !== "pending") return;
    if (isExpired(inv.expiresAt)) {
      alert("Diese Einladung ist abgelaufen.");
      return;
    }

    setAcceptingId(inv.id);
    try {
      const inviteRef = doc(db, "bandInvites", inv.id);
      const bandRef = doc(db, "bands", inv.bandId);

      await runTransaction(db, async (tx) => {
        const inviteSnap = await tx.get(inviteRef);
        if (!inviteSnap.exists()) throw new Error("Einladung nicht gefunden.");

        const invite = inviteSnap.data() as any;
        if ((invite.status ?? "pending") !== "pending") throw new Error("Einladung ist nicht mehr gültig.");
        if (isExpired(invite.expiresAt)) throw new Error("Einladung ist abgelaufen.");

        const bandSnap = await tx.get(bandRef);
        if (!bandSnap.exists()) throw new Error("Band nicht gefunden.");

        const band = bandSnap.data() as any;
        const memberUids: string[] = Array.isArray(band.memberUids) ? band.memberUids : [];
        const count = typeof band.memberCount === "number" ? band.memberCount : memberUids.length;

        if (count >= 6) throw new Error("Band ist bereits voll (max 6).");
        if (memberUids.includes(user.uid)) throw new Error("Du bist bereits Mitglied.");

        const newUids = [...memberUids, user.uid];

        tx.update(bandRef, {
          memberUids: newUids,
          memberCount: newUids.length,
          [`members.${user.uid}`]: {
            role: "member",
            displayName: user.displayName ?? user.email ?? "User",
            photoURL: user.photoURL ?? null,
            joinedAt: serverTimestamp(),
          },
          updatedAt: serverTimestamp(),
        });

        tx.update(inviteRef, {
          status: "accepted",
          acceptedAt: serverTimestamp(),
          acceptedByUid: user.uid,
        });
      });

      alert("Einladung angenommen ✅");
      await loadInvites();
    } catch (e: any) {
      console.error(e);
      alert(`Annehmen fehlgeschlagen: ${e?.message ?? e}`);
    } finally {
      setAcceptingId(null);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-black-900">Nachrichten</h1>
          <p className="text-sm text-zinc-600 mt-1">
            
            {totalUnread > 0 ? ` · Ungelesen: ${totalUnread}` : ""}.
          </p>
        </div>

        <Link
          href="/listings"
          className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 transition"
        >
          Inserate
        </Link>
      </div>

      {/* ✅ Tabs */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setTab("chats")}
          className={[
            "rounded-xl px-4 py-2 text-sm font-semibold border transition",
            tab === "chats"
              ? "bg-zinc-900 text-white border-zinc-900"
              : "bg-white text-zinc-800 border-zinc-200 hover:bg-zinc-50",
          ].join(" ")}
        >
          Chats
          {totalUnread > 0 && (
            <span className="ml-2 inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-xs">
              {totalUnread}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setTab("invites")}
          className={[
            "rounded-xl px-4 py-2 text-sm font-semibold border transition inline-flex items-center gap-2",
            tab === "invites"
              ? "bg-zinc-900 text-white border-zinc-900"
              : "bg-white text-zinc-800 border-zinc-200 hover:bg-zinc-50",
          ].join(" ")}
        >
          Band-Einladungen
          {pendingInvitesCount > 0 && (
            <span className="ml-1 inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-xs">
              {pendingInvitesCount}
            </span>
          )}
        </button>

        {tab === "invites" ? (
          <button
            type="button"
            onClick={loadInvites}
            disabled={loadingInvites}
            className="ml-auto rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 transition disabled:opacity-50"
          >
            {loadingInvites ? "Lade…" : "Aktualisieren"}
          </button>
        ) : null}
      </div>

      {/* ✅ TAB CONTENT */}
      {tab === "chats" ? (
        <>
          {/* Inbox (DARK CARDS) */}
          <div className="grid gap-4 md:grid-cols-2">
            {convs.map((c) => {
              const otherUid = c.participants.find((p) => p !== user.uid) ?? "";
              const p = otherUid ? profiles[otherUid] : undefined;

              const unread = c.unreadFor?.[user.uid] ?? 0;

              return (
                <Link
                  key={c.id}
                  href={`/messages/${c.id}`}
                  className="group rounded-2xl bg-zinc-900 text-white p-6 shadow-lg hover:bg-zinc-800 transition border border-zinc-800/60 flex items-start gap-4"
                >
                  {/* Avatar */}
                  <div className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                    {p?.photoURL ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.photoURL} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-lg">🎸</span>
                    )}
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold truncate text-zinc-100">{p?.displayName ?? "Lade…"}</div>

                        {p?.location ? (
                          <div className="text-xs text-zinc-400 mt-0.5 truncate">{p.location}</div>
                        ) : null}
                      </div>

                      {/* Unread Badge (dark-style) */}
                      {unread > 0 && (
                        <span className="shrink-0 inline-flex items-center justify-center rounded-full px-2.5 py-1 text-xs font-semibold bg-white/10 text-zinc-100 border border-white/15">
                          {unread}
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-zinc-400 mt-2 truncate">{c.listingTitle}</div>

                    <div className="text-sm text-zinc-200 mt-2 truncate">
                      {c.lastMessage ? c.lastMessage : "Noch keine Nachricht – starte den Chat."}
                    </div>

                    <div className="mt-4 text-sm font-semibold text-zinc-100 flex items-center gap-2">
                      Chat öffnen
                      <span className="opacity-70 group-hover:opacity-100 transition">→</span>
                    </div>
                  </div>
                </Link>
              );
            })}

            {convs.length === 0 && (
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
                Noch keine Chats. Öffne ein Inserat und klicke „Nachricht senden“.
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Invites (DARK CARDS) */}
          <div className="grid gap-4 md:grid-cols-2">
            {invites.map((inv) => {
              const expired = isExpired(inv.expiresAt);
              const disabled = inv.status !== "pending" || expired || acceptingId === inv.id;

              return (
                <div
                  key={inv.id}
                  className="rounded-2xl bg-zinc-900 text-white p-6 shadow-lg border border-zinc-800/60"
                >
                  <div className="text-lg font-semibold">{inv.bandName}</div>
                  <div className="text-sm text-zinc-300 mt-1">Von: {inv.inviterName}</div>

                  <div className="mt-3 text-xs text-zinc-400">
                    Status:{" "}
                    <span className="text-zinc-200 font-semibold">
                      {expired ? "abgelaufen" : inv.status}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => acceptInvite(inv)}
                      disabled={disabled}
                      className="rounded-xl bg-white text-zinc-900 px-4 py-2 text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
                    >
                      {acceptingId === inv.id ? "Bitte warten…" : "Annehmen"}
                    </button>

                    <Link
                      href={`/bands/${inv.bandId}`}
                      className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-100 hover:bg-white/10 transition"
                    >
                      Band ansehen
                    </Link>
                  </div>
                </div>
              );
            })}

            {invites.length === 0 && (
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
                Keine Band-Einladungen gefunden.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
