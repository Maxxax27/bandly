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
import { useRouter, useSearchParams } from "next/navigation";

type ProducerDoc = {
  verified?: boolean;
  studioName?: string;
  displayName?: string;
  photoURL?: string | null;
};

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
  updatedAt?: any;
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

function pillBtn(active: boolean) {
  return `rounded-xl px-3 py-1.5 text-xs border border-white/10 hover:bg-white/5 ${
    active ? "bg-white/10 text-white" : "text-white/70"
  }`;
}

function SkeletonList() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-white/10 bg-black/40 p-4 animate-pulse"
        >
          <div className="h-4 w-1/3 rounded bg-white/10" />
          <div className="mt-3 h-3 w-full rounded bg-white/10" />
          <div className="mt-2 h-3 w-5/6 rounded bg-white/10" />
          <div className="mt-3 flex gap-2">
            <div className="h-7 w-20 rounded-xl bg-white/10" />
            <div className="h-7 w-24 rounded-xl bg-white/10" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ProducerDashboardClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const [uid, setUid] = useState<string | null>(auth.currentUser?.uid ?? null);
  const [producer, setProducer] = useState<ProducerDoc | null>(null);

  const [requests, setRequests] = useState<ProducerRequest[]>([]);
  const [projects, setProjects] = useState<ProducerProject[]>([]);

  const [loadingGate, setLoadingGate] = useState(true);
  const [reqReady, setReqReady] = useState(false);
  const [projReady, setProjReady] = useState(false);

  // URL state
  const tab =
    (sp.get("tab") as "requests" | "projects" | "messages" | null) ?? "requests";

  const status = sp.get("status") ?? "all";
  const selected = sp.get("selected");

  function setQuery(next: Record<string, string | null>) {
    const params = new URLSearchParams(sp.toString());
    Object.entries(next).forEach(([k, v]) => {
      if (!v) params.delete(k);
      else params.set(k, v);
    });
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "");
  }

  // Auth gate
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUid(u?.uid ?? null);
      if (!u) router.replace("/login");
    });
    return () => unsub();
  }, [router]);

  // Producer verification gate
  useEffect(() => {
    async function loadProducer() {
      if (!uid) return;

      setLoadingGate(true);
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
      setLoadingGate(false);
    }

    if (uid) loadProducer();
  }, [uid, router]);

  // Snapshots
  useEffect(() => {
    if (!uid) return;

    setReqReady(false);
    setProjReady(false);

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
        setReqReady(true);
      },
      () => {
        setRequests([]);
        setReqReady(true);
      }
    );

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
        setProjReady(true);
      },
      () => {
        setProjects([]);
        setProjReady(true);
      }
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

  const openCount = useMemo(
    () => requests.filter((r) => r.status === "open").length,
    [requests]
  );

  const activeProjectsCount = useMemo(
    () => projects.filter((p) => p.status !== "done").length,
    [projects]
  );

  // Smart default tab only if URL has no tab
  useEffect(() => {
    const hasTab = sp.get("tab");
    if (hasTab) return;

    if (openCount > 0) setQuery({ tab: "requests", status: "open", selected: null });
    else if (activeProjectsCount > 0)
      setQuery({ tab: "projects", status: "active", selected: null });
    else setQuery({ tab: "requests", status: "all", selected: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openCount, activeProjectsCount]);

  if (loadingGate) return <div className="p-6 text-sm text-white/70">Lade Dashboard…</div>;
  if (!producer) return null;

  const filteredRequests =
    tab === "requests"
      ? status === "all"
        ? requests
        : requests.filter((r) => r.status === status)
      : requests;

  const filteredProjects =
    tab === "projects"
      ? status === "all"
        ? projects
        : status === "active"
        ? projects.filter((p) => p.status !== "done")
        : projects.filter((p) => p.status === status)
      : projects;

  const selectedRequest =
    tab === "requests" ? requests.find((r) => r.id === selected) ?? null : null;

  const selectedProject =
    tab === "projects" ? projects.find((p) => p.id === selected) ?? null : null;

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

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <button
          onClick={() => setQuery({ tab: "requests", status: "open", selected: null })}
          className="rounded-3xl border border-white/10 bg-black/30 p-4 text-left hover:bg-white/5"
        >
          <div className="text-xs text-white/60">Neue Anfragen</div>
          <div className="mt-1 text-2xl font-semibold text-white">{openCount}</div>
          <div className="mt-1 text-xs text-white/50">Öffnen</div>
        </button>

        <button
          onClick={() => setQuery({ tab: "projects", status: "active", selected: null })}
          className="rounded-3xl border border-white/10 bg-black/30 p-4 text-left hover:bg-white/5"
        >
          <div className="text-xs text-white/60">Aktive Projekte</div>
          <div className="mt-1 text-2xl font-semibold text-white">{activeProjectsCount}</div>
          <div className="mt-1 text-xs text-white/50"></div>
        </button>

        <button
          onClick={() => setQuery({ tab: "messages", status: null, selected: null })}
          className="rounded-3xl border border-white/10 bg-black/30 p-4 text-left hover:bg-white/5"
        >
          <div className="text-xs text-white/60">Nachrichten</div>
          <div className="mt-1 text-2xl font-semibold text-white">-</div>
          <div className="mt-1 text-xs text-white/50">Zu DMs</div>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          className={tabBtn(tab === "requests")}
          onClick={() => setQuery({ tab: "requests", status: "all", selected: null })}
        >
          Anfragen{openCount > 0 ? ` (${openCount})` : ""}
        </button>
        <button
          className={tabBtn(tab === "projects")}
          onClick={() => setQuery({ tab: "projects", status: "all", selected: null })}
        >
          Projekte{activeProjectsCount > 0 ? ` (${activeProjectsCount})` : ""}
        </button>
        <button
          className={tabBtn(tab === "messages")}
          onClick={() => setQuery({ tab: "messages", status: null, selected: null })}
        >
          Nachrichten
        </button>
      </div>

      {/* Filter Bar */}
      {tab === "requests" && (
        <div className="flex flex-wrap items-center gap-2">
          {([
            { key: "all", label: "Alle" },
            { key: "open", label: "Offen" },
            { key: "accepted", label: "Angenommen" },
            { key: "declined", label: "Abgelehnt" },
          ] as const).map((s) => (
            <button
              key={s.key}
              onClick={() => setQuery({ status: s.key, selected: null })}
              className={pillBtn(status === s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {tab === "projects" && (
        <div className="flex flex-wrap items-center gap-2">
          {(["all", "active", "lead", "done"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setQuery({ status: s, selected: null })}
              className={pillBtn(status === s)}
            >
              {s === "all" ? "Alle" : s}
            </button>
          ))}
        </div>
      )}

      {/* Desktop split: list + detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {tab === "requests" && (
            <div className="rounded-3xl border border-white/10 bg-black/30 p-5 space-y-3">
              <div className="text-sm font-semibold text-white">Anfragen</div>

              {!reqReady ? (
                <SkeletonList />
              ) : filteredRequests.length === 0 ? (
                <div className="text-sm text-white/60">
                  {status === "all" ? "Noch keine Anfragen." : "Keine Anfragen für diesen Filter."}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredRequests.map((r) => (
                    <div
                      key={r.id}
                      className={`rounded-2xl border border-white/10 bg-black/40 p-4 ${
                        selected === r.id ? "ring-1 ring-white/20" : ""
                      }`}
                    >
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
                          Status: <span className="text-white/80">{r.status}</span>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          onClick={() => setQuery({ selected: r.id })}
                          className="rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-white/80 hover:bg-white/5"
                        >
                          Öffnen
                        </button>
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

              {!projReady ? (
                <SkeletonList />
              ) : filteredProjects.length === 0 ? (
                <div className="text-sm text-white/60">
                  {status === "all" ? "Noch keine Projekte." : "Keine Projekte für diesen Filter."}
                </div>
              ) : (
                <div className="grid gap-2">
                  {filteredProjects.map((p) => (
                    <div
                      key={p.id}
                      className={`rounded-2xl border border-white/10 bg-black/40 p-4 ${
                        selected === p.id ? "ring-1 ring-white/20" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-white truncate">{p.title}</div>
                          <div className="mt-1 text-xs text-white/40">
                            Teilnehmer: {Array.isArray(p.participants) ? p.participants.length : 0}
                          </div>
                        </div>
                        <div className="text-xs text-white/50">{p.status}</div>
                      </div>

                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => setQuery({ selected: p.id })}
                          className="rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-white/80 hover:bg-white/5"
                        >
                          Öffnen
                        </button>
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

        <div className="hidden lg:block">
          <div className="sticky top-4 rounded-3xl border border-white/10 bg-black/30 p-5">
            {!selected ? (
              <div className="text-sm text-white/60">
                Wähle links ein Element aus, um Details zu sehen.
              </div>
            ) : tab === "requests" ? (
              <RequestDetailPanel request={selectedRequest} />
            ) : tab === "projects" ? (
              <ProjectDetailPanel project={selectedProject} />
            ) : (
              <div className="text-sm text-white/60">Messages Panel kommt später.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function RequestDetailPanel({ request }: { request: ProducerRequest | null }) {
  if (!request) return <div className="text-sm text-white/60">Nicht gefunden.</div>;

  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold text-white">Anfrage</div>

      <div className="flex items-center gap-3">
        <div className="h-10 w-10 overflow-hidden rounded-full border border-white/10 bg-black/40">
          <img
            src={request.fromPhotoURL ?? "/default-avatar.png"}
            alt={request.fromName ?? "Absender"}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white truncate">
            {request.fromName || "Unbekannt"}{" "}
            <span className="text-xs text-white/40">({request.fromType})</span>
          </div>
          <div className="text-xs text-white/50">
            Status: <span className="text-white/80">{request.status}</span>
          </div>
        </div>
      </div>

      <div className="text-sm text-white/70 whitespace-pre-line">{request.message}</div>

      <div className="pt-2 flex flex-wrap gap-2">
        <RequestStatusButtons requestId={request.id} current={request.status} />
      </div>
    </div>
  );
}

function ProjectDetailPanel({ project }: { project: ProducerProject | null }) {
  if (!project) return <div className="text-sm text-white/60">Nicht gefunden.</div>;

  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold text-white">Projekt</div>
      <div className="text-lg font-semibold text-white">{project.title}</div>
      <div className="text-sm text-white/60">
        Status: <span className="text-white/80">{project.status}</span>
      </div>
      <div className="text-sm text-white/60">
        Teilnehmer: {Array.isArray(project.participants) ? project.participants.length : 0}
      </div>
    </div>
  );
}

/** Buttons: accept/decline/open */
function RequestStatusButtons({ requestId, current }: { requestId: string; current: string }) {
  const [saving, setSaving] = useState(false);

  async function setStatus(next: "accepted" | "declined" | "open") {
    setSaving(true);
    try {
      const { updateDoc, doc, serverTimestamp } = await import("firebase/firestore");
      await updateDoc(doc(db, "producerRequests", requestId), {
        status: next,
        updatedAt: serverTimestamp(),
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
