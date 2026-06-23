import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export class ClientsRepository {
  private db(tx?: Prisma.TransactionClient) {
    return tx || prisma;
  }

  async findMany(args?: Prisma.ClientFindManyArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).client.findMany(args);
  }

  async findUnique(args: Prisma.ClientFindUniqueArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).client.findUnique(args);
  }

  async findFirst(args?: Prisma.ClientFindFirstArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).client.findFirst(args);
  }

  async create(args: Prisma.ClientCreateArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).client.create(args);
  }

  async update(args: Prisma.ClientUpdateArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).client.update(args);
  }

  async delete(args: Prisma.ClientDeleteArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).client.delete(args);
  }

  async count(args?: Prisma.ClientCountArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).client.count(args);
  }
}
