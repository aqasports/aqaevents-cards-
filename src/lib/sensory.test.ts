import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { isSensorySoundEnabled, setSensorySoundEnabled, playSensorySound, triggerHaptic } from "./sensory";

describe("sensory utility", () => {
  let storage: Record<string, string> = {};

  beforeEach(() => {
    storage = {};
    const mockLocalStorage = {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, value: string) => {
        storage[key] = value;
      },
      removeItem: (key: string) => {
        delete storage[key];
      },
      clear: () => {
        storage = {};
      },
    };

    vi.stubGlobal("localStorage", mockLocalStorage);
    vi.stubGlobal("window", {
      localStorage: mockLocalStorage,
      matchMedia: () => ({ matches: false }),
    });
    vi.stubGlobal("navigator", {
      vibrate: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("defaults sound enabled to true", () => {
    expect(isSensorySoundEnabled()).toBe(true);
  });

  it("stores sound enabled setting in localStorage", () => {
    setSensorySoundEnabled(false);
    expect(isSensorySoundEnabled()).toBe(false);
    expect(localStorage.getItem("aqa_sensory_sound")).toBe("false");

    setSensorySoundEnabled(true);
    expect(isSensorySoundEnabled()).toBe(true);
    expect(localStorage.getItem("aqa_sensory_sound")).toBe("true");
  });

  it("handles playSensorySound gracefully without errors in headless/jsdom environment", () => {
    expect(() => {
      playSensorySound("click");
      playSensorySound("flip");
      playSensorySound("success");
      playSensorySound("warning");
      playSensorySound("error");
      playSensorySound("sparkle");
      playSensorySound("tap");
    }).not.toThrow();
  });

  it("handles triggerHaptic gracefully without errors", () => {
    expect(() => {
      triggerHaptic("light");
      triggerHaptic("medium");
      triggerHaptic("heavy");
      triggerHaptic("success");
      triggerHaptic("warning");
    }).not.toThrow();
  });
});
