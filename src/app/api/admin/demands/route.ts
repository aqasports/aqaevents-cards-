import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { ClientsService } from "@/modules/clients/service";
import { getEventCardUrl } from "@/lib/tokens";
import { sendSimulatedNotification } from "@/lib/notifications";
import { eventBus, EVENTS } from "@/lib/events";

export const dynamic = "force-dynamic";
const clientsService = new ClientsService();

export async function GET(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "all";

  try {
    const where = status === "all" ? {} : { status };
    const demands = await prisma.cardDemand.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(demands);
  } catch (err: unknown) {
    console.error("GET admin demands error:", err);
    return NextResponse.json({ error: "Failed to fetch demands" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  try {
    const body = await request.json();
    const { demandId, cardCode } = body;

    if (!demandId || !cardCode) {
      return NextResponse.json({ error: "Demand ID and Card Code are required" }, { status: 400 });
    }

    const demand = await prisma.cardDemand.findUnique({
      where: { id: demandId },
    });

    if (!demand) {
      return NextResponse.json({ error: "Demand not found" }, { status: 404 });
    }

    if (demand.status !== "pending") {
      return NextResponse.json({ error: "Demand is already processed" }, { status: 400 });
    }

    const normalizedCardCode = cardCode.trim().toUpperCase();

    // Process card demand acceptance
    let clientResult;
    try {
      if (demand.creditType === "package") {
        clientResult = await clientsService.createClient({
          fullName: demand.name,
          phone: demand.phone,
          packageId: demand.packageId,
          issueCard: false,
          preCardCode: normalizedCardCode,
        }, session.user.id);
      } else {
        // Create client first (linking the blank card)
        clientResult = await clientsService.createClient({
          fullName: demand.name,
          phone: demand.phone,
          packageId: null,
          issueCard: false,
          preCardCode: normalizedCardCode,
        }, session.user.id);

        // Load custom credits and generate invoice
        await eventBus.emit(EVENTS.PACKAGE_PURCHASED, {
          clientId: clientResult.id,
          customAmount: demand.amount,
          reason: "Custom Credit Demand Activation",
          adminId: session.user.id,
          cardId: clientResult.card?.id || null,
          invoice: {
            amount: demand.price,
            category: "custom",
            items: `Custom credit demand — ${demand.amount} credits`,
            notes: "Custom Credit Demand Activation",
            status: "paid"
          }
        });
      }
    } catch (activationErr: any) {
      console.error("Activation error:", activationErr);
      return NextResponse.json({ error: activationErr.message || "Failed to activate card and create client" }, { status: 400 });
    }

    // Update demand status in DB
    const updatedDemand = await prisma.cardDemand.update({
      where: { id: demandId },
      data: {
        status: "accepted",
        cardCode: normalizedCardCode,
      },
    });

    // Send WhatsApp notification containing the client side link
    const token = clientResult.card?.publicToken;
    if (token) {
      const clientUrl = getEventCardUrl(token);
      const whatsappMsg = `Hello ${demand.name}! Your AQA Card demand has been accepted. Here is the link to view your card balance and history: ${clientUrl}. Card Code: ${normalizedCardCode}.`;

      console.log(`[SIMULATED WHATSAPP MESSAGE SENT]
To Client: ${demand.phone}
Message: ${whatsappMsg}
`);

      // Log notification in the DB
      await sendSimulatedNotification(
        clientResult.id,
        "whatsapp" as any,
        demand.phone,
        whatsappMsg
      );
    }

    return NextResponse.json(updatedDemand);
  } catch (err: unknown) {
    console.error("POST process demand error:", err);
    return NextResponse.json({ error: "Failed to process demand" }, { status: 500 });
  }
}
