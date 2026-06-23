export class AsyncEventEmitter {
  private listenersMap = new Map<string, Function[]>();

  on(event: string, listener: Function) {
    const list = this.listenersMap.get(event) ?? [];
    list.push(listener);
    this.listenersMap.set(event, list);
  }

  async emit(event: string, payload: any): Promise<void> {
    const listeners = this.listenersMap.get(event) ?? [];
    await Promise.all(
      listeners.map(async (listener) => {
        try {
          await listener(payload);
        } catch (err) {
          console.error(`Error in listener for event ${event}:`, err);
          throw err; // Rethrow to allow transaction rollback if needed
        }
      })
    );
  }
}

export const eventBus = new AsyncEventEmitter();

export const EVENTS = {
  CLIENT_CREATED: "CLIENT_CREATED",
  PACKAGE_PURCHASED: "PACKAGE_PURCHASED",
  ACTIVITY_REDEEMED: "ACTIVITY_REDEEMED",
  REDEMPTION_DELETED: "REDEMPTION_DELETED",
} as const;
