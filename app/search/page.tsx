import Link from "next/link";

export default function SearchPage() {
  const items = [
    {
      title: "Nachrichten",
      desc: "Deine Chats & Gespräche",
      href: "/messages", // wenn bei dir anders: z.B. "/nachrichten"
    },
    {
      title: "Musiker",
      desc: "Musiker:innen entdecken",
      href: "/musicians", // falls noch nicht existiert: als nächstes anlegen
    },
    {
      title: "Bands",
      desc: "Bands entdecken",
      href: "/bands", // falls noch nicht existiert: als nächstes anlegen
    },
  ];

  return (
    <div className="pb-28">
      <h1 className="text-xl font-semibold">Suche</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Entdecke Nachrichten, Musiker und Bands.
      </p>

      <div className="mt-6 grid gap-3">
        {items.map((it) => (
          <Link
            key={it.title}
            href={it.href}
            className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm active:scale-[0.99]"
          >
            <div className="text-base font-semibold">{it.title}</div>
            <div className="mt-1 text-sm text-zinc-500">{it.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
