import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export class ContractsRepository {
  async findMany(params?: {
    where?: Prisma.ContractWhereInput;
    orderBy?: Prisma.ContractOrderByWithRelationInput;
    tx?: Prisma.TransactionClient;
  }) {
    const client = params?.tx || prisma;
    return client.contract.findMany({
      where: params?.where,
      orderBy: params?.orderBy || { createdAt: "desc" },
      include: {
        organization: {
          select: { id: true, name: true, slug: true },
        },
      },
    });
  }

  async findById(id: string, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.contract.findUnique({
      where: { id },
      include: {
        organization: true,
      },
    });
  }

  async create(data: Prisma.ContractCreateInput, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.contract.create({
      data,
      include: {
        organization: { select: { id: true, name: true } },
      },
    });
  }

  async update(id: string, data: Prisma.ContractUpdateInput, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.contract.update({
      where: { id },
      data,
      include: {
        organization: { select: { id: true, name: true } },
      },
    });
  }

  async delete(id: string, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.contract.delete({
      where: { id },
    });
  }
}
