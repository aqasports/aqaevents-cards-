import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  convertSwimDataToCsv,
  validateSwimBackupSnapshot,
} from "./swim-backup";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    swimMember: { count: vi.fn().mockResolvedValue(15) },
    swimGroup: { count: vi.fn().mockResolvedValue(4) },
    swimLead: { count: vi.fn().mockResolvedValue(8) },
    swimPayment: { count: vi.fn().mockResolvedValue(22) },
    swimCard: { count: vi.fn().mockResolvedValue(15) },
    platformSetting: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

vi.mock("@/lib/swim-calls-server", () => ({
  getStoredCallRecords: vi.fn().mockResolvedValue({
    rec1: { id: "rec1", status: "to_call" },
  }),
}));

describe("convertSwimDataToCsv", () => {
  it("formats members dataset to standard RFC 4180 CSV with escaping", () => {
    const mockMembers = [
      {
        swimId: "SWM-001001",
        fullName: "Sarah, Benali", // Has comma, requires quotes
        phone: "0555123456",
        email: "sarah@example.com",
        category: "femme",
        level: "intermediate",
        formula: "G10",
        duration: "3m",
        priceDA: 24000,
        paymentStatus: "paid",
        groupStatus: "accepted",
        group: { name: "Femme Avance", coachName: "Coach Amine" },
        dateOfStart: "2026-10-01T00:00:00.000Z",
        subscriptionStart: "2026-10-01T00:00:00.000Z",
        subscriptionEnd: "2027-01-05T00:00:00.000Z",
        createdAt: "2026-09-01T12:00:00.000Z",
        notes: "Client requested \"morning\" slots", // Has quotes, requires escaping
      },
    ];

    const csv = convertSwimDataToCsv("members", mockMembers);
    const lines = csv.split("\r\n");

    expect(lines[0]).toContain("Swim ID,Full Name,Phone");
    expect(lines[1]).toContain("SWM-001001");
    expect(lines[1]).toContain('"Sarah, Benali"');
    expect(lines[1]).toContain('"Client requested ""morning"" slots"');
  });

  it("formats payments dataset into valid CSV", () => {
    const mockPayments = [
      {
        id: "pay_1",
        memberId: "mem_1",
        amount: 15000,
        method: "cash",
        paidAt: "2026-10-02T10:00:00.000Z",
        notes: "Desk receipt #402",
        createdAt: "2026-10-02T10:00:00.000Z",
      },
    ];

    const csv = convertSwimDataToCsv("payments", mockPayments);
    const lines = csv.split("\r\n");

    expect(lines[0]).toBe("Payment ID,Member ID,Amount DA,Method,Paid At,Notes,Created At");
    expect(lines[1]).toContain("pay_1,mem_1,15000,cash");
  });

  it("formats leads dataset into valid CSV", () => {
    const mockLeads = [
      {
        id: "lead_1",
        fullName: "Karim Meziane",
        phone: "0770987654",
        email: "karim@mail.dz",
        category: "homme",
        level: "beginner",
        frequency: "2x",
        formula: "MAX5",
        duration: "6m",
        preferredDays: "Lundi / Jeudi",
        status: "pending",
        createdAt: "2026-09-15T08:00:00.000Z",
        notes: "Preferred evening",
      },
    ];

    const csv = convertSwimDataToCsv("leads", mockLeads);
    expect(csv).toContain("Karim Meziane");
    expect(csv).toContain("MAX5");
  });

  it("returns empty string for unrecognized type", () => {
    // @ts-expect-error test invalid type
    expect(convertSwimDataToCsv("invalid", [])).toBe("");
  });
});

describe("validateSwimBackupSnapshot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects non-object input", async () => {
    const result = await validateSwimBackupSnapshot(null);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain("Not a JSON object");
  });

  it("rejects missing metadata header", async () => {
    const result = await validateSwimBackupSnapshot({ data: {} });
    expect(result.isValid).toBe(false);
    expect(result.error).toContain("Missing 'metadata'");
  });

  it("rejects missing data container", async () => {
    const result = await validateSwimBackupSnapshot({ metadata: {} });
    expect(result.isValid).toBe(false);
    expect(result.error).toContain("Missing 'data'");
  });

  it("rejects malformed data tables", async () => {
    const result = await validateSwimBackupSnapshot({
      metadata: { version: "1.0.0" },
      data: { members: "not-an-array" },
    });
    expect(result.isValid).toBe(false);
    expect(result.error).toContain("must be arrays");
  });

  it("successfully validates valid snapshot and returns count comparison", async () => {
    const validSnapshot = {
      metadata: {
        timestamp: "2026-09-24T12:00:00.000Z",
        version: "1.0.0",
        totalRecords: 3,
        counts: { members: 1, groups: 1, leads: 0, payments: 1, cards: 0, callRecords: 0 },
      },
      data: {
        members: [
          {
            swimId: "SWM-001001",
            fullName: "Amine Belkacem",
            category: "homme",
            formula: "G10",
            paymentStatus: "paid",
          },
        ],
        groups: [{ id: "grp_1", name: "Groupe Homme 1" }],
        leads: [],
        payments: [{ id: "p1", amount: 12000 }],
        cards: [],
        callRecords: {},
      },
    };

    const report = await validateSwimBackupSnapshot(validSnapshot);
    expect(report.isValid).toBe(true);
    expect(report.backupCounts?.members).toBe(1);
    expect(report.liveCounts?.members).toBe(15);
    expect(report.sampleMembers?.length).toBe(1);
    expect(report.sampleMembers?.[0].swimId).toBe("SWM-001001");
  });
});
