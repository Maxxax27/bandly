"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { onIdTokenChanged } from "firebase/auth";

// ✅ Passe Import an
import { auth, db } from "@/lib/firebase";

type VenueApplication = {
  id: string;
  applicantUid: string;
  venueName: string;
  proposedLocation: { country: string; city: string; address?: string };
  links?: any;
  status: "pending" | "approved" | "rejected";
};

function randomId(len = 20) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export default function AdminVenuesClient() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [items, setItems] = useState<VenueApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    return onIdTokenChanged(auth, async (u) => {
      setIsAdmin(false);
      if (!u) return;
      const res = await u.getIdTokenResult();
      setIsAdmin(res?.claims?.admin === true);
    });
  }, []);

  async function load() {
    setErr(null);
    setLoading(true);
    try {
      const q = query(
        collection(db, "venueApplications"),
        where("status", "==", "pending"),
        orderBy("createdAt", "desc"),
        limit(50)
      );
      const snap = await getDocs(q);
      const data: VenueApplication[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));
      setItems(data);
    } catch (e: any) {
      setErr(e?.message ?? "Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  const canUse = useMemo(() => isAdmin && !loading, [isAdmin, loading]);

  // --------------------------------------------------
  // ✅ APPROVE (FIXED – mit Membership Mirror)
  // --------------------------------------------------
  async function approve(app: VenueApplication) {
    setErr(null);
    setBusyId(app.id);

    try {
      const venueId = randomId(20);
      const batch = writeBatch(db);

      // 1) application approved
      batch.update(doc(db, "venueApplications", app.id), {
        status: "approved",
        reviewedAt: serverTimestamp(),
        reviewedBy: auth.currentUser?.uid ?? null,
        updatedAt: serverTimestamp(),
      });

      // 2) venue create
      batch.set(doc(db, "venues", venueId), {
        ownerUid: app.applicantUid,
        verified: true,
        published: true,
        name: app.venueName,
        bio: "",
        location: app.proposedLocation,
        links: app.links ?? {},
        avatarURL: "",
        photos: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // 3) members owner
      batch.set(
        doc(db, "venues", venueId, "members", app.applicantUid),
        {
          role: "owner",
          permissions: {
            manageProfile: true,
            manageRequests: true,
            manageBookings: true,
            manageFiles: true,
          },
          joinedAt: serverTimestamp(),
        }
      );

      // 4) ✅ MEMBERSHIP MIRROR (VenuePicker)
      batch.set(
        doc(db, "venueMemberships", app.applicantUid, "venues", venueId),
        {
          venueId: venueId,
          role: "owner",
          name: app.venueName,
          verified: true,
          published: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
      );

      // 5) commit
      await batch.commit();
      await load();
    } catch (e: any) {
      setErr(e?.message ?? "Approve fehlgeschlagen");
    } finally {
      setBusyId(null);
    }
  }

  async function reject(app: VenueApplication) {
    setErr(null);
    setBusyId(app.id);
    try {
      await updateDoc(doc(db, "venueApplications", app.id), {
        status: "rejected",
        reviewedAt: serverTimestamp(),
        reviewedBy: auth.currentUser?.uid ?? null,
        updatedAt: serverTimestamp(),
      });
      await load();
    } catch (e: any) {
      setErr(e?.message ?? "Reject fehlgeschlagen");
    } finally {
      setBusyId(null);
    }
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-xl p-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm text-zinc-200">Kein Admin Zugriff.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-4">
      <h1 className="text-2xl font-semibold">Admin – Venue Bewerbungen</h1>

      {err && (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {err}
        </div>
      )}

      <div className="mt-6 space-y-3">
        {loading && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
            Lade...
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
            Keine offenen Bewerbungen.
          </div>
        )}

        {items.map((app) => (
          <div
            key={app.id}
            className="rounded-2xl border border-white/10 bg-white/5 p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-semibold">{app.venueName}</div>
                <div className="mt-1 text-sm text-zinc-400">
                  {app.proposedLocation.city}, {app.proposedLocation.country}
                  {app.proposedLocation.address
                    ? ` • ${app.proposedLocation.address}`
                    : ""}
                </div>
                <div className="mt-2 text-xs text-zinc-500">
                  Applicant: {app.applicantUid}
                </div>
                <div className="mt-1 text-xs text-zinc-500">
                  App ID: {app.id}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  disabled={!canUse || busyId === app.id}
                  onClick={() => approve(app)}
                  className="rounded-xl bg-emerald-500/90 px-3 py-2 text-sm font-semibold text-black disabled:opacity-40"
                >
                  {busyId === app.id ? "..." : "Approve"}
                </button>
                <button
                  disabled={!canUse || busyId === app.id}
                  onClick={() => reject(app)}
                  className="rounded-xl bg-red-500/80 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
