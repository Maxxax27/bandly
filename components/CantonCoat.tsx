"use client";

// eslint-disable-next-line @next/next/no-img-element
import React from "react";
import { KANTON_LABELS } from "@/lib/cantons";

type Props = {
  code?: string | null; // "LU", "ZH", ...
  size?: number;        // px
  className?: string;
};

export default function CantonCoat({ code, size = 18, className = "" }: Props) {
  const c = (code ?? "").trim().toUpperCase();
  if (!c) return null;

  const src = `/cantons/${c.toLowerCase()}.svg`;
  const label = (KANTON_LABELS as any)[c] ?? c;

  return (
    <img
      src={src}
      width={size}
      height={size}
      alt={label}
      title={label}
      className={`block shrink-0 object-contain ${className}`}
      onError={(e) => {
        // kein "broken image" wenn mal ein Kanton fehlt
        e.currentTarget.style.display = "none";
      }}
    />
  );
}
