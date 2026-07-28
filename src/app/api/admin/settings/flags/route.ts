/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession, requireSuperAdminSession } from "@/lib/api-auth";
import { FLAG_REGISTRY, getFlag, setFlag } from "@/lib/feature-flags";
import { ReportingRepository } from "@/modules/reports/repository";
import { z } from "zod";

const reportingRepo = new ReportingRepository();

// ─── GET /api/admin/settings/flags ───────────────────────────────────────────
// Any authenticated admin can read the current flag states.

export async function GET() {
  try {
    const { error } = await requireAdminSession();
    if (error) return error;

    const flags = await Promise.all(
      FLAG_REGISTRY.map(async (def) => {
        const value = await getFlag(def.key, def.default);
        return {
          key: def.key,
          description: def.description,
          value,
          default: def.default,
        };
      })
    );

    return NextResponse.json({ flags });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch feature flags" },
      { status: 500 }
    );
  }
}

// ─── PATCH /api/admin/settings/flags ─────────────────────────────────────────
// Only super_admin can toggle flags.

const PatchBody = z.object({
  key: z.string().min(1),
  value: z.boolean(),
});

export async function PATCH(request: NextRequest) {
  try {
    const { session, error } = await requireSuperAdminSession();
    if (error || !session) return error;

    const raw = await request.json();
    const parsed = PatchBody.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body. Expected { key: string, value: boolean }." },
        { status: 400 }
      );
    }

    const { key, value } = parsed.data;

    // Reject keys not in the registry — prevents blind writes to PlatformSetting
    const knownKeys = FLAG_REGISTRY.map((f) => f.key);
    if (!knownKeys.includes(key)) {
      return NextResponse.json(
        { error: `Unknown flag key: "${key}". Add it to FLAG_REGISTRY first.` },
        { status: 400 }
      );
    }

    const oldValue = await getFlag(key);
    await setFlag(key, value);

    await reportingRepo.createAudit({
      data: {
        userId: session.user.id,
        action: "UPDATE_FEATURE_FLAG",
        target: `PlatformSetting:${key}`,
        details: `Changed feature flag "${key}" from ${oldValue} to ${value}.`,
      },
    });

    return NextResponse.json({ success: true, key, value });
  } catch (error: any) {
    const status =
      error.message === "Forbidden"
        ? 403
        : error.message === "Unauthorized"
        ? 401
        : 500;
    return NextResponse.json(
      { error: error.message || "Failed to update feature flag" },
      { status }
    );
  }
}
