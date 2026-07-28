import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { ProductsService } from "@/modules/invoices/service";
import { createProductSchema } from "@/modules/invoices/validators";
import { logger } from "@/lib/logger";

const productsService = new ProductsService();

export async function GET() {
  const { error } = await requireAdminSession();
  if (error) return error;

  try {
    const products = await productsService.getProducts();
    return NextResponse.json(products);
  } catch (err: unknown) {
    logger.error("GET products API error:", err);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  try {
    const body = await request.json();
    const parsed = createProductSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const product = await productsService.createProduct(parsed.data, session.user.id);
    return NextResponse.json(product, { status: 201 });
  } catch (err: unknown) {
    logger.error("POST product API error:", err);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
