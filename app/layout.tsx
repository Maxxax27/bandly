import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "Bandly – Schweizer Bandbörse",
  description: "Finde Musiker:innen & Bands in der Schweiz.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body className="min-h-screen">
        <header className="border-b">
          <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
            <Link href="/" className="font-bold">
              🎶 Bandly
            </Link>

            <nav className="flex gap-4 text-sm">
              <Link href="/listings" className="hover:underline">
                Inserate
              </Link>
              <Link href="/profile" className="hover:underline">
                Profil
              </Link>
              <Link href="/login" className="hover:underline">
                Login
              </Link>
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
