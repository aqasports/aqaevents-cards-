"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Card, PageHeader, Alert } from "@/components/admin/ui";
import { useTranslations } from "@/lib/i18n";

// ─── Types ────────────────────────────────────────────────────────────────────

type CardItem = {
  cardId: string;
  cardCode: string;
  clientName: string | null;
  isBlank: boolean;
  url: string;
  qrDataUrl: string;
};

type Mode = "prebatch" | "clientcards";

// ─── Card face component ──────────────────────────────────────────────────────

function QRCardFace({
  item,
  qrSizePx,
  isSelected,
  onToggle,
}: {
  item: CardItem;
  qrSizePx: number;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslations("print");
  const previewSize = Math.min(qrSizePx, 160); // cap preview size

  return (
    <div className={`relative ${!isSelected ? "print:hidden" : ""}`}>
      {/* Checkbox — screen only */}
      <label className="absolute left-3 top-3 z-10 flex cursor-pointer items-center gap-1.5 print:hidden">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggle}
          className="h-4 w-4 accent-blue-600"
        />
      </label>

      {/* Card face */}
      <div
        className={`flex flex-col items-center gap-2.5 rounded-2xl border p-4 text-center break-inside-avoid transition-all duration-150 ${
          isSelected
            ? "border-blue-500 bg-white ring-1 ring-blue-400 shadow-md"
            : "border-slate-200 bg-slate-50 opacity-40"
        }`}
      >
        {/* Brand header */}
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="h-5 w-5 rounded-md bg-blue-700 text-white flex items-center justify-center text-[9px] font-black">
              AQ
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-700">
              AQA Sports
            </span>
          </div>
          <span className="text-[9px] font-medium text-slate-400">
            {item.isBlank ? t("labelPrePrinted") : t("labelEventCard")}
          </span>
        </div>

        {/* QR code */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.qrDataUrl}
          alt={`QR code ${item.cardCode}`}
          style={{ width: previewSize, height: previewSize }}
          className="rounded-lg"
        />

        {/* Card code (ID number) — big and visible for matching */}
        <div className="w-full space-y-0.5">
          <p className="font-mono text-base font-black tracking-widest text-slate-900">
            {item.cardCode}
          </p>
          {item.clientName ? (
            <p className="text-sm font-semibold text-slate-700">{item.clientName}</p>
          ) : (
            <p className="text-xs italic text-slate-400">{t("unassigned")}</p>
          )}
          <p className="text-[9px] text-slate-400 mt-0.5">{t("scanToCheck")}</p>
        </div>

        <div className="w-full border-t border-dashed border-slate-200" />
        <p className="text-[9px] text-slate-400">aqasports.com/eventcard</p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PrintPage() {
  const { t, dir } = useTranslations("print");
  const [mode, setMode] = useState<Mode>("prebatch");

  // Pre-batch state
  const [batchCount, setBatchCount] = useState(50);
  const [batchGenerating, setBatchGenerating] = useState(false);

  // Size state (mm is proprietary. Default to 38 mm)
  const [qrSizeMm, setQrSizeMm] = useState<number>(38);
  // 1 mm ≈ 3.7795 pixels. Clamp generated px within Zod schema limits (100 - 800)
  const qrSizePx = Math.max(100, Math.min(800, Math.round(qrSizeMm * 3.7795)));

  // Cards state
  const [items, setItems] = useState<CardItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: "success" | "danger" | "info" } | null>(null);

  const hasFetchedClientCards = useRef(false);

  // Load client cards on mode switch
  useEffect(() => {
    if (mode === "clientcards" && !hasFetchedClientCards.current) {
      hasFetchedClientCards.current = true;
      loadClientCards();
    }
    if (mode === "prebatch") {
      setItems([]);
      setSelected(new Set());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  async function loadClientCards() {
    setLoading(true);
    setMessage(null);
    const res = await fetch("/api/admin/cards/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "client", qrSize: qrSizePx }),
    });
    const data = await res.json();
    const loaded: CardItem[] = data.items ?? [];
    setItems(loaded);
    setSelected(new Set(loaded.map((i) => i.cardId)));
    setLoading(false);
  }

  async function regenerateWithSize() {
    if (mode === "clientcards") {
      hasFetchedClientCards.current = false;
      loadClientCards();
    } else if (items.length > 0) {
      // Re-render existing batch with new size (QR data URLs are size-dependent)
      setBatchGenerating(true);
      const res = await fetch("/api/admin/cards/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "blank",
          qrSize: qrSizePx,
          // Only re-export the ones we already have
          clientIds: [],
        }),
      });
      const data = await res.json();
      setItems(data.items ?? []);
      setBatchGenerating(false);
    }
  }

  async function generateBatch() {
    if (batchCount < 1 || batchCount > 200) return;
    setBatchGenerating(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/cards/prebatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: batchCount, qrSize: qrSizePx }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ text: data.error ?? t("networkError"), tone: "danger" });
        return;
      }

      const newItems: CardItem[] = data.cards.map(
        (c: { id: string; cardCode: string; url: string; qrDataUrl: string }) => ({
          cardId: c.id,
          cardCode: c.cardCode,
          clientName: null,
          isBlank: true,
          url: c.url,
          qrDataUrl: c.qrDataUrl,
        }),
      );

      setItems(newItems);
      setSelected(new Set(newItems.map((i) => i.cardId)));
      setMessage({
        text: t("successBatchGen", {
          count: newItems.length,
          start: newItems[0]?.cardCode ?? "",
          end: newItems[newItems.length - 1]?.cardCode ?? "",
        }),
        tone: "success",
      });
    } catch {
      setMessage({ text: t("networkError"), tone: "danger" });
    } finally {
      setBatchGenerating(false);
    }
  }

  function toggleCard(cardId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  }

  function downloadCSV() {
    const visible = items.filter((i) => selected.has(i.cardId));
    if (visible.length === 0) {
      setMessage({ text: t("selectOneCardFirst"), tone: "info" });
      return;
    }
    const rows = [
      ["Card Code (ID)", "Status", "Client", "QR URL"],
      ...visible.map((i) => [i.cardCode, i.isBlank ? "BLANK" : "ASSIGNED", i.clientName ?? "", i.url]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aqa-qr-batch-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportPDF() {
    const visible = items.filter((i) => selected.has(i.cardId));
    if (visible.length === 0) {
      setMessage({ text: t("selectOneCardFirst"), tone: "info" });
      return;
    }

    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 10;
      const gap = 5;

      const itemWidth = qrSizeMm;
      const itemHeight = qrSizeMm + 6; // QR code height + card code label gap

      // Calculate columns and rows that can fit on an A4 page
      const cols = Math.max(1, Math.floor((pageWidth - 2 * margin + gap) / (itemWidth + gap)));
      const rows = Math.max(1, Math.floor((pageHeight - 2 * margin + gap) / (itemHeight + gap)));
      const itemsPerPage = cols * rows;

      visible.forEach((item, index) => {
        if (index > 0 && index % itemsPerPage === 0) {
          doc.addPage();
        }

        const pageIdx = index % itemsPerPage;
        const col = pageIdx % cols;
        const row = Math.floor(pageIdx / cols);

        const x = margin + col * (itemWidth + gap);
        const y = margin + row * (itemHeight + gap);

        // Add QR code image
        doc.addImage(item.qrDataUrl, "PNG", x, y, itemWidth, itemWidth);

        // Add centered card code text below the QR code
        doc.setFont("courier", "bold");
        doc.setFontSize(8);
        doc.text(item.cardCode, x + itemWidth / 2, y + itemWidth + 4, { align: "center" });
      });

      doc.save(`aqa-qr-cards-${new Date().toISOString().split("T")[0]}.pdf`);
      setMessage({ text: t("successExportPdf"), tone: "success" });
    } catch (err) {
      console.error(err);
      setMessage({ text: t("failedExportPdf"), tone: "danger" });
    }
  }

  const visibleItems = items.filter((i) => selected.has(i.cardId));

  return (
    <div className="animate-fade-in" dir={dir}>
      <PageHeader
        title={t("title")}
        description={t("description")}
        action={
          <div className={`flex gap-2 print:hidden ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
            <Button variant="secondary" onClick={downloadCSV} disabled={visibleItems.length === 0}>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {t("csvManifestBtn")}
            </Button>
            <Button variant="secondary" onClick={exportPDF} disabled={visibleItems.length === 0}>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              {t("exportPdfBtn")} {visibleItems.length > 0 ? `(${visibleItems.length})` : ""}
            </Button>
            <Button onClick={() => window.print()} disabled={visibleItems.length === 0}>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              {t("printSheetsBtn")}
            </Button>
          </div>
        }
      />

      {/* Mode tabs */}
      <div className={`flex border-b border-slate-200 mb-6 print:hidden ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
        {(
          [
            { key: "prebatch", label: t("blankBatchTab"), desc: t("tabBlankDesc") },
            { key: "clientcards", label: t("clientCardsTab"), desc: t("tabClientDesc") },
          ] as { key: Mode; label: string; desc: string }[]
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setMode(tab.key)}
            className={`px-5 py-3.5 text-sm font-bold border-b-2 transition-all ${
              dir === "rtl" ? "text-right" : "text-left"
            } ${
              mode === tab.key
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-slate-400 hover:text-slate-700"
            }`}
          >
            <span>{tab.label}</span>
            <span className={`block text-[11px] font-normal mt-0.5 ${mode === tab.key ? "text-blue-500" : "text-slate-400"}`}>{tab.desc}</span>
          </button>
        ))}
      </div>

      {message && (
        <div className="mb-5 print:hidden">
          <Alert tone={message.tone as "success" | "danger"}>{message.text}</Alert>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr] print:block">
        {/* ── Controls panel ──────────────────────────────────── */}
        <div className="space-y-4 print:hidden">

          {/* QR Size setter (mm only) */}
          <Card>
            <h3 className={`text-sm font-black uppercase tracking-wide text-slate-500 mb-3 ${dir === "rtl" ? "text-right" : "text-left"}`}>
              {t("qrSize")}
            </h3>
            <div className="space-y-3">
              <div>
                <label className={`block text-xs font-semibold text-slate-600 mb-1.5 ${dir === "rtl" ? "text-right" : "text-left"}`}>
                  {t("sizeMm")}
                </label>
                <input
                  type="number"
                  min={27}
                  max={211}
                  value={qrSizeMm}
                  onChange={(e) => setQrSizeMm(Math.max(27, Math.min(211, Number(e.target.value))))}
                  className={`w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold ${
                    dir === "rtl" ? "text-right" : "text-left"
                  }`}
                />
                <p className={`text-[11px] text-slate-400 mt-1.5 ${dir === "rtl" ? "text-right" : "text-left"}`}>
                  {t("limitHelp", { px: qrSizePx })}
                </p>
              </div>

              <button
                onClick={regenerateWithSize}
                className="w-full rounded-xl border border-blue-300 text-blue-700 hover:bg-blue-50 py-2 text-sm font-semibold transition"
              >
                {t("applySize")}
              </button>
            </div>
          </Card>

          {/* Pre-batch generator */}
          {mode === "prebatch" && (
            <Card>
              <h3 className={`text-sm font-black uppercase tracking-wide text-slate-500 mb-3 ${dir === "rtl" ? "text-right" : "text-left"}`}>
                {t("generateBatchTitle")}
              </h3>
              <p className={`text-xs text-slate-500 mb-4 ${dir === "rtl" ? "text-right" : "text-left"}`}>
                {t("generateBatchDesc")}
              </p>

              <div className="space-y-3">
                <div>
                  <label className={`block text-xs font-semibold text-slate-600 mb-1.5 ${dir === "rtl" ? "text-right" : "text-left"}`}>
                    {t("cardsCountLabel")}
                  </label>
                  <div className={`flex items-center gap-2 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
                    {[25, 50, 100].map((n) => (
                      <button
                        key={n}
                        onClick={() => setBatchCount(n)}
                        className={`flex-1 rounded-lg border py-2 text-sm font-bold transition ${
                          batchCount === n ? "border-blue-500 bg-blue-600 text-white" : "border-slate-200 text-slate-600 hover:border-blue-300"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <div className={`mt-2 flex items-center gap-2 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
                    <label className="text-xs text-slate-500 shrink-0">{t("customLabel")}</label>
                    <input
                      type="number"
                      min={1}
                      max={200}
                      value={batchCount}
                      onChange={(e) => setBatchCount(Math.max(1, Math.min(200, Number(e.target.value))))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <button
                  onClick={generateBatch}
                  disabled={batchGenerating}
                  className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-black py-3 text-sm transition flex items-center justify-center gap-2"
                >
                  {batchGenerating ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      {t("generatingCardsBtn", { count: batchCount })}
                    </>
                  ) : (
                    t("generateBtn", { count: batchCount })
                  )}
                </button>
              </div>
            </Card>
          )}

          {/* Client cards refresh */}
          {mode === "clientcards" && (
            <Card>
              <h3 className={`text-sm font-black uppercase tracking-wide text-slate-500 mb-3 ${dir === "rtl" ? "text-right" : "text-left"}`}>
                {t("refreshTitle")}
              </h3>
              <Button className="w-full" variant="secondary" onClick={loadClientCards} disabled={loading}>
                {loading ? t("loading") : t("reloadClientCards")}
              </Button>
            </Card>
          )}

          {/* Selection controls */}
          {items.length > 0 && (
            <Card>
              <h3 className={`text-sm font-black uppercase tracking-wide text-slate-500 mb-3 ${dir === "rtl" ? "text-right" : "text-left"}`}>
                {t("selectionTitle")}
              </h3>
              <p className={`text-sm text-slate-600 mb-3 ${dir === "rtl" ? "text-right" : "text-left"}`}>
                {t("selectedCount", { count: selected.size, total: items.length })}
              </p>
              <div className="flex gap-2">
                <button onClick={() => setSelected(new Set(items.map((i) => i.cardId)))} className="flex-1 rounded-lg border border-slate-200 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">{t("selectAll")}</button>
                <button onClick={() => setSelected(new Set())} className="flex-1 rounded-lg border border-slate-200 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50">{t("selectNone")}</button>
              </div>
            </Card>
          )}

          {/* How-to card */}
          <Card>
            <h3 className={`text-sm font-black uppercase tracking-wide text-slate-500 mb-3 ${dir === "rtl" ? "text-right" : "text-left"}`}>
              {t("workflowTitle")}
            </h3>
            <ol className={`space-y-2.5 text-xs text-slate-500 list-none ${dir === "rtl" ? "text-right" : "text-left"}`}>
              {[
                [1, t("workflowStep1")],
                [2, t("workflowStep2")],
                [3, t("workflowStep3")],
                [4, t("workflowStep4")],
                [5, t("workflowStep5")],
              ].map(([num, text]) => (
                <li key={text as string} className={`flex items-start gap-2.5 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--primary-light)] text-[var(--primary)] text-[10px] font-black border border-[var(--primary)]/10 shadow-[var(--shadow-glow)]">
                    {num}
                  </span>
                  <span className="leading-5">{text as string}</span>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        {/* ── Cards grid ──────────────────────────────────────── */}
        <div>
          {loading || batchGenerating ? (
            <Card>
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
                <p className="text-sm text-slate-500">
                  {batchGenerating ? t("generatingCards", { count: batchCount }) : t("loading")}
                </p>
              </div>
            </Card>
          ) : items.length === 0 ? (
            <Card>
              <div className="py-16 text-center">
                <div className="mb-4 flex justify-center text-slate-400">
                  {mode === "prebatch" ? (
                    <svg className="h-14 w-14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581a2.25 2.25 0 003.182 0l4.318-4.318a2.25 2.25 0 000-3.182L11.16 3.659A2.25 2.25 0 009.568 3z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                    </svg>
                  ) : (
                    <svg className="h-14 w-14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                    </svg>
                  )}
                </div>
                <p className="font-bold text-slate-700 text-lg">
                  {mode === "prebatch" ? t("emptyBatchTitle") : t("emptyClientsTitle")}
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  {mode === "prebatch" ? t("emptyBatchDesc") : t("emptyClientsDesc")}
                </p>
              </div>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 print:grid-cols-4 print:gap-2">
              {items.map((item) => (
                <QRCardFace
                  key={item.cardId}
                  item={item}
                  qrSizePx={qrSizePx}
                  isSelected={selected.has(item.cardId)}
                  onToggle={() => toggleCard(item.cardId)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
