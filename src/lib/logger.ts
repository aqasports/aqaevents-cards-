import * as Sentry from "@sentry/nextjs";
import pino from "pino";

// Create pino instance for server-side structured logging
const pinoLogger =
  typeof window === "undefined" && process.env.NEXT_RUNTIME !== "edge"
    ? pino({
        level: process.env.LOG_LEVEL || "info",
        base: { env: process.env.NODE_ENV },
      })
    : null;

function formatMessage(context: unknown, message?: unknown, ...args: unknown[]): string {
  const parts: string[] = [];
  if (typeof context === "string") {
    parts.push(`[${context}]`);
  } else if (context !== undefined && context !== null) {
    parts.push(`[${JSON.stringify(context)}]`);
  }

  if (typeof message === "string") {
    parts.push(message);
  } else if (message instanceof Error) {
    parts.push(message.message);
  } else if (message !== undefined && message !== null) {
    parts.push(JSON.stringify(message));
  }

  for (const arg of args) {
    if (typeof arg === "string") {
      parts.push(arg);
    } else if (arg instanceof Error) {
      parts.push(arg.stack || arg.message);
    } else if (arg !== undefined && arg !== null) {
      parts.push(JSON.stringify(arg));
    }
  }

  return parts.join(" ");
}

export const logger = {
  info(context: unknown, message?: unknown, ...args: unknown[]) {
    const formatted = formatMessage(context, message, ...args);
    if (pinoLogger) {
      pinoLogger.info({ context, extra: args }, formatted);
    } else {
      console.log(formatted);
    }
  },

  warn(context: unknown, message?: unknown, ...args: unknown[]) {
    const formatted = formatMessage(context, message, ...args);
    if (pinoLogger) {
      pinoLogger.warn({ context, extra: args }, formatted);
    } else {
      console.warn(formatted);
    }

    Sentry.captureMessage(formatted, {
      level: "warning",
      extra: { context, message, args },
    });
  },

  error(context: unknown, message?: unknown, ...args: unknown[]) {
    const formatted = formatMessage(context, message, ...args);
    if (pinoLogger) {
      pinoLogger.error({ context, extra: args }, formatted);
    } else {
      console.error(formatted);
    }

    Sentry.captureMessage(formatted, {
      level: "error",
      extra: { context, message, args },
    });
  },
};
