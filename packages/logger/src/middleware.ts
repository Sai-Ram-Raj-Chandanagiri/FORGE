import type { Logger } from "./logger";

/**
 * Logs structured information about an HTTP request.
 *
 * This is a generic logging function that is not tied to any specific
 * framework (Express, Fastify, etc.). It simply takes the relevant
 * request/response data and writes a structured log entry.
 *
 * @param method - The HTTP method (GET, POST, PUT, DELETE, etc.).
 * @param url - The request URL or path.
 * @param statusCode - The HTTP response status code.
 * @param duration - The request duration in milliseconds.
 * @param logger - A Logger instance to write the log entry to.
 *
 * @example
 * ```ts
 * const logger = createLogger("api");
 * const start = Date.now();
 * // ... handle request ...
 * logRequest("GET", "/api/users", 200, Date.now() - start, logger);
 * ```
 */
export function logRequest(
  method: string,
  url: string,
  statusCode: number,
  duration: number,
  logger: Logger,
): void {
  const logData = {
    method,
    url,
    statusCode,
    duration,
    durationUnit: "ms",
  };

  if (statusCode >= 500) {
    logger.error(logData, `${method} ${url} ${statusCode} - ${duration}ms`);
  } else if (statusCode >= 400) {
    logger.warn(logData, `${method} ${url} ${statusCode} - ${duration}ms`);
  } else {
    logger.info(logData, `${method} ${url} ${statusCode} - ${duration}ms`);
  }
}
