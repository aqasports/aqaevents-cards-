/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  FLAG_REGISTRY,
  getFlag,
  setFlag,
} from "./feature-flags";
import { prisma } from "./prisma";

vi.mock("./prisma", () => ({
  prisma: {
    platformSetting: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

describe("feature-flags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Registry integrity ────────────────────────────────────────────────────

  it("FLAG_REGISTRY has no duplicate keys", () => {
    const keys = FLAG_REGISTRY.map((f) => f.key);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(keys.length);
  });

  it("every FLAG_REGISTRY entry has a non-empty key and description", () => {
    for (const def of FLAG_REGISTRY) {
      expect(def.key.trim().length).toBeGreaterThan(0);
      expect(def.description.trim().length).toBeGreaterThan(0);
    }
  });

  // ── getFlag ───────────────────────────────────────────────────────────────

  it("returns defaultValue (false) when no PlatformSetting row exists", async () => {
    vi.mocked(prisma.platformSetting.findUnique).mockResolvedValue(null);

    const key = FLAG_REGISTRY[0].key;
    const result = await getFlag(key);
    expect(result).toBe(false);
  });

  it("returns supplied defaultValue when no row exists", async () => {
    vi.mocked(prisma.platformSetting.findUnique).mockResolvedValue(null);

    const key = FLAG_REGISTRY[0].key;
    const result = await getFlag(key, true);
    expect(result).toBe(true);
  });

  it("returns true when DB row value is 'true'", async () => {
    const key = FLAG_REGISTRY[0].key;
    vi.mocked(prisma.platformSetting.findUnique).mockResolvedValue({
      key,
      value: "true",
      updatedAt: new Date(),
    } as any);

    const result = await getFlag(key);
    expect(result).toBe(true);
  });

  it("returns false when DB row value is 'false'", async () => {
    const key = FLAG_REGISTRY[0].key;
    vi.mocked(prisma.platformSetting.findUnique).mockResolvedValue({
      key,
      value: "false",
      updatedAt: new Date(),
    } as any);

    const result = await getFlag(key);
    expect(result).toBe(false);
  });

  it("returns defaultValue for a key that is not in FLAG_REGISTRY — never queries DB", async () => {
    const result = await getFlag("totally_unknown_flag_xyz");
    expect(result).toBe(false);
    expect(prisma.platformSetting.findUnique).not.toHaveBeenCalled();
  });

  it("returns defaultValue (true) for an unknown key regardless of defaultValue param", async () => {
    const result = await getFlag("totally_unknown_flag_xyz", true);
    expect(result).toBe(true);
    expect(prisma.platformSetting.findUnique).not.toHaveBeenCalled();
  });

  // ── setFlag ───────────────────────────────────────────────────────────────

  it("round-trip: setFlag(key, true) stores 'true' and getFlag returns true", async () => {
    const key = FLAG_REGISTRY[0].key;

    vi.mocked(prisma.platformSetting.upsert).mockResolvedValue({
      key,
      value: "true",
      updatedAt: new Date(),
    } as any);

    await setFlag(key, true);

    expect(prisma.platformSetting.upsert).toHaveBeenCalledWith({
      where: { key },
      create: { key, value: "true" },
      update: { value: "true" },
    });

    // Simulate next DB read returning the stored value
    vi.mocked(prisma.platformSetting.findUnique).mockResolvedValue({
      key,
      value: "true",
      updatedAt: new Date(),
    } as any);

    const result = await getFlag(key);
    expect(result).toBe(true);
  });

  it("round-trip: setFlag(key, false) stores 'false' and getFlag returns false", async () => {
    const key = FLAG_REGISTRY[0].key;

    vi.mocked(prisma.platformSetting.upsert).mockResolvedValue({
      key,
      value: "false",
      updatedAt: new Date(),
    } as any);

    await setFlag(key, false);

    expect(prisma.platformSetting.upsert).toHaveBeenCalledWith({
      where: { key },
      create: { key, value: "false" },
      update: { value: "false" },
    });

    vi.mocked(prisma.platformSetting.findUnique).mockResolvedValue({
      key,
      value: "false",
      updatedAt: new Date(),
    } as any);

    const result = await getFlag(key);
    expect(result).toBe(false);
  });

  it("setFlag silently ignores unknown keys — no upsert performed", async () => {
    await setFlag("totally_unknown_flag_xyz", true);
    expect(prisma.platformSetting.upsert).not.toHaveBeenCalled();
  });
});
