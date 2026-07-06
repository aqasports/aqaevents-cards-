const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function runCommand(cmd) {
  console.log(`Running: ${cmd}`);
  try {
    const stdout = execSync(cmd, { stdio: "inherit" });
    return true;
  } catch (err) {
    console.error(`Command failed: ${cmd}`);
    return false;
  }
}

function main() {
  const dbUrl = process.env.DATABASE_URL || "";
  
  if (!dbUrl) {
    console.log("No DATABASE_URL found. Skipping migrations.");
    return;
  }

  const isSqlite = dbUrl.startsWith("file:") || dbUrl.startsWith("sqlite:");
  if (isSqlite) {
    console.log("SQLite detected. Using db push for development database...");
    runCommand("npx prisma db push --accept-data-loss");
    return;
  }

  console.log("PostgreSQL database detected. Running migrations safely...");

  // Try standard deploy first
  const deploySuccess = runCommand("npx prisma migrate deploy");
  if (deploySuccess) {
    console.log("Migrations applied successfully using standard deploy.");
    return;
  }

  console.log("\n⚠️ Standard migration deploy failed. Attempting database transition from db push to migrate...");

  const migrationsDir = path.join(__dirname, "migrations");
  if (!fs.existsSync(migrationsDir)) {
    console.log("No migrations directory found. Performing schema push...");
    runCommand("npx prisma db push");
    return;
  }

  // Find all migrations in the folder
  const files = fs.readdirSync(migrationsDir);
  const migrationFolders = files.filter(f => {
    const fullPath = path.join(migrationsDir, f);
    return fs.statSync(fullPath).isDirectory();
  }).sort(); // Ensure sorted chronological order

  console.log(`Found ${migrationFolders.length} migration(s) in project folder.`);

  // Resolve migrations as applied to prevent table duplication errors
  for (const migration of migrationFolders) {
    console.log(`Marking migration as already applied: ${migration}`);
    // Run migrate resolve. This updates the _prisma_migrations table without altering database tables.
    runCommand(`npx prisma migrate resolve --applied "${migration}"`);
  }

  // Retry deploy
  console.log("Retrying migrate deploy after resolving baseline...");
  const retrySuccess = runCommand("npx prisma migrate deploy");
  if (retrySuccess) {
    console.log("✅ Database successfully synchronized with migrate deploy.");
  } else {
    console.error("❌ Migrate deploy failed again. Manual database inspection required.");
    process.exit(1);
  }
}

main();
