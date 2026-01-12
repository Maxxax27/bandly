"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";

type Invite = {
  id: string;
  bandId: string;
  bandName: string;
  inviterName: string;
  inviteeEmail: string; // lower
  status: "pending" | "accepted" | "revoked";
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

export default function BandInvitesPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [all, setAll] = useState<Invite[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const myEmail = user?.email ? lowerEmail(user.email) : null;

  useEffect(() => {
    async function load() {
      if (!myEmail) {
        setAll([]);
        setLoadingInvites(false);
        return;
      }

      setLoadingInvites(true);

      const qy = query(
        collection(db, "bandInvites"),
        where("inviteeEmailLower", "==", myEmail),
        orderBy("createdAt", "desc")
      );

      const snap = await getDocs(qy);

      const data: Invite[] = snap.docs.map((d) => {
        const x = d.data() as any;
        return {
          id: d.id,
          bandId: x.bandId ?? "",
          bandName: x.bandName ?? "Band",
          inviterName: x.inviterName ?? "—",
          inviteeEmail: lowerEmail(x.inviteeEmailLower ?? ""),
          status: x.status ?? "pending",
          expiresAt: x.expiresAt,
        };
      });

      setAll(data);
      setLoadingInvites(false);
    }

    load();
  }, [myEmail]);

  const mine = useMemo(() => all, [all]);

  async function accept(inv: Invite) {
    if (!user) return router.push("/login");

    if (inv.status !== "pending") return;
    if (isExpired(inv.expiresAt)) {
      alert("Diese Einladung ist abgelaufen.");
      return;
    }

    setAcceptingId(inv.id);
    try {
      await runTransaction(db, async (tx) => {
        const inviteRef = doc(db, "bandInvites", inv.id);
        const bandRef = doc(db, "bands", inv.bandId);
        const profileRef = doc(db, "profiles", user.uid);

        const inviteSnap = await tx.get(inviteRef);
        if (!inviteSnap.exists()) throw new Error("Einladung nicht gefunden.");

        const invite = inviteSnap.data() as any;
        if ((invite.status ?? "pending") !== "pending") {
          throw new Error("Einladung ist nicht mehr gültig.");
        }

        if (isExpired(invite.expiresAt)) throw new Error("Einladung ist abgelaufen.");

        const bandSnap = await tx.get(bandRef);
        if (!bandSnap.exists()) throw new Error("Band nicht gefunden.");

        const band = bandSnap.data() as any;

        const memberUids: string[] = Array.isArray(band.memberUids) ? band.memberUids : [];
        const count = typeof band.memberCount === "number" ? band.memberCount : memberUids.length;

        if (count >= 6) throw new Error("Band ist bereits voll (max 6).");
        if (memberUids.includes(user.uid)) throw new Error("Du bist bereits Mitglied.");

        const newUids = [...memberUids, user.uid];

        // ✅ 0) PROFIL: Band-Verknüpfung setzen (für Badge + Logo im Profil)
        // Bandbild-Feld ist bei dir "photoURL" im band-doc -> wird als "logoURL" im Profil gespeichert
        tx.set(
          profileRef,
          {
            band: {
              bandId: inv.bandId,
              name: band?.name ?? inv.bandName ?? "Band",
              logoURL: band?.photoURL ?? null, // ✅ WICHTIG: photoURL -> logoURL
              joinedAt: serverTimestamp(),
            },
            status: "Band",
            bandName: band?.name ?? inv.bandName ?? "",
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        // ✅ 1) BAND: Member hinzufügen (MIT acceptInviteId!)
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
          acceptInviteId: inv.id,
        });

        // ✅ 2) INVITE: accepted setzen
        tx.update(inviteRef, {
          status: "accepted",
          acceptedAt: serverTimestamp(),
          acceptedByUid: user.uid,
        });
      });

      alert("Einladung angenommen ✅");

      // Reload
      if (myEmail) {
        const qy = query(
          collection(db, "bandInvites"),
          where("inviteeEmailLower", "==", myEmail),
          orderBy("createdAt", "desc")
        );

        const snap = await getDocs(qy);
        setAll(
          snap.docs.map((d) => {
            const x = d.data() as any;
            return {
              id: d.id,
              bandId: x.bandId ?? "",
              bandName: x.bandName ?? "Band",
              inviterName: x.inviterName ?? "—",
              inviteeEmail: lowerEmail(x.inviteeEmailLower ?? ""),
              status: x.status ?? "pending",
              expiresAt: x.expiresAt,
            };
          })
        );
      }
    } catch (e: any) {
      console.error(e);
      alert(`Annehmen fehlgeschlagen: ${e?.message ?? e}`);
    } finally {
      setAcceptingId(null);
    }
  }

  if (loading || loadingInvites) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
        Lade…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-4">
        <Link href="/bands" className="text-sm hover:underline">
          ← Zurück
        </Link>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
          Bitte einloggen, um Einladungen zu sehen.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <Link href="/bands" className="text-sm hover:underline">
          ← Zurück
        </Link>
      </div>

      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-zinc-900">Band-Einladungen</h1>
        <p className="text-sm text-zinc-600 mt-1">Eingeloggt als: {user.email}</p>
      </div>

      {mine.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
          Keine Einladungen gefunden.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {mine.map((inv) => {
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
                    onClick={() => accept(inv)}
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
        </div>
      )}
    </div>
  );
}
