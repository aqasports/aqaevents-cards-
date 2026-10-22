import { logger } from "@/lib/logger";
export type EventListener = (payload: any) => unknown | Promise<unknown>;
export class AsyncEventEmitter {
  private listenersMap = new Map<string, EventListener[]>();

  on(event: string, listener: EventListener) {
    const list = this.listenersMap.get(event) ?? [];
    list.push(listener);
    this.listenersMap.set(event, list);
  }

  async emit(event: string, payload: any): Promise<void> {
    const listeners = this.listenersMap.get(event) ?? [];
    for (const listener of listeners) {
      try {
        await listener(payload);
      } catch (err) {
        logger.error(`Error in listener for event ${event}:`, err);
        throw err; // Rethrow to allow transaction rollback if needed
      }
    }
  }
}

export const eventBus = new AsyncEventEmitter();

export const EVENTS = {
  CLIENT_CREATED: "CLIENT_CREATED",
  PACKAGE_PURCHASED: "PACKAGE_PURCHASED",
  ACTIVITY_REDEEMED: "ACTIVITY_REDEEMED",
  REDEMPTION_DELETED: "REDEMPTION_DELETED",
} as const;

