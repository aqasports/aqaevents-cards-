"use client";

import { useEffect, useState } from "react";
import { Card, Badge, Button } from "@/components/admin/ui";
import { useTranslations } from "@/lib/i18n";

interface ImportStatus {
  totalInRoster: number;
  readyToInsertCount: number;
  alreadyPresentCount: number;
  alreadyPresentNames: string[];
  totalExistingHommeInDb: number;
}

interface ImportResult {
  success: boolean;
  dryRun: boolean;
  totalInRoster: number;
  createdCount: number;
  skippedCount: number;
  created: Array<{ swimId: string; fullName: string; dateOfStart: string }>;
  skipped: Array<{ fullName: string; reason: string }>;
}

interface HommeRosterImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function HommeRosterImportModal({
  isOpen,
  onClose,
  onSuccess,
}: HommeRosterImportModalProps) {
  const { t } = useTranslations("swimRosterImport");
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [status, setStatus] = useState<ImportStatus | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      setResult(null);
      setErrorMsg(null);
    }
  }, [isOpen]);

  async function fetchStatus() {
    setLoadingStatus(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/swim/members/import-roster");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to load status");
      }
      const data = (await res.json()) as ImportStatus;
      setStatus(data);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingStatus(false);
    }
  }

  async function handleImport(dryRun: boolean) {
    setExecuting(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/swim/members/import-roster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Import failed");
      }
      const data = (await res.json()) as ImportResult;
      setResult(data);
      if (!dryRun) {
        onSuccess();
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setExecuting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[var(--border)] pb-4">
          <div>
            <h3 className="text-lg font-bold text-white tracking-wide">
              {t("modalTitle")}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {t("modalSubtitle")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 transition-colors text-sm"
          >
            [X]
          </button>
        </div>

        {/* Status / Error feedback */}
        {errorMsg && (
          <div className="p-3 bg-red-950/70 border border-red-800/60 rounded-xl text-red-300 text-xs font-mono">
            {t("errorPrefix")}{errorMsg}
          </div>
        )}

        {/* Inspection Stats */}
        {loadingStatus ? (
          <div className="py-8 text-center text-xs text-slate-400">
            {t("checking")}
          </div>
        ) : status ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="p-3 bg-slate-900/60 border border-slate-800">
              <div className="text-[11px] text-slate-400">{t("totalInRoster")}</div>
              <div className="text-xl font-bold text-cyan-400 mt-1 font-mono">
                {status.totalInRoster}
              </div>
            </Card>
            <Card className="p-3 bg-slate-900/60 border border-slate-800">
              <div className="text-[11px] text-slate-400">{t("readyToImport")}</div>
              <div className="text-xl font-bold text-emerald-400 mt-1 font-mono">
                {status.readyToInsertCount}
              </div>
            </Card>
            <Card className="p-3 bg-slate-900/60 border border-slate-800">
              <div className="text-[11px] text-slate-400">{t("alreadyPresent")}</div>
              <div className="text-xl font-bold text-slate-400 mt-1 font-mono">
                {status.alreadyPresentCount}
              </div>
            </Card>
          </div>
        ) : null}

        {/* Configuration Notice */}
        <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs space-y-1.5 text-slate-300">
          <div className="font-semibold text-slate-200">Import Configuration:</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-400 font-mono">
            <div>Category: <span className="text-cyan-300">homme</span></div>
            <div>Formula: <span className="text-cyan-300">G10</span></div>
            <div>Level: <span className="text-cyan-300">new_aqa</span></div>
            <div>Payment: <span className="text-amber-300">unpaid</span></div>
          </div>
          <p className="text-[11px] text-slate-400 pt-1">
            All 155 approved records have collision-free SwimIDs and active SwimCards auto-generated.
          </p>
        </div>

        {/* Result view */}
        {result && (
          <div className={`p-4 rounded-xl border ${
            result.dryRun
              ? "bg-sky-950/40 border-sky-800/60"
              : "bg-emerald-950/40 border-emerald-800/60"
          } space-y-3`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                {result.dryRun ? "Simulation Result" : t("successTitle")}
              </span>
              <Badge tone={result.dryRun ? "info" : "success"}>
                {result.createdCount} / {result.totalInRoster}
              </Badge>
            </div>
            <p className="text-xs text-slate-300">
              {t("successSummary", {
                created: result.createdCount,
                skipped: result.skippedCount,
              })}
            </p>

            {result.created.length > 0 && (
              <div className="max-h-40 overflow-y-auto border border-slate-800 rounded-lg p-2 bg-black/40 text-[11px] space-y-1 font-mono text-slate-300">
                {result.created.slice(0, 50).map((c, i) => (
                  <div key={i} className="flex justify-between">
                    <span>{c.swimId} - {c.fullName}</span>
                    <span className="text-slate-500">{c.dateOfStart.split("T")[0]}</span>
                  </div>
                ))}
                {result.created.length > 50 && (
                  <div className="text-slate-500 italic text-center pt-1">
                    ... and {result.created.length - 50} more
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
          <Button onClick={onClose} variant="secondary">
            {t("closeBtn")}
          </Button>

          {(!result || result.dryRun) && (
            <>
              <Button
                onClick={() => handleImport(true)}
                variant="secondary"
                disabled={executing || loadingStatus}
              >
                {t("dryRunBtn")}
              </Button>
              <Button
                onClick={() => handleImport(false)}
                variant="primary"
                disabled={executing || loadingStatus || (status?.readyToInsertCount === 0)}
              >
                {executing ? t("executing") : t("executeBtn")}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
