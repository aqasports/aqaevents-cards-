import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import TerminalClient from "./terminal-client";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function ClubTerminalPage({ params }: Props) {
  const { token } = await params;

  const club = await prisma.club.findUnique({
    where: { token },
    select: {
      id: true,
      name: true,
      active: true,
      sessions: {
        where: { active: true },
        include: {
          activity: { select: { id: true, name: true } },
          _count: { select: { redemptions: true, clubCheckIns: true } },
        },
        orderBy: { sessionDate: "asc" },
      },
    },
  });

  if (!club || !club.active) {
    notFound();
  }

  return <TerminalClient club={club} token={token} />;
}
