import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export class CampaignsRepository {
  async findMany(params?: {
    where?: Prisma.CampaignPromoWhereInput;
    orderBy?: Prisma.CampaignPromoOrderByWithRelationInput;
    tx?: Prisma.TransactionClient;
  }) {
    const client = params?.tx || prisma;
    return client.campaignPromo.findMany({
      where: params?.where,
      orderBy: params?.orderBy || { createdAt: "desc" },
    });
  }

  async findByCode(code: string, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.campaignPromo.findUnique({
      where: { code: code.toUpperCase().trim() },
    });
  }

  async findById(id: string, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.campaignPromo.findUnique({
      where: { id },
    });
  }

  async create(data: Prisma.CampaignPromoCreateInput, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.campaignPromo.create({ data });
  }

  async update(id: string, data: Prisma.CampaignPromoUpdateInput, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.campaignPromo.update({
      where: { id },
      data,
    });
  }

  async delete(id: string, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.campaignPromo.delete({
      where: { id },
    });
  }
}
