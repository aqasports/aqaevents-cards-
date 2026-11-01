import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { DEFAULT_SWIM_LOCATIONS } from "@/lib/swim-groups";

export const dynamic = "force-dynamic";

const LOCATIONS_SETTING_KEY = "swim_locations";
const BARIDIMOB_RIP_SETTING_KEY = "swim_baridimob_rip";

async function getStoredRip(): Promise<string> {
  try {
    const setting = await prisma.platformSetting.findUnique({
      where: { key: BARIDIMOB_RIP_SETTING_KEY },
    });
    return setting?.value?.trim() || "";
  } catch (err) {
    logger.error("Failed to read swim_baridimob_rip from PlatformSetting:", err);
    return "";
  }
}

async function saveStoredRip(rip: string): Promise<string> {
  const cleaned = rip.trim();
  await prisma.platformSetting.upsert({
    where: { key: BARIDIMOB_RIP_SETTING_KEY },
    create: {
      key: BARIDIMOB_RIP_SETTING_KEY,
      value: cleaned,
    },
    update: {
      value: cleaned,
    },
  });
  return cleaned;
}

async function getStoredLocations(): Promise<string[]> {
  try {
    const setting = await prisma.platformSetting.findUnique({
      where: { key: LOCATIONS_SETTING_KEY },
    });
    if (setting?.value) {
      const parsed = JSON.parse(setting.value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const cleaned = parsed
          .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
          .map((item) =>
            item.trim() === "Bassin Olympique" || item.trim() === "Piscine Olympique"
              ? "Azal"
              : item.trim()
          );
        const unique = Array.from(new Set(cleaned));
        if (JSON.stringify(parsed) !== JSON.stringify(unique)) {
          await saveStoredLocations(unique);
        }
        return unique;
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
    const [coaches, locations, baridimobRip] = await Promise.all([
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
      getStoredRip(),
    ]);

    return NextResponse.json({ coaches, locations, baridimobRip });
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

    if (action === "save_rip") {
      const rip = typeof body.rip === "string" ? body.rip.trim() : "";
      const saved = await saveStoredRip(rip);
      return NextResponse.json({ success: true, baridimobRip: saved });
    }

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
