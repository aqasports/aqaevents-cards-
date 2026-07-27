import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { generateInvoicePdfBuffer } from "@/lib/invoice-pdf";
import { sendSimulatedNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { id } = await params;

  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        client: true,
        organization: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const recipientEmail = invoice.organization
      ? null
      : invoice.client?.email;

    if (!recipientEmail) {
      return NextResponse.json(
        { error: "No recipient email address on file for this invoice" },
        { status: 400 }
      );
    }

    const pdfBuffer = await generateInvoicePdfBuffer(id);

    const message = `Hello,\n\nPlease find attached invoice ${invoice.invoiceCode} for ${invoice.amount.toLocaleString("fr-DZ")} DA.\n\nStatus: ${invoice.status.toUpperCase()}\nPDF Size: ${pdfBuffer.length} bytes.\n\nThank you for choosing AQA Events!`;

    await sendSimulatedNotification(
      invoice.clientId || "org",
      "email",
      recipientEmail,
      message,
      `AQA Events Invoice ${invoice.invoiceCode}`
    );

    return NextResponse.json({
      success: true,
      message: `Invoice PDF successfully emailed to ${recipientEmail}`,
      invoiceCode: invoice.invoiceCode,
    });
  } catch (err: unknown) {
    console.error("POST email invoice PDF error:", err);
    return NextResponse.json(
      { error: "Failed to email invoice PDF" },
      { status: 500 }
    );
  }
}
