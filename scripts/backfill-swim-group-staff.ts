import { prisma } from "../src/lib/prisma";

/**
 * Backfill script: reads all active SwimGroup records and matches legacy
 * coachName text against Coach.name to create SwimGroupStaff lead assignments.
 *
 * Usage:
 *   npx tsx scripts/backfill-swim-group-staff.ts           (defaults to --dry-run)
 *   npx tsx scripts/backfill-swim-group-staff.ts --apply   (performs DB writes)
 */
async function main() {
  const isApply = process.argv.includes("--apply");
  console.log(`[AQA Backfill] Running in ${isApply ? "APPLY" : "DRY-RUN"} mode...\n`);

  const groups = await prisma.swimGroup.findMany({
    where: { active: true },
    include: {
      staff: {
        where: { endsOn: null },
      },
    },
  });

  const coaches = await prisma.coach.findMany({
    where: { active: true },
  });

  const coachMapByName = new Map<string, typeof coaches[0]>();
  for (const c of coaches) {
    coachMapByName.set(c.name.trim().toLowerCase(), c);
  }

  let matched = 0;
  let alreadyStaffed = 0;
  let unmatched = 0;

  for (const g of groups) {
    if (g.staff.length > 0) {
      console.log(`[OK - Already Staffed] "${g.name}" already has ${g.staff.length} staff member(s).`);
      alreadyStaffed++;
      continue;
    }

    const legacyName = (g.coachName || "").trim().toLowerCase();
    if (!legacyName) {
      console.log(`[Skip - No Coach Name] "${g.name}" has no coachName.`);
      unmatched++;
      continue;
    }

    const coach = coachMapByName.get(legacyName);
    if (coach) {
      console.log(`[Match Found] "${g.name}" (legacy: "${g.coachName}") -> Coach "${coach.name}" (ID: ${coach.id})`);
      matched++;
      if (isApply) {
        await prisma.swimGroupStaff.create({
          data: {
            groupId: g.id,
            coachId: coach.id,
            role: "lead",
            startsOn: new Date(),
          },
        });
        console.log(`  -> Applied SwimGroupStaff lead assignment.`);
      }
    } else {
      console.log(`[Unmatched] "${g.name}" legacy coach "${g.coachName}" does not match any active Coach.`);
      unmatched++;
    }
  }

  console.log(`\n========================================`);
  console.log(`Backfill Summary:`);
  console.log(`  Already Staffed: ${alreadyStaffed}`);
  console.log(`  Matched & ${isApply ? "Applied" : "Ready to Apply"}: ${matched}`);
  console.log(`  Unmatched / Empty: ${unmatched}`);
  console.log(`========================================\n`);

  if (!isApply) {
    console.log(`Run with --apply to commit these assignments to the database.`);
  }
}

main()
  .catch((err) => {
    console.error("Backfill error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
