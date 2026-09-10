import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { DEFAULT_SWIM_LOCATIONS } from "@/lib/swim-groups";

export const dynamic = "force-dynamic";

const LOCATIONS_SETTING_KEY = "swim_locations";

async function getStoredLocations(): Promise<string[]> {
  try {
    const setting = await prisma.platformSetting.findUnique({
      where: { key: LOCATIONS_SETTING_KEY },
    });
    if (setting?.value) {
      const parsed = JSON.parse(setting.value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
      }
    }
  } catch (err) {
    logger.error("Failed to read swim_locations from PlatformSetting:", err);
  }
  return [...DEFAULT_SWIM_LOCATIONS];
}

async function saveStoredLocations(locations: string[]): Promise<string[]> {
  const unique = Array.from(new Set(locations.map((loc) => loc.trim()).filter(Boolean)));
  await prisma.platformSetting.upsert({
    where: { key: LOCATIONS_SETTING_KEY },
    create: {
      key: LOCATIONS_SETTING_KEY,
      value: JSON.stringify(unique),
    },
    update: {
      value: JSON.stringify(unique),
    },
  });
  return unique;
}

export async function GET() {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  try {
    const [coaches, locations] = await Promise.all([
      prisma.coach.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          phone: true,
          specialties: true,
          active: true,
        },
      }),
      getStoredLocations(),
    ]);

    return NextResponse.json({ coaches, locations });
  } catch (err: unknown) {
    logger.error("GET swim preferences error:", err);
    return NextResponse.json({ error: "Failed to fetch swim preferences" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  try {
    const body = await request.json();
    const { action } = body;

    if (action === "add_location") {
      const locationName = body.locationName?.trim();
      if (!locationName) {
        return NextResponse.json({ error: "Location name is required" }, { status: 400 });
      }
      const current = await getStoredLocations();
      if (!current.includes(locationName)) {
        current.push(locationName);
        await saveStoredLocations(current);
      }
      return NextResponse.json({ success: true, locations: current });
    }

    if (action === "delete_location") {
      const locationName = body.locationName?.trim();
      if (!locationName) {
        return NextResponse.json({ error: "Location name is required" }, { status: 400 });
      }
      const current = await getStoredLocations();
      const updated = current.filter((l) => l !== locationName);
      await saveStoredLocations(updated);
      return NextResponse.json({ success: true, locations: updated });
    }

    if (action === "add_coach") {
      const { name, phone, specialties } = body;
      const trimmedName = name?.trim();
      if (!trimmedName) {
        return NextResponse.json({ error: "Coach name is required" }, { status: 400 });
      }

      const coach = await prisma.coach.create({
        data: {
          name: trimmedName,
          phone: phone?.trim() || null,
          specialties: specialties?.trim() || null,
          active: true,
        },
      });

      return NextResponse.json({ success: true, coach }, { status: 201 });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    logger.error("POST swim preferences error:", err);
    return NextResponse.json({ error: "Failed to update swim preferences" }, { status: 500 });
  }
}
