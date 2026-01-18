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
    {
      title: "Producer",
      desc: "Producer entdecken",
      href: "/producers",
      icon: "🎚️",
    },
    {
      title: "Venues",
      desc: "Veranstaltungsorte entdecken",
      href: "/venues",
      icon: "🏟️",
    },
  ];

  return (
    <div className="pb-28 space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-lg font-semibold text-white">Suche</h1>
        <p className="mt-1 text-sm text-white/60">
          Finde Musiker, Bands, Producer und Venues.
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

      {/* Venue Apply CTA */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-white">
              Eigene Venue eintragen
            </div>
            <div className="mt-1 text-sm text-white/60">
              Bewirb dich als Veranstaltungsort und erhalte Anfragen von Bands & Musikern.
            </div>
          </div>

          <Link
            href="/venues/apply"
            className="
              shrink-0 rounded-xl
              border border-white/10
              bg-white/10
              px-3 py-1.5
              text-xs font-semibold text-white
              transition
              hover:bg-white/20
            "
          >
            Venue bewerben
          </Link>
        </div>
      </div>
    </div>
  );
}
