import { Suspense } from "react";
import ProducerRequestsAdminClient from "./ProducerRequestsAdminClient";

export default function ProducerRequestsAdminPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-white/70">Lade…</div>}>
      <ProducerRequestsAdminClient />
    </Suspense>
  );
}
