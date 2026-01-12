"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { useAuth } from "../../../lib/auth-context";
import { KANTON_LABELS, kantonWappen } from "@/lib/cantons";

// ✅ Alter berechnen (nur Anzeige, Geburtstag bleibt privat)
function calcAge(birthday?: string | null): number | null {
  if (!birthday) return null;

  const parts = birthday.split("-").map((x) => parseInt(x, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;

  const [y, m, d] = parts;
  const today = new Date();

  let age = today.getFullYear() - y;
  const mm = today.getMonth() + 1;
  const dd = today.getDate();
  if (mm < m || (mm === m && dd < d)) age--;

  return age;
}

export default function MusicianDetailPage() {
  const router = useRouter();
  const params = useParams<{ uid: string }>();
  const otherUid = params?.uid;

  const { user, loading } = useAuth();

  const [p, setP] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      if (!otherUid) return;
      setLoadingProfile(true);
      const snap = await getDoc(doc(db, "profiles", otherUid));
      setP(snap.exists() ? snap.data() : null);
      setLoadingProfile(false);
    }
    loadProfile();
  }, [otherUid]);

  const isMe = useMemo(() => !!user && !!otherUid && user.uid === otherUid, [user, otherUid]);

  async function startDM() {
    if (!otherUid) return;

    if (!user) {
      router.push("/login");
      return;
    }

    if (isMe) {
      alert("Das ist dein eigenes Profil 🙂");
      return;
    }

    // stabile DM-ID
    const [a, b] = [user.uid, otherUid].sort();
    const convId = `dm__${a}_${b}`;

    await setDoc(
      doc(db, "conversations", convId),
      {
        type: "dm",
        participants: [a, b],
        dmKey: `${a}_${b}`,

        // ✅ Snapshots für Inbox/Chat-Header (Name + Foto)
        participantSnapshot: {
          [user.uid]: {
            name: user.displayName ?? user.email ?? "User",
            photoURL: user.photoURL ?? null,
          },
          [otherUid]: {
            name: p?.displayName ?? "Unbekannt",
            photoURL: p?.photoURL ?? null,
          },
        },

        lastMessage: "",
        lastSenderUid: "",
        unreadFor: { [a]: 0, [b]: 0 },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    router.push(`/messages/${convId}`);
  }

  if (loading || loadingProfile) return <p>Lade…</p>;
  if (!p) return <p>Profil nicht gefunden.</p>;

  const age = calcAge(p.birthday ?? null);

  // ✅ Wappen helpers
  const regionCode = String(p.region ?? "").toUpperCase().trim(); // z.B. "LU"
  const crestSrc = regionCode ? kantonWappen(regionCode) : null;

  const crestTitle =
    regionCode && KANTON_LABELS[regionCode]
      ? `${regionCode}: ${KANTON_LABELS[regionCode]}`
      : regionCode
        ? `Region ${regionCode}`
        : "Region unbekannt";

  return (
    <div className="max-w-3xl space-y-5">
      <Link href="/musicians" className="text-sm hover:underline">
        ← Zurück
      </Link>

      <div className="rounded-3xl bg-zinc-900 border border-zinc-700 p-5 text-zinc-100 flex items-center gap-4">
        <div className="h-16 w-16 rounded-3xl bg-zinc-800 border border-zinc-700 overflow-hidden flex items-center justify-center shrink-0">
          {p.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.photoURL} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-2xl text-zinc-300">🎸</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* ✅ Name + Alter */}
          <div className="text-2xl font-bold truncate">
            {p.displayName ?? "Unbekannt"}
            {age !== null && (
              <span className="ml-2 text-base font-normal text-zinc-400">· {age}</span>
            )}
          </div>

          <div className="text-sm text-zinc-400 mt-1 truncate">
            {p.bandName ? `Band: ${p.bandName}` : p.status ? `Status: ${p.status}` : "—"}
            {Array.isArray(p.roles) && p.roles.length ? ` · ${p.roles.join(", ")}` : ""}
          </div>

          {/* ✅ Wappen + PLZ */}
          <div className="mt-3 flex items-center gap-2 text-xs text-zinc-400">
            {crestSrc ? (
              <span className="inline-flex items-center" title={crestTitle}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={crestSrc}
                  alt={regionCode || "Wappen"}
                  className="h-6 w-6 rounded-sm bg-white/5 border border-white/10 p-0.5"
                  onError={(e) => {
                    // falls Pfad doch falsch ist, Bild ausblenden statt "broken image"
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              </span>
            ) : (
              <span>{regionCode ? `Region ${regionCode}` : "Region unbekannt"}</span>
            )}

            {p.zip && <span>· PLZ {p.zip}</span>}
            {p.location && <span>· {p.location}</span>}
          </div>
        </div>

        <button
          type="button"
          onClick={startDM}
          className="rounded-xl bg-white text-black px-4 py-2 text-sm font-semibold hover:bg-zinc-200 transition"
        >
          Nachricht
        </button>
      </div>

      {p.bio && (
        <div className="rounded-3xl bg-zinc-900 border border-zinc-700 p-5 text-zinc-100">
          <div className="font-semibold">Bio</div>
          <div className="mt-2 whitespace-pre-wrap text-zinc-300">{p.bio}</div>
        </div>
      )}
    </div>
  );
}
