/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const DEFAULT_CREDIT_RATE = 1900;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

let cachedCreditRate: { rate: number; expiresAt: number } | null = null;

export function clearCreditRateCache(): void {
  cachedCreditRate = null;
}

export async function getCreditRate(tx?: any): Promise<number> {
  const now = Date.now();
  if (!tx && cachedCreditRate && now < cachedCreditRate.expiresAt) {
    return cachedCreditRate.rate;
  }

  try {
    const client = tx || prisma;
    if (!client || !client.platformSetting || typeof client.platformSetting.findUnique !== "function") {
      return DEFAULT_CREDIT_RATE;
    }

    const setting = await client.platformSetting.findUnique({
      where: { key: "credit_rate_da" },
    });

    if (setting && setting.value) {
      const parsed = parseFloat(setting.value);
      if (!isNaN(parsed) && parsed > 0) {
        if (!tx) {
          cachedCreditRate = { rate: parsed, expiresAt: now + CACHE_TTL_MS };
        }
        return parsed;
      }
    }
  } catch (err) {
    logger.error("Failed to fetch credit_rate_da from PlatformSetting:", err);
  }

  return DEFAULT_CREDIT_RATE;
}

export async function setCreditRate(rate: number, tx?: any): Promise<number> {
  const client = tx || prisma;
  const valueStr = rate.toString();

  await client.platformSetting.upsert({
    where: { key: "credit_rate_da" },
    create: { key: "credit_rate_da", value: valueStr },
    update: { value: valueStr },
  });

  cachedCreditRate = { rate, expiresAt: Date.now() + CACHE_TTL_MS };
  return rate;
}
