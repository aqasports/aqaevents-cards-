import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

const SCRIPT_PATH = path.join(__dirname, "../../prisma/safe-migrate.js");

describe("safe-migrate.js -- hardening checks", () => {
  const scriptContent = fs.readFileSync(SCRIPT_PATH, "utf8");

  it("script file exists", () => {
    expect(fs.existsSync(SCRIPT_PATH)).toBe(true);
  });

  // -----------------------------------------------------------------------
  // Structural checks: verify the safety mechanisms are present in the code
  // -----------------------------------------------------------------------

  it("contains schema drift check via prisma migrate diff", () => {
    expect(scriptContent).toContain("prisma migrate diff");
    expect(scriptContent).toContain("--from-schema-datamodel");
    expect(scriptContent).toContain("--to-schema-datasource");
    expect(scriptContent).toContain("--exit-code");
  });

  it("contains ALLOW_SQL_FALLBACK environment gate", () => {
    expect(scriptContent).toContain("ALLOW_SQL_FALLBACK");
    expect(scriptContent).toContain("process.env.ALLOW_SQL_FALLBACK");
  });

  it("aborts with process.exit(1) when SQL fallback is blocked", () => {
    // The script should have a conditional that checks ALLOW_SQL_FALLBACK
    // and exits if it is not set
    expect(scriptContent).toContain("if (!process.env.ALLOW_SQL_FALLBACK)");
    expect(scriptContent).toContain("process.exit(1)");
  });

  it("contains prominent warning banners for fallback paths", () => {
    // Auto-resolve banner
    expect(scriptContent).toContain("FALLBACK PATH ACTIVATED -- AUTO-RESOLVE");
    // SQL fallback banner
    expect(scriptContent).toContain("FALLBACK PATH ACTIVATED -- RAW SQL EXECUTION");
    // Blocked banner
    expect(scriptContent).toContain("SQL FALLBACK BLOCKED -- BUILD ABORTED");
    // Schema drift banner
    expect(scriptContent).toContain("SCHEMA DRIFT DETECTED -- BUILD ABORTED");
  });

  it("contains runCommandCapture helper for capturing diff output", () => {
    expect(scriptContent).toContain("function runCommandCapture");
    expect(scriptContent).toContain("encoding: \"utf8\"");
  });

  it("does not contain emojis", () => {
    // Check that common emojis used in the old version have been removed.
    // The old script used: warning sign, check mark, cross mark
    const emojiPattern = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    expect(emojiPattern.test(scriptContent)).toBe(false);
  });

  // -----------------------------------------------------------------------
  // Behavioral test: simulate migrate deploy failure without ALLOW_SQL_FALLBACK
  // -----------------------------------------------------------------------

  it("exits with error when migrate deploy fails and ALLOW_SQL_FALLBACK is not set", () => {
    // We test this by running the script with:
    //   - A fake DATABASE_URL (PostgreSQL format, but not a real server)
    //   - No ALLOW_SQL_FALLBACK set
    //   - The script should fail at 'prisma migrate deploy', then attempt
    //     the diff check which will also fail (no real DB), and abort.
    //
    // The key assertion: the script should exit with code 1 (non-zero),
    // meaning the Netlify build would fail loudly.
    //
    // Note: prisma commands attempting to connect to a non-existent database
    // can take time to time out on DNS/connection, so we allow 60s for this test.

    let exitCode = 0;
    try {
      execSync(`node "${SCRIPT_PATH}"`, {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
        timeout: 55000,
        env: {
          ...process.env,
          DATABASE_URL: "postgresql://fake_user:fake_pass@127.0.0.1:59999/fake_db",
          ALLOW_SQL_FALLBACK: "",
          PATH: process.env.PATH,
          NODE_PATH: process.env.NODE_PATH || "",
        },
      });
    } catch (err: unknown) {
      const execErr = err as { status?: number };
      exitCode = execErr.status || 1;
    }

    // The script must exit with a non-zero code
    // It should fail at either the diff check or the migrate deploy step
    expect(exitCode).not.toBe(0);
  }, 60000);


  // -----------------------------------------------------------------------
  // Verify the SQLite path is preserved (should still use db push)
  // -----------------------------------------------------------------------

  it("still handles SQLite with db push for local development", () => {
    expect(scriptContent).toContain("SQLite detected");
    expect(scriptContent).toContain("db push --accept-data-loss");
  });

  // -----------------------------------------------------------------------
  // Verify the happy path structure is preserved
  // -----------------------------------------------------------------------

  it("tries standard migrate deploy first (happy path)", () => {
    // The first non-SQLite migration attempt should be 'prisma migrate deploy'
    const migrateDeployIndex = scriptContent.indexOf("prisma migrate deploy");
    const autoResolveIndex = scriptContent.indexOf("FALLBACK PATH ACTIVATED -- AUTO-RESOLVE");
    expect(migrateDeployIndex).toBeLessThan(autoResolveIndex);
  });
});
