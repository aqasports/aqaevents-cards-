import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export class DepartmentsRepository {
  async findMany(params?: {
    where?: Prisma.DepartmentWhereInput;
    orderBy?: Prisma.DepartmentOrderByWithRelationInput;
    tx?: Prisma.TransactionClient;
  }) {
    const client = params?.tx || prisma;
    return client.department.findMany({
      where: params?.where,
      orderBy: params?.orderBy || { name: "asc" },
      include: {
        clients: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
        _count: {
          select: { clients: true },
        },
      },
    });
  }

  async findById(id: string, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.department.findUnique({
      where: { id },
      include: {
        clients: true,
        organization: true,
        _count: { select: { clients: true } },
      },
    });
  }

  async create(data: Prisma.DepartmentCreateInput, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.department.create({
      data,
      include: { organization: { select: { name: true } } },
    });
  }

  async update(id: string, data: Prisma.DepartmentUpdateInput, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.department.update({
      where: { id },
      data,
    });
  }

  async delete(id: string, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.department.delete({
      where: { id },
    });
  }

  async reassignClient(clientId: string, departmentId: string | null, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.client.update({
      where: { id: clientId },
      data: { departmentId },
    });
  }
}
