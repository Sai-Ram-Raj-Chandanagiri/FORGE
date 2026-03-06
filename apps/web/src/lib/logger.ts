/**
 * Lightweight structured logger for FORGE.
 * Wraps console.* with service-name prefixes and log levels.
 * Can be swapped for a production logging service (e.g., Pino, Winston) later.
 */

type LogLevel = "info" | "warn" | "error" | "debug";

function formatMessage(level: LogLevel, service: string, message: string): string {
  return `[${service}] ${message}`;
}

function createServiceLogger(service: string) {
  return {
    info(message: string, ...args: unknown[]) {
      console.log(formatMessage("info", service, message), ...args);
    },
    warn(message: string, ...args: unknown[]) {
      console.warn(formatMessage("warn", service, message), ...args);
    },
    error(message: string, ...args: unknown[]) {
      console.error(formatMessage("error", service, message), ...args);
    },
    debug(message: string, ...args: unknown[]) {
      if (process.env.NODE_ENV === "development") {
        console.debug(formatMessage("debug", service, message), ...args);
      }
    },
  };
}

export type Logger = ReturnType<typeof createServiceLogger>;

export const logger = {
  /** Create a logger scoped to a service name */
  forService: createServiceLogger,

  /** Top-level convenience methods (unscoped) */
  info(message: string, ...args: unknown[]) {
    console.log(message, ...args);
  },
  warn(message: string, ...args: unknown[]) {
    console.warn(message, ...args);
  },
  error(message: string, ...args: unknown[]) {
    console.error(message, ...args);
  },
};
