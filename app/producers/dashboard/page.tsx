"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  where,
  limit,
} from "firebase/firestore";
import { useRouter } from "next/navigation";

type ProducerDoc = { verified?: boolean; studioName?: string; displayName?: string; photoURL?: string | null };

type ProducerRequest = {
  id: string;
  toProducerUid: string;
  fromType: "band" | "musician";
  fromUid: string;
  fromName?: string;
  fromPhotoURL?: string;
  message: string;
  status: "open" | "accepted" | "declined";
  createdAt?: any;
};

type ProducerProject = {
  id: string;
  ownerUid: string;
  title: string;
  status: "lead" | "active" | "done";
  participants: string[];
  createdAt?: any;
};

function tabBtn(active: boolean) {
  return `rounded-xl px-3 py-2 text-sm border border-white/10 hover:bg-white/5 ${
    active ? "bg-white/10 text-white" : "text-white/70"
  }`;
}

export default function ProducerDashboardPage() {
  const router = useRouter();

  const [uid, setUid] = useState<string | null>(auth.currentUser?.uid ?? null);
  const [producer, setProducer] = useState<ProducerDoc | null>(null);
  const [tab, setTab] = useState<"requests" | "projects" | "messages">("requests");

  const [requests, setRequests] = useState<ProducerRequest[]>([]);
  const [projects, setProjects] = useState<ProducerProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUid(u?.uid ?? null);
      if (!u) router.replace("/login");
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    async function loadProducer() {
      if (!uid) return;

      setLoading(true);
      const snap = await getDoc(doc(db, "producers", uid));
      if (!snap.exists()) {
        router.replace("/producers/apply");
        return;
      }
      const data = snap.data() as ProducerDoc;
      if (data.verified !== true) {
        router.replace("/producers/apply");
        return;
      }
      setProducer(data);
      setLoading(false);
    }
    if (uid) loadProducer();
  }, [uid, router]);

  useEffect(() => {
    if (!uid) return;

    // Requests
    const qReq = query(
      collection(db, "producerRequests"),
      where("toProducerUid", "==", uid),
      orderBy("createdAt", "desc"),
      limit(30)
    );

    const unsubReq = onSnapshot(
      qReq,
      (snap) => {
        setRequests(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      },
      () => setRequests([])
    );

    // Projects
    const qProj = query(
      collection(db, "producerProjects"),
      where("ownerUid", "==", uid),
      orderBy("createdAt", "desc"),
      limit(30)
    );

    const unsubProj = onSnapshot(
      qProj,
      (snap) => {
        setProjects(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      },
      () => setProjects([])
    );

    return () => {
      unsubReq();
      unsubProj();
    };
  }, [uid]);

  const title = useMemo(() => {
    if (!producer) return "Producer Dashboard";
    return producer.studioName || producer.displayName || "Producer Dashboard";
  }, [producer]);

  if (loading) return <div className="p-6 text-sm text-white/70">Lade Dashboard…</div>;
  if (!producer) return null;

  const openCount = requests.filter((r) => r.status === "open").length;

  return (
    <div className="pb-28 space-y-4">
      {/* Top */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 overflow-hidden rounded-full border border-white/10 bg-black/40">
            <img
              src={producer.photoURL ?? "/default-avatar.png"}
              alt={title}
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <div className="text-lg font-semibold text-white">{title}</div>
            <div className="text-sm text-white/60">
              {openCount > 0 ? `🔔 ${openCount} neue Anfrage(n)` : "Keine neuen Anfragen"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={uid ? `/producers/${uid}` : "/producers"}
            className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/80 hover:bg-white/5"
          >
            Profil ansehen
          </Link>
          <Link
            href="/producers/edit"
            className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-black hover:opacity-95"
          >
            Profil bearbeiten
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        <button className={tabBtn(tab === "requests")} onClick={() => setTab("requests")}>
          Anfragen
        </button>
        <button className={tabBtn(tab === "projects")} onClick={() => setTab("projects")}>
          Projekte
        </button>
        <button className={tabBtn(tab === "messages")} onClick={() => setTab("messages")}>
          Nachrichten
        </button>
      </div>

      {/* Content */}
      {tab === "requests" && (
        <div className="rounded-3xl border border-white/10 bg-black/30 p-5 space-y-3">
          <div className="text-sm font-semibold text-white">Anfragen</div>

          {requests.length === 0 ? (
            <div className="text-sm text-white/60">Noch keine Anfragen.</div>
          ) : (
            <div className="space-y-2">
              {requests.map((r) => (
                <div key={r.id} className="rounded-2xl border border-white/10 bg-black/40 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white truncate">
                        {r.fromName || "Unbekannt"}{" "}
                        <span className="text-xs text-white/40">({r.fromType})</span>
                      </div>
                      <div className="mt-1 text-sm text-white/70 whitespace-pre-line">
                        {r.message}
                      </div>
                    </div>

                    <div className="text-xs text-white/50">
                      Status:{" "}
                      <span className="text-white/80">{r.status}</span>
                    </div>
                  </div>

                  {/* Actions (Status-Update) -> du kannst hier später Buttons einbauen */}
                  <div className="mt-3 flex gap-2">
                    <RequestStatusButtons requestId={r.id} current={r.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "projects" && (
        <div className="rounded-3xl border border-white/10 bg-black/30 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-white">Projekte</div>
            <Link
              href="/producers/projects/new"
              className="rounded-xl border border-white/10 px-3 py-1.5 text-xs text-white/80 hover:bg-white/5"
            >
              + Neues Projekt
            </Link>
          </div>

          {projects.length === 0 ? (
            <div className="text-sm text-white/60">Noch keine Projekte.</div>
          ) : (
            <div className="grid gap-2">
              {projects.map((p) => (
                <div key={p.id} className="rounded-2xl border border-white/10 bg-black/40 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-white">{p.title}</div>
                    <div className="text-xs text-white/50">{p.status}</div>
                  </div>
                  <div className="mt-1 text-xs text-white/40">
                    Teilnehmer: {Array.isArray(p.participants) ? p.participants.length : 0}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "messages" && (
        <div className="rounded-3xl border border-white/10 bg-black/30 p-5 space-y-2">
          <div className="text-sm font-semibold text-white">Nachrichten</div>
          <div className="text-sm text-white/60">
            Öffne deine normalen DMs – wir hängen das später direkt ans Dashboard.
          </div>
          <Link
            href="/messages"
            className="inline-block rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:opacity-95"
          >
            Zu Nachrichten
          </Link>
        </div>
      )}
    </div>
  );
}

/** Buttons: accept/decline/open */
function RequestStatusButtons({ requestId, current }: { requestId: string; current: string }) {
  const [saving, setSaving] = useState(false);

  async function setStatus(next: "accepted" | "declined" | "open") {
    setSaving(true);
    try {
      const { updateDoc, doc } = await import("firebase/firestore");
      await updateDoc(doc(db, "producerRequests", requestId), {
        status: next,
        updatedAt: new Date(),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        disabled={saving || current === "accepted"}
        onClick={() => setStatus("accepted")}
        className="rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-black disabled:opacity-60"
      >
        Annehmen
      </button>
      <button
        disabled={saving || current === "declined"}
        onClick={() => setStatus("declined")}
        className="rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-white/80 hover:bg-white/5 disabled:opacity-60"
      >
        Ablehnen
      </button>
      <button
        disabled={saving || current === "open"}
        onClick={() => setStatus("open")}
        className="rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-white/60 hover:bg-white/5 disabled:opacity-60"
      >
        Zurück auf offen
      </button>
    </>
  );
}
