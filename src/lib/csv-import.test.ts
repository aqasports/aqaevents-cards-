import { describe, it, expect, vi, beforeEach } from "vitest";
import { processEmployeeCsvImport } from "./csv-import";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    client: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    department: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    card: {
      create: vi.fn(),
    },
  },
}));

describe("Employee CSV Import Engine", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should report an error when required column 'fullName' is missing", async () => {
    const csvContent = `email,phone\nalice@example.com,+213555123456`;

    vi.mocked(prisma.client.findMany).mockResolvedValue([]);
    vi.mocked(prisma.department.findMany).mockResolvedValue([]);

    const res = await processEmployeeCsvImport(csvContent, "org-1", false);

    expect(res.validRows).toBe(0);
    expect(res.errorRows).toBe(1);
    expect(res.preview[0].errors[0]).toContain("Missing required header column");
  });

  it("should catch malformed email and phone numbers", async () => {
    const csvContent = `fullName,email,phone\nJohn Doe,invalid-email-string,123`;

    vi.mocked(prisma.client.findMany).mockResolvedValue([]);
    vi.mocked(prisma.department.findMany).mockResolvedValue([]);

    const res = await processEmployeeCsvImport(csvContent, "org-1", false);

    expect(res.validRows).toBe(0);
    expect(res.errorRows).toBe(1);
    expect(res.preview[0].errors.some((e) => e.includes("Invalid email"))).toBe(true);
    expect(res.preview[0].errors.some((e) => e.includes("Invalid phone"))).toBe(true);
  });

  it("should identify duplicate employees existing in the database or batch", async () => {
    const csvContent = `fullName,email,phone\nExisting Employee,existing@example.com,+213555123456\nBatch Dup,existing@example.com,+213555999999`;

    vi.mocked(prisma.client.findMany).mockResolvedValue([
      { id: "c-1", email: "existing@example.com", phone: "+213555123456", fullName: "Existing" } as any,
    ]);
    vi.mocked(prisma.department.findMany).mockResolvedValue([]);

    const res = await processEmployeeCsvImport(csvContent, "org-1", false);

    expect(res.duplicateRows).toBe(2);
    expect(res.preview[0].isDuplicate).toBe(true);
    expect(res.preview[1].isDuplicate).toBe(true);
  });

  it("should process a clean successful batch and commit clients and cards", async () => {
    const csvContent = `fullName,email,phone,departmentName\nAlice Smith,alice@example.com,+213555100200,Engineering\nBob Jones,bob@example.com,+213555100300,Sales`;

    vi.mocked(prisma.client.findMany).mockResolvedValue([]);
    vi.mocked(prisma.department.findMany).mockResolvedValue([
      { id: "dept-1", name: "Engineering", organizationId: "org-1" } as any,
    ]);

    vi.mocked(prisma.department.create).mockResolvedValue({
      id: "dept-2",
      name: "Sales",
      organizationId: "org-1",
    } as any);

    vi.mocked(prisma.client.create).mockImplementation(async (args: any) => ({
      id: `client-${args.data.fullName}`,
      ...args.data,
    }) as any);

    vi.mocked(prisma.card.create).mockResolvedValue({ id: "card-1" } as any);

    const res = await processEmployeeCsvImport(csvContent, "org-1", true);

    expect(res.validRows).toBe(2);
    expect(res.errorRows).toBe(0);
    expect(res.importedCount).toBe(2);
    expect(prisma.client.create).toHaveBeenCalledTimes(2);
    expect(prisma.card.create).toHaveBeenCalledTimes(2);
  });
});
