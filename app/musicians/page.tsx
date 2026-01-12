"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  startAt,
  endAt,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import CantonCoat from "@/components/CantonCoat";
import { KANTON_LABELS } from "@/lib/cantons";
import { useRouter } from "next/navigation";

const REGIONS = ["Alle", "LU", "ZH", "BE", "BS", "SG", "AG", "TG", "GR", "VS", "TI"];
const ROLES = ["Alle", "Singer", "Gitarre", "Lead Guitar", "Rhythm Guitar", "Bass", "Drums", "Keys", "DJ", "Violin"];
const STATUSES = ["Alle", "Band", "Solo", "Suchend"];

type ActiveBand = {
  bandId: string;
  name: string;
  logoURL?: string | null;
  role?: string;
};

type Musician = {
  uid: string;
  displayName: string;
  photoURL: string | null;
  region: string;
  zip: string;
  roles: string[];
  bandName: string;
  status: string;
  band?: ActiveBand | null;
};

export default function MusiciansPage() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Musician[]>([]);
  const router = useRouter();

  const [mode, setMode] = useState<"name" | "band">("name");
  const [text, setText] = useState("");
  const [region, setRegion] = useState("Alle");
  const [role, setRole] = useState("Alle");
  const [status, setStatus] = useState("Alle");
  const [zip, setZip] = useState("");

  async function runSearch() {
    setLoading(true);

    const ref = collection(db, "profiles");
    const wheres: any[] = [];

    if (region !== "Alle") wheres.push(where("region", "==", region));
    if (status !== "Alle") wheres.push(where("status", "==", status));
    if (role !== "Alle") wheres.push(where("roles", "array-contains", role));
    if (zip.trim()) wheres.push(where("zip", "==", zip.trim()));

    const s = text.trim().toLowerCase();
    const field = mode === "name" ? "search.name" : "search.band";

    const qx =
      s.length > 0
        ? query(ref, ...wheres, orderBy(field), startAt(s), endAt(s + "\uf8ff"), limit(40))
        : query(ref, ...wheres, orderBy("updatedAt", "desc"), limit(40));

    const snap = await getDocs(qx);

    const data = snap.docs.map((d) => {
      const x = d.data() as any;

      const band: ActiveBand | null =
        x.band?.bandId
          ? {
              bandId: x.band.bandId,
              name: x.band.name ?? x.bandName ?? "Band",
              logoURL: x.band.logoURL ?? null,
              role: x.band.role ?? "Mitglied",
            }
          : null;

      return {
        uid: d.id,
        displayName: x.displayName ?? "Unbekannt",
        photoURL: x.photoURL ?? null,
        region: x.region ?? "",
        zip: x.zip ?? "",
        roles: Array.isArray(x.roles) ? x.roles : [],
        bandName: x.bandName ?? "",
        status: x.status ?? "",
        band,
      } as Musician;
    });

    setItems(data);
    setLoading(false);
  }

  useEffect(() => {
    runSearch();
  }, []);

  const subtitle = useMemo(() => {
    const parts = [];
    if (region !== "Alle") parts.push(region);
    if (zip.trim()) parts.push(`PLZ ${zip.trim()}`);
    if (role !== "Alle") parts.push(role);
    if (status !== "Alle") parts.push(status);
    return parts.length ? parts.join(" · ") : "Filter optional";
  }, [region, zip, role, status]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-zinc-900">Musiker finden</h1>
          <p className="text-sm text-zinc-600 mt-1">{subtitle}</p>
        </div>

        <Link
          href="/profile"
          className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 transition"
        >
          Profil bearbeiten
        </Link>
      </div>

      {/* Ergebnisse */}
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((m) => (
          <Link
            key={m.uid}
            href={`/musicians/${m.uid}`}
            className="group rounded-2xl bg-zinc-900 text-white p-6 shadow-lg hover:bg-zinc-800 transition border border-zinc-800/60 flex items-start gap-4"
          >
            {/* Avatar */}
            <div className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
              {m.photoURL ? (
                <img src={m.photoURL} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-lg">🎸</span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold text-zinc-100 truncate">{m.displayName}</div>

                    {/* ✅ Bandlogo + Tooltip */}
                    {m.band?.bandId && (
                      <div className="relative group">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            router.push(`/bands/${m.band!.bandId}`);
                          }}
                          className="h-6 w-6 rounded-full overflow-hidden border border-white/10 bg-white/10 flex items-center justify-center"
                        >
                          {m.band.logoURL ? (
                            <img src={m.band.logoURL} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-[10px]">🎵</span>
                          )}
                        </button>

                        {/* Tooltip */}
                        <div className="pointer-events-none absolute left-1/2 top-9 -translate-x-1/2 hidden group-hover:block z-20">
                          <div className="rounded-xl bg-zinc-950 border border-white/10 px-3 py-2 text-xs text-white shadow-lg whitespace-nowrap">
                            <div className="font-semibold">{m.band.name}</div>
                            <div className="text-zinc-300">{m.band.role ?? "Mitglied"}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="text-sm text-zinc-300 mt-1 truncate">
                    {m.bandName ? `Band: ${m.bandName}` : `Status: ${m.status || "—"}`}
                  </div>
                </div>

                <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-zinc-200 border border-white/10">
                  {m.status || "—"}
                </span>
              </div>

              {m.roles?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {m.roles.slice(0, 6).map((r) => (
                    <span key={r} className="rounded-full bg-white/10 px-3 py-1 text-xs border border-white/10">
                      {r}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-2 flex items-center gap-2 text-xs text-zinc-300">
                <CantonCoat code={m.region} size={18} className="h-[18px] w-[18px]" />
                <span>
                  {KANTON_LABELS[m.region as keyof typeof KANTON_LABELS] ?? m.region}
                  {m.zip ? ` · PLZ ${m.zip}` : ""}
                </span>
              </div>

              <div className="mt-4 text-sm font-semibold text-zinc-100">
                Profil öffnen →
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
