"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, PageHeader, Input, Alert } from "@/components/admin/ui";

export default function NewClubPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const name = formData.get("name") as string;
    const logoUrl = formData.get("logoUrl") as string;
    const contactName = formData.get("contactName") as string;
    const contactEmail = formData.get("contactEmail") as string;
    const contactPhone = formData.get("contactPhone") as string;

    try {
      const res = await fetch("/api/admin/clubs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          logoUrl: logoUrl.trim() || null,
          contactName: contactName.trim() || null,
          contactEmail: contactEmail.trim() || null,
          contactPhone: contactPhone.trim() || null,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        router.push("/admin/clubs");
        router.refresh();
      } else {
        setError(data.error || "Failed to create club.");
        setSubmitting(false);
      }
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="animate-fade-in max-w-2xl mx-auto space-y-6">
      <PageHeader
        title="New Partner Club"
        description="Register a new third-party partner organisation and generate their terminal scan link."
      />

      {error && (
        <Alert tone="danger">
          {error}
        </Alert>
      )}

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Club Name"
            name="name"
            placeholder="e.g. Rockwall Climbing Co."
            required
            autoFocus
          />

          <Input
            label="Club Logo URL"
            name="logoUrl"
            placeholder="e.g. https://example.com/logo.png"
          />

          <Input
            label="Contact Name"
            name="contactName"
            placeholder="e.g. John Doe"
          />

          <Input
            label="Contact Email"
            name="contactEmail"
            type="email"
            placeholder="e.g. info@rockwall.com"
          />

          <Input
            label="Contact Phone"
            name="contactPhone"
            placeholder="e.g. +213 555 123 456"
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
            <Link href="/admin/clubs">
              <Button type="button" variant="secondary" disabled={submitting}>
                Cancel
              </Button>
            </Link>
            <Button type="submit" loading={submitting}>
              Create Club
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
