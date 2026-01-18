import { Suspense } from "react";
import VenueDashboardClient from "./VenueDashboardClient";

export default function VenueDashboardPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-white/70">Lade Venue Dashboard…</div>}>
      <VenueDashboardClient />
    </Suspense>
  );
}
