import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export class BillingRepository {
  private db(tx?: Prisma.TransactionClient) {
    return tx || prisma;
  }

  // Invoice operations
  async findInvoiceMany(args?: Prisma.InvoiceFindManyArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).invoice.findMany(args);
  }

  async findInvoiceUnique(args: Prisma.InvoiceFindUniqueArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).invoice.findUnique(args);
  }

  async createInvoice(args: Prisma.InvoiceCreateArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).invoice.create(args);
  }

  async updateInvoice(args: Prisma.InvoiceUpdateArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).invoice.update(args);
  }

  async deleteInvoice(args: Prisma.InvoiceDeleteArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).invoice.delete(args);
  }

  async countInvoice(args?: Prisma.InvoiceCountArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).invoice.count(args);
  }

  async aggregateInvoice(args: Prisma.InvoiceAggregateArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).invoice.aggregate(args);
  }

  // Package operations
  async findPackageMany(args?: Prisma.PackageFindManyArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).package.findMany(args);
  }

  async findPackageUnique(args: Prisma.PackageFindUniqueArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).package.findUnique(args);
  }

  async createPackage(args: Prisma.PackageCreateArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).package.create(args);
  }

  async updatePackage(args: Prisma.PackageUpdateArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).package.update(args);
  }

  async deletePackage(args: Prisma.PackageDeleteArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).package.delete(args);
  }

  // LedgerEntry operations
  async findLedgerMany(args?: Prisma.LedgerEntryFindManyArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).ledgerEntry.findMany(args);
  }

  async findLedgerUnique(args: Prisma.LedgerEntryFindUniqueArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).ledgerEntry.findUnique(args);
  }

  async createLedger(args: Prisma.LedgerEntryCreateArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).ledgerEntry.create(args);
  }

  async deleteLedger(args: Prisma.LedgerEntryDeleteArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).ledgerEntry.delete(args);
  }

  async countLedger(args?: Prisma.LedgerEntryCountArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).ledgerEntry.count(args);
  }

  async sumLedgerDelta(clientId: string, tx?: Prisma.TransactionClient): Promise<number> {
    const aggregate = await this.db(tx).ledgerEntry.aggregate({
      where: { clientId },
      _sum: { delta: true },
    });
    return aggregate._sum.delta ?? 0;
  }

  // Redemption operations
  async findRedemptionMany(args?: Prisma.RedemptionFindManyArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).redemption.findMany(args);
  }

  async findRedemptionUnique(args: Prisma.RedemptionFindUniqueArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).redemption.findUnique(args);
  }

  async createRedemption(args: Prisma.RedemptionCreateArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).redemption.create(args);
  }

  async deleteRedemption(args: Prisma.RedemptionDeleteArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).redemption.delete(args);
  }

  async deleteRedemptionMany(args?: Prisma.RedemptionDeleteManyArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).redemption.deleteMany(args);
  }

  async countRedemption(args?: Prisma.RedemptionCountArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).redemption.count(args);
  }

  async groupByRedemption(args: any, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).redemption.groupBy(args);
  }

  // Product operations (from ProductsRepository)
  async findProductMany(args?: Prisma.ProductFindManyArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).product.findMany(args);
  }

  async findProductUnique(args: Prisma.ProductFindUniqueArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).product.findUnique(args);
  }

  async createProduct(args: Prisma.ProductCreateArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).product.create(args);
  }

  async updateProduct(args: Prisma.ProductUpdateArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).product.update(args);
  }

  async deleteProduct(args: Prisma.ProductDeleteArgs, tx?: Prisma.TransactionClient): Promise<any> {
    return this.db(tx).product.delete(args);
  }
}
