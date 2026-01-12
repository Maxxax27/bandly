"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { useParams, useRouter } from "next/navigation";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  Timestamp,
  updateDoc,
  writeBatch,
  deleteDoc,
} from "firebase/firestore";

import { db, storage } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import CantonCoat from "@/components/CantonCoat";
import { KANTON_LABELS } from "@/lib/cantons";

type BandMember = {
  role: "admin" | "member";
  displayName: string;
  photoURL: string | null;
  joinedAt?: any;
};

type BandDoc = {
  name: string;
  region: string;
  zip?: string;
  location?: string;
  genres: string[];
  bio?: string;
  photoURL?: string | null;

  members?: Record<string, BandMember>;
  memberUids?: string[];
  memberCount?: number;

  links?: {
    instagram?: string;
    youtube?: string;
    spotify?: string;
    soundcloud?: string;
    website?: string;
  };
};

function lowerEmail(s: string) {
  return (s ?? "").trim().toLowerCase();
}

function isValidEmail(s: string) {
  const x = lowerEmail(s);
  return !!x && x.includes("@") && x.includes(".");
}

export default function BandDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const bandId = params?.id;

  const { user, loading } = useAuth();

  const [band, setBand] = useState<BandDoc | null>(null);
  const [loadingBand, setLoadingBand] = useState(true);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  // ✅ Bandbild Upload
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoFileRef = useRef<HTMLInputElement | null>(null);

  // ✅ Band löschen
  const [deletingBand, setDeletingBand] = useState(false);

  useEffect(() => {
    async function load() {
      if (!bandId) return;
      setLoadingBand(true);
      const snap = await getDoc(doc(db, "bands", bandId));
      setBand(snap.exists() ? (snap.data() as any) : null);
      setLoadingBand(false);
    }
    load();
  }, [bandId]);

  const myUid = user?.uid ?? null;

  const memberUids = band?.memberUids ?? [];
  const members = band?.members ?? {};
  const memberCount = band?.memberCount ?? memberUids.length ?? 0;

  const isMember = useMemo(() => !!myUid && memberUids.includes(myUid), [myUid, memberUids]);
  const myRole = useMemo(() => (myUid ? members?.[myUid]?.role : null), [myUid, members]);
  const isAdmin = isMember && myRole === "admin";

  // ✅ LOGO UPLOAD
  async function onPickLogo(file: File) {
    if (!user || !bandId) return;

    if (!isAdmin) {
      alert("Nur Admins können das Bandbild ändern.");
      return;
    }

    setUploadingLogo(true);
    try {
      if (!file.type.startsWith("image/")) {
        alert("Bitte ein Bild auswählen (JPG/PNG/WebP).");
        return;
      }
      if (file.size > 6 * 1024 * 1024) {
        alert("Bild zu gross (max. 6 MB).");
        return;
      }

      const path = `bands/${bandId}/logo`;
      const sref = ref(storage, path);

      await uploadBytes(sref, file, { contentType: file.type });
      const url = await getDownloadURL(sref);

      await updateDoc(doc(db, "bands", bandId), {
        photoURL: url,
        updatedAt: serverTimestamp(),
      });

      setBand((prev) => (prev ? { ...prev, photoURL: url } : prev));

      if (logoFileRef.current) logoFileRef.current.value = "";
      alert("Bandbild gespeichert ✅");
    } catch (e: any) {
      console.error(e);
      alert(`Upload fehlgeschlagen: ${e?.message ?? e}`);
    } finally {
      setUploadingLogo(false);
    }
  }

  async function removeLogo() {
    if (!user || !bandId) return;

    if (!isAdmin) {
      alert("Nur Admins können das Bandbild ändern.");
      return;
    }

    setUploadingLogo(true);
    try {
      await deleteObject(ref(storage, `bands/${bandId}/logo`)).catch(() => {});
      await updateDoc(doc(db, "bands", bandId), {
        photoURL: null,
        updatedAt: serverTimestamp(),
      });

      setBand((prev) => (prev ? { ...prev, photoURL: null } : prev));
      alert("Bandbild entfernt ✅");
    } catch (e: any) {
      console.error(e);
      alert(`Entfernen fehlgeschlagen: ${e?.message ?? e}`);
    } finally {
      setUploadingLogo(false);
    }
  }

  // ✅ BAND LÖSCHEN (Admin only)
 async function deleteBand() {
  if (!user) return router.push("/login");
  if (!bandId) return;

  // safety reload band doc to check admin
  const snap = await getDoc(doc(db, "bands", bandId));
  if (!snap.exists()) {
    alert("Band nicht gefunden.");
    return;
  }
  const liveBand = snap.data() as any;

  const role = liveBand?.members?.[user.uid]?.role ?? null;
  if (role !== "admin") {
    alert(`Keine Rechte: du bist nicht Admin (role=${String(role)})`);
    return;
  }

  const ok = confirm(
    "Band wirklich löschen?\n\n1) Band wird gelöscht\n2) Danach werden Einladungen (best effort) gelöscht\n3) Bandbild im Storage wird entfernt\n\nDieser Schritt kann nicht rückgängig gemacht werden."
  );
  if (!ok) return;

  setDeletingBand(true);
  try {
    // ✅ 1) Band löschen (separat, damit wir klare Fehlermeldung kriegen)
    await deleteDoc(doc(db, "bands", bandId));

    // ✅ 2) Invites löschen (best effort, einzeln)
    // Wenn Rules hierfür noch blocken, ist der Band-Delete trotzdem schon durch.
    try {
      const invSnap = await getDocs(collection(db, "bandInvites"));
      const toDelete = invSnap.docs.filter((d) => (d.data() as any)?.bandId === bandId);

      for (const d of toDelete) {
        await deleteDoc(doc(db, "bandInvites", d.id)).catch(() => {});
      }
    } catch {
      // ignore
    }

    // ✅ 3) Storage Logo löschen (best effort)
    await deleteObject(ref(storage, `bands/${bandId}/logo`)).catch(() => {});

    alert("Band gelöscht ✅");
    router.push("/bands");
  } catch (e: any) {
    console.error(e);
    alert(`Löschen fehlgeschlagen: ${e?.message ?? e}`);
  } finally {
    setDeletingBand(false);
  }
}


  async function createInvite() {
    if (!user || !bandId || !band) {
      router.push("/login");
      return;
    }
    if (!isAdmin) {
      alert("Nur Admins können Einladungen erstellen.");
      return;
    }
    if (memberCount >= 6) {
      alert("Maximal 6 Mitglieder pro Bandprofil.");
      return;
    }

    const email = lowerEmail(inviteEmail);
    if (!isValidEmail(email)) {
      alert("Bitte eine gültige E-Mail eingeben.");
      return;
    }

    setInviting(true);
    try {
      const expiresAt = Timestamp.fromDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000));

      await addDoc(collection(db, "bandInvites"), {
        bandId,
        bandName: band.name ?? "Band",
        inviterUid: user.uid,
        inviterName: user.displayName ?? user.email ?? "User",

        inviteeEmail: inviteEmail.trim(),
        inviteeEmailLower: email,

        status: "pending",
        createdAt: serverTimestamp(),
        expiresAt,
      });

      setInviteEmail("");
      alert("Einladung erstellt ✅");
    } catch (e: any) {
      console.error(e);
      alert(`Einladen fehlgeschlagen: ${e?.message ?? e}`);
    } finally {
      setInviting(false);
    }
  }

  if (loading || loadingBand) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
        Lade…
      </div>
    );
  }

  if (!band) {
    return (
      <div className="space-y-4">
        <Link href="/bands" className="text-sm hover:underline">
          ← Zurück
        </Link>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
          Bandprofil nicht gefunden.
        </div>
      </div>
    );
  }

  const regionLabel = band.region
    ? `${band.region}: ${KANTON_LABELS[band.region as keyof typeof KANTON_LABELS] ?? band.region}`
    : "—";

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/bands" className="text-sm hover:underline">
          ← Zurück
        </Link>

        {user ? (
          <Link
            href="/bands/invites"
            className="text-sm rounded-xl border border-zinc-300 bg-white px-3 py-1.5 text-zinc-800 hover:bg-zinc-50 transition"
          >
            Einladungen
          </Link>
        ) : null}
      </div>

      {/* Band Card */}
      <div className="rounded-2xl bg-zinc-900 text-white p-6 md:p-7 shadow-lg border border-zinc-800/60 space-y-4">
        <div className="flex items-start gap-4">
          <div className="shrink-0">
            <div className="h-16 w-16 rounded-2xl bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center">
              {band.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={band.photoURL} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-2xl">🎸</span>
              )}
            </div>

            {/* ✅ Upload UI direkt unter dem Logo (nur Admin) */}
            {isAdmin ? (
              <div className="mt-3 flex flex-col gap-2">
                <input
                  ref={logoFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onPickLogo(f);
                  }}
                />

                <button
                  type="button"
                  onClick={() => logoFileRef.current?.click()}
                  disabled={uploadingLogo || deletingBand}
                  className="rounded-xl bg-white text-zinc-900 px-3 py-2 text-xs font-semibold hover:opacity-90 transition disabled:opacity-50"
                >
                  {uploadingLogo ? "Lade…" : "Bandbild hochladen"}
                </button>

                <button
                  type="button"
                  onClick={removeLogo}
                  disabled={uploadingLogo || deletingBand || !band.photoURL}
                  className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-100 hover:bg-white/10 transition disabled:opacity-50"
                >
                  Entfernen
                </button>

                {/* ✅ NEU: Band löschen */}
                <button
                  type="button"
                  onClick={deleteBand}
                  disabled={uploadingLogo || deletingBand}
                  className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-100 hover:bg-white/10 transition disabled:opacity-50"
                  title="Band löschen"
                >
                  {deletingBand ? "Lösche…" : "Band löschen"}
                </button>
              </div>
            ) : null}
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-2xl font-bold truncate">{band.name}</div>

            <div className="mt-2 flex items-center gap-2 text-xs text-zinc-400">
              <CantonCoat code={band.region} size={18} className="h-[18px] w-[18px]" />
              <span className="truncate">
                {regionLabel}
                {band.zip ? ` · PLZ ${band.zip}` : ""}
                {band.location ? ` · ${band.location}` : ""}
              </span>

              <span className="ml-auto text-zinc-300">
                Mitglieder: <span className="text-zinc-100 font-semibold">{memberCount}</span> / 6
              </span>
            </div>

            {band.genres?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {band.genres.slice(0, 10).map((g) => (
                  <span
                    key={g}
                    className="rounded-full bg-white/10 px-3 py-1 text-xs text-zinc-200 border border-white/10"
                  >
                    {g}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {band.bio ? <div className="text-sm text-zinc-200 whitespace-pre-wrap">{band.bio}</div> : null}
      </div>

      {/* Members */}
      <div className="rounded-2xl bg-zinc-900 text-white p-6 shadow-lg border border-zinc-800/60 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Mitglieder</h2>
          {!user ? (
            <Link
              href="/login"
              className="rounded-xl bg-white text-zinc-900 px-4 py-2 text-sm font-semibold hover:opacity-90 transition"
            >
              Login
            </Link>
          ) : null}
        </div>

        {memberUids.length === 0 ? (
          <div className="text-sm text-zinc-300">Noch keine Mitglieder.</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {memberUids.map((uid) => {
              const m = members?.[uid];
              return (
                <div
                  key={uid}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center gap-3"
                >
                  <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                    {m?.photoURL ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.photoURL} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-lg">👤</span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="font-semibold text-zinc-100 truncate">{m?.displayName ?? "Member"}</div>
                    <div className="text-xs text-zinc-400">{m?.role === "admin" ? "Admin" : "Member"}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!isMember ? (
          <div className="text-sm text-zinc-400">
            Du bist kein Mitglied dieser Band. Wenn du eingeladen wurdest, nimm die Einladung unter{" "}
            <Link className="underline" href="/bands/invites">
              Einladungen
            </Link>{" "}
            an.
          </div>
        ) : null}
      </div>

      {/* Invite box (Admin only) */}
      {isAdmin ? (
        <div className="rounded-2xl bg-zinc-900 text-white p-6 shadow-lg border border-zinc-800/60 space-y-3">
          <h2 className="text-lg font-bold">Mitglied einladen (per E-Mail)</h2>

          <div className="flex flex-col md:flex-row gap-3">
            <input
              type="email"
              placeholder="email@domain.ch"
              className="w-full rounded-xl bg-white/10 text-white placeholder:text-zinc-400 border border-white/10 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-white/10"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />

            <button
              type="button"
              onClick={createInvite}
              disabled={inviting || deletingBand}
              className="rounded-xl bg-white text-zinc-900 px-5 py-2 text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
            >
              {inviting ? "Sende…" : "Einladen"}
            </button>
          </div>

          <div className="text-xs text-zinc-400">Maximal 6 Mitglieder. Die Einladung ist 14 Tage gültig.</div>
        </div>
      ) : null}
    </div>
  );
}
