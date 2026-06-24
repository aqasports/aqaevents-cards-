import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export class ProductsRepository {
  private db(tx?: Prisma.TransactionClient) {
    return tx || prisma;
  }

  async findMany(args?: Prisma.ProductFindManyArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).product.findMany(args);
  }

  async findUnique(args: Prisma.ProductFindUniqueArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).product.findUnique(args);
  }

  async create(args: Prisma.ProductCreateArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).product.create(args);
  }

  async update(args: Prisma.ProductUpdateArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).product.update(args);
  }

  async delete(args: Prisma.ProductDeleteArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).product.delete(args);
  }
}
