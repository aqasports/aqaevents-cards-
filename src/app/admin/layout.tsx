import { AuthProvider } from "@/components/providers/session-provider";

// Server component — provides SessionProvider context to the /admin/login page
// and any other non-dashboard admin routes.
// Auth enforcement for dashboard routes is handled by (dashboard)/layout.tsx.
export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthProvider>{children}</AuthProvider>;
}
