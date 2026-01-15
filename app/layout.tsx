import "./globals.css";
import Providers from "./providers";
import Header from "@/components/Header";
import HeaderNav from "@/components/HeaderNav";
import MobileBottomNav from "@/components/MobileBottomNav";

export const metadata = {
  title: "Bandly | Schweizer Musiker Community",
  description: "Finde Musiker:innen & Bands in der Schweiz.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className="dark">
      <body className="min-h-screen bg-black text-zinc-100 antialiased">
        <Providers>
          <Header />

          {/* Tabs oben nur Desktop */}
          <div className="hidden md:block">
            <HeaderNav />
          </div>

          {/* Platz für BottomNav auf Mobile */}
          <main className="mx-auto max-w-6xl px-4 py-6 pb-32 md:pb-8">
            {/* Seamless Dark Surface statt weißer Card */}
            <div className="rounded-2xl border border-black/5 bg-zinc-950/80 p-4 md:p-6">
              {children}
            </div>
          </main>
        </Providers>

        {/* BottomNav außerhalb Providers */}
        <MobileBottomNav />
      </body>
    </html>
  );
}
