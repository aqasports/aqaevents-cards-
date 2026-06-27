import React from "react";

// ─── StatCard ────────────────────────────────────────────────────────────────
export function StatCard({
  label,
  value,
  hint,
  icon,
  trend,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: React.ReactNode;
  trend?: { value: number; label: string };
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-md p-5 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-glow)] hover:border-[var(--primary)]/30 transition-all duration-300 active:scale-[0.99] group">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)] group-hover:text-[var(--primary)] transition-colors">{label}</p>
          <p className="mt-2 text-3xl font-bold text-[var(--foreground)] tabular-nums">{value}</p>
          {hint ? (
            <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p>
          ) : null}
          {trend ? (
            <p className={`mt-1 text-xs font-medium ${trend.value >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
              {trend.value >= 0 ? "+" : ""}{trend.value} {trend.label}
            </p>
          ) : null}
        </div>
        {icon ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-light)] text-[var(--primary)] group-hover:bg-[var(--primary)] group-hover:text-white transition-all duration-300">
            {icon}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─── PageHeader ──────────────────────────────────────────────────────────────
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 className="text-2xl font-bold text-[var(--foreground)]">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

// ─── Button ──────────────────────────────────────────────────────────────────
export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  loading,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
  loading?: boolean;
}) {
  const base = "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--primary)] focus-visible:outline-offset-2";

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
  };

  const variants = {
    primary: "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] hover:shadow-[var(--shadow-glow)] active:scale-[0.98] shadow-sm",
    secondary: "border border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-sm text-[var(--foreground)] hover:bg-[var(--surface-2)] hover:shadow-[var(--shadow-glow)] active:scale-[0.98] shadow-[var(--shadow-sm)]",
    danger: "bg-[var(--danger)] text-white hover:bg-red-700 active:scale-[0.98] shadow-sm",
    ghost: "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] rounded-lg",
  };

  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {loading ? (
        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : null}
      {children}
    </button>
  );
}

// ─── Input ───────────────────────────────────────────────────────────────────
export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & {
    label?: string;
    hint?: string;
    error?: string;
  }
>(({ label, hint, error, ...props }, ref) => {
  return (
    <label className="block text-sm">
      {label ? (
        <span className="mb-1.5 block font-medium text-[var(--foreground)]">{label}</span>
      ) : null}
      <input
        ref={ref}
        className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors duration-150 placeholder:text-[var(--muted-light)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] text-[var(--foreground)] ${
          error
            ? "border-[var(--danger)] bg-[var(--danger-bg)]"
            : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]"
        }`}
        {...props}
      />
      {hint && !error ? (
        <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p>
      ) : null}
      {error ? (
        <p className="mt-1 text-xs text-[var(--danger)]">{error}</p>
      ) : null}
    </label>
  );
});
Input.displayName = "Input";


// ─── Select ──────────────────────────────────────────────────────────────────
export function Select({
  label,
  hint,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  hint?: string;
}) {
  return (
    <label className="block text-sm">
      {label ? (
        <span className="mb-1.5 block font-medium text-[var(--foreground)]">{label}</span>
      ) : null}
      <select
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none transition-colors duration-150 hover:border-[var(--border-strong)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] text-[var(--foreground)]"
        {...props}
      >
        {children}
      </select>
      {hint ? (
        <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p>
      ) : null}
    </label>
  );
}

// ─── Textarea ────────────────────────────────────────────────────────────────
export function Textarea({
  label,
  hint,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  hint?: string;
}) {
  return (
    <label className="block text-sm">
      {label ? (
        <span className="mb-1.5 block font-medium text-[var(--foreground)]">{label}</span>
      ) : null}
      <textarea
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none transition-colors duration-150 hover:border-[var(--border-strong)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] resize-y text-[var(--foreground)]"
        rows={3}
        {...props}
      />
      {hint ? (
        <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p>
      ) : null}
    </label>
  );
}

// ─── Card ────────────────────────────────────────────────────────────────────
export function Card({
  children,
  className = "",
  padding = true,
}: {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-md shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-glow)] transition-all duration-300 ${padding ? "p-5" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

// ─── SectionTitle ────────────────────────────────────────────────────────────
export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)] mb-3">
      {children}
    </h3>
  );
}

// ─── Badge ───────────────────────────────────────────────────────────────────
export function Badge({
  children,
  tone = "default",
  size = "md",
}: {
  children: React.ReactNode;
  tone?: "default" | "success" | "warning" | "danger" | "info" | "primary";
  size?: "sm" | "md";
}) {
  const tones = {
    default: "bg-[var(--surface-2)] text-[var(--muted)]",
    success: "bg-[var(--success-bg)] text-[var(--success-text)]",
    warning: "bg-[var(--warning-bg)] text-[var(--warning-text)]",
    danger: "bg-[var(--danger-bg)] text-[var(--danger-text)]",
    info: "bg-[var(--info-bg)] text-[var(--info-text)]",
    primary: "bg-[var(--primary-light)] text-[var(--primary)]",
  };

  const sizes = {
    sm: "px-1.5 py-0.5 text-[10px]",
    md: "px-2.5 py-1 text-xs",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold ${tones[tone]} ${sizes[size]}`}
    >
      {children}
    </span>
  );
}

// ─── Alert ───────────────────────────────────────────────────────────────────
export function Alert({
  children,
  tone = "info",
}: {
  children: React.ReactNode;
  tone?: "success" | "warning" | "danger" | "info";
}) {
  const tones = {
    success: "bg-[var(--success-bg)] border-[var(--success)] text-[var(--success-text)]",
    warning: "bg-[var(--warning-bg)] border-[var(--warning)] text-[var(--warning-text)]",
    danger: "bg-[var(--danger-bg)] border-[var(--danger)] text-[var(--danger-text)]",
    info: "bg-[var(--info-bg)] border-[var(--primary)] text-[var(--info-text)]",
  };

  return (
    <div className={`rounded-lg border-l-4 px-4 py-3 text-sm ${tones[tone]}`}>
      {children}
    </div>
  );
}

// ─── EmptyState ──────────────────────────────────────────────────────────────
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon ? (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-[var(--muted)]">
          {icon}
        </div>
      ) : null}
      <p className="font-semibold text-[var(--foreground)]">{title}</p>
      {description ? (
        <p className="mt-1 text-sm text-[var(--muted)] max-w-xs">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

// ─── Divider ─────────────────────────────────────────────────────────────────
export function Divider() {
  return <hr className="border-[var(--border)]" />;
}

// ─── ConfirmModal ────────────────────────────────────────────────────────────
export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  isDanger = false,
}: {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDanger?: boolean;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] bg-slate-50/50">
          <h3 className="font-bold text-[var(--foreground)] flex items-center gap-2">
            {isDanger ? (
              <svg className="h-5 w-5 text-[var(--danger)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            ) : (
              <svg className="h-5 w-5 text-[var(--primary)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {title}
          </h3>
          <button
            onClick={onCancel}
            type="button"
            className="h-7 w-7 flex items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-2)] transition"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {/* Body */}
        <div className="p-5 text-sm text-[var(--muted)] leading-relaxed whitespace-pre-line">
          {message}
        </div>
        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-[var(--border)] bg-slate-50/20">
          <Button
            variant="secondary"
            className="flex-1"
            type="button"
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={isDanger ? "danger" : "primary"}
            className="flex-1"
            type="button"
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
