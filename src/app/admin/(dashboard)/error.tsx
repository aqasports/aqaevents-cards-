"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function AdminDashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (

    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div
        style={{
          textAlign: "center",
          padding: "2.5rem 2rem",
          background: "var(--card-bg, #111827)",
          border: "1px solid var(--border, #1f2937)",
          borderRadius: "16px",
          maxWidth: "480px",
          width: "90%",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            background: "rgba(245, 158, 11, 0.1)",
            color: "#f59e0b",
            fontSize: "1.5rem",
            fontWeight: "bold",
            marginBottom: "1.25rem",
          }}
        >
          !
        </div>
        <h2
          style={{
            fontSize: "1.25rem",
            fontWeight: 700,
            margin: "0 0 0.75rem 0",
            color: "var(--foreground, #ffffff)",
          }}
        >
          Dashboard failed to load
        </h2>
        <p
          style={{
            color: "var(--muted-foreground, #9ca3af)",
            lineHeight: 1.6,
            fontSize: "0.9rem",
            margin: "0 0 1.5rem 0",
          }}
        >
          A server error prevented the dashboard from loading. This is usually temporary -- try refreshing the page.
        </p>
        {error?.digest && (
          <p
            style={{
              color: "#6b7280",
              fontSize: "0.75rem",
              margin: "0 0 1rem 0",
              fontFamily: "monospace",
            }}
          >
            Ref: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          style={{
            padding: "0.5rem 1.25rem",
            background: "#2563eb",
            color: "#ffffff",
            border: "none",
            borderRadius: "8px",
            fontSize: "0.875rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Retry
        </button>
      </div>
    </div>
  );
}
