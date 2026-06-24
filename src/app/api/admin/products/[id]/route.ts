import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/api-auth";
import { ProductsService } from "@/domains/products/products.service";

const productsService = new ProductsService();

const updateProductSchema = z.object({
  name: z.string().min(2).optional(),
  price: z.number().int().positive().optional(),
  description: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  advertised: z.boolean().optional(),
  active: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = updateProductSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const product = await productsService.updateProduct(id, parsed.data, session.user.id);
    return NextResponse.json(product);
  } catch (err: unknown) {
    console.error("PATCH product API error:", err);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { id } = await params;

  try {
    const product = await productsService.deleteProduct(id, session.user.id);
    return NextResponse.json(product);
  } catch (err: unknown) {
    console.error("DELETE product API error:", err);
    return NextResponse.json({ error: "Failed to archive product" }, { status: 500 });
  }
}
