import "./globals.css";
import Providers from "./providers";
import Header from "@/components/Header";
import HeaderNav from "@/components/HeaderNav";

export const metadata = {
  title: "Bandly | Schweizer Bandbörse",
  description: "Finde Musiker:innen & Bands in der Schweiz.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" className="dark">
      <body className="min-h-screen bg-[#f7f7fb] text-zinc-900 antialiased">
        <Providers>
          <Header />

          {/* Main */}
          <main className="mx-auto max-w-6xl px-4 py-8">
            <div className="rounded-[2.5rem] bg-white border border-zinc-200 shadow-lg p-6 md:p-8">
              {children}
            </div>
          </main>
        </Providers>
      </body>
    </html>
  );
}

