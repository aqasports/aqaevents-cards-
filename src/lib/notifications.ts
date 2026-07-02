import { prisma } from "./prisma";

export async function sendSimulatedNotification(
  clientId: string,
  type: "sms" | "email" | "whatsapp",
  recipient: string,
  message: string,
  subject?: string | null,
) {
  try {
    console.log(
      `[SIMULATED NOTIFICATION SENT]
Type: ${type.toUpperCase()}
Recipient: ${recipient}
${subject ? `Subject: ${subject}\n` : ""}Message: ${message}
`
    );

    await prisma.notificationLog.create({
      data: {
        clientId,
        type,
        recipient,
        subject: subject ?? null,
        message,
        status: "sent",
      },
    });
  } catch (err) {
    console.error("Failed to log simulated notification:", err);
  }
}
