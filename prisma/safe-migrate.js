const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function runCommand(cmd) {
  console.log(`Running: ${cmd}`);
  try {
    execSync(cmd, { stdio: "inherit" });
    return true;
  } catch (err) {
    console.error(`Command failed: ${cmd}`);
    return false;
  }
}

/**
 * Run a command and capture its stdout/stderr instead of inheriting stdio.
 * Returns { success: boolean, stdout: string, stderr: string }.
 */
function runCommandCapture(cmd) {
  console.log(`Running (capture): ${cmd}`);
  try {
    const stdout = execSync(cmd, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
    return { success: true, stdout: stdout || "", stderr: "" };
  } catch (err) {
    return {
      success: false,
      stdout: err.stdout ? err.stdout.toString() : "",
      stderr: err.stderr ? err.stderr.toString() : "",
    };
  }
}

function banner(title, lines) {
  const width = 72;
  const border = "=".repeat(width);
  console.log("");
  console.log(border);
  console.log(`  ${title}`);
  for (const line of lines) {
    console.log(`  ${line}`);
  }
  console.log(border);
  console.log("");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

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

  // -----------------------------------------------------------------------
  // Step 1: Try standard migrate deploy (happy path)
  // -----------------------------------------------------------------------
  const deploySuccess = runCommand("npx prisma migrate deploy");
  if (deploySuccess) {
    console.log("Migrations applied successfully using standard deploy.");
    return;
  }

  // -----------------------------------------------------------------------
  // Step 2: Standard deploy failed -- investigate before auto-resolving
  // -----------------------------------------------------------------------

  banner("WARNING: MIGRATION DEPLOY FAILED", [
    "Standard 'prisma migrate deploy' did not succeed.",
    "Investigating whether auto-resolve is safe...",
  ]);

  const migrationsDir = path.join(__dirname, "migrations");
  if (!fs.existsSync(migrationsDir)) {
    console.log("No migrations directory found. Performing schema push...");
    runCommand("npx prisma db push");
    return;
  }

  // Find all migration folders
  const files = fs.readdirSync(migrationsDir);
  const migrationFolders = files.filter(f => {
    const fullPath = path.join(migrationsDir, f);
    return fs.statSync(fullPath).isDirectory();
  }).sort();

  console.log(`Found ${migrationFolders.length} migration(s) in project folder.`);

  // -----------------------------------------------------------------------
  // Step 2a: Schema drift check
  //
  // Compare what the Prisma schema expects against what the live database
  // actually has.  If they disagree, it is NOT safe to blindly mark
  // migrations as "already applied" because we would be lying to Prisma
  // about the real state of the database.
  // -----------------------------------------------------------------------

  console.log("\n--- Schema drift check ---");
  console.log("Comparing Prisma schema against live database...");

  // --from-schema-datamodel = "what the schema.prisma file expects"
  // --to-schema-datasource  = "what the live database actually has"
  // --exit-code makes the command exit 0 if no diff, 2 if diff exists, 1 on error
  const diffResult = runCommandCapture(
    "npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datasource prisma/schema.prisma --exit-code"
  );

  if (!diffResult.success) {
    // Exit code 2 = diff exists, exit code 1 = error running the command
    const combinedOutput = (diffResult.stdout + "\n" + diffResult.stderr).trim();

    if (combinedOutput.length > 0) {
      console.log("Diff output:");
      console.log(combinedOutput);
    }

    banner("SCHEMA DRIFT DETECTED -- BUILD ABORTED", [
      "The live database schema does NOT match what prisma/schema.prisma expects.",
      "Refusing to auto-mark migrations as 'already applied' because doing so",
      "would mask a genuine schema conflict.",
      "",
      "To resolve this:",
      "  1. Inspect the diff output above.",
      "  2. Fix the schema or database to bring them into agreement.",
      "  3. Re-deploy.",
      "",
      "This check prevents safe-migrate.js from silently papering over a",
      "real schema mismatch that could corrupt data at runtime.",
    ]);

    process.exit(1);
  }

  console.log("Schema drift check passed -- database matches expected schema.");

  // -----------------------------------------------------------------------
  // Step 3: Auto-resolve baseline migrations
  // -----------------------------------------------------------------------

  banner("WARNING: FALLBACK PATH ACTIVATED -- AUTO-RESOLVE", [
    "This deploy did NOT use a clean 'prisma migrate deploy'.",
    "Migrations are being marked as already applied.",
    "This path was taken because migrate deploy failed but the",
    "schema drift check confirmed the database matches the schema.",
  ]);

  const syncMigration = "20260727090000_sync_production_schema";

  // Only auto-resolve migrations that pre-date or equal the sync migration.
  // Newer migrations contain real DDL that MUST be executed, not skipped.
  const syncTimestamp = syncMigration.split("_")[0]; // "20260727090000"

  for (const migration of migrationFolders) {
    const migrationTimestamp = migration.split("_")[0];
    if (migrationTimestamp <= syncTimestamp) {
      console.log(`Marking baseline migration as already applied: ${migration}`);
      runCommand(`npx prisma migrate resolve --applied "${migration}"`);
    } else {
      console.log(`Skipping auto-resolve for post-sync migration: ${migration}`);
    }
  }

  // -----------------------------------------------------------------------
  // Step 4: Retry migrate deploy after resolving baseline
  // -----------------------------------------------------------------------
  console.log("Retrying migrate deploy after resolving baseline...");
  const retrySuccess = runCommand("npx prisma migrate deploy");
  if (retrySuccess) {
    banner("DEPLOY SUCCEEDED (VIA AUTO-RESOLVE)", [
      "Migrations applied after marking baseline migrations as already applied.",
      "Review the build log to confirm this was expected.",
    ]);
    return;
  }

  // -----------------------------------------------------------------------
  // Step 5: Raw SQL fallback -- gated behind ALLOW_SQL_FALLBACK
  // -----------------------------------------------------------------------
  console.error("Migrate deploy failed again after resolving baseline.");

  if (!process.env.ALLOW_SQL_FALLBACK) {
    banner("SQL FALLBACK BLOCKED -- BUILD ABORTED", [
      "The raw-SQL fallback is disabled by default for safety.",
      "safe-migrate.js will NOT execute migration SQL directly unless",
      "the environment variable ALLOW_SQL_FALLBACK=true is explicitly set.",
      "",
      "To enable this fallback (use with extreme caution):",
      "  1. Set ALLOW_SQL_FALLBACK=true in your Netlify environment variables.",
      "  2. Re-deploy.",
      "",
      "This block exists because running raw SQL against a database whose",
      "state has not been verified can cause silent data corruption.",
    ]);
    process.exit(1);
  }

  banner("WARNING: FALLBACK PATH ACTIVATED -- RAW SQL EXECUTION", [
    "ALLOW_SQL_FALLBACK is set. Executing migration SQL directly.",
    "This is the LAST RESORT fallback and should be investigated.",
    "The SQL file being executed was written for a specific schema state",
    "and may not be appropriate for the current database.",
  ]);

  const sqlPath = path.join(migrationsDir, syncMigration, "migration.sql");
  if (!fs.existsSync(sqlPath)) {
    console.error(`Sync migration SQL file not found: ${sqlPath}`);
    process.exit(1);
  }

  const sqlSuccess = runCommand(
    `npx prisma db execute --file "${sqlPath}"`
  );

  if (sqlSuccess) {
    runCommand(`npx prisma migrate resolve --applied "${syncMigration}"`);
    banner("DEPLOY SUCCEEDED (VIA RAW SQL FALLBACK)", [
      "The sync migration was applied by executing its SQL directly.",
      "This is NOT a normal deploy path. Investigate why migrate deploy failed.",
    ]);
  } else {
    banner("BUILD FAILED -- ALL MIGRATION STRATEGIES EXHAUSTED", [
      "1. prisma migrate deploy -- FAILED",
      "2. Auto-resolve + retry  -- FAILED",
      "3. Raw SQL execution     -- FAILED",
      "",
      "Manual intervention is required.",
    ]);
    process.exit(1);
  }
}

main();
