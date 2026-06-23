import { prisma } from "./prisma";

export async function getClientBalance(clientId: string): Promise<number> {
  const result = await prisma.ledgerEntry.aggregate({
    where: { clientId },
    _sum: { delta: true },
  });
  return result._sum.delta ?? 0;
}

export async function getClientBalances(
  clientIds: string[],
): Promise<Map<string, number>> {
  if (clientIds.length === 0) return new Map();

  const entries = await prisma.ledgerEntry.groupBy({
    by: ["clientId"],
    where: { clientId: { in: clientIds } },
    _sum: { delta: true },
  });

  return new Map(
    entries.map((entry) => [entry.clientId, entry._sum.delta ?? 0]),
  );
}
