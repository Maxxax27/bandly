import "./globals.css";

import Header from "@/components/Header";
import HeaderNav from "@/components/HeaderNav";
import MobileBottomNav from "@/components/MobileBottomNav";
import Providers from "./providers";

export const metadata = {
  title: "Bandly | Schweizer Bandbörse",
  description: "Finde Musiker:innen & Bands in der Schweiz.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" className="dark">
      <body className="min-h-screen bg-black text-white antialiased">
        <Providers>
          <Header />

          {/* Tabs oben nur Desktop */}
          <div className="hidden md:block">
            <HeaderNav />
          </div>

          {/* Content */}
          <main className="min-h-[calc(100vh-64px)] w-full px-0 pt-0 pb-32 md:pb-8">
            {children}
          </main>
        </Providers>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav />
      </body>
    </html>
  );
}
