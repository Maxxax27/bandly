"use client";

import { AuthProvider } from "../lib/auth-context.tsx";

export default function Providers({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

