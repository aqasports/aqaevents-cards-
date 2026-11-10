import AsyncStorage from "@react-native-async-storage/async-storage";
import { classifySyncFailure, type CanonicalMutationType } from "../contract";

export interface OutboxMutation {
  id: string;
  type: CanonicalMutationType;
  method: "PUT" | "POST";
  path: string;
  payload: Record<string, unknown>;
  createdAt: string;
  lastError?: string;
}

const OUTBOX_STORAGE_KEY = "aqa_coach_mobile_outbox_v2";
const REJECTED_STORAGE_KEY = "aqa_coach_mobile_rejected_v2";

export function createMutationId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now()}-${rand}`;
}

export class CoachOfflineOutbox {
  private flushing = false;

  async getOutbox(): Promise<OutboxMutation[]> {
    return this.readList(OUTBOX_STORAGE_KEY);
  }

  async getRejected(): Promise<OutboxMutation[]> {
    return this.readList(REJECTED_STORAGE_KEY);
  }

  private async readList(key: string): Promise<OutboxMutation[]> {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as OutboxMutation[]) : [];
    } catch {
      return [];
    }
  }

  private async writeList(key: string, items: OutboxMutation[]): Promise<void> {
    if (items.length === 0) {
      await AsyncStorage.removeItem(key);
    } else {
      await AsyncStorage.setItem(key, JSON.stringify(items));
    }
  }

  async enqueue(item: OutboxMutation): Promise<void> {
    const current = await this.getOutbox();
    const deduped = current.filter((m) => m.id !== item.id);
    deduped.push(item);
    await this.writeList(OUTBOX_STORAGE_KEY, deduped);
  }

  /**
   * Replays queued mutations in FIFO order using the supplied authenticated sender.
   * - 2xx: removed from outbox.
   * - Deterministic 4xx (except 401/408/429): moved to rejected queue with server reason.
   * - Network / 5xx / 401 / 429: kept at head of outbox to preserve ordering.
   */
  async flush(
    sendRequest: (item: OutboxMutation) => Promise<{ status: number; errorMessage?: string }>
  ): Promise<{ accepted: number; rejected: number; remaining: number }> {
    if (this.flushing) {
      const cur = await this.getOutbox();
      return { accepted: 0, rejected: 0, remaining: cur.length };
    }
    this.flushing = true;

    let accepted = 0;
    let newlyRejected = 0;

    try {
      const outbox = await this.getOutbox();
      if (outbox.length === 0) {
        return { accepted: 0, rejected: 0, remaining: 0 };
      }

      const rejected = await this.getRejected();
      const remaining = [...outbox];

      for (const item of outbox) {
        try {
          const res = await sendRequest(item);
          if (res.status >= 200 && res.status < 300) {
            const idx = remaining.findIndex((r) => r.id === item.id);
            if (idx !== -1) remaining.splice(idx, 1);
            accepted++;
            continue;
          }

          const decision = classifySyncFailure(res.status);
          if (decision === "reject") {
            const idx = remaining.findIndex((r) => r.id === item.id);
            if (idx !== -1) remaining.splice(idx, 1);
            rejected.push({
              ...item,
              lastError: res.errorMessage || `HTTP ${res.status}`,
            });
            newlyRejected++;
            continue;
          }

          break;
        } catch {
          break;
        }
      }

      await this.writeList(OUTBOX_STORAGE_KEY, remaining);
      await this.writeList(REJECTED_STORAGE_KEY, rejected);

      return { accepted, rejected: newlyRejected, remaining: remaining.length };
    } finally {
      this.flushing = false;
    }
  }

  async clearRejected(): Promise<void> {
    await AsyncStorage.removeItem(REJECTED_STORAGE_KEY);
  }

  async clearAllOnLogout(): Promise<void> {
    await AsyncStorage.multiRemove([OUTBOX_STORAGE_KEY, REJECTED_STORAGE_KEY]);
  }
}
