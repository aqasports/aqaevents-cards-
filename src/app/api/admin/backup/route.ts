export const dynamic = "force-dynamic";

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdminSession } from "@/lib/api-auth";
import { logger } from "@/lib/logger";

function timingSafeMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export async function POST(request: NextRequest) {
  try {
    const backupKey = request.headers.get("X-Backup-Key");
    const validBackupKey = process.env.BACKUP_API_KEY;
    const hasValidKey = Boolean(validBackupKey && backupKey && timingSafeMatch(backupKey, validBackupKey));

    if (!hasValidKey) {
      const { session, error } = await requireSuperAdminSession();
      if (error || !session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const clients = await prisma.client.findMany();
    const cards = await prisma.card.findMany();
    const ledgerEntries = await prisma.ledgerEntry.findMany();
    const redemptions = await prisma.redemption.findMany();
    const invoices = await prisma.invoice.findMany({
      select: {
        id: true,
        clientId: true,
        organizationId: true,
        invoiceCode: true,
        amount: true,
        status: true,
        category: true,
        items: true,
        notes: true,
        paidAt: true,
        createdAt: true,
      },
    });
    const packages = await prisma.package.findMany();
    const activities = await prisma.activity.findMany();
    const sessions = await prisma.activitySession.findMany();
    const expenses = await prisma.activityExpense.findMany();
    const auditLogs = await prisma.auditLog.findMany();
    const adminUsersRaw = await prisma.adminUser.findMany();
    const notificationLogs = await prisma.notificationLog.findMany();
    const products = await prisma.product.findMany();
    const demands = await prisma.cardDemand.findMany();
    const proposals = await prisma.activityProposal.findMany();
    const swimMembers = await prisma.swimMember.findMany();
    const swimGroups = await prisma.swimGroup.findMany();
    const swimLeads = await prisma.swimLead.findMany();
    const swimPayments = await prisma.swimPayment.findMany();
    const swimCards = await prisma.swimCard.findMany();

    // Extended tables for complete ERP backup coverage
    const organizations = (await prisma.organization?.findMany?.()) ?? [];
    const organizationUsersRaw = (await prisma.organizationUser?.findMany?.()) ?? [];
    const contracts = (await prisma.contract?.findMany?.()) ?? [];
    const departments = (await prisma.department?.findMany?.()) ?? [];
    const invoiceLineItems = (await prisma.invoiceLineItem?.findMany?.()) ?? [];
    const coaches = (await prisma.coach?.findMany?.()) ?? [];
    const coachAccountsRaw = (await prisma.coachAccount?.findMany?.()) ?? [];
    const equipmentAssets = (await prisma.equipmentAsset?.findMany?.()) ?? [];
    const equipmentUsages = (await prisma.equipmentUsage?.findMany?.()) ?? [];
    const clubs = (await prisma.club?.findMany?.()) ?? [];
    const checkIns = (await prisma.checkIn?.findMany?.()) ?? [];
    const platformSettings = (await prisma.platformSetting?.findMany?.()) ?? [];
    const campaignPromos = (await prisma.campaignPromo?.findMany?.()) ?? [];
    const swimEquipmentSales = (await prisma.swimEquipmentSale?.findMany?.()) ?? [];
    const swimEquipmentArticles = (await prisma.swimEquipmentArticle?.findMany?.()) ?? [];
    const swimGroupStaff = (await prisma.swimGroupStaff?.findMany?.()) ?? [];
    const swimSessions = (await prisma.swimSession?.findMany?.()) ?? [];
    const swimAttendances = (await prisma.swimAttendance?.findMany?.()) ?? [];
    const swimTechReviews = (await prisma.swimTechReview?.findMany?.()) ?? [];
    const swimCoachAbsences = (await prisma.swimCoachAbsence?.findMany?.()) ?? [];
    const swimReplacements = (await prisma.swimReplacement?.findMany?.()) ?? [];
    const swimApneaPacks = (await prisma.swimApneaPack?.findMany?.()) ?? [];
    const swimApneaRecords = (await prisma.swimApneaRecord?.findMany?.()) ?? [];
    const swimApneaPresences = (await prisma.swimApneaPresence?.findMany?.()) ?? [];
    const swimApneaTerminals = (await prisma.swimApneaTerminal?.findMany?.()) ?? [];

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const adminUsers = adminUsersRaw.map(({ passwordHash, ...rest }) => rest);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const organizationUsers = organizationUsersRaw.map(({ passwordHash, magicToken, ...rest }: any) => rest);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const coachAccounts = coachAccountsRaw.map(({ passwordHash, ...rest }: any) => rest);

    const timestamp = new Date().toISOString();
    const backupData = {
      metadata: {
        timestamp,
        version: "2.0.0",
        counts: {
          clients: clients.length,
          cards: cards.length,
          ledgerEntries: ledgerEntries.length,
          redemptions: redemptions.length,
          invoices: invoices.length,
          packages: packages.length,
          activities: activities.length,
          sessions: sessions.length,
          expenses: expenses.length,
          auditLogs: auditLogs.length,
          adminUsers: adminUsers.length,
          notificationLogs: notificationLogs.length,
          products: products.length,
          demands: demands.length,
          proposals: proposals.length,
          swimMembers: swimMembers.length,
          swimGroups: swimGroups.length,
          swimLeads: swimLeads.length,
          swimPayments: swimPayments.length,
          swimCards: swimCards.length,
          organizations: organizations.length,
          organizationUsers: organizationUsers.length,
          contracts: contracts.length,
          departments: departments.length,
          invoiceLineItems: invoiceLineItems.length,
          coaches: coaches.length,
          coachAccounts: coachAccounts.length,
          equipmentAssets: equipmentAssets.length,
          equipmentUsages: equipmentUsages.length,
          clubs: clubs.length,
          checkIns: checkIns.length,
          platformSettings: platformSettings.length,
          campaignPromos: campaignPromos.length,
          swimEquipmentSales: swimEquipmentSales.length,
          swimEquipmentArticles: swimEquipmentArticles.length,
          swimGroupStaff: swimGroupStaff.length,
          swimSessions: swimSessions.length,
          swimAttendances: swimAttendances.length,
          swimTechReviews: swimTechReviews.length,
          swimCoachAbsences: swimCoachAbsences.length,
          swimReplacements: swimReplacements.length,
          swimApneaPacks: swimApneaPacks.length,
          swimApneaRecords: swimApneaRecords.length,
          swimApneaPresences: swimApneaPresences.length,
          swimApneaTerminals: swimApneaTerminals.length,
        }
      },
      data: {
        clients,
        cards,
        ledgerEntries,
        redemptions,
        invoices,
        packages,
        activities,
        sessions,
        expenses,
        auditLogs,
        adminUsers,
        notificationLogs,
        products,
        demands,
        proposals,
        swimMembers,
        swimGroups,
        swimLeads,
        swimPayments,
        swimCards,
        organizations,
        organizationUsers,
        contracts,
        departments,
        invoiceLineItems,
        coaches,
        coachAccounts,
        equipmentAssets,
        equipmentUsages,
        clubs,
        checkIns,
        platformSettings,
        campaignPromos,
        swimEquipmentSales,
        swimEquipmentArticles,
        swimGroupStaff,
        swimSessions,
        swimAttendances,
        swimTechReviews,
        swimCoachAbsences,
        swimReplacements,
        swimApneaPacks,
        swimApneaRecords,
        swimApneaPresences,
        swimApneaTerminals,
      }
    };

    const supabaseUrl = process.env.SUPABASE_STORAGE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    let uploaded = false;
    let uploadPath = null;
    let deletedCount = 0;

    if (supabaseUrl && supabaseKey) {
      const filenameDate = timestamp.replace(/[:.]/g, "-");
      const filename = `aqa-backup-${filenameDate}.json`;
      
      const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/db-backups/${filename}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${supabaseKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(backupData)
      });

      if (!uploadRes.ok) {
        const errorText = await uploadRes.text();
        logger.error("[ERROR] Failed to upload backup to Supabase", errorText);
      } else {
        uploaded = true;
        uploadPath = `db-backups/${filename}`;
      }

      // 14-day rotation
      const listRes = await fetch(`${supabaseUrl}/storage/v1/object/list/db-backups`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${supabaseKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ prefix: "", limit: 1000 })
      });

      if (listRes.ok) {
        const objects: Array<{ name: string; created_at: string }> = await listRes.json();
        
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

        const toDelete = objects
          .filter(obj => {
            if (!obj.name.endsWith(".json")) return false;
            const createdAt = new Date(obj.created_at);
            return createdAt < fourteenDaysAgo;
          })
          .map(obj => obj.name);

        if (toDelete.length > 0) {
          const deleteRes = await fetch(`${supabaseUrl}/storage/v1/object/db-backups`, {
            method: "DELETE",
            headers: {
              "Authorization": `Bearer ${supabaseKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ prefixes: toDelete })
          });
          
          if (deleteRes.ok) {
            deletedCount = toDelete.length;
          } else {
            logger.error("[WARN] Failed to delete old backups", await deleteRes.text());
          }
        }
      } else {
        logger.error("[WARN] Failed to list backups for rotation", await listRes.text());
      }
    }

    return NextResponse.json({
      success: true,
      metadata: backupData.metadata,
      uploaded,
      uploadPath,
      deletedCount
    });
  } catch (error) {
    logger.error("[ERROR] Backup endpoint failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
