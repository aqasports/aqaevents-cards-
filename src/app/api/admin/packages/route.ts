import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession, requireSuperAdminSession } from "@/lib/api-auth";
import { BillingService } from "@/modules/invoices/service";
import { createPackageSchema } from "@/modules/invoices/validators";

const billingService = new BillingService();

export async function GET() {
  const { error } = await requireAdminSession();
  if (error) return error;

  try {
    const packages = await billingService.getPackages();
    return NextResponse.json(packages);
  } catch (err: unknown) {
    console.error("GET packages API error:", err);
    return NextResponse.json({ error: "Failed to fetch packages" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireSuperAdminSession();
  if (error || !session) return error;

  const body = await request.json();
  const parsed = createPackageSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const pkg = await billingService.createPackage(parsed.data, session.user.id);
    return NextResponse.json(pkg, { status: 201 });
  } catch (err: unknown) {
    console.error("POST package API error:", err);
    return NextResponse.json({ error: "Failed to create package" }, { status: 500 });
  }
}
