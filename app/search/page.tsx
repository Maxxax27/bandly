import Link from "next/link";

export default function SearchPage() {
  const items = [
    {
      title: "Musiker",
      desc: "Musiker:innen entdecken",
      href: "/musicians",
      icon: "🎸",
    },
    {
      title: "Bands",
      desc: "Bands entdecken",
      href: "/bands",
      icon: "🥁",
    },
  ];

  return (
    <div className="pb-28 space-y-4">
      {/* Title */}
      <div>
        <h1 className="text-lg font-semibold text-white">Suche</h1>
        <p className="mt-1 text-sm text-white/60">
          Finde Musiker und Bands.
        </p>
      </div>

      {/* Cards */}
      <div className="grid gap-3">
        {items.map((it) => (
          <Link
            key={it.title}
            href={it.href}
            className="
              flex items-center gap-4 rounded-2xl
              border border-white/10
              bg-black/30 p-4
              transition
              hover:bg-white/5
              active:scale-[0.99]
            "
          >
            {/* Icon */}
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-black/40 text-lg">
              {it.icon}
            </div>

            {/* Text */}
            <div className="min-w-0">
              <div className="text-base font-semibold text-white">
                {it.title}
              </div>
              <div className="mt-0.5 text-sm text-white/60">
                {it.desc}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
