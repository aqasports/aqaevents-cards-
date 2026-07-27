import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export class ProposedActionsRepository {
  async findMany(params?: {
    where?: Prisma.AiActionQueueWhereInput;
    orderBy?: Prisma.AiActionQueueOrderByWithRelationInput;
    tx?: Prisma.TransactionClient;
  }) {
    const client = params?.tx || prisma;
    return client.aiActionQueue.findMany({
      where: params?.where,
      orderBy: params?.orderBy || { createdAt: "desc" },
    });
  }

  async findById(id: string, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.aiActionQueue.findUnique({
      where: { id },
    });
  }

  async create(data: Prisma.AiActionQueueCreateInput, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.aiActionQueue.create({ data });
  }

  async update(id: string, data: Prisma.AiActionQueueUpdateInput, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.aiActionQueue.update({
      where: { id },
      data,
    });
  }
}
