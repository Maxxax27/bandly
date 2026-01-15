"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { auth } from "@/lib/firebase";

function clsx(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function MobileBottomNav() {
  const pathname = usePathname();
  const uid = auth.currentUser?.uid;

  const profileHref = uid ? `/musicians/${uid}` : "/";

  const items = [
    { href: "/", label: "Feed", icon: HomeIcon },
    { href: "/search", label: "Suche", icon: SearchIcon },
    { href: "/listings", label: "Inserate", icon: TagIcon },
    { href: "/events", label: "Events", icon: CalendarIcon },
    { href: profileHref, label: "Profil", icon: UserIcon },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-[9999]  border-t border-white/10 bg-black/80 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Bottom Navigation"
    >
      <div className="mx-auto w-full max-w-md px-2">
        <ul className="grid grid-cols-5 gap-1 py-2">
          {items.map((it) => {
            const active = isActive(pathname, it.href);
            const Icon = it.icon;

            return (
              <li key={it.label}>
                <Link
                  href={it.href}
                  className={clsx(
                    "flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs",
                    active
                      ? "text-white"
                      : "text-white/60 hover:text-white"
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon active={active} />
                  <span className={clsx(active && "font-semibold")}>
                    {it.label}
                  </span>
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
