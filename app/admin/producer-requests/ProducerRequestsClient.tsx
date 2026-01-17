"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

function norm(v: any) {
  return String(v ?? "").trim();
}

export default function ProducerRequestsAdminPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const selectedUid = sp.get("uid"); // kommt von /admin/inbox?uid=...

  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [active, setActive] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // ✅ Admin Guard via Claim
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.replace("/login");
        return;
      }
      const tok = await u.getIdTokenResult(true);
      const admin = tok?.claims?.admin === true;
      setIsAdmin(admin);
      setReady(true);
      if (!admin) router.replace("/");
    });
    return () => unsub();
  }, [router]);

  // ✅ Liste: nur pending (für Übersicht links)
  // ✅ ABER: wenn ?uid=... gesetzt ist, laden wir diese Bewerbung immer als "active"
  useEffect(() => {
    if (!ready || !isAdmin) return;

    async function load() {
      setLoading(true);
      setErr(null);

      try {
        // 1) pending Liste
        let snap;
try {
  // ✅ schnell & sortiert (braucht evtl. Index)
  const q1 = query(
    collection(db, "producerApplications"),
    where("status", "==", "pending"),
    orderBy("createdAt", "desc"),
    limit(50)
  );
  snap = await getDocs(q1);
} catch (e: any) {
  // ✅ Fallback ohne orderBy (kein Index nötig)
  const q2 = query(
    collection(db, "producerApplications"),
    where("status", "==", "pending"),
    limit(50)
  );
  snap = await getDocs(q2);

  // optional: Debug Hinweis
  setErr("Hinweis: Index fehlt (Fallback ohne Sortierung aktiv).");
}

        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setRows(list);

        // 2) aktive Bewerbung über URL (egal welcher Status!)
        if (selectedUid) {
          const s = await getDoc(doc(db, "producerApplications", selectedUid));
          if (s.exists()) {
            setActive({ id: s.id, ...s.data() });
          } else {
            setActive(null);
            setErr("Bewerbung nicht gefunden (producerApplications/{uid} existiert nicht).");
          }
        } else {
          setActive(list[0] ?? null);
        }
      } catch (e: any) {
        setErr("Konnte Anfragen nicht laden.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [ready, isAdmin, selectedUid]);

  const activeUid = active?.uid ?? active?.id ?? null;
  const activeStatus = active?.status ?? "—";

  const activeTitle = useMemo(() => {
    if (!active) return "Keine Auswahl";
    return norm(active.studioName) || norm(active.displayName) || "Producer Anfrage";
  }, [active]);

  async function markMessageHandled(uid: string) {
    await setDoc(
      doc(db, "adminMessages", `producer_${uid}`),
      { status: "handled", updatedAt: serverTimestamp() },
      { merge: true }
    );
  }

  async function approve() {
    if (!activeUid) return;
    setActionLoading(true);
    setErr(null);

    try {
      await setDoc(
        doc(db, "producers", activeUid),
        {
          uid: activeUid,
          verified: true,
          displayName: active.displayName ?? "",
          photoURL: active.photoURL ?? null,
          studioName: active.studioName ?? "",
          location: active.location ?? "",
          genres: Array.isArray(active.genres) ? active.genres : [],
          links: Array.isArray(active.links) ? active.links : [],
          motivation: active.motivation ?? "",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      await updateDoc(doc(db, "producerApplications", activeUid), {
        status: "approved",
        updatedAt: serverTimestamp(),
      });

      await markMessageHandled(activeUid);

      setRows((prev) => prev.filter((x) => (x.uid ?? x.id) !== activeUid));
      router.push("/admin/inbox");
    } catch (e: any) {
      setErr(
        e?.code === "permission-denied"
          ? "Keine Berechtigung (Admin Claim / Rules prüfen)."
          : "Approve fehlgeschlagen."
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function reject() {
    if (!activeUid) return;
    if (!window.confirm("Anfrage wirklich ablehnen?")) return;

    setActionLoading(true);
    setErr(null);

    try {
      await updateDoc(doc(db, "producerApplications", activeUid), {
        status: "rejected",
        updatedAt: serverTimestamp(),
      });

      await markMessageHandled(activeUid);

      setRows((prev) => prev.filter((x) => (x.uid ?? x.id) !== activeUid));
      router.push("/admin/inbox");
    } catch (e: any) {
      setErr(
        e?.code === "permission-denied"
          ? "Keine Berechtigung (Admin Claim / Rules prüfen)."
          : "Reject fehlgeschlagen."
      );
    } finally {
      setActionLoading(false);
    }
  }

  if (!ready) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/70">
        Lade…
      </div>
    );
  }
  if (!isAdmin) return null;

  return (
    <div className="pb-28 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-white">Producer Requests</h1>
          <p className="mt-1 text-sm text-white/60">
            Prüfen und freischalten (approve) oder ablehnen (reject).
          </p>
        </div>

        <button
          onClick={() => router.push("/admin/inbox")}
          className="shrink-0 rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10"
        >
          Zur Inbox
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-white/60">Lade Anfragen…</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-[320px_1fr]">
          {/* Liste links (pending) */}
          <div className="rounded-3xl border border-white/10 bg-black/30 p-3">
            <div className="text-sm font-semibold text-white/80 px-2 pb-2">
              Pending ({rows.length})
            </div>

            {rows.length === 0 ? (
              <div className="px-2 py-3 text-sm text-white/60">
                Keine pending Producer-Anfragen.
              </div>
            ) : (
              <div className="space-y-2">
                {rows.map((r) => {
                  const id = r.uid ?? r.id;
                  const isSel = id === activeUid;
                  const title = norm(r.studioName) || norm(r.displayName) || id;

                  return (
                    <button
                      key={id}
                      onClick={() => {
                        setActive(r);
                        router.replace(`/admin/producer-requests?uid=${id}`);
                      }}
                      className={[
                        "w-full text-left rounded-2xl border px-3 py-3 transition",
                        isSel
                          ? "border-white/30 bg-white/10"
                          : "border-white/10 bg-black/20 hover:bg-white/5",
                      ].join(" ")}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={r.photoURL ?? "/default-avatar.png"}
                          className="h-9 w-9 rounded-full object-cover border border-white/10"
                          alt={title}
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-white truncate">
                            {title}
                          </div>
                          <div className="text-xs text-white/50 truncate">
                            {r.location ?? "—"}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Details rechts (auch wenn NICHT pending) */}
          <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
            {!active ? (
              <div className="text-sm text-white/70">
                Keine Auswahl. (Oder Bewerbung existiert nicht.)
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xl font-bold text-white truncate">
                      {activeTitle}
                    </div>
                    <div className="mt-1 text-sm text-white/60">
                      {active.location ?? "—"} · Status:{" "}
                      <span className="text-white/80">{activeStatus}</span>
                    </div>
                  </div>

                  {/* Buttons nur wenn pending */}
                  {activeStatus === "pending" ? (
                    <div className="flex gap-2">
                      <button
                        onClick={reject}
                        disabled={actionLoading}
                        className="rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10 disabled:opacity-50"
                      >
                        Ablehnen
                      </button>
                      <button
                        onClick={approve}
                        disabled={actionLoading}
                        className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-black hover:opacity-95 disabled:opacity-60"
                      >
                        Freischalten
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs text-white/50">
                      Keine Aktion (Status ist nicht pending).
                    </div>
                  )}
                </div>

                <div className="mt-4 grid gap-3">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="text-sm font-semibold text-white">Bewerber</div>
                    <div className="mt-2 flex items-center gap-3">
                      <img
                        src={active.photoURL ?? "/default-avatar.png"}
                        className="h-12 w-12 rounded-full object-cover border border-white/10"
                        alt={active.displayName ?? "User"}
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white truncate">
                          {active.displayName ?? "—"}
                        </div>
                        <div className="text-xs text-white/50 truncate">
                          {active.email ?? "—"}
                        </div>
                        <div className="text-xs text-white/40 truncate">
                          uid: {activeUid}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="text-sm font-semibold text-white">Genres</div>
                    <div className="mt-2 text-sm text-white/70">
                      {Array.isArray(active.genres) && active.genres.length > 0
                        ? active.genres.join(" • ")
                        : "—"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="text-sm font-semibold text-white">Links</div>
                    <div className="mt-2 space-y-2">
                      {Array.isArray(active.links) && active.links.length > 0 ? (
                        active.links.map((l: string, i: number) => (
                          <a
                            key={i}
                            href={l}
                            target="_blank"
                            rel="noreferrer"
                            className="block truncate text-sm text-white/80 hover:underline"
                          >
                            {l}
                          </a>
                        ))
                      ) : (
                        <div className="text-sm text-white/70">—</div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="text-sm font-semibold text-white">
                      Motivation / Erfahrung
                    </div>
                    <div className="mt-2 whitespace-pre-wrap text-sm text-white/80">
                      {active.motivation ?? "—"}
                    </div>
                  </div>

                  {err && <div className="text-sm text-red-400">{err}</div>}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="text-xs text-white/40">
        Freischalten erstellt/updated <code>producers/{`{uid}`}</code> mit{" "}
        <code>verified:true</code> und setzt Application auf approved.
      </div>
    </div>
  );
}
