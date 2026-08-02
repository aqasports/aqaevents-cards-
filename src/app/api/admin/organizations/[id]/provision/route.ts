import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { generateCardCode, generatePublicToken } from "@/lib/tokens";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

type EmployeeInput = {
  fullName: string;
  email?: string;
  phone?: string;
  initialCredits?: number;
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { id: organizationId } = await params;

  try {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        useSharedPool: true,
        sharedCreditPool: true,
      },
    });

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const body = await request.json();
    const employees: EmployeeInput[] = body.employees || [];
    const grantInitialCreditsFromPool = Boolean(body.grantInitialCreditsFromPool);

    if (!Array.isArray(employees) || employees.length === 0) {
      return NextResponse.json(
        { error: "Employees array is required and must not be empty" },
        { status: 400 }
      );
    }

    // Calculate total credits requested
    const totalCreditsRequested = employees.reduce((sum, emp) => {
      const credits = Number(emp.initialCredits) || 0;
      return sum + (credits > 0 ? credits : 0);
    }, 0);

    if (grantInitialCreditsFromPool && totalCreditsRequested > 0) {
      if (org.sharedCreditPool < totalCreditsRequested) {
        return NextResponse.json(
          {
            error: `Insufficient organization shared credit pool. Required: ${totalCreditsRequested}, available: ${org.sharedCreditPool}`,
          },
          { status: 400 }
        );
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      let createdCount = 0;
      let updatedCount = 0;
      let totalCreditsGranted = 0;
      let cardsGenerated = 0;

      if (grantInitialCreditsFromPool && totalCreditsRequested > 0) {
        await tx.organization.update({
          where: { id: organizationId },
          data: {
            sharedCreditPool: {
              decrement: totalCreditsRequested,
            },
          },
        });
      }

      for (const emp of employees) {
        const name = emp.fullName?.trim();
        if (!name) continue;

        const email = emp.email?.trim() || null;
        const phone = emp.phone?.trim() || null;
        const initialCredits = Number(emp.initialCredits) || 0;

        let client = null;

        // Try matching by email or phone
        if (email) {
          client = await tx.client.findFirst({ where: { email } });
        }
        if (!client && phone) {
          client = await tx.client.findFirst({ where: { phone } });
        }

        if (client) {
          client = await tx.client.update({
            where: { id: client.id },
            data: {
              organizationId,
              orgRole: client.orgRole || "member",
            },
          });
          updatedCount++;
        } else {
          client = await tx.client.create({
            data: {
              fullName: name,
              email,
              phone,
              organizationId,
              orgRole: "member",
            },
          });
          createdCount++;
        }

        // Ensure card exists for client
        let card = await tx.card.findFirst({
          where: { clientId: client.id, status: "active" },
        });

        if (!card) {
          let cardCode = generateCardCode();
          let publicToken = generatePublicToken();

          // Avoid collision
          let codeExists = await tx.card.findUnique({ where: { cardCode } });
          while (codeExists) {
            cardCode = generateCardCode();
            codeExists = await tx.card.findUnique({ where: { cardCode } });
          }

          let tokenExists = await tx.card.findUnique({ where: { publicToken } });
          while (tokenExists) {
            publicToken = generatePublicToken();
            tokenExists = await tx.card.findUnique({ where: { publicToken } });
          }

          card = await tx.card.create({
            data: {
              clientId: client.id,
              cardCode,
              publicToken,
              status: "active",
            },
          });
          cardsGenerated++;
        }

        if (initialCredits > 0) {
          await tx.ledgerEntry.create({
            data: {
              clientId: client.id,
              cardId: card.id,
              delta: initialCredits,
              type: "B2B_GRANT",
              reason: "Initial organization credit grant",
              createdById: session.user.id,
            },
          });
          totalCreditsGranted += initialCredits;
        }
      }

      return {
        createdCount,
        updatedCount,
        totalCreditsGranted,
        cardsGenerated,
      };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err: unknown) {
    logger.error("POST provision error:", err);
    const details = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Provisioning failed: ${details}` },
      { status: 500 }
    );
  }
}
