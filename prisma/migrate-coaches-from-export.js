/**
 * One-time Migration Script: Import legacy localStorage Coach Data into PostgreSQL
 *
 * Usage:
 *   1. Export your browser's localStorage items: 'aqa_coaches', 'aqa_coach_assignments', 'aqa_coach_payouts'.
 *   2. Paste the JSON strings into a file `prisma/legacy-coaches.json` with shape:
 *      {
 *        "coaches": [...],
 *        "assignments": [...],
 *        "payouts": [...]
 *      }
 *   3. Run: `node prisma/migrate-coaches-from-export.js`
 */

import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function main() {
  const jsonPath = path.join(process.cwd(), "prisma", "legacy-coaches.json");
  if (!fs.existsSync(jsonPath)) {
    console.log("No legacy-coaches.json found. Skipping coach import.");
    return;
  }

  const fileContent = fs.readFileSync(jsonPath, "utf-8");
  const data = JSON.parse(fileContent);

  console.log(`Importing ${data.coaches?.length || 0} coaches...`);

  for (const c of data.coaches || []) {
    await prisma.coach.upsert({
      where: { id: c.id },
      create: {
        id: c.id,
        name: c.name,
        email: c.email || null,
        phone: c.phone || null,
        specialties: c.notes || null,
        defaultPayRate: c.baseRate || 0,
        commissionRate: c.bonusPerAttendee || 0,
      },
      update: {
        name: c.name,
        email: c.email || null,
        phone: c.phone || null,
        specialties: c.notes || null,
        defaultPayRate: c.baseRate || 0,
        commissionRate: c.bonusPerAttendee || 0,
      },
    });
  }

  console.log("Coach import completed successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
