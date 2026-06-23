import { AdminNav } from "@/components/admin/admin-nav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <AdminNav />
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
