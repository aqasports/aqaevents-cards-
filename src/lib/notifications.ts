import { prisma } from "./prisma";
import { logger } from "@/lib/logger";

export async function sendNotification(
  clientId: string,
  type: "sms" | "email" | "whatsapp",
  recipient: string,
  message: string,
  subject?: string | null,
) {
  let deliveryStatus: "sent" | "failed" = "sent";

  try {
    if (type === "email" && process.env.RESEND_API_KEY) {
      const fromEmail = process.env.RESEND_FROM_EMAIL || "notifications@aqaevents.dz";
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [recipient],
          subject: subject || "AQA Event Card Notification",
          text: message,
        }),
      });
      if (!res.ok) {
        deliveryStatus = "failed";
        logger.error("Resend notification failed with status:", res.status);
      }
    } else if (
      type === "sms" &&
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM_NUMBER
    ) {
      const sid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const fromNumber = process.env.TWILIO_FROM_NUMBER;
      const authHeader = "Basic " + Buffer.from(`${sid}:${authToken}`).toString("base64");
      const formData = new URLSearchParams();
      formData.append("From", fromNumber);
      formData.append("To", recipient);
      formData.append("Body", message);

      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });
      if (!res.ok) {
        deliveryStatus = "failed";
        logger.error("Twilio SMS notification failed with status:", res.status);
      }
    } else {
      // Fall back to console.log simulation if env vars are missing
      logger.info(
        `[SIMULATED NOTIFICATION SENT]
Type: ${type.toUpperCase()}
Recipient: ${recipient}
${subject ? `Subject: ${subject}\n` : ""}Message: ${message}
`
      );
    }

    await prisma.notificationLog.create({
      data: {
        clientId,
        type,
        recipient,
        subject: subject ?? null,
        message,
        status: deliveryStatus,
      },
    });
  } catch (err) {
    logger.error("Failed to process notification delivery/logging:", err);
  }
}

export const sendSimulatedNotification = sendNotification;
