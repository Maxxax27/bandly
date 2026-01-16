"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  setDoc,
  where,
} from "firebase/firestore";

type AppRow = any;

export default function ProducerRequestsAdminPage() {
  const router = useRouter();

  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AppRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    async function boot() {
      try {
        const u = auth.currentUser;
        if (!u) {
          router.replace("/login");
          return;
        }

        const token = await u.getIdTokenResult(true);
        const admin = !!token.claims.admin;
        setIsAdmin(admin);

        if (!admin) {
          setErr("Kein Zugriff (Admin erforderlich).");
          setLoading(false);
          return;
        }

        const q = query(
          collection(db, "producerApplications"),
          where("status", "==", "pending"),
          orderBy("createdAt", "desc")
        );
        const snap = await getDocs(q);
        setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e: any) {
        setErr("Konnte Anfragen nicht laden.");
      } finally {
        setLoading(false);
      }
    }

    boot();
  }, [router]);

  async function approve(app: AppRow) {
    const uid = app.uid as string;
    if (!uid) return;

    // 1) offizielles Producer Profil erstellen/ersetzen
    await setDoc(
      doc(db, "producers", uid),
      {
        uid,
        displayName: app.displayName ?? "",
        photoURL: app.photoURL ?? null,
        studioName: app.studioName ?? "",
        location: app.location ?? "",
        genres: Array.isArray(app.genres) ? app.genres : [],
        links: Array.isArray(app.links) ? app.links : [],
        bio: app.motivation ?? "",
        verified: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // 2) Bewerbung status
    await updateDoc(doc(db, "producerApplications", uid), {
      status: "approved",
      reviewedAt: serverTimestamp(),
      reviewedBy: auth.currentUser?.uid ?? null,
    });

    // 3) UI aktualisieren
    setRows((xs) => xs.filter((x) => x.id !== uid));
  }

  async function reject(app: AppRow) {
    const uid = app.uid as string;
    if (!uid) return;

    await updateDoc(doc(db, "producerApplications", uid), {
      status: "rejected",
      reviewedAt: serverTimestamp(),
      reviewedBy: auth.currentUser?.uid ?? null,
    });

    setRows((xs) => xs.filter((x) => x.id !== uid));
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/70">
        Lade…
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-red-300">
        {err ?? "Kein Zugriff."}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-2xl font-bold text-white">Producer Anfragen</div>
          <div className="text-sm text-white/60">Pending Bewerbungen</div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-black/30 p-5 text-sm text-white/70">
          Keine offenen Anfragen ✅
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((a) => (
            <div key={a.id} className="rounded-3xl border border-white/10 bg-black/30 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-lg font-bold text-white truncate">
                    {a.studioName || a.displayName || a.uid}
                  </div>
                  <div className="mt-1 text-sm text-white/60">
                    {a.email ?? "—"} • {a.location ?? "—"}
                  </div>
                  <div className="mt-2 text-sm text-white/80 whitespace-pre-wrap">
                    {a.motivation ?? "—"}
                  </div>

                  {Array.isArray(a.genres) && a.genres.length > 0 && (
                    <div className="mt-2 text-xs text-white/60">
                      Genres: {a.genres.join(", ")}
                    </div>
                  )}

                  {Array.isArray(a.links) && a.links.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {a.links.map((l: string, i: number) => (
                        <a
                          key={i}
                          href={l}
                          target="_blank"
                          rel="noreferrer"
                          className="block text-xs text-white/70 hover:text-white underline underline-offset-2"
                        >
                          {l}
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 flex-col gap-2">
                  <button
                    onClick={() => approve(a)}
                    className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-black hover:opacity-95"
                  >
                    ✅ Approve
                  </button>
                  <button
                    onClick={() => reject(a)}
                    className="rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10"
                  >
                    ❌ Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
