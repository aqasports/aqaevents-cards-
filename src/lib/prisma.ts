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

// Reuse the client across warm invocations in all environments to prevent connection pool exhaustion in serverless.
export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient();

globalForPrisma.prisma = prisma;

import "@/modules/subscribers";

