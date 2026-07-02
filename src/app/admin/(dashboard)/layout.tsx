"use client";

import { AdminNav } from "@/components/admin/admin-nav";
import { useTranslations } from "@/lib/i18n";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { dir } = useTranslations("nav");

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col lg:flex-row" dir={dir}>
      <AdminNav />
      <main className="flex-1 px-4 py-8 lg:px-8 max-w-7xl mx-auto w-full overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
