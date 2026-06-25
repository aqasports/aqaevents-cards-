import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export class CardsRepository {
  private db(tx?: Prisma.TransactionClient) {
    return tx || prisma;
  }

  async findMany(args?: Prisma.CardFindManyArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).card.findMany(args);
  }

  async findUnique(args: Prisma.CardFindUniqueArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).card.findUnique(args);
  }

  async findFirst(args?: Prisma.CardFindFirstArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).card.findFirst(args);
  }

  async create(args: Prisma.CardCreateArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).card.create(args);
  }

  async update(args: Prisma.CardUpdateArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).card.update(args);
  }

  async delete(args: Prisma.CardDeleteArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).card.delete(args);
  }

  async deleteMany(args?: Prisma.CardDeleteManyArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).card.deleteMany(args);
  }

  async count(args?: Prisma.CardCountArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).card.count(args);
  }

  async createMany(args: Prisma.CardCreateManyArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).card.createMany(args);
  }
}
