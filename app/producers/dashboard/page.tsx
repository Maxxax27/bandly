import { Suspense } from "react";
import ProducerDashboardClient from "./ProducerDashboardClient";

export default function ProducerDashboardPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-white/70">Lade Dashboard…</div>}>
      <ProducerDashboardClient />
    </Suspense>
  );
}
