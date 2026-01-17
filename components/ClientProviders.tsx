"use client";

import { UserDataProvider } from "@/lib/user-data-context";

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return <UserDataProvider>{children}</UserDataProvider>;
}
