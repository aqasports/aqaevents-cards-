import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export class OrganizationsRepository {
  async findMany(params?: {
    where?: Prisma.OrganizationWhereInput;
    orderBy?: Prisma.OrganizationOrderByWithRelationInput;
    tx?: Prisma.TransactionClient;
  }) {
    const client = params?.tx || prisma;
    return client.organization.findMany({
      where: params?.where,
      orderBy: params?.orderBy || { name: "asc" },
      include: {
        _count: {
          select: { clients: true, invoices: true },
        },
      },
    });
  }

  async findById(id: string, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.organization.findUnique({
      where: { id },
      include: {
        clients: {
          include: {
            cards: true,
          },
        },
        invoices: true,
        _count: {
          select: { clients: true, invoices: true },
        },
      },
    });
  }

  async findBySlug(slug: string, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.organization.findUnique({
      where: { slug },
    });
  }

  async create(data: Prisma.OrganizationCreateInput, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.organization.create({ data });
  }

  async update(id: string, data: Prisma.OrganizationUpdateInput, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.organization.update({
      where: { id },
      data,
    });
  }

  async delete(id: string, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.organization.delete({
      where: { id },
    });
  }
}
