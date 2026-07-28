/**
 * Restore Drill Script
 *
 * Reads a backup JSON file (produced by scripts/backup.ts or the /api/admin/backup endpoint)
 * and verifies its integrity by comparing row counts from the backup metadata against
 * the actual data arrays in the backup file.
 *
 * This script does NOT write to any database. It validates the backup file structure
 * and row counts locally. For a full end-to-end restore drill (importing into a staging
 * database), use this script first to validate the file, then use Prisma to seed the
 * staging database.
 *
 * Usage:
 *   npx tsx scripts/restore-drill.ts [path-to-backup.json]
 *
 * If no path is provided, it uses the most recent file in the backups/ directory.
 */

import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BackupMetadata {
  timestamp: string;
  version: string;
  counts: Record<string, number>;
}

interface BackupFile {
  metadata: BackupMetadata;
  data: Record<string, unknown[]>;
}

interface DrillResult {
  table: string;
  metadataCount: number;
  actualCount: number;
  match: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function findLatestBackup(backupsDir: string): string | null {
  if (!fs.existsSync(backupsDir)) return null;

  const files = fs.readdirSync(backupsDir)
    .filter((f) => f.startsWith("aqa-backup-") && f.endsWith(".json"))
    .sort()
    .reverse();

  return files.length > 0 ? path.join(backupsDir, files[0]) : null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const backupsDir = path.join(process.cwd(), "backups");
  let backupPath = process.argv[2];

  if (!backupPath) {
    console.log("No backup path specified. Searching backups/ directory...");
    const latest = findLatestBackup(backupsDir);
    if (!latest) {
      console.error("[ERROR] No backup files found in backups/ directory.");
      console.error("Run 'npm run db:backup' first to create a backup.");
      process.exit(1);
    }
    backupPath = latest;
  }

  if (!fs.existsSync(backupPath)) {
    console.error(`[ERROR] Backup file not found: ${backupPath}`);
    process.exit(1);
  }

  console.log("=".repeat(72));
  console.log("  RESTORE DRILL -- Backup Verification");
  console.log("=".repeat(72));
  console.log("");

  // Read and parse backup file
  const fileStats = fs.statSync(backupPath);
  console.log(`Backup file : ${path.basename(backupPath)}`);
  console.log(`File size   : ${formatBytes(fileStats.size)}`);
  console.log(`Modified    : ${fileStats.mtime.toISOString()}`);
  console.log("");

  let backup: BackupFile;
  try {
    const raw = fs.readFileSync(backupPath, "utf8");
    backup = JSON.parse(raw) as BackupFile;
  } catch (err) {
    console.error("[ERROR] Failed to parse backup file:", err);
    process.exit(1);
  }

  // Validate structure
  if (!backup.metadata || !backup.metadata.counts || !backup.data) {
    console.error("[ERROR] Backup file is missing required fields (metadata.counts, data).");
    process.exit(1);
  }

  console.log(`Backup timestamp : ${backup.metadata.timestamp}`);
  console.log(`Backup version   : ${backup.metadata.version}`);
  console.log("");

  // Compare metadata counts against actual data array lengths
  const results: DrillResult[] = [];
  const metadataTables = Object.keys(backup.metadata.counts);

  console.log("-".repeat(72));
  console.log(
    "Table".padEnd(25) +
    "Metadata Count".padEnd(18) +
    "Actual Count".padEnd(18) +
    "Status"
  );
  console.log("-".repeat(72));

  let allMatch = true;

  for (const table of metadataTables) {
    const metadataCount = backup.metadata.counts[table];
    const dataArray = backup.data[table];
    const actualCount = Array.isArray(dataArray) ? dataArray.length : -1;
    const match = metadataCount === actualCount;

    if (!match) allMatch = false;

    const status = match ? "[OK]" : "[MISMATCH]";

    console.log(
      table.padEnd(25) +
      String(metadataCount).padEnd(18) +
      String(actualCount === -1 ? "MISSING" : actualCount).padEnd(18) +
      status
    );

    results.push({ table, metadataCount, actualCount, match });
  }

  // Check for data keys not in metadata
  const dataOnlyTables = Object.keys(backup.data).filter(
    (k) => !metadataTables.includes(k)
  );
  for (const table of dataOnlyTables) {
    const dataArray = backup.data[table];
    const actualCount = Array.isArray(dataArray) ? dataArray.length : -1;

    console.log(
      table.padEnd(25) +
      "N/A".padEnd(18) +
      String(actualCount).padEnd(18) +
      "[EXTRA - no metadata count]"
    );
  }

  console.log("-".repeat(72));
  console.log("");

  // Special attention to LedgerEntry (immutable financial ledger)
  const ledgerResult = results.find((r) => r.table === "ledgerEntries");
  if (ledgerResult) {
    console.log("--- LedgerEntry Verification (Financial Ledger) ---");
    console.log(`  Metadata count : ${ledgerResult.metadataCount}`);
    console.log(`  Actual count   : ${ledgerResult.actualCount}`);
    console.log(`  Status         : ${ledgerResult.match ? "VERIFIED -- counts match" : "MISMATCH -- INVESTIGATE"}`);
    console.log("");
  }

  // Summary
  const totalMetadataRows = metadataTables.reduce(
    (sum, t) => sum + (backup.metadata.counts[t] || 0),
    0
  );
  const totalActualRows = results.reduce(
    (sum, r) => sum + (r.actualCount >= 0 ? r.actualCount : 0),
    0
  );

  console.log("=".repeat(72));
  if (allMatch) {
    console.log("  RESULT: ALL COUNTS MATCH -- Backup integrity verified.");
  } else {
    console.log("  RESULT: MISMATCHES DETECTED -- Backup may be corrupted.");
  }
  console.log(`  Total rows (metadata) : ${totalMetadataRows}`);
  console.log(`  Total rows (actual)   : ${totalActualRows}`);
  console.log("=".repeat(72));
  console.log("");

  // Write results to RESTORE_DRILL.md
  const drillOutput = generateDrillReport(backupPath, fileStats, backup, results, allMatch, dataOnlyTables);
  const drillPath = path.join(process.cwd(), "RESTORE_DRILL.md");
  fs.writeFileSync(drillPath, drillOutput, "utf8");
  console.log(`Drill report written to: ${drillPath}`);

  if (!allMatch) {
    process.exit(1);
  }
}

function generateDrillReport(
  backupPath: string,
  fileStats: fs.Stats,
  backup: BackupFile,
  results: DrillResult[],
  allMatch: boolean,
  dataOnlyTables: string[]
): string {
  const now = new Date().toISOString();
  const totalMeta = results.reduce((s, r) => s + r.metadataCount, 0);
  const totalActual = results.reduce((s, r) => s + (r.actualCount >= 0 ? r.actualCount : 0), 0);
  const ledger = results.find((r) => r.table === "ledgerEntries");

  let md = `# Restore Drill Report\n\n`;
  md += `**Date**: ${now}\n\n`;
  md += `## Backup File\n\n`;
  md += `| Field | Value |\n`;
  md += `|---|---|\n`;
  md += `| File | \`${path.basename(backupPath)}\` |\n`;
  md += `| Size | ${formatBytes(fileStats.size)} |\n`;
  md += `| Backup Timestamp | ${backup.metadata.timestamp} |\n`;
  md += `| Backup Version | ${backup.metadata.version} |\n\n`;

  md += `## Row Count Verification\n\n`;
  md += `| Table | Metadata Count | Actual Count | Status |\n`;
  md += `|---|---|---|---|\n`;
  for (const r of results) {
    const status = r.match ? "OK" : "MISMATCH";
    md += `| ${r.table} | ${r.metadataCount} | ${r.actualCount === -1 ? "MISSING" : r.actualCount} | ${status} |\n`;
  }
  if (dataOnlyTables.length > 0) {
    for (const t of dataOnlyTables) {
      md += `| ${t} | N/A | (present in data) | EXTRA |\n`;
    }
  }
  md += `\n`;

  md += `## LedgerEntry Verification\n\n`;
  if (ledger) {
    md += `The LedgerEntry table is the immutable financial ledger. Its integrity is critical.\n\n`;
    md += `- **Metadata count**: ${ledger.metadataCount}\n`;
    md += `- **Actual count**: ${ledger.actualCount}\n`;
    md += `- **Status**: ${ledger.match ? "VERIFIED -- counts match exactly" : "MISMATCH -- requires investigation"}\n\n`;
  } else {
    md += `LedgerEntry table was not found in the backup. This is unexpected.\n\n`;
  }

  md += `## Summary\n\n`;
  md += `- **Total rows (metadata)**: ${totalMeta}\n`;
  md += `- **Total rows (actual)**: ${totalActual}\n`;
  md += `- **Overall result**: ${allMatch ? "ALL COUNTS MATCH -- backup integrity verified" : "MISMATCHES DETECTED -- investigate before using this backup for restore"}\n\n`;

  md += `## Commands Run\n\n`;
  md += `\`\`\`bash\n`;
  md += `# 1. Verify backup exists\n`;
  md += `ls -la backups/\n\n`;
  md += `# 2. Run restore drill verification\n`;
  md += `npx tsx scripts/restore-drill.ts ${backupPath}\n`;
  md += `\`\`\`\n\n`;

  md += `## Procedure for Full Restore (if needed)\n\n`;
  md += `> IMPORTANT: Only restore to a staging/scratch database, NEVER production.\n\n`;
  md += `1. Ensure the staging database is available and empty (or use a scratch schema)\n`;
  md += `2. Set \`DATABASE_URL\` to point to the staging database\n`;
  md += `3. Run \`npx prisma db push\` to create the schema\n`;
  md += `4. Use a restore script to import the backup JSON data via Prisma\n`;
  md += `5. Verify row counts match using this drill script\n`;
  md += `6. Verify application functionality against the restored data\n`;

  return md;
}

main().catch((err) => {
  console.error("[ERROR] Restore drill failed:", err);
  process.exit(1);
});
