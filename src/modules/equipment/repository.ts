import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export class EquipmentRepository {
  async findMany(params?: {
    where?: Prisma.EquipmentAssetWhereInput;
    orderBy?: Prisma.EquipmentAssetOrderByWithRelationInput;
    tx?: Prisma.TransactionClient;
  }) {
    const client = params?.tx || prisma;
    return client.equipmentAsset.findMany({
      where: params?.where,
      orderBy: params?.orderBy || { name: "asc" },
      include: {
        _count: {
          select: { usageLogs: true },
        },
      },
    });
  }

  async findById(id: string, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.equipmentAsset.findUnique({
      where: { id },
      include: {
        usageLogs: {
          include: {
            session: {
              include: {
                activity: true,
              },
            },
          },
        },
      },
    });
  }

  async create(data: Prisma.EquipmentAssetCreateInput, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.equipmentAsset.create({ data });
  }

  async update(id: string, data: Prisma.EquipmentAssetUpdateInput, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.equipmentAsset.update({
      where: { id },
      data,
    });
  }

  async delete(id: string, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.equipmentAsset.delete({
      where: { id },
    });
  }

  async createUsageLog(
    data: {
      equipmentAssetId: string;
      sessionId?: string | null;
      loggedAt?: Date;
      notes?: string | null;
    },
    tx?: Prisma.TransactionClient
  ) {
    const client = tx || prisma;
    return client.equipmentUsage.create({
      data: {
        equipmentAssetId: data.equipmentAssetId,
        sessionId: data.sessionId ?? null,
        loggedAt: data.loggedAt ?? new Date(),
        notes: data.notes ?? null,
      },
      include: {
        session: {
          include: {
            activity: true,
          },
        },
      },
    });
  }

  async deleteUsageLog(id: string, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.equipmentUsage.delete({
      where: { id },
    });
  }

  async findUsageLogsByAssetId(equipmentAssetId: string, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.equipmentUsage.findMany({
      where: { equipmentAssetId },
      orderBy: { loggedAt: "desc" },
      include: {
        session: {
          include: {
            activity: true,
          },
        },
      },
    });
  }
}

