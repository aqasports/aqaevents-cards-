import { ProductsRepository } from "./products.repository";
import { ReportingRepository } from "../reporting/reporting.repository";

export class ProductsService {
  private productsRepo = new ProductsRepository();
  private reportingRepo = new ReportingRepository();

  async getProducts() {
    return this.productsRepo.findMany({
      where: { active: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async getAdvertisedProducts() {
    return this.productsRepo.findMany({
      where: { active: true, advertised: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async getProduct(id: string) {
    return this.productsRepo.findUnique({
      where: { id },
    });
  }

  async createProduct(
    data: {
      name: string;
      price: number;
      description?: string | null;
      imageUrl?: string | null;
      advertised?: boolean;
    },
    adminId?: string | null
  ) {
    const product = await this.productsRepo.create({
      data: {
        name: data.name,
        price: data.price,
        description: data.description,
        imageUrl: data.imageUrl,
        advertised: data.advertised ?? true,
      },
    });

    if (adminId) {
      await this.reportingRepo.createAudit({
        data: {
          userId: adminId,
          action: "CREATE_PRODUCT",
          target: `Product ${product.name}`,
          details: `Created product "${product.name}" for ${product.price} DA. Advertised: ${product.advertised}.`,
        },
      });
    }

    return product;
  }

  async updateProduct(
    id: string,
    data: {
      name?: string;
      price?: number;
      description?: string | null;
      imageUrl?: string | null;
      advertised?: boolean;
      active?: boolean;
    },
    adminId?: string | null
  ) {
    const product = await this.productsRepo.update({
      where: { id },
      data,
    });

    if (adminId) {
      await this.reportingRepo.createAudit({
        data: {
          userId: adminId,
          action: "UPDATE_PRODUCT",
          target: `Product ${product.name}`,
          details: `Updated product "${product.name}".`,
        },
      });
    }

    return product;
  }

  async deleteProduct(id: string, adminId?: string | null) {
    // Soft delete by setting active = false
    const product = await this.productsRepo.update({
      where: { id },
      data: { active: false, advertised: false },
    });

    if (adminId) {
      await this.reportingRepo.createAudit({
        data: {
          userId: adminId,
          action: "DELETE_PRODUCT",
          target: `Product ${product.name}`,
          details: `Soft deleted/archived product "${product.name}".`,
        },
      });
    }

    return product;
  }
}
