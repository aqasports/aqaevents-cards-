/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as getEquipment, POST as createEquipment } from "./route";
import { GET as getAsset, PATCH as updateAsset, DELETE as deleteAsset } from "./[id]/route";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

vi.mock("@/lib/api-auth", () => ({
  requireAdminSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    equipmentAsset: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe("Equipment API Endpoints", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    vi.mocked(requireAdminSession).mockResolvedValue({
      session: { user: { id: "admin-1", role: "admin" } } as any,
      error: null,
    });
  });

  describe("GET /api/admin/equipment", () => {
    it("should return list of equipment assets", async () => {
      vi.mocked(prisma.equipmentAsset.findMany).mockResolvedValue([
        { id: "asset-1", name: "Sea Kayak Pro 2", category: "Kayak", purchasePrice: 350000 },
      ] as any);

      const res = await getEquipment();
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveLength(1);
      expect(body[0].name).toBe("Sea Kayak Pro 2");
    });
  });

  describe("POST /api/admin/equipment", () => {
    it("should return 400 if name or category is missing", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/equipment", {
        method: "POST",
        body: JSON.stringify({ purchasePrice: 50000 }),
      });

      const res = await createEquipment(req);
      expect(res.status).toBe(400);
    });

    it("should create equipment asset successfully", async () => {
      vi.mocked(prisma.equipmentAsset.create).mockResolvedValue({
        id: "asset-1",
        name: "Carbon Paddle X",
        category: "Paddle",
        purchasePrice: 25000,
        usefulLifeMonths: 24,
        status: "available",
      } as any);

      const req = new NextRequest("http://localhost:3000/api/admin/equipment", {
        method: "POST",
        body: JSON.stringify({
          name: "Carbon Paddle X",
          category: "Paddle",
          purchasePrice: 25000,
          usefulLifeMonths: 24,
        }),
      });

      const res = await createEquipment(req);
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.name).toBe("Carbon Paddle X");
    });
  });

  describe("GET /api/admin/equipment/[id]", () => {
    it("should return equipment asset by id", async () => {
      vi.mocked(prisma.equipmentAsset.findUnique).mockResolvedValue({ id: "asset-1", name: "Carbon Paddle X" } as any);

      const req = new NextRequest("http://localhost:3000/api/admin/equipment/asset-1");
      const res = await getAsset(req, { params: Promise.resolve({ id: "asset-1" }) });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.name).toBe("Carbon Paddle X");
    });
  });

  describe("PATCH /api/admin/equipment/[id]", () => {
    it("should update asset maintenance cost and status", async () => {
      vi.mocked(prisma.equipmentAsset.findUnique).mockResolvedValue({ id: "asset-1" } as any);
      vi.mocked(prisma.equipmentAsset.update).mockResolvedValue({
        id: "asset-1",
        maintenanceCost: 12000,
        status: "maintenance",
      } as any);

      const req = new NextRequest("http://localhost:3000/api/admin/equipment/asset-1", {
        method: "PATCH",
        body: JSON.stringify({ maintenanceCost: 12000, status: "maintenance" }),
      });

      const res = await updateAsset(req, { params: Promise.resolve({ id: "asset-1" }) });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("maintenance");
    });
  });

  describe("DELETE /api/admin/equipment/[id]", () => {
    it("should delete equipment asset by id", async () => {
      vi.mocked(prisma.equipmentAsset.findUnique).mockResolvedValue({ id: "asset-1" } as any);
      vi.mocked(prisma.equipmentAsset.delete).mockResolvedValue({ id: "asset-1" } as any);

      const req = new NextRequest("http://localhost:3000/api/admin/equipment/asset-1", {
        method: "DELETE",
      });

      const res = await deleteAsset(req, { params: Promise.resolve({ id: "asset-1" }) });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });
  });
});
