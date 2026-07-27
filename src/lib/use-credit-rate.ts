"use client";

import { useCallback } from "react";
import { useDataCache } from "@/lib/use-data-cache";

const DEFAULT_RATE = 1900;

async function fetchCreditRate(): Promise<number> {
  try {
    const res = await fetch("/api/admin/settings/credit-rate");
    if (!res.ok) return DEFAULT_RATE;
    const data = await res.json();
    return typeof data.creditRate === "number" ? data.creditRate : DEFAULT_RATE;
  } catch {
    return DEFAULT_RATE;
  }
}

export function useCreditRate(): number {
  const fetcher = useCallback(fetchCreditRate, []);
  const { data } = useDataCache("/api/admin/settings/credit-rate", fetcher, {
    ttlMs: 60000,
  });
  return data ?? DEFAULT_RATE;
}
