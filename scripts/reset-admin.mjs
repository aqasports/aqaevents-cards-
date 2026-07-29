/**
 * Admin Account Recovery Script
 *
 * Usage:
 *   node scripts/reset-admin.mjs <email> <newPassword>
 *
 * Safe to run against production -- does NOT drop or truncate any table.
 */

import { createRequire } from "module";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const require = createRequire(import.meta.url);

const [,, emailArg, passwordArg] = process.argv;

if (!emailArg || !passwordArg) {
  console.error("Usage: node scripts/reset-admin.mjs <email> <newPassword>");
  process.exit(1);
}

const email = emailArg.trim().toLowerCase();
const password = passwordArg;

const { PrismaClient } = await import("@prisma/client");
const bcrypt = await import("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log(`\nRecovering admin account for: ${email}\n`);

  // Step 1: Try to clear lockouts (table may not exist in prod)
  try {
    const lockoutKey = `login-email:${email}`;
    const deleted = await prisma.rateLimitBucket.deleteMany({ where: { key: lockoutKey } });
    if (deleted.count > 0) {
      console.log(`[OK] Cleared login lockout for ${email}`);
    } else {
      console.log(`[OK] No login lockout found for ${email}`);
    }
  } catch (err) {
    if (err.message?.includes("does not exist")) {
      console.log(`[WARN] RateLimitBucket table does not exist -- lockout cleared implicitly`);
    } else {
      throw err;
    }
  }

  // Step 2: Hash the new password
  const passwordHash = await bcrypt.hash(password, 12);

  // Step 3: Upsert the AdminUser
  const existing = await prisma.adminUser.findUnique({ where: { email } });

  if (existing) {
    await prisma.adminUser.update({
      where: { email },
      data: { passwordHash },
    });
    console.log(`[OK] Password updated for existing admin: ${existing.name} (${email})`);
    console.log(`     Role: ${existing.role}`);
  } else {
    const newUser = await prisma.adminUser.create({
      data: {
        email,
        passwordHash,
        name: "Super Admin",
        role: "super-admin",
      },
    });
    console.log(`[OK] New super-admin account created: ${newUser.name} (${email})`);
  }

  console.log(`\nDone. You can now log in at /admin/login with:`);
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${password}`);
  console.log(`\nIMPORTANT: Delete this script after use if it contains a real password.\n`);
}

main()
  .catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
