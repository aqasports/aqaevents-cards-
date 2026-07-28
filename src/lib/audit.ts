import { prisma } from "./prisma";
import { logger } from "@/lib/logger";

export async function logAdminAction(
  userId: string | null,
  action: string,
  target: string,
  details?: string | null,
  ipAddress?: string | null,
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        target,
        details: details ?? null,
        ipAddress: ipAddress ?? null,
      },
    });
  } catch (err) {
    logger.error("Failed to write audit log:", err);
  }
}
