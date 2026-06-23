"use client";

import { AuthProvider } from "@/components/providers/session-provider";

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthProvider>{children}</AuthProvider>;
}
