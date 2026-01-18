"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { useRouter, useSearchParams } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";

import { auth, db } from "@/lib/firebase";
import { useVenueMemberships } from "@/lib/useVenueMemberships";
import VenuePicker from "@/components/VenuePicker";

type Profile = { activeRole?: "musician" | "producer" | "venue" | string; activeVenueId?: string | null };

type VenueRequest = {
  id: string;
  venueId: string;
  fromUid: string;
  fromBandId?: string;
  message: string;
  status: "open" | "accepted" | "declined";
  createdAt?: any;
  updatedAt?: any;
};

type VenueBooking = {
  id: string;
  venueId: string;
  requestId?: string;
  artistUid?: string;
  bandId?: string;
  title?: string;
  status: "active" | "done" | "cancelled";
  createdAt?: any;
  updatedAt?: any;
};

export default function VenueDashboardClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const tab = (sp.get("tab") ?? "requests") as "requests" | "bookings" | "messages";
  const status = (sp.get("status") ?? "open") as "open" | "all" | "active" | "done";
  const selected = sp.get("selected");

  // ✅ IMPORTANT: loading aus Hook nutzen (Race Fix)
  const { uid, venues, loading: membershipsLoading } = useVenueMemberships();

  const [profile, setProfile] = useState<Profile | null>(null);

  const [requests, setRequests] = useState<VenueRequest[]>([]);
  const [bookings, setBookings] = useState<VenueBooking[]>([]);
  const [loading, setLoading] = useState(true);

  // auth guard
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      if (!u) {
        setProfile(null);
        router.push("/");
      }
    });
  }, [router]);

  // profile live
  useEffect(() => {
    if (!uid) {
      setProfile(null);
      return;
    }
    const unsub = onSnapshot(doc(db, "profiles", uid), (snap) => {
      setProfile((snap.data() as any) ?? null);
    });
    return () => unsub();
  }, [uid]);

  const safeVenues = useMemo(() => (Array.isArray(venues) ? venues : []), [venues]);

  // ✅ 1) Memberships guard (FIXED)
  useEffect(() => {
    if (!uid) return;
    if (membershipsLoading) return;

    // 1) keine Venue Membership -> apply
    if (safeVenues.length === 0) {
      router.replace("/venues/apply");
      return;
    }

    // 2) hat Venues, aber activeVenueId fehlt/ungültig -> automatisch setzen
    const current = profile?.activeVenueId ?? null;
    const isValid = current && safeVenues.some((v: any) => v.venueId === current);

    if (!isValid) {
      const firstVenueId = safeVenues[0]?.venueId ?? null;
      if (!firstVenueId) {
        router.replace("/venues/apply");
        return;
      }

      // ✅ set active venue + switch to venue mode (ohne read)
      updateDoc(doc(db, "profiles", uid), {
        activeRole: "venue",
        activeVenueId: firstVenueId,
        updatedAt: serverTimestamp(),
      }).catch(() => {});
    }
  }, [uid, membershipsLoading, safeVenues, profile?.activeVenueId, router]);

  // ✅ activeVenueId erst verwenden, wenn memberships geladen sind und valide
  const activeVenueId = useMemo(() => {
    if (membershipsLoading) return null;
    const vid = profile?.activeVenueId ?? null;
    if (vid && safeVenues.some((v: any) => v.venueId === vid)) return vid;
    return safeVenues[0]?.venueId ?? null;
  }, [membershipsLoading, profile?.activeVenueId, safeVenues]);

  // load requests/bookings for activeVenueId
  useEffect(() => {
    // ✅ Warten bis memberships da sind, sonst flackert activeVenueId
    if (membershipsLoading) {
      setLoading(true);
      return;
    }

    if (!activeVenueId) {
      setRequests([]);
      setBookings([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Requests
    const reqQ =
      tab !== "requests"
        ? null
        : status === "all"
        ? query(
            collection(db, "venueRequests"),
            where("venueId", "==", activeVenueId),
            orderBy("createdAt", "desc")
          )
        : query(
            collection(db, "venueRequests"),
            where("venueId", "==", activeVenueId),
            where("status", "==", "open"),
            orderBy("createdAt", "desc")
          );

    const unsubReq =
      reqQ === null
        ? () => {}
        : onSnapshot(reqQ, (snap) => {
            const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as VenueRequest[];
            setRequests(list);
            setLoading(false);
          });

    // Bookings
    const bookStatus = status === "active" ? "active" : status === "done" ? "done" : null;

    const bookQ =
      tab !== "bookings"
        ? null
        : status === "all" || !bookStatus
        ? query(
            collection(db, "venueBookings"),
            where("venueId", "==", activeVenueId),
            orderBy("createdAt", "desc")
          )
        : query(
            collection(db, "venueBookings"),
            where("venueId", "==", activeVenueId),
            where("status", "==", bookStatus),
            orderBy("createdAt", "desc")
          );

    const unsubBook =
      bookQ === null
        ? () => {}
        : onSnapshot(bookQ, (snap) => {
            const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as VenueBooking[];
            setBookings(list);
          });

    return () => {
      unsubReq();
      unsubBook();
    };
  }, [activeVenueId, status, tab, membershipsLoading]);

  const leftList = useMemo(() => {
    if (tab === "requests") return requests;
    if (tab === "bookings") return bookings;
    return [];
  }, [tab, requests, bookings]);

  function setQS(next: { tab?: string; status?: string; selected?: string | null }) {
    const p = new URLSearchParams(sp.toString());
    if (next.tab) p.set("tab", next.tab);
    if (next.status) p.set("status", next.status);
    if (next.selected === null) p.delete("selected");
    if (typeof next.selected === "string") p.set("selected", next.selected);
    router.push(`/venues/dashboard?${p.toString()}`);
  }

  async function acceptRequest(req: VenueRequest) {
    if (!activeVenueId) return;

    const batch = writeBatch(db);

    batch.update(doc(db, "venueRequests", req.id), {
      status: "accepted",
      updatedAt: serverTimestamp(),
    });

    // Booking erstellen
    const bookingRef = doc(collection(db, "venueBookings"));
    batch.set(bookingRef, {
      venueId: activeVenueId,
      requestId: req.id,
      artistUid: req.fromUid,
      bandId: req.fromBandId ?? null,
      title: "New Booking",
      status: "active",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await batch.commit();
    setQS({ tab: "bookings", status: "active", selected: bookingRef.id });
  }

  async function declineRequest(req: VenueRequest) {
    await updateDoc(doc(db, "venueRequests", req.id), {
      status: "declined",
      updatedAt: serverTimestamp(),
    });
  }

  if (!uid) {
    return (
      <div className="mx-auto max-w-3xl p-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
          Bitte einloggen.
        </div>
      </div>
    );
  }

  // ✅ Optional: schöner Lade-Zustand solange Memberships laden
  if (membershipsLoading) {
    return (
      <div className="mx-auto max-w-3xl p-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
          Lade Venue Memberships…
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Venue Dashboard</h1>
          <p className="text-sm text-zinc-400">Requests & Bookings verwalten</p>
        </div>

        <div className="flex items-center gap-3">
          <VenuePicker uid={uid} activeVenueId={activeVenueId} venues={safeVenues} />
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex gap-2">
        <button
          onClick={() => setQS({ tab: "requests", selected: null })}
          className={`rounded-xl px-3 py-1 text-sm border ${
            tab === "requests" ? "border-white/30 bg-white/10" : "border-white/10 bg-white/5"
          }`}
        >
          Requests
        </button>
        <button
          onClick={() => setQS({ tab: "bookings", status: "active", selected: null })}
          className={`rounded-xl px-3 py-1 text-sm border ${
            tab === "bookings" ? "border-white/30 bg-white/10" : "border-white/10 bg-white/5"
          }`}
        >
          Bookings
        </button>
      </div>

      {/* Status */}
      <div className="mt-3 flex gap-2">
        {tab === "requests" && (
          <>
            <button
              onClick={() => setQS({ status: "open", selected: null })}
              className={`rounded-xl px-3 py-1 text-xs border ${
                status === "open" ? "border-white/30 bg-white/10" : "border-white/10 bg-white/5"
              }`}
            >
              Open
            </button>
            <button
              onClick={() => setQS({ status: "all", selected: null })}
              className={`rounded-xl px-3 py-1 text-xs border ${
                status === "all" ? "border-white/30 bg-white/10" : "border-white/10 bg-white/5"
              }`}
            >
              All
            </button>
          </>
        )}
        {tab === "bookings" && (
          <>
            <button
              onClick={() => setQS({ status: "active", selected: null })}
              className={`rounded-xl px-3 py-1 text-xs border ${
                status === "active" ? "border-white/30 bg-white/10" : "border-white/10 bg-white/5"
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setQS({ status: "done", selected: null })}
              className={`rounded-xl px-3 py-1 text-xs border ${
                status === "done" ? "border-white/30 bg-white/10" : "border-white/10 bg-white/5"
              }`}
            >
              Done
            </button>
            <button
              onClick={() => setQS({ status: "all", selected: null })}
              className={`rounded-xl px-3 py-1 text-xs border ${
                status === "all" ? "border-white/30 bg-white/10" : "border-white/10 bg-white/5"
              }`}
            >
              All
            </button>
          </>
        )}
      </div>

      {/* Split */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1 rounded-2xl border border-white/10 bg-white/5 p-3">
          {loading && <div className="text-sm text-zinc-300">Lade…</div>}

          {!loading && tab === "requests" && requests.length === 0 && (
            <div className="text-sm text-zinc-400">Keine Requests.</div>
          )}

          {!loading && tab === "bookings" && bookings.length === 0 && (
            <div className="text-sm text-zinc-400">Keine Bookings.</div>
          )}

          <div className="mt-2 space-y-2">
            {tab === "requests" &&
              requests.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setQS({ selected: r.id })}
                  className={`w-full text-left rounded-xl border px-3 py-2 ${
                    selected === r.id ? "border-white/30 bg-white/10" : "border-white/10 bg-black/20"
                  }`}
                >
                  <div className="text-sm font-semibold">Request</div>
                  <div className="text-xs text-zinc-400 line-clamp-2">{r.message}</div>
                  <div className="mt-1 text-[11px] text-zinc-500">Status: {r.status}</div>
                </button>
              ))}

            {tab === "bookings" &&
              bookings.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setQS({ selected: b.id })}
                  className={`w-full text-left rounded-xl border px-3 py-2 ${
                    selected === b.id ? "border-white/30 bg-white/10" : "border-white/10 bg-black/20"
                  }`}
                >
                  <div className="text-sm font-semibold">{b.title ?? "Booking"}</div>
                  <div className="mt-1 text-[11px] text-zinc-500">Status: {b.status}</div>
                </button>
              ))}
          </div>
        </div>

        <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-4">
          {!selected && <div className="text-sm text-zinc-400">Wähle links einen Eintrag.</div>}

          {selected && tab === "requests" &&
            (() => {
              const r = requests.find((x) => x.id === selected);
              if (!r) return <div className="text-sm text-zinc-400">Nicht gefunden.</div>;
              return (
                <div>
                  <div className="text-lg font-semibold">Request Details</div>
                  <div className="mt-2 text-sm text-zinc-200 whitespace-pre-wrap">{r.message}</div>

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => acceptRequest(r)}
                      disabled={r.status !== "open"}
                      className="rounded-xl bg-emerald-500/90 px-3 py-2 text-sm font-semibold text-black disabled:opacity-40"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => declineRequest(r)}
                      disabled={r.status !== "open"}
                      className="rounded-xl bg-red-500/80 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              );
            })()}

          {selected && tab === "bookings" &&
            (() => {
              const b = bookings.find((x) => x.id === selected);
              if (!b) return <div className="text-sm text-zinc-400">Nicht gefunden.</div>;
              return (
                <div>
                  <div className="text-lg font-semibold">Booking Details</div>
                  <div className="mt-2 text-sm text-zinc-400">ID: {b.id}</div>
                  <div className="mt-2 text-sm text-zinc-200">Status: {b.status}</div>
                </div>
              );
            })()}
        </div>
      </div>
    </div>
  );
}
