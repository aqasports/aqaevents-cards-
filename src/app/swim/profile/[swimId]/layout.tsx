import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ swimId: string }>;
}): Promise<Metadata> {
  const { swimId } = await params;
  const rawId = (swimId || "").trim();
  const normalizedId = rawId.toUpperCase();
  const cleanDigits = normalizedId.replace(/\D/g, "");
  const formattedSwm = cleanDigits.length === 6 ? `SWM-${cleanDigits}` : null;

  let memberName: string | null = null;

  try {
    const member = await prisma.swimMember.findFirst({
      where: {
        OR: [
          { id: rawId },
          { swimId: { equals: normalizedId, mode: "insensitive" } },
          ...(formattedSwm
            ? [{ swimId: { equals: formattedSwm, mode: "insensitive" as const } }]
            : []),
          {
            card: {
              OR: [
                { cardCode: { equals: normalizedId, mode: "insensitive" } },
                ...(formattedSwm
                  ? [{ cardCode: { equals: formattedSwm, mode: "insensitive" as const } }]
                  : []),
                { publicToken: { equals: rawId } },
              ],
            },
          },
        ],
      },
      select: {
        fullName: true,
        swimId: true,
      },
    });

    if (member?.fullName) {
      memberName = member.fullName.trim();
    }
  } catch {
    // Database query fallback if unavailable
  }

  const titleText = memberName
    ? `${memberName} · AQA Swim Client Card`
    : normalizedId
    ? `AQA Swim Client Card · ${normalizedId}`
    : "AQA Swim Client Card";

  const descriptionText = memberName
    ? `AQA Swim Client Card · Profil d'adherent de ${memberName} a AQA Sports Academy. Consultez votre carte digitale, groupe et planning d'entrainement.`
    : "AQA Swim Client Card · Carte d'adherent officielle, planning d'entrainement et suivi d'abonnement AQA Sports Academy.";

  const canonicalUrl = `https://aqasports.com/swim/profile/${encodeURIComponent(
    normalizedId || rawId
  )}`;

  return {
    title: {
      absolute: titleText,
    },
    description: descriptionText,
    openGraph: {
      title: titleText,
      description: descriptionText,
      url: canonicalUrl,
      siteName: "AQA Sports Academy",
      images: [
        {
          url: "https://aqasports.com/image/face.png",
          width: 1200,
          height: 630,
          alt: "AQA Swim Client Card",
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: titleText,
      description: descriptionText,
      images: ["https://aqasports.com/image/face.png"],
    },
  };
}

export default function SwimmerProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
