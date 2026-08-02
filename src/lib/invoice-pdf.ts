/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "./prisma";

// CONFIG: Confirm applicable TVA rate and any additional required legal mentions with an accountant before this ships to a real client.
export const AQA_LEGAL_CONFIG = {
  companyName: "AQA Sports & Events SARL",
  address: "Complexe Sportif & Nautique, Alger, Algérie",
  nif: "002416099814522",
  nis: "002416099814522",
  rc: "16/00-0982341B24",
  defaultTaxRate: 19, // 19% standard TVA in Algeria (9% reduced rate applies to specific service categories)
};

export async function generateInvoicePdfBuffer(invoiceId: string): Promise<Buffer> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      client: true,
      organization: true,
      lineItems: true,
    },
  });

  if (!invoice) {
    throw new Error(`Invoice with id ${invoiceId} not found`);
  }

  // Parse structured line items or fallback to legacy items field
  let lineItemsList: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    lineTotal: number;
  }> = [];

  if (invoice.lineItems && invoice.lineItems.length > 0) {
    lineItemsList = invoice.lineItems.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      taxRate: item.taxRate,
      lineTotal: item.lineTotal,
    }));
  } else {
    try {
      const parsed = typeof invoice.items === "string" ? JSON.parse(invoice.items || "[]") : (invoice.items as any) || [];
      if (Array.isArray(parsed) && parsed.length > 0) {
        lineItemsList = parsed.map((item: any, idx: number) => {
          const qty = item.quantity || 1;
          const price = item.amount || item.price || invoice.amount;
          return {
            description: item.description || item.name || `Line Item #${idx + 1}`,
            quantity: qty,
            unitPrice: price,
            taxRate: invoice.taxRate || AQA_LEGAL_CONFIG.defaultTaxRate,
            lineTotal: qty * price,
          };
        });
      }
    } catch {
      lineItemsList = [];
    }
  }

  if (lineItemsList.length === 0) {
    lineItemsList = [
      {
        description: `Prepaid Activity Credit Purchase (${invoice.category})`,
        quantity: 1,
        unitPrice: invoice.amount,
        taxRate: invoice.taxRate || AQA_LEGAL_CONFIG.defaultTaxRate,
        lineTotal: invoice.amount,
      },
    ];
  }

  const recipientName = invoice.organization?.name || invoice.client?.fullName || "Valued Client";
  const recipientEmail = invoice.organization?.contactEmail || invoice.client?.email || "";
  const recipientPhone = invoice.organization?.contactPhone || invoice.client?.phone || "";
  const recipientAddress = invoice.organization?.billingAddress || "";
  const recipientNif = invoice.organization?.nif || "N/A";
  const recipientNis = invoice.organization?.nis || "N/A";
  const recipientRc = invoice.organization?.rc || "N/A";

  const createdDate = invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString("fr-DZ") : "";
  const dueDateStr = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("fr-DZ") : "Due on receipt";
  const paidDate = invoice.paidAt ? new Date(invoice.paidAt).toLocaleDateString("fr-DZ") : "N/A";

  const totalHT = lineItemsList.reduce((acc, item) => acc + item.lineTotal, 0);
  const totalTVA = lineItemsList.reduce((acc, item) => acc + Math.round(item.lineTotal * (item.taxRate / 100)), 0);
  const totalTTC = totalHT + totalTVA;

  const rowsHtml = lineItemsList
    .map(
      (item) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${item.description}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-family: monospace;">${item.unitPrice.toLocaleString("fr-DZ")} DA</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${item.taxRate}%</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-family: monospace; font-weight: bold;">${item.lineTotal.toLocaleString("fr-DZ")} DA</td>
      </tr>
    `
    )
    .join("");

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice ${invoice.invoiceCode}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; margin: 40px; background: #ffffff; line-height: 1.5; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0ea5e9; padding-bottom: 20px; }
    .brand { font-size: 24px; font-weight: 800; color: #0284c7; tracking-tight; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 6px; font-weight: bold; text-transform: uppercase; font-size: 11px; }
    .status-paid { background-color: #dcfce7; color: #166534; }
    .status-unpaid { background-color: #fee2e2; color: #991b1b; }
    .legal-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 20px 0; font-size: 12px; }
    .grid-2 { display: flex; justify-content: space-between; gap: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
    th { background-color: #f1f5f9; text-align: left; padding: 10px; border-bottom: 2px solid #cbd5e1; font-weight: bold; color: #475569; }
    .totals { text-align: right; margin-top: 20px; font-size: 13px; }
    .total-ttc { font-size: 18px; font-weight: 800; color: #0284c7; margin-top: 8px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">${AQA_LEGAL_CONFIG.companyName}</div>
      <p style="margin: 4px 0; font-size: 12px; color: #64748b;">${AQA_LEGAL_CONFIG.address}</p>
      <p style="margin: 2px 0; font-size: 11px; color: #64748b; font-family: monospace;">
        NIF: ${AQA_LEGAL_CONFIG.nif} · NIS: ${AQA_LEGAL_CONFIG.nis} · RC: ${AQA_LEGAL_CONFIG.rc}
      </p>
    </div>
    <div style="text-align: right;">
      <h2 style="margin: 0; color: #0f172a; font-family: monospace;">${invoice.invoiceCode}</h2>
      <p style="margin: 4px 0; font-size: 12px; color: #64748b;">Date: ${createdDate}</p>
      <p style="margin: 2px 0; font-size: 12px; color: #64748b;">Due Date: <strong>${dueDateStr}</strong></p>
      <span class="badge ${invoice.status === "paid" ? "status-paid" : "status-unpaid"}">${invoice.status}</span>
    </div>
  </div>

  <div class="legal-box grid-2">
    <div>
      <h4 style="margin: 0 0 6px 0; color: #475569; text-transform: uppercase; font-size: 10px;">Billed To (Client / Organization)</h4>
      <strong style="font-size: 14px;">${recipientName}</strong>
      ${recipientAddress ? `<p style="margin: 4px 0;">${recipientAddress}</p>` : ""}
      ${recipientEmail ? `<p style="margin: 2px 0;">Email: ${recipientEmail}</p>` : ""}
      ${recipientPhone ? `<p style="margin: 2px 0;">Phone: ${recipientPhone}</p>` : ""}
      ${invoice.poNumber ? `<p style="margin: 4px 0; font-weight: bold;">PO Number: ${invoice.poNumber}</p>` : ""}
    </div>
    <div style="text-align: right;">
      <h4 style="margin: 0 0 6px 0; color: #475569; text-transform: uppercase; font-size: 10px;">Algerian Tax Identifiers</h4>
      <p style="margin: 2px 0; font-family: monospace;">NIF: ${recipientNif}</p>
      <p style="margin: 2px 0; font-family: monospace;">NIS: ${recipientNis}</p>
      <p style="margin: 2px 0; font-family: monospace;">RC: ${recipientRc}</p>
      <p style="margin: 6px 0 0 0; color: #64748b;">Payment Date: ${paidDate}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th style="text-align: center;">Qty</th>
        <th style="text-align: right;">Unit Price (HT)</th>
        <th style="text-align: center;">TVA Rate</th>
        <th style="text-align: right;">Total HT</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  <div class="totals">
    <p style="margin: 4px 0;">Total Hors Taxe (HT): <strong>${totalHT.toLocaleString("fr-DZ")} DA</strong></p>
    <p style="margin: 4px 0;">TVA (Tax Amount): <strong>${totalTVA.toLocaleString("fr-DZ")} DA</strong></p>
    <div class="total-ttc">Total All Taxes Included (TTC): ${totalTTC.toLocaleString("fr-DZ")} DA</div>
  </div>
</body>
</html>
  `;

  return Buffer.from(htmlContent, "utf-8");
}
