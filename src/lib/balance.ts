import { prisma } from "./prisma";

export async function getClientBalance(clientId: string, tx?: any): Promise<number> {
  const db = tx ?? prisma;
  const result = await db.ledgerEntry.aggregate({
    where: { clientId },
    _sum: { delta: true },
  });
  const rawBalance = result._sum.delta ?? 0;
  return Math.ceil(rawBalance * 100) / 100;
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
    entries.map((entry) => [
      entry.clientId,
      Math.ceil((entry._sum.delta ?? 0) * 100) / 100
    ]),
  );
}
