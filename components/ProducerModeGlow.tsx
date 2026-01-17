"use client";

import { useEffect, useState } from "react";

export default function ProducerModeGlow({ active }: { active: boolean }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!active) return;

    setShow(true);
    const t = setTimeout(() => setShow(false), 900);
    return () => clearTimeout(t);
  }, [active]);

  if (!show) return null;

  return (
    <div
      className="
        pointer-events-none
        fixed inset-0 z-[9998]
        ring-4 ring-blue-400/60
        rounded-none
        animate-producer-glow
      "
    />
  );
}
