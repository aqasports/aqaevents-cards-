import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export class ActivitiesRepository {
  private db(tx?: Prisma.TransactionClient) {
    return tx || prisma;
  }

  // Activity CRUD
  async findMany(args?: Prisma.ActivityFindManyArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).activity.findMany(args);
  }

  async findUnique(args: Prisma.ActivityFindUniqueArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).activity.findUnique(args);
  }

  async create(args: Prisma.ActivityCreateArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).activity.create(args);
  }

  async update(args: Prisma.ActivityUpdateArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).activity.update(args);
  }

  async delete(args: Prisma.ActivityDeleteArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).activity.delete(args);
  }

  // Session CRUD
  async findSessionMany(args?: Prisma.ActivitySessionFindManyArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).activitySession.findMany(args);
  }

  async findSessionUnique(args: Prisma.ActivitySessionFindUniqueArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).activitySession.findUnique(args);
  }

  async createSession(args: Prisma.ActivitySessionCreateArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).activitySession.create(args);
  }

  async updateSession(args: Prisma.ActivitySessionUpdateArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).activitySession.update(args);
  }

  async deleteSession(args: Prisma.ActivitySessionDeleteArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).activitySession.delete(args);
  }

  // Expense CRUD
  async findExpenseMany(args?: Prisma.ActivityExpenseFindManyArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).activityExpense.findMany(args);
  }

  async findExpenseUnique(args: Prisma.ActivityExpenseFindUniqueArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).activityExpense.findUnique(args);
  }

  async createExpense(args: Prisma.ActivityExpenseCreateArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).activityExpense.create(args);
  }

  async updateExpense(args: Prisma.ActivityExpenseUpdateArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).activityExpense.update(args);
  }

  async deleteExpense(args: Prisma.ActivityExpenseDeleteArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).activityExpense.delete(args);
  }

  // SessionExpense CRUD
  async findSessionExpenseMany(args?: Prisma.SessionExpenseFindManyArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).sessionExpense.findMany(args);
  }

  async createSessionExpense(args: Prisma.SessionExpenseCreateArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).sessionExpense.create(args);
  }

  async deleteSessionExpense(args: Prisma.SessionExpenseDeleteArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).sessionExpense.delete(args);
  }
}
