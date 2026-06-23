import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth-options";
import { prisma } from "./prisma";

export async function requireAdminSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { session: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  // Verify that the user still exists in the database.
  // This catches stale sessions from database resets.
  const userExists = await prisma.adminUser.findUnique({
    where: { id: session.user.id },
    select: { id: true },
  });

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
