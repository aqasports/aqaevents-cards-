import { NextRequest, NextResponse } from "next/server";
import { requireOrgSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { logAdminAction } from "@/lib/audit";

export const dynamic = "force-dynamic";

const updateSettingsSchema = z.object({
  contactName: z.string().optional().nullable(),
  contactEmail: z.string().email().optional().nullable().or(z.literal("")),
  contactPhone: z.string().optional().nullable(),
  billingAddress: z.string().optional().nullable(),
  nif: z.string().optional().nullable(),
  nis: z.string().optional().nullable(),
  rc: z.string().optional().nullable(),
  defaultPaymentTermDays: z.number().int().nonnegative().optional().nullable(),
});

export async function GET() {
  const { session, organizationId, error } = await requireOrgSession();
  if (error || !session || !organizationId) return error;

  try {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        users: { select: { id: true, email: true, role: true, active: true, createdAt: true } },
      },
    });

    return NextResponse.json(org);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  // Server-side enforcement: OWNER only!
  const { session, organizationId, role, error } = await requireOrgSession(["OWNER"]);
  if (error || !session || !organizationId) return error;

  try {
    const body = await request.json();
    const validated = updateSettingsSchema.parse(body);

    const updated = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        ...(validated.contactName !== undefined ? { contactName: validated.contactName } : {}),
        ...(validated.contactEmail !== undefined ? { contactEmail: validated.contactEmail || null } : {}),
        ...(validated.contactPhone !== undefined ? { contactPhone: validated.contactPhone } : {}),
        ...(validated.billingAddress !== undefined ? { billingAddress: validated.billingAddress } : {}),
        ...(validated.nif !== undefined ? { nif: validated.nif } : {}),
        ...(validated.nis !== undefined ? { nis: validated.nis } : {}),
        ...(validated.rc !== undefined ? { rc: validated.rc } : {}),
        ...(validated.defaultPaymentTermDays !== undefined ? { defaultPaymentTermDays: validated.defaultPaymentTermDays } : {}),
      },
    });

    await logAdminAction(
      session.user.id,
      "UPDATE_ORG_SETTINGS",
      updated.name,
      `Updated organization contact/tax settings in portal (${role})`
    );

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to update settings" }, { status: 400 });
  }
}
