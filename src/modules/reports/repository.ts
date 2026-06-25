import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export class ReportingRepository {
  private db(tx?: Prisma.TransactionClient) {
    return tx || prisma;
  }

  // Audit Logs
  async findAuditMany(args?: Prisma.AuditLogFindManyArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).auditLog.findMany(args);
  }

  async createAudit(args: Prisma.AuditLogCreateArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).auditLog.create(args);
  }

  // Notification Logs
  async findNotificationMany(args?: Prisma.NotificationLogFindManyArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).notificationLog.findMany(args);
  }

  async createNotification(args: Prisma.NotificationLogCreateArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).notificationLog.create(args);
  }

  // Admin Users
  async findAdminMany(args?: Prisma.AdminUserFindManyArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).adminUser.findMany(args);
  }

  async findAdminUnique(args: Prisma.AdminUserFindUniqueArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).adminUser.findUnique(args);
  }

  async createAdmin(args: Prisma.AdminUserCreateArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).adminUser.create(args);
  }

  async updateAdmin(args: Prisma.AdminUserUpdateArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).adminUser.update(args);
  }

  async deleteAdmin(args: Prisma.AdminUserDeleteArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).adminUser.delete(args);
  }
}
