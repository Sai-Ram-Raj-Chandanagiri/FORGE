import pino, { type Logger as PinoLogger, type LoggerOptions as PinoLoggerOptions } from "pino";

export type Logger = PinoLogger;

export interface LoggerOptions {
  /**
   * Minimum log level. Defaults to LOG_LEVEL env var or "info".
   */
  level?: string;

  /**
   * Whether the logger is running in development mode.
   * Defaults to NODE_ENV !== "production".
   * When true, uses pino-pretty for human-readable output.
   */
  development?: boolean;

  /**
   * Additional base bindings to include in every log line.
   */
  base?: Record<string, unknown>;
}

/**
 * Creates a structured Pino logger instance.
 *
 * @param name - The name of the logger (appears in every log entry).
 * @param options - Optional configuration for level, environment, and base bindings.
 * @returns A configured Pino logger instance.
 *
 * @example
 * ```ts
 * const logger = createLogger("api-server");
 * logger.info("Server started");
 *
 * const dbLogger = createLogger("database", { level: "debug" });
 * dbLogger.debug({ query: "SELECT ..." }, "Executing query");
 * ```
 */
export function createLogger(name: string, options?: LoggerOptions): Logger {
  const isDev =
    options?.development ?? process.env.NODE_ENV !== "production";
  const level =
    options?.level ?? process.env.LOG_LEVEL ?? "info";

  const pinoOptions: PinoLoggerOptions = {
    name,
    level,
    timestamp: pino.stdTimeFunctions.isoTime,
    base: {
      name,
      ...options?.base,
    },
    ...(isDev
      ? {
          transport: {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "SYS:standard",
              ignore: "pid,hostname",
            },
          },
        }
      : {}),
  };

  return pino(pinoOptions);
}
