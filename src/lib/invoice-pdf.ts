/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "./prisma";

export async function generateInvoicePdfBuffer(invoiceId: string): Promise<Buffer> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      client: true,
      organization: true,
    },
  });

  if (!invoice) {
    throw new Error(`Invoice with id ${invoiceId} not found`);
  }

  let itemsList: Array<{ description?: string; name?: string; amount?: number; price?: number; quantity?: number }> = [];
  try {
    itemsList = typeof invoice.items === "string" ? JSON.parse(invoice.items || "[]") : (invoice.items as any) || [];
  } catch {
    itemsList = [];
  }

  const recipientName = invoice.organization?.name || invoice.client?.fullName || "Valued Client";
  const recipientEmail = invoice.organization ? null : invoice.client?.email;
  const recipientPhone = invoice.organization ? null : invoice.client?.phone;
  const createdDate = invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString("fr-DZ") : "";
  const paidDate = invoice.paidAt ? new Date(invoice.paidAt).toLocaleDateString("fr-DZ") : "N/A";

  const rowsHtml = itemsList.map((item, index) => {
    const desc = item.description || item.name || `Item #${index + 1}`;
    const qty = item.quantity || 1;
    const itemPrice = item.amount || item.price || invoice.amount;
    const total = qty * itemPrice;
    return `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${desc}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${qty}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${itemPrice.toLocaleString("fr-DZ")} DA</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${total.toLocaleString("fr-DZ")} DA</td>
      </tr>
    `;
  }).join("");

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice ${invoice.invoiceCode}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #333; margin: 40px; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #2563eb; padding-bottom: 20px; }
    .title { font-size: 24px; font-weight: bold; color: #1e40af; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-weight: bold; text-transform: uppercase; }
    .status-paid { background-color: #d1fae5; color: #065f46; }
    .status-unpaid { background-color: #fee2e2; color: #991b1b; }
    .details { margin: 20px 0; display: flex; justify-content: space-between; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th { background-color: #f3f4f6; text-align: left; padding: 10px; border-bottom: 2px solid #ccc; }
    .total-row { font-size: 18px; font-weight: bold; text-align: right; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">AQA EVENTS</div>
      <p style="margin: 4px 0;">Official Invoice</p>
    </div>
    <div style="text-align: right;">
      <h3 style="margin: 0;">${invoice.invoiceCode}</h3>
      <p style="margin: 4px 0;">Date: ${createdDate}</p>
      <span class="badge ${invoice.status === "paid" ? "status-paid" : "status-unpaid"}">${invoice.status}</span>
    </div>
  </div>

  <div class="details">
    <div>
      <h4>Billed To:</h4>
      <p><strong>${recipientName}</strong></p>
      ${recipientEmail ? `<p>Email: ${recipientEmail}</p>` : ""}
      ${recipientPhone ? `<p>Phone: ${recipientPhone}</p>` : ""}
    </div>
    <div style="text-align: right;">
      <h4>Payment Status:</h4>
      <p>Status: ${invoice.status}</p>
      <p>Paid Date: ${paidDate}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th style="text-align: center;">Qty</th>
        <th style="text-align: right;">Unit Price</th>
        <th style="text-align: right;">Total (DA)</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || `<tr><td colspan="4" style="padding: 12px;">Invoice for category: ${invoice.category}</td></tr>`}
    </tbody>
  </table>

  <div class="total-row">
    Total Amount: ${invoice.amount.toLocaleString("fr-DZ")} DA
  </div>
</body>
</html>
  `;

  return Buffer.from(htmlContent, "utf-8");
}
