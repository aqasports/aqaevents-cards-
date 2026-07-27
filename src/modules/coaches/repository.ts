import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export class CoachesRepository {
  async findMany(params?: {
    where?: Prisma.CoachWhereInput;
    orderBy?: Prisma.CoachOrderByWithRelationInput;
    tx?: Prisma.TransactionClient;
  }) {
    const client = params?.tx || prisma;
    return client.coach.findMany({
      where: params?.where,
      orderBy: params?.orderBy || { name: "asc" },
      include: {
        _count: {
          select: { sessions: true },
        },
      },
    });
  }

  async findById(id: string, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.coach.findUnique({
      where: { id },
      include: {
        sessions: {
          include: {
            activity: true,
            redemptions: true,
          },
        },
      },
    });
  }

  async create(data: Prisma.CoachCreateInput, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.coach.create({ data });
  }

  async update(id: string, data: Prisma.CoachUpdateInput, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.coach.update({
      where: { id },
      data,
    });
  }

  async delete(id: string, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.coach.delete({
      where: { id },
    });
  }
}
