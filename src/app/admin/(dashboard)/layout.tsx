import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { AdminNav } from "@/components/admin/admin-nav";
import { AuthProvider } from "@/components/providers/session-provider";

// Server component — runs before any child page fetches data.
// This is the second-layer auth guard: even if middleware fails (e.g. missing env var),
// the session is verified here server-side before any Prisma query runs.
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/admin/login");
  }

  return (
    <AuthProvider>
      <div className="min-h-screen bg-[var(--background)] flex flex-col lg:flex-row">
        <AdminNav />
        <main className="flex-1 px-3 pt-4 sm:px-4 sm:pt-6 lg:px-8 lg:py-8 md:max-w-7xl mx-auto w-full overflow-x-hidden pb-24 sm:pb-28 lg:pb-8" style={{ paddingBottom: 'max(5.5rem, calc(4.5rem + env(safe-area-inset-bottom)))' }}>
          {children}
        </main>
      </div>
    </AuthProvider>
  );
}
