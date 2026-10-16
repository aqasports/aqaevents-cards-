import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as loginHandler } from "./auth/login/route";
import { GET as bootstrapHandler } from "./bootstrap/route";
import { prisma } from "@/lib/prisma";
import { hashPassword, signCoachJwt } from "@/lib/coach-auth";

vi.mock("@/lib/rate-limit", () => ({
  checkAndIncrement: vi.fn().mockResolvedValue({ allowed: true }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    platformSetting: {
      findUnique: vi.fn().mockResolvedValue({ value: "true" }),
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
});
