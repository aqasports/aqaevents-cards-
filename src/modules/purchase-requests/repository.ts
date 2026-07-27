/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export class PurchaseRequestsRepository {
  private db(tx?: Prisma.TransactionClient) {
    return tx || prisma;
  }

  async findMany(args?: Prisma.PublicPurchaseRequestFindManyArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).publicPurchaseRequest.findMany(args);
  }

  async findUnique(args: Prisma.PublicPurchaseRequestFindUniqueArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).publicPurchaseRequest.findUnique(args);
  }

  async findFirst(args?: Prisma.PublicPurchaseRequestFindFirstArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).publicPurchaseRequest.findFirst(args);
  }

  async create(args: Prisma.PublicPurchaseRequestCreateArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).publicPurchaseRequest.create(args);
  }

  async update(args: Prisma.PublicPurchaseRequestUpdateArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).publicPurchaseRequest.update(args);
  }

  async delete(args: Prisma.PublicPurchaseRequestDeleteArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).publicPurchaseRequest.delete(args);
  }
}
