"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          background: "#0b0f19",
          color: "#f3f4f6",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
        }}
      >
        <div
          style={{
            textAlign: "center",
            padding: "2.5rem 2rem",
            background: "#111827",
            border: "1px solid #1f2937",
            borderRadius: "16px",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            maxWidth: "480px",
            width: "90%",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              background: "rgba(239, 68, 68, 0.1)",
              color: "#ef4444",
              fontSize: "1.75rem",
              fontWeight: "bold",
              marginBottom: "1.5rem",
            }}
          >
            !
          </div>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              margin: "0 0 0.75rem 0",
              color: "#ffffff",
              letterSpacing: "-0.025em",
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              color: "#9ca3af",
              lineHeight: 1.6,
              fontSize: "0.95rem",
              margin: "0 0 1.5rem 0",
            }}
          >
            An unexpected error occurred. Please try again or contact support if the problem persists.
          </p>
          {error?.digest && (
            <p
              style={{
                color: "#6b7280",
                fontSize: "0.8rem",
                margin: "0 0 1.5rem 0",
                fontFamily: "monospace",
              }}
            >
              Error reference: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              padding: "0.625rem 1.5rem",
              background: "#2563eb",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              fontSize: "0.9rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "background 0.2s",
            }}
            onMouseOver={(e) => ((e.target as HTMLButtonElement).style.background = "#1d4ed8")}
            onMouseOut={(e) => ((e.target as HTMLButtonElement).style.background = "#2563eb")}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
