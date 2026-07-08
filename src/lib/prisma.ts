import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const url = process.env.DATABASE_URL;
export const isSqlite = !url || url.startsWith("file:") || url.startsWith("sqlite:");

function createPrismaClient() {
  if (!url) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  return new PrismaClient({
    datasources: { db: { url } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

// In development, reuse the client across hot-reloads to avoid too many connections.
// But always create fresh if the global is missing (first load or after error reset).
export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

import "@/modules/subscribers";

