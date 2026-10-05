"use client";

import React, { useEffect, useId } from "react";

export const FIELD_CLASS =
  "w-full px-3 py-2 rounded-[10px] bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-slate-500 text-sm focus:outline-none focus:border-[var(--primary)] focus:shadow-[var(--shadow-glow)] transition-colors disabled:opacity-60";

export const LABEL_CLASS =
  "block text-xs font-semibold text-[var(--muted)] mb-1";

interface ModalShellProps {
  title: string;
  closeLabel: string;
  onClose: () => void;
  /** Disables Escape and the close button while a request is in flight. */
  busy?: boolean;
  maxWidth?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Accessible dialog frame: role="dialog", Escape to close, locked page scroll,
 * sticky header and footer with a scrollable body. The backdrop deliberately does not
 * close the dialog, so a half-filled financial form is never lost by a stray click.
 */
export function ModalShell({
  title,
  closeLabel,
  onClose,
  busy = false,
  maxWidth = "max-w-lg",
  footer,
  children,
}: ModalShellProps) {
  const titleId = useId();

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onClose();
    }
    document.addEventListener("keydown", handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [busy, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`w-full ${maxWidth} max-h-[94vh] flex flex-col rounded-t-[20px] sm:rounded-[20px] bg-[var(--surface)] border border-[var(--border)] shadow-2xl overflow-hidden`}
      >
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between gap-3 bg-[var(--surface-2)]/40">
          <h3 id={titleId} className="font-bold text-base text-[var(--foreground)]">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label={closeLabel}
            className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors disabled:opacity-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">{children}</div>

        {footer ? (
          <div className="px-5 py-4 border-t border-[var(--border)] bg-[var(--surface-2)]/40 space-y-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
