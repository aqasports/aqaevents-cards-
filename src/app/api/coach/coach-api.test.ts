import fs from "fs";
import path from "path";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as loginHandler } from "./auth/login/route";
import { GET as bootstrapHandler } from "./bootstrap/route";
import { POST as syncHandler } from "./sync/route";
import { POST as pushTokenHandler } from "./push-token/route";
import { prisma } from "@/lib/prisma";
import { hashPassword, signCoachJwt } from "@/lib/coach-auth";
import {
  classifySyncFailure,
  normalizeCoachMutationType,
  toWesternNumerals,
} from "@/lib/coach-contract";
import {
  TRANSLATIONS,
  translate,
} from "../../../../coach-mobile/src/i18n/translations";

vi.mock("@/lib/rate-limit", () => ({
  checkAndIncrement: vi.fn().mockResolvedValue({ allowed: true }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    platformSetting: {
      findUnique: vi.fn().mockResolvedValue({ value: "true" }),
      findMany: vi.fn().mockResolvedValue([]),
    },
    rateLimitBucket: {
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue({ count: 1 }),
      create: vi.fn(),
    },
    coachAccount: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    coachAuthSession: {
      create: vi.fn().mockResolvedValue({ id: "session_mock_123" }),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({ id: "audit_123" }),
      findMany: vi.fn().mockResolvedValue([]),
    },
    coach: {
      findUnique: vi.fn(),
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
    },
    coachAbsence: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    swimCoachAbsence: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    swimGroup: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn(),
    },
    swimGroupStaff: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
    swimSession: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    swimReplacement: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    swimSetting: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    swimAttendance: {
      upsert: vi.fn().mockResolvedValue({ id: "att_1" }),
    },
    swimTechReview: {
      upsert: vi.fn().mockResolvedValue({ id: "rev_1" }),
    },
  },
}));

