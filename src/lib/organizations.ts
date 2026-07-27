import { prisma } from "./prisma";
import { getCreditRate } from "./settings";

export async function getEffectiveCreditRateForClient(clientId: string): Promise<number> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { organization: true },
  });

  if (client?.organization?.creditRate !== undefined && client.organization.creditRate !== null) {
    return client.organization.creditRate;
  }

  return await getCreditRate();
}

export async function getClientEffectiveBalance(clientId: string): Promise<{
  balance: number;
  source: "individual" | "shared_pool";
}> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { organization: true },
  });

  if (!client) {
    return { balance: 0, source: "individual" };
  }

  if (client.organization?.useSharedPool) {
    return {
      balance: client.organization.sharedCreditPool,
      source: "shared_pool",
    };
  }

  // Calculate actual individual balance from ledger or cached client.totalSpent / ledger math
  // For balance reading, we fetch client ledger balance or balance field if present
  // Client balance is tracked in balance helpers
  const ledger = await prisma.ledgerEntry.aggregate({
    where: { clientId },
    _sum: { delta: true },
  });

  const currentBalance = ledger._sum.delta ?? 0;

  return {
    balance: currentBalance,
    source: "individual",
  };
}
