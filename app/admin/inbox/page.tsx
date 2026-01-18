"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  getDocs,
  limit,
  query,
  where,
  orderBy,
} from "firebase/firestore";

function norm(v: any) {
  return String(v ?? "").trim();
}

type AdminMsg = {
  id: string;

  type: "producer_application" | "venue_application" | string;
  status: "open" | "handled" | string;

  applicationId?: string;

  fromUid?: string;
  fromName?: string;
  fromPhotoURL?: string;
  fromEmail?: string;

  // Producer
  studioName?: string;
  location?: any;

  // Venue
  venueName?: string;
  proposedLocation?: any;

  createdAt?: any;
  updatedAt?: any;
};

export default function AdminInboxPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [rows, setRows] = useState<AdminMsg[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.replace("/login");
        return;
      }

      // ✅ kein force refresh
      const tok = await u.getIdTokenResult();
      const admin = tok?.claims?.admin === true;

      setIsAdmin(admin);
      setReady(true);

      if (!admin) router.replace("/");
    });

    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (!ready || !isAdmin) return;

    async function load() {
      setLoading(true);
      setErr(null);

      try {
        // ✅ Admin Inbox basiert auf adminMessages
        // - status open
        // - type: producer_application / venue_application
        const q = query(
          collection(db, "adminMessages"),
          where("status", "==", "open"),
          orderBy("createdAt", "desc"),
          limit(50)
        );

        const snap = await getDocs(q);
        const data: AdminMsg[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }));

        // Optional: falls du NUR diese 2 Types willst:
        const filtered = data.filter(
          (x) => x.type === "producer_application" || x.type === "venue_application"
        );

        setRows(filtered);
      } catch (e: any) {
        const msg =
          e?.code === "permission-denied"
            ? "Keine Berechtigung (Admin Claim / Rules)."
            : e?.code === "failed-precondition"
            ? "Firestore Index fehlt (orderBy/where)."
            : "Konnte Inbox nicht laden.";

        console.error("AdminInbox load error:", e);
        setErr(msg);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [ready, isAdmin]);

  if (!ready) {
    return <div className="p-6 text-sm text-white/70">Lade Admin Inbox…</div>;
  }
  if (!isAdmin) return null;

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white">📩 Admin Inbox</h1>
        <p className="text-sm text-white/60">
          Offene Producer- & Venue-Bewerbungen.
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-white/60">Lade Anfragen…</div>
      ) : err ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
          {err}
          <div className="mt-2 text-xs text-red-200/70">
            (Details im Browser-Console Log)
          </div>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/70">
          Keine offenen Anfragen.
        </div>
      ) : (
        <div className="grid gap-3">
          {rows.map((m) => {
            const type = m.type;
            const appId = m.applicationId ?? m.id;

            const title =
              type === "venue_application"
                ? norm(m.venueName) || norm(m.fromName) || appId
                : norm(m.studioName) || norm(m.fromName) || appId;

            const subtitle =
              type === "venue_application"
                ? norm(m?.proposedLocation?.city) || norm(m?.proposedLocation?.country) || "—"
                : norm(m.location) || "—";

            const href =
              type === "venue_application"
                ? `/admin/venues?applicationId=${encodeURIComponent(appId)}`
                : `/admin/producer-requests?uid=${encodeURIComponent(appId)}`;

            return (
              <div
                key={m.id}
                className="rounded-2xl border border-white/10 bg-black/30 p-4"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={m.fromPhotoURL || "/default-avatar.png"}
                    className="h-10 w-10 rounded-full object-cover border border-white/10"
                    alt={title}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold text-white truncate">{title}</div>
                      <span className="text-[11px] rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-white/70">
                        {type === "venue_application" ? "Venue" : "Producer"}
                      </span>
                    </div>
                    <div className="text-sm text-white/60 truncate">{subtitle}</div>
                  </div>

                  <Link
                    href={href}
                    className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
                  >
                    Öffnen
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