describe("AQA Coach API Endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/coach/auth/login", () => {
    it("returns 400 for invalid body payload", async () => {
      const req = new NextRequest("http://localhost:3000/api/coach/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: "invalid-email" }),
      });

      const res = await loginHandler(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBeDefined();
    });

    it("returns 401 when coach account does not exist", async () => {
      (prisma.coachAccount.findUnique as any).mockResolvedValue(null);

      const req = new NextRequest("http://localhost:3000/api/coach/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: "unknown@aqasports.pro", password: "password123" }),
      });

      const res = await loginHandler(req);
      expect(res.status).toBe(401);
    });

    it("authenticates valid coach and returns tokens", async () => {
      const pwHash = await hashPassword("validPassword123");
      (prisma.coachAccount.findUnique as any).mockResolvedValue({
        id: "acc_1",
        coachId: "coach_1",
        email: "karim@aqasports.pro",
        passwordHash: pwHash,
        role: "coach",
        categories: JSON.stringify(["homme", "enfants"]),
        loginEnabled: true,
        coach: {
          id: "coach_1",
          name: "Karim Benali",
          phone: "+213555000111",
          active: true,
        },
      });

      const req = new NextRequest("http://localhost:3000/api/coach/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: "karim@aqasports.pro", password: "validPassword123" }),
      });

      const res = await loginHandler(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.accessToken).toBeDefined();
      expect(data.refreshToken).toBeDefined();
      expect(data.coach.name).toBe("Karim Benali");
      expect(data.coach.role).toBe("coach");
    });
  });

  describe("GET /api/coach/bootstrap", () => {
    it("rejects request missing Authorization header", async () => {
      const req = new NextRequest("http://localhost:3000/api/coach/bootstrap", {
        method: "GET",
      });

      const res = await bootstrapHandler(req);
      expect(res.status).toBe(401);
    });

    it("returns workspace data for authenticated coach", async () => {
      (prisma.coachAccount.findUnique as any).mockResolvedValue({
        id: "acc_1",
        coachId: "coach_1",
        email: "karim@aqasports.pro",
        role: "coach",
        categories: JSON.stringify(["homme"]),
        loginEnabled: true,
        coach: {
          id: "coach_1",
          name: "Karim Benali",
          phone: "+213555000111",
          active: true,
        },
      });

      const token = signCoachJwt({
        sub: "acc_1",
        coachId: "coach_1",
        role: "coach",
        email: "karim@aqasports.pro",
        name: "Karim Benali",
        sessionId: "session_mock_123",
      });

      const req = new NextRequest("http://localhost:3000/api/coach/bootstrap", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const res = await bootstrapHandler(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.coach.name).toBe("Karim Benali");
      expect(Array.isArray(data.groups)).toBe(true);
      expect(Array.isArray(data.sessions)).toBe(true);
    });
  });

  describe("POST /api/coach/sync", () => {
    it("processes legacy lowercase mutation types and reports unknown types as failed", async () => {
      (prisma.coachAccount.findUnique as any).mockResolvedValue({
        id: "acc_1",
        coachId: "coach_1",
        email: "karim@aqasports.pro",
        role: "head_coach",
        categories: JSON.stringify(["homme"]),
        loginEnabled: true,
        coach: {
          id: "coach_1",
          name: "Karim Benali",
          phone: "+213555000111",
          active: true,
        },
      });
      (prisma.swimSession as any).findUnique = vi.fn().mockResolvedValue({
        id: "sess_1",
        groupId: "grp_1",
        plannedCoachId: "coach_1",
        actualCoachId: "coach_1",
      });
      (prisma.swimMember as any) = {
        findUnique: vi.fn().mockResolvedValue({ id: "mem_1", groupId: "grp_1" }),
      };

      const token = signCoachJwt({
        sub: "acc_1",
        coachId: "coach_1",
        role: "head_coach",
        email: "karim@aqasports.pro",
        name: "Karim Benali",
        sessionId: "session_mock_123",
      });

      const req = new NextRequest("http://localhost:3000/api/coach/sync", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mutations: [
            {
              id: "mut_att_1",
              type: "attendance",
              payload: {
                sessionId: "sess_1",
                records: [{ memberId: "mem_1", status: "PRESENT" }],
              },
            },
            {
              id: "mut_unknown_1",
              type: "unknown_future_type",
              payload: {},
            },
          ],
        }),
      });

      const res = await syncHandler(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.attendances).toEqual([{ id: "mut_att_1-mem_1", success: true }]);
      expect(data.mutations).toEqual([
        {
          id: "mut_unknown_1",
          success: false,
          error: "Unsupported mutation type: unknown_future_type",
        },
      ]);
    });
  });

  describe("POST /api/coach/push-token & Shared Coach Contract", () => {
    it("registers device push token on the active CoachAuthSession", async () => {
      (prisma.coachAccount.findUnique as any).mockResolvedValue({
        id: "acc_1",
        coachId: "coach_1",
        email: "karim@aqasports.pro",
        role: "coach",
        categories: JSON.stringify(["homme"]),
        loginEnabled: true,
        coach: {
          id: "coach_1",
          name: "Karim Benali",
          phone: "+213555000111",
          active: true,
        },
      });

      const token = signCoachJwt({
        sub: "acc_1",
        coachId: "coach_1",
        role: "coach",
        email: "karim@aqasports.pro",
        name: "Karim Benali",
        sessionId: "session_mock_123",
      });

      const req = new NextRequest("http://localhost:3000/api/coach/push-token", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pushToken: "ExponentPushToken[abc123xyz987]",
          platform: "android",
        }),
      });

      const res = await pushTokenHandler(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.registered).toBe(true);
      expect(prisma.coachAuthSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "session_mock_123" },
          data: expect.objectContaining({
            pushToken: "ExponentPushToken[abc123xyz987]",
            platform: "android",
          }),
        })
      );
    });

    it("enforces Western Arabic numerals, outbox classification, and trilingual key parity", () => {
      expect(toWesternNumerals("٠١٢٣٤٥٦٧٨٩ - ۰۱۲۳۴۵۶۷۸۹")).toBe(
        "0123456789 - 0123456789"
      );
      expect(translate("ar", "common.pending_sync", { count: "٤٢" })).toContain(
        "42"
      );

      expect(normalizeCoachMutationType("attendance")).toBe("ATTENDANCE_BATCH");
      expect(normalizeCoachMutationType("TECH_REVIEW")).toBe("TECH_REVIEW");
      expect(normalizeCoachMutationType("unknown")).toBeNull();

      expect(classifySyncFailure(null)).toBe("retry");
      expect(classifySyncFailure(401)).toBe("retry");
      expect(classifySyncFailure(429)).toBe("retry");
      expect(classifySyncFailure(503)).toBe("retry");
      expect(classifySyncFailure(400)).toBe("reject");
      expect(classifySyncFailure(403)).toBe("reject");

      const frKeys = Object.keys(TRANSLATIONS.fr).sort();
      const enKeys = Object.keys(TRANSLATIONS.en).sort();
      const arKeys = Object.keys(TRANSLATIONS.ar).sort();
      expect(enKeys).toEqual(frKeys);
      expect(arKeys).toEqual(frKeys);

      // Verify ERP and coach-mobile contract files remain byte-for-byte identical
      const erpContract = fs
        .readFileSync(path.resolve(process.cwd(), "src/lib/coach-contract.ts"), "utf8")
        .replace(/\r\n/g, "\n");
      const mobileContract = fs
        .readFileSync(
          path.resolve(process.cwd(), "coach-mobile/src/contract/coach-contract.ts"),
          "utf8"
        )
        .replace(/\r\n/g, "\n");
      expect(mobileContract).toBe(erpContract);
    });
  });
});
