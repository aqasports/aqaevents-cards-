import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth-options";
import { prisma } from "./prisma";
import { logger } from "@/lib/logger";

export async function requireAdminSession() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      logger.warn("[api-auth] No session or user id found. NEXTAUTH_URL:", process.env.NEXTAUTH_URL ?? "(not set)");
      return { session: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
    }

    // Verify that the user still exists in the database.
    // This catches stale sessions from database resets.
    let userExists;
    try {
      userExists = await prisma.adminUser.findUnique({
        where: { id: session.user.id },
        select: { id: true },
      });
    } catch (dbErr) {
      logger.error("[api-auth] Database error verifying user:", dbErr);
      return {
        session: null,
        error: NextResponse.json(
          { error: "Database connection error. Please try again." },
          { status: 503 }
        ),
      };
    }

    if (!userExists) {
      return {
        session: null,
        error: NextResponse.json(
          { error: "Stale session. If you recently reset the database, please log out of the admin panel and log back in." },
          { status: 401 }
        ),
      };
    }

    return { session, error: null };
  } catch (err) {
    logger.error("[api-auth] Unexpected error in requireAdminSession:", err);
    return {
      session: null,
      error: NextResponse.json(
        { error: "Authentication service error. Please try again." },
        { status: 500 }
      ),
    };
  }
}

export async function requireSuperAdminSession() {
  const { session, error } = await requireAdminSession();
  if (error || !session) return { session: null, error };

  if (session.user.role !== "super_admin") {
    return {
      session: null,
      error: NextResponse.json({ error: "Forbidden: Super Admin role required" }, { status: 403 }),
    };
  }

  return { session, error: null };
}
