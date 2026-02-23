/**
 * Deployment lifecycle status values matching the Prisma schema `DeploymentStatus` enum.
 * These represent every possible state a deployment can be in.
 */
export enum DeploymentStatus {
  /** Deployment has been created but provisioning has not yet started. */
  PENDING = "PENDING",
  /** Infrastructure is being allocated and the container is being pulled/started. */
  PROVISIONING = "PROVISIONING",
  /** The deployment is actively running and serving requests. */
  RUNNING = "RUNNING",
  /** The deployment has been gracefully stopped by the user or system. */
  STOPPED = "STOPPED",
  /** The deployment encountered an error and is no longer operational. */
  FAILED = "FAILED",
  /** The deployment has been permanently removed; this is a terminal state. */
  TERMINATED = "TERMINATED",
}

/**
 * Map of valid state transitions for the deployment lifecycle.
 * Each key is a source status and the value is the set of statuses it may transition to.
 *
 * Transition diagram:
 * ```
 * PENDING ---------> PROVISIONING
 * PROVISIONING ----> RUNNING | FAILED
 * RUNNING ---------> STOPPED | FAILED
 * STOPPED ---------> RUNNING (restart) | TERMINATED
 * FAILED ----------> PROVISIONING (retry) | TERMINATED
 * TERMINATED ------> (none — terminal state)
 * ```
 */
export const VALID_TRANSITIONS: Readonly<
  Record<DeploymentStatus, readonly DeploymentStatus[]>
> = {
  [DeploymentStatus.PENDING]: [DeploymentStatus.PROVISIONING],
  [DeploymentStatus.PROVISIONING]: [
    DeploymentStatus.RUNNING,
    DeploymentStatus.FAILED,
  ],
  [DeploymentStatus.RUNNING]: [
    DeploymentStatus.STOPPED,
    DeploymentStatus.FAILED,
  ],
  [DeploymentStatus.STOPPED]: [
    DeploymentStatus.RUNNING,
    DeploymentStatus.TERMINATED,
  ],
  [DeploymentStatus.FAILED]: [
    DeploymentStatus.PROVISIONING,
    DeploymentStatus.TERMINATED,
  ],
  [DeploymentStatus.TERMINATED]: [],
} as const;

/**
 * Checks whether a state transition is valid according to the deployment lifecycle.
 *
 * @param from - The current deployment status.
 * @param to - The desired target deployment status.
 * @returns `true` if the transition from `from` to `to` is allowed.
 *
 * @example
 * ```ts
 * canTransition(DeploymentStatus.RUNNING, DeploymentStatus.STOPPED);  // true
 * canTransition(DeploymentStatus.TERMINATED, DeploymentStatus.RUNNING); // false
 * ```
 */
export function canTransition(
  from: DeploymentStatus,
  to: DeploymentStatus,
): boolean {
  const allowed = VALID_TRANSITIONS[from];
  return allowed !== undefined && allowed.includes(to);
}

/**
 * Returns a human-readable label for a deployment status.
 *
 * @param status - The deployment status to label.
 * @returns A user-friendly string representation of the status.
 */
export function getStatusLabel(status: DeploymentStatus): string {
  const labels: Record<DeploymentStatus, string> = {
    [DeploymentStatus.PENDING]: "Pending",
    [DeploymentStatus.PROVISIONING]: "Provisioning",
    [DeploymentStatus.RUNNING]: "Running",
    [DeploymentStatus.STOPPED]: "Stopped",
    [DeploymentStatus.FAILED]: "Failed",
    [DeploymentStatus.TERMINATED]: "Terminated",
  };
  return labels[status];
}

/**
 * Checks whether the given status represents a terminal state
 * (i.e., no further transitions are possible).
 *
 * @param status - The deployment status to check.
 * @returns `true` if the deployment is in a terminal state.
 */
export function isTerminalStatus(status: DeploymentStatus): boolean {
  return VALID_TRANSITIONS[status].length === 0;
}
