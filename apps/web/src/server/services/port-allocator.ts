import { TRPCError } from "@trpc/server";

/** Port ranges for each service category */
export const PORT_RANGES = {
  deployment: { start: 3001, end: 4000 },
  sandbox: { start: 4001, end: 5000 },
  proxy: { start: 8080, end: 8999 },
} as const;

export type PortCategory = keyof typeof PORT_RANGES;

/**
 * Find the first available port in a range, given a set of used ports.
 * Throws a TRPCError if the range is exhausted.
 */
export function findAvailablePortInRange(
  category: PortCategory,
  usedPorts: Set<number>,
): number {
  const { start, end } = PORT_RANGES[category];
  for (let port = start; port <= end; port++) {
    if (!usedPorts.has(port)) return port;
  }
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: `No available ${category} ports in range ${start}-${end}`,
  });
}
