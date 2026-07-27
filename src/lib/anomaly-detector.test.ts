/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { detectBusinessAnomalies } from "./anomaly-detector";
import { prisma } from "./prisma";

vi.mock("./prisma", () => ({
  prisma: {
    ledgerEntry: {
      aggregate: vi.fn(),
    },
    invoice: {
      aggregate: vi.fn(),
    },
    client: {
      count: vi.fn(),
    },
    checkIn: {
      count: vi.fn(),
    },
  },
}));

describe("Anomaly Detector Engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should trigger HIGH_MANUAL_CREDIT when manual credits exceed 50,000 DA in 7 days", async () => {
    vi.mocked(prisma.ledgerEntry.aggregate).mockResolvedValue({ _sum: { delta: 65000 } } as any);
    vi.mocked(prisma.invoice.aggregate).mockResolvedValue({ _sum: { amount: 0 } } as any);
    vi.mocked(prisma.client.count).mockResolvedValue(5);
    vi.mocked(prisma.checkIn.count).mockResolvedValue(10);

    const anomalies = await detectBusinessAnomalies();

    expect(anomalies).toHaveLength(1);
    expect(anomalies[0].type).toBe("HIGH_MANUAL_CREDIT");
    expect(anomalies[0].severity).toBe("high");
  });

  it("should trigger HIGH_OVERDUE_AR when overdue invoices > 60 days exceed 100,000 DA", async () => {
    vi.mocked(prisma.ledgerEntry.aggregate).mockResolvedValue({ _sum: { delta: 10000 } } as any);
    vi.mocked(prisma.invoice.aggregate).mockResolvedValue({ _sum: { amount: 250000 } } as any);
    vi.mocked(prisma.client.count).mockResolvedValue(5);
    vi.mocked(prisma.checkIn.count).mockResolvedValue(10);

    const anomalies = await detectBusinessAnomalies();

    expect(anomalies).toHaveLength(1);
    expect(anomalies[0].type).toBe("HIGH_OVERDUE_AR");
    expect(anomalies[0].severity).toBe("medium");
  });

  it("should trigger LOW_CHECKIN_VOLUME when active clients > 10 and recent check-ins < 5", async () => {
    vi.mocked(prisma.ledgerEntry.aggregate).mockResolvedValue({ _sum: { delta: 0 } } as any);
    vi.mocked(prisma.invoice.aggregate).mockResolvedValue({ _sum: { amount: 0 } } as any);
    vi.mocked(prisma.client.count).mockResolvedValue(25);
    vi.mocked(prisma.checkIn.count).mockResolvedValue(2);

    const anomalies = await detectBusinessAnomalies();

    expect(anomalies).toHaveLength(1);
    expect(anomalies[0].type).toBe("LOW_CHECKIN_VOLUME");
    expect(anomalies[0].severity).toBe("low");
  });
});
