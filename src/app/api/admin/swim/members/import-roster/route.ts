import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { generateSwimId, generateSwimToken, generateSwimCardCode } from "@/lib/swim-id";
import { HOMME_ROSTER_DATA } from "@/lib/swim-homme-roster";

export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest, sessionUser: unknown): boolean {
  if (sessionUser) return true;
  const headerKey = request.headers.get("x-import-key");
  const secretKey = process.env.IMPORT_ROSTER_SECRET || "aqa-homme-roster-import-2026";
  return headerKey === secretKey;
}

export async function GET(request: NextRequest) {
  const { session } = await requireAdminSession();
  if (!isAuthorized(request, session?.user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const existingHommeMembers = await prisma.swimMember.findMany({
      where: { category: "homme" },
      select: { id: true, fullName: true, swimId: true, dateOfStart: true },
    });

    const existingNamesSet = new Set(
      existingHommeMembers.map((m) => m.fullName.trim().toLowerCase())
    );

    const readyToInsert = HOMME_ROSTER_DATA.filter(
      (item) => !existingNamesSet.has(item.fullName.trim().toLowerCase())
    );
    const alreadyPresent = HOMME_ROSTER_DATA.filter(
      (item) => existingNamesSet.has(item.fullName.trim().toLowerCase())
    );

    return NextResponse.json({
      totalInRoster: HOMME_ROSTER_DATA.length,
      readyToInsertCount: readyToInsert.length,
      alreadyPresentCount: alreadyPresent.length,
      alreadyPresentNames: alreadyPresent.map((p) => p.fullName),
      totalExistingHommeInDb: existingHommeMembers.length,
    });
  } catch (err: unknown) {
    logger.error("GET import-roster status error:", err);
    return NextResponse.json({ error: "Failed to inspect import status" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { session } = await requireAdminSession();
  if (!isAuthorized(request, session?.user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const dryRun = Boolean(body.dryRun);

    const existingHommeMembers = await prisma.swimMember.findMany({
      where: { category: "homme" },
      select: { id: true, fullName: true },
    });

    const existingNamesSet = new Set(
      existingHommeMembers.map((m) => m.fullName.trim().toLowerCase())
    );

    const createdList: Array<{ swimId: string; fullName: string; dateOfStart: string }> = [];
    const skippedList: Array<{ fullName: string; reason: string }> = [];

    for (const item of HOMME_ROSTER_DATA) {
      const lowerName = item.fullName.trim().toLowerCase();
      if (existingNamesSet.has(lowerName)) {
        skippedList.push({
          fullName: item.fullName,
          reason: "Already exists in database under category homme",
        });
        continue;
      }

      if (dryRun) {
        createdList.push({
          swimId: "SWM-DRYRUN",
          fullName: item.fullName,
          dateOfStart: item.dateOfStart,
        });
        existingNamesSet.add(lowerName);
        continue;
      }

      // Generate collision-free swimId
      let swimId = generateSwimId();
      let collision = await prisma.swimMember.findUnique({ where: { swimId } });
      while (collision) {
        swimId = generateSwimId();
        collision = await prisma.swimMember.findUnique({ where: { swimId } });
      }

      // Create SwimMember
      const member = await prisma.swimMember.create({
        data: {
          swimId,
          fullName: item.fullName.trim(),
          phone: item.phone,
          category: "homme",
          level: item.level,
          formula: item.formula,
          duration: item.duration,
          priceDA: 0,
          dateOfStart: new Date(item.dateOfStart),
          paymentStatus: item.paymentStatus,
          groupStatus: item.groupStatus,
          notes: item.notes,
        },
      });

      // Generate collision-free card
      let cardCode = generateSwimCardCode();
      let codeCollision = await prisma.swimCard.findUnique({ where: { cardCode } });
      while (codeCollision) {
        cardCode = generateSwimCardCode();
        codeCollision = await prisma.swimCard.findUnique({ where: { cardCode } });
      }

      let publicToken = generateSwimToken();
      let tokenCollision = await prisma.swimCard.findUnique({ where: { publicToken } });
      while (tokenCollision) {
        publicToken = generateSwimToken();
        tokenCollision = await prisma.swimCard.findUnique({ where: { publicToken } });
      }

      await prisma.swimCard.create({
        data: {
          memberId: member.id,
          publicToken,
          cardCode,
          status: "active",
        },
      });

      createdList.push({
        swimId: member.swimId,
        fullName: member.fullName,
        dateOfStart: item.dateOfStart,
      });

      existingNamesSet.add(lowerName);
    }

    if (!dryRun && createdList.length > 0) {
      try {
        await prisma.auditLog.create({
          data: {
            action: "SWIM_MEMBER_ROSTER_IMPORT",
            target: "SWIM_HOMME_ROSTER",
            userId: (session?.user as { id?: string })?.id || "system",
            details: `Imported ${createdList.length} members into homme category (${skippedList.length} skipped)`,
          },
        });
      } catch (logErr) {
        logger.warn("Audit log creation skipped:", logErr);
      }
    }

    return NextResponse.json({
      success: true,
      dryRun,
      totalInRoster: HOMME_ROSTER_DATA.length,
      createdCount: createdList.length,
      skippedCount: skippedList.length,
      created: createdList,
      skipped: skippedList,
    });
  } catch (err: unknown) {
    logger.error("POST import-roster error:", err);
    return NextResponse.json(
      { error: "Failed to execute roster import", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
