import { NextRequest, NextResponse } from "next/server";
import { ClientsService } from "@/modules/clients/service";
import { prisma } from "@/lib/prisma";

const clientsService = new ClientsService();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fullName, email, phone, packageId } = body;

    if (!fullName) {
      return NextResponse.json({ error: "Missing fullName" }, { status: 400 });
    }

    if (!packageId) {
      return NextResponse.json({ error: "Missing packageId" }, { status: 400 });
    }

    // Verify package exists and is active
    const pkg = await prisma.package.findUnique({
      where: { id: packageId, active: true },
    });

    if (!pkg) {
      return NextResponse.json({ error: "Selected package is invalid or inactive" }, { status: 400 });
    }

    // Create client and issue card
    const result = await clientsService.createClient(
      {
        fullName,
        email: email || null,
        phone: phone || null,
        notes: `Online self-signup for ${pkg.name} package.`,
        packageId,
        issueCard: true,
        preCardCode: null,
        leadSource: "website_signup",
      },
      null // null adminId since it is a self-signup
    );

    return NextResponse.json({
      success: true,
      message: "Signup successful!",
      client: {
        id: result.id,
        fullName: result.fullName,
        email: result.email,
        phone: result.phone,
        balance: result.balance,
      },
      card: result.card ? {
        cardCode: result.card.cardCode,
        publicToken: result.card.publicToken,
      } : null,
    });
  } catch (err: unknown) {
    console.error("POST public signup API error:", err);
    const details = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Signup failed: ${details}` },
      { status: 500 }
    );
  }
}
