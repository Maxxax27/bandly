"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onIdTokenChanged, type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useMemo, useRef, useState } from "react";

function clsx(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

type ProfileDoc = {
  photoURL?: string | null;
  activeRole?: "user" | "producer";
  updatedAt?: any; // serverTimestamp()
};

type ProducerDoc = {
  verified?: boolean;
};

function cacheBust(url: string, v?: string | number | null) {
  if (!v) return url;
  return url.includes("?") ? `${url}&v=${String(v)}` : `${url}?v=${String(v)}`;
}

export default function MobileBottomNav() {
  const pathname = usePathname();

  const [user, setUser] = useState<User | null>(auth.currentUser);
  const uid = user?.uid ?? null;

  const [profile, setProfile] = useState<ProfileDoc | null>(null);
  const [producer, setProducer] = useState<ProducerDoc | null>(null);

  // Guard against events after unmount
  const aliveRef = useRef(true);

  // ✅ More stable than onAuthStateChanged in fast navigation + dev
  useEffect(() => {
    aliveRef.current = true;

    const unsub = onIdTokenChanged(auth, (u) => {
      if (!aliveRef.current) return;
      setUser(u);

      if (!u) {
        setProfile(null);
        setProducer(null);
      }
    });

    return () => {
      aliveRef.current = false;
      unsub();
    };
  }, []);

  // Profile live (Avatar + activeRole)
  useEffect(() => {
    if (!uid) {
      setProfile(null);
      return;
    }

    let unsub: (() => void) | null = null;
    let cancelled = false;

    // ✅ start subscription next microtask (reduces watch race)
    Promise.resolve().then(() => {
      if (cancelled || !aliveRef.current) return;

      const ref = doc(db, "profiles", uid);
      unsub = onSnapshot(
        ref,
        (snap) => {
          if (!aliveRef.current) return;
          setProfile(snap.exists() ? (snap.data() as ProfileDoc) : null);
        },
        () => {
          if (!aliveRef.current) return;
          setProfile(null);
        }
      );
    });

    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
    // ✅ pathname included => clean re-subscribe on route change
  }, [uid, pathname]);

  // Producer doc live (verified gate)
  useEffect(() => {
    if (!uid) {
      setProducer(null);
      return;
    }

    let unsub: (() => void) | null = null;
    let cancelled = false;

    Promise.resolve().then(() => {
      if (cancelled || !aliveRef.current) return;

      const ref = doc(db, "producers", uid);
      unsub = onSnapshot(
        ref,
        (snap) => {
          if (!aliveRef.current) return;
          setProducer(snap.exists() ? (snap.data() as ProducerDoc) : null);
        },
        () => {
          if (!aliveRef.current) return;
          setProducer(null);
        }
      );
    });

    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, [uid, pathname]);

  const loginHref = "/login";
  const isVerifiedProducer = producer?.verified === true;

  // activeRole darf nur producer sein, wenn verified
  const activeRole: "user" | "producer" =
    profile?.activeRole === "producer" && isVerifiedProducer ? "producer" : "user";

  const avatarSrc = useMemo(() => {
    const base = profile?.photoURL ?? user?.photoURL ?? "/default-avatar.png";

    const v =
      profile?.updatedAt?.seconds ??
      profile?.updatedAt?.toMillis?.() ??
      profile?.updatedAt?.toDate?.()?.getTime?.() ??
      null;

    return cacheBust(base, v ? String(v) : null);
  }, [profile?.photoURL, profile?.updatedAt, user?.photoURL]);

  // Links / Labels
  const profileHref = uid ? "/profile" : loginHref;
  const profileLabel = uid ? "Profil" : "Login";

  // ✅ User-Mode Nav (wie vorher)
  const userItems = [
    { href: "/", label: "Feed", icon: HomeIcon },
    { href: "/search", label: "Suche", icon: SearchIcon },
    { href: "/listings", label: "Inserate", icon: TagIcon },
    { href: "/events", label: "Events", icon: CalendarIcon },
    { href: profileHref, label: profileLabel, icon: UserIcon },
  ] as const;

  // ✅ Producer-Mode Nav (wie du wolltest)
  const producerItems = [
    { href: "/", label: "Feed", icon: HomeIcon },
    { href: "/producers/dashboard", label: "Dashboard", icon: DashboardIcon },
    { href: "/producers/dashboard", label: "Anfragen", icon: InboxIcon }, // später /producers/dashboard?tab=requests
    { href: "/messages", label: "Chats", icon: ChatIcon },
    { href: profileHref, label: profileLabel, icon: UserIcon },
  ] as const;

  const items = activeRole === "producer" ? producerItems : userItems;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-[9999] md:hidden border-t border-white/10 bg-black/80 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Bottom Navigation"
    >
      <div className="mx-auto w-full max-w-md px-2">
        <ul className="grid grid-cols-5 gap-1 py-2">
          {items.map((it, idx) => {
            const isProfileItem = idx === items.length - 1;
            const active = isActive(pathname, it.href);
            const Icon = it.icon;

            if (isProfileItem && uid) {
              return (
                <li key={it.label}>
                  <Link
                    href={it.href}
                    prefetch={false}
                    className={clsx(
                      "flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs",
                      active ? "text-white" : "text-white/60 hover:text-white"
                    )}
                    aria-current={active ? "page" : undefined}
                    aria-label="Profil"
                  >
                    <span
                      className={clsx(
                        "grid place-items-center rounded-lg p-1",
                        active && "bg-white/10"
                      )}
                      aria-hidden="true"
                    >
                      <img
                        src={avatarSrc}
                        alt="Profil"
                        className={clsx(
                          "h-[22px] w-[22px] rounded-full object-cover border",
                          active ? "border-white/60" : "border-white/20"
                        )}
                      />
                    </span>
                    <span className={clsx(active && "font-semibold")}>Profil</span>
                  </Link>
                </li>
              );
            }

            return (
              <li key={it.label}>
                <Link
                  href={it.href}
                  prefetch={false}
                  className={clsx(
                    "flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs",
                    active ? "text-white" : "text-white/60 hover:text-white"
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon active={active} />
                  <span className={clsx(active && "font-semibold")}>{it.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

/* --- Icons --- */

function IconBase({
  children,
  active,
}: {
  children: React.ReactNode;
  active: boolean;
}) {
  return (
    <span
      className={clsx(
        "grid place-items-center rounded-lg p-1",
        active && "bg-white/10"
      )}
      aria-hidden="true"
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        className={clsx(active ? "opacity-100" : "opacity-90")}
      >
        {children}
      </svg>
    </span>
  );
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <IconBase active={active}>
      <path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </IconBase>
  );
}

function SearchIcon({ active }: { active: boolean }) {
  return (
    <IconBase active={active}>
      <path
        d="M10.5 18a7.5 7.5 0 1 1 5.3-12.8A7.5 7.5 0 0 1 10.5 18Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M16.3 16.3 20 20"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </IconBase>
  );
}

function TagIcon({ active }: { active: boolean }) {
  return (
    <IconBase active={active}>
      <path
        d="M3.5 12.2V6.5A2 2 0 0 1 5.5 4.5h5.7a2 2 0 0 1 1.4.6l8 8a2 2 0 0 1 0 2.8l-4.7 4.7a2 2 0 0 1-2.8 0l-8-8a2 2 0 0 1-.6-1.4Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </IconBase>
  );
}

function CalendarIcon({ active }: { active: boolean }) {
  return (
    <IconBase active={active}>
      <path
        d="M7 3v3M17 3v3M4.5 8.5h15"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <rect
        x="4"
        y="6"
        width="16"
        height="14"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </IconBase>
  );
}

function UserIcon({ active }: { active: boolean }) {
  return (
    <IconBase active={active}>
      <path
        d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M4.5 20.5a7.5 7.5 0 0 1 15 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </IconBase>
  );
}

/* Producer Mode Icons */
function DashboardIcon({ active }: { active: boolean }) {
  return (
    <IconBase active={active}>
      <path
        d="M4 4h7v7H4V4Zm9 0h7v4h-7V4Zm0 6h7v10h-7V10ZM4 13h7v7H4v-7Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </IconBase>
  );
}

function InboxIcon({ active }: { active: boolean }) {
  return (
    <IconBase active={active}>
      <path
        d="M4 4h16v12H4V4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M4 16l4-5h3l2 2h2l2-2h3l4 5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </IconBase>
  );
}

function ChatIcon({ active }: { active: boolean }) {
  return (
    <IconBase active={active}>
      <rect
        x="4"
        y="5"
        width="16"
        height="12"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M8 17l-3 3v-3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </IconBase>
  );
}
