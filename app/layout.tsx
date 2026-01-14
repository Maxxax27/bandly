import "./globals.css";
import Providers from "./providers";
import Header from "@/components/Header";
import HeaderNav from "@/components/HeaderNav";
import MobileBottomNav from "@/components/MobileBottomNav";

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

          {/* HeaderNav nur Desktop (oben keine Reiter auf Mobile) */}
          <div className="hidden md:block">
            <HeaderNav />
          </div>

          {/* Seitencontent */}
          <main className="mx-auto max-w-6xl px-4 py-8">
            <div className="rounded-[2.5rem] border border-zinc-200 bg-white p-6 shadow-lg md:p-8">
              {children}
            </div>
          </main>

          {/* BottomNav: nur Mobile (Komponente hat md:hidden) */}
          <MobileBottomNav />
        </Providers>
      </body>
    </html>
  );
}
