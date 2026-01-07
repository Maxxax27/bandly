const mockListings = [
  {
    id: "1",
    title: "Rockband sucht Bassist:in",
    region: "LU",
    genres: ["Rock", "Hard Rock"],
    instrument: "Bass",
  },
  {
    id: "2",
    title: "Gitarrist sucht Band (Blues/Rock)",
    region: "ZH",
    genres: ["Blues", "Rock"],
    instrument: "Gitarre",
  },
];

export default function ListingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Inserate</h1>

      <div className="grid gap-4">
        {mockListings.map((l) => (
          <div key={l.id} className="rounded-xl border p-4">
            <div className="font-semibold">{l.title}</div>
            <div className="text-sm opacity-80 mt-1">
              Region: {l.region} · Instrument: {l.instrument}
            </div>
            <div className="text-sm mt-2">
              Genres: {l.genres.join(", ")}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
