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
      select: {
        id: true,
        name: true,
        slug: true,
        creditRate: true,
        sharedCreditPool: true,
        useSharedPool: true,
        createdAt: true,
        updatedAt: true,
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
      select: {
        id: true,
        name: true,
        slug: true,
        creditRate: true,
        sharedCreditPool: true,
        useSharedPool: true,
        createdAt: true,
        updatedAt: true,
        clients: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            archived: true,
            cards: {
              select: { id: true, cardCode: true, publicToken: true, status: true },
            },
          },
        },
        invoices: {
          select: {
            id: true,
            invoiceCode: true,
            amount: true,
            category: true,
            items: true,
            status: true,
            paidAt: true,
            createdAt: true,
          },
        },
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
      select: {
        id: true,
        name: true,
        slug: true,
        creditRate: true,
        sharedCreditPool: true,
        useSharedPool: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async create(data: Prisma.OrganizationCreateInput, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.organization.create({
      data,
      select: {
        id: true,
        name: true,
        slug: true,
        creditRate: true,
        sharedCreditPool: true,
        useSharedPool: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async update(id: string, data: Prisma.OrganizationUpdateInput, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.organization.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        slug: true,
        creditRate: true,
        sharedCreditPool: true,
        useSharedPool: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async delete(id: string, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.organization.delete({
      where: { id },
    });
  }
}
