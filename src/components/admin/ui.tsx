"use client";

import React, { useState } from "react";
import { useLocale } from "@/lib/i18n";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { Sparkline } from "@/components/ui/sparkline";
import { playSensorySound } from "@/lib/sensory";

// ─── StatCard ────────────────────────────────────────────────────────────────
export function StatCard({
  label,
  value,
  hint,
  icon,
  trend,
  sparklineData,
  animated = false,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: React.ReactNode;
  trend?: { value: number; label: string };
  sparklineData?: number[];
  animated?: boolean;
}) {
  const isNumeric = typeof value === "number";

  return (
    <div className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-md p-3.5 sm:p-5 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-glow)] hover:border-[var(--primary)]/40 transition-all duration-300 active:scale-[0.99] group">
      {/* Dynamic ambient highlight on hover */}
      <div className="pointer-events-none absolute -inset-px opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-transparent via-[var(--primary)]/5 to-transparent -translate-x-full group-hover:translate-x-full duration-1000" />
      
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)] group-hover:text-[var(--primary)] transition-colors">
            {label}
          </p>
          <p className="mt-2 text-2xl sm:text-3xl font-bold text-[var(--foreground)] tabular-nums">
            {animated && isNumeric ? (
              <AnimatedCounter value={value as number} />
            ) : (
              value
            )}
          </p>
          {hint ? (
            <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p>
          ) : null}
          {trend ? (
            <p className={`mt-1 text-xs font-medium ${trend.value >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
              {trend.value >= 0 ? "+" : ""}{trend.value} {trend.label}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          {icon ? (
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-[var(--primary-light)] text-[var(--primary)] group-hover:bg-[var(--primary)] group-hover:text-white group-hover:shadow-[0_0_15px_rgba(14,165,233,0.5)] transition-all duration-300">
              {icon}
            </div>
          ) : null}
          {sparklineData && sparklineData.length >= 2 ? (
            <div className="mt-1">
              <Sparkline data={sparklineData} width={72} height={22} />
            </div>
          ) : null}
        </div>
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
    <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
      <div>
        <h2 className="text-2xl font-bold text-[var(--foreground)] tracking-tight">{title}</h2>
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
  sound = true,
  onClick,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
  loading?: boolean;
  sound?: boolean;
}) {
  const base = "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--primary)] focus-visible:outline-offset-2 select-none cursor-pointer";

  const sizes = {
    sm: "px-3 py-2 text-xs min-h-[36px]",
    md: "px-4 py-2.5 text-sm min-h-[44px]",
  };

  const variants = {
    primary: "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] hover:shadow-[var(--shadow-glow)] active:scale-[0.97] shadow-sm",
    secondary: "border border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-sm text-[var(--foreground)] hover:bg-[var(--surface-2)] hover:shadow-[var(--shadow-glow)] hover:border-[var(--border-strong)] active:scale-[0.97] shadow-[var(--shadow-sm)]",
    danger: "bg-[var(--danger)] text-white hover:bg-red-700 active:scale-[0.97] shadow-sm",
    ghost: "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] rounded-lg active:scale-[0.97]",
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (sound && !loading && !props.disabled) {
      playSensorySound("click");
    }
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      onClick={handleClick}
      {...props}
    >
      {loading ? (
        <svg className="h-4 w-4 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
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
  let locale: string | undefined = undefined;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const locObj = useLocale();
    locale = locObj.locale;
  } catch {
    // fallback if context is not yet loaded
  }

  const isDateOrTime = props.type === "datetime-local" || props.type === "date" || props.type === "time";
  const derivedLang = props.lang || (isDateOrTime ? (locale === "ar" ? "ar-EG" : locale === "fr" ? "fr" : "en-GB") : undefined);

  return (
    <label className="block text-sm">
      {label ? (
        <span className="mb-1.5 block font-medium text-[var(--foreground)]">{label}</span>
      ) : null}
      <input
        ref={ref}
        lang={derivedLang}
        className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-all duration-150 placeholder:text-[var(--muted-light)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] focus:shadow-[0_0_12px_rgba(14,165,233,0.2)] text-[var(--foreground)] ${
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
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm outline-none transition-all duration-150 hover:border-[var(--border-strong)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] focus:shadow-[0_0_12px_rgba(14,165,233,0.2)] text-[var(--foreground)] cursor-pointer"
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
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none transition-all duration-150 hover:border-[var(--border-strong)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] focus:shadow-[0_0_12px_rgba(14,165,233,0.2)] resize-y text-[var(--foreground)]"
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
      className={`rounded-xl border border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-md shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-glow)] transition-all duration-300 ${padding ? "p-3.5 sm:p-5" : ""} ${className}`}
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
    default: "bg-[var(--surface-2)] text-[var(--muted)] border border-[var(--border)]",
    success: "bg-[var(--success-bg)] text-[var(--success-text)] border border-[var(--success)]/20 shadow-[0_0_8px_rgba(16,185,129,0.15)]",
    warning: "bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning)]/20 shadow-[0_0_8px_rgba(245,158,11,0.15)]",
    danger: "bg-[var(--danger-bg)] text-[var(--danger-text)] border border-[var(--danger)]/20 shadow-[0_0_8px_rgba(239,68,68,0.15)]",
    info: "bg-[var(--info-bg)] text-[var(--info-text)] border border-[var(--primary)]/20 shadow-[0_0_8px_rgba(14,165,233,0.15)]",
    primary: "bg-[var(--primary-light)] text-[var(--primary)] border border-[var(--primary)]/30 shadow-[0_0_10px_rgba(14,165,233,0.2)]",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-[10px]",
    md: "px-2.5 py-1 text-xs",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold transition-colors ${tones[tone]} ${sizes[size]}`}
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
    success: "bg-[var(--success-bg)] border-[var(--success)] text-[var(--success-text)] shadow-[0_0_12px_rgba(16,185,129,0.1)]",
    warning: "bg-[var(--warning-bg)] border-[var(--warning)] text-[var(--warning-text)] shadow-[0_0_12px_rgba(245,158,11,0.1)]",
    danger: "bg-[var(--danger-bg)] border-[var(--danger)] text-[var(--danger-text)] shadow-[0_0_12px_rgba(239,68,68,0.1)]",
    info: "bg-[var(--info-bg)] border-[var(--primary)] text-[var(--info-text)] shadow-[0_0_12px_rgba(14,165,233,0.1)]",
  };

  return (
    <div className={`rounded-lg border-l-4 px-4 py-3 text-sm transition-all duration-200 animate-fade-in ${tones[tone]}`}>
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
    <div className="flex flex-col items-center justify-center py-12 text-center animate-fade-in">
      {icon ? (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-[var(--muted)] shadow-[var(--shadow-sm)] border border-[var(--border)]">
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

// ─── Skeleton & SkeletonCard ─────────────────────────────────────────────────
export function Skeleton({
  className = "",
  rounded = "rounded-lg",
}: {
  className?: string;
  rounded?: string;
}) {
  return (
    <div
      className={`bg-gradient-to-r from-[var(--surface-2)] via-[var(--border-strong)] to-[var(--surface-2)] bg-[length:200%_100%] animate-pulse ${rounded} ${className}`}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/80 p-5 space-y-4">
      <Skeleton className="h-5 w-1/3" />
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
    </div>
  );
}

// ─── CopyPill ────────────────────────────────────────────────────────────────
export function CopyPill({
  textToCopy,
  label,
}: {
  textToCopy: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(textToCopy);
      playSensorySound("sparkle");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <button
      onClick={handleCopy}
      type="button"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--primary)] text-[var(--foreground)] hover:text-[var(--primary)] transition-all cursor-pointer select-none active:scale-95"
      title="Copy to clipboard"
    >
      <span>{label || textToCopy}</span>
      {copied ? (
        <svg className="w-3.5 h-3.5 text-[var(--success-text)] shrink-0 animate-fade-in" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5 text-[var(--muted)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </button>
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4 animate-fade-in">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md overflow-hidden animate-slide-up sm:animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] bg-[var(--surface-2)]/40">
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
        <div className="flex gap-3 px-5 py-4 border-t border-[var(--border)] bg-[var(--surface-2)]/20">
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
