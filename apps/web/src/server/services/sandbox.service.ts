import { TRPCError } from "@trpc/server";
import { type PrismaClient } from "@forge/db";
import {
  ContainerManager,
  HealthChecker,
  NetworkManager,
  type ContainerConfig,
} from "@forge/docker-manager";
import { findAvailablePortInRange } from "./port-allocator";
import { logger } from "@/lib/logger";

const log = logger.forService("SandboxService");

/** Resource limits for sandbox containers — lighter than real deployments */
const SANDBOX_CPU_LIMIT = 0.25;
const SANDBOX_MEMORY_LIMIT_MB = 256;

/** Allowed demo durations in minutes */
export const SANDBOX_DURATIONS = [1, 5, 15] as const;
export type SandboxDuration = (typeof SANDBOX_DURATIONS)[number];

/** Default demo duration in minutes */
const DEFAULT_DURATION_MINUTES = 5;

/** Max concurrent sandboxes per user */
const MAX_CONCURRENT_PER_USER = 5;

/** Max total sandbox containers across all users (based on port range capacity) */
const MAX_TOTAL_SANDBOXES = 100;

/** Cleanup interval in milliseconds — aggressive: every 15 seconds */
const CLEANUP_INTERVAL_MS = 15_000;

export class SandboxService {
  private containerManager: ContainerManager;
  private healthChecker: HealthChecker;
  private networkManager: NetworkManager;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private prisma: PrismaClient) {
    this.containerManager = new ContainerManager();
    this.healthChecker = new HealthChecker();
    this.networkManager = new NetworkManager();
  }

  // ==================== START DEMO ====================

  async startDemo(userId: string, moduleId: string, versionId?: string, durationMinutes?: number) {
    // Validate and resolve duration
    const duration = this.resolveDuration(durationMinutes);

    // 1. Check per-user concurrent sandbox limit
    const userActiveSandboxes = await this.prisma.sandboxSession.count({
      where: {
        userId,
        status: { in: ["starting", "running"] },
      },
    });

    if (userActiveSandboxes >= MAX_CONCURRENT_PER_USER) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: `You can have up to ${MAX_CONCURRENT_PER_USER} active sandbox demos at a time. Please stop an existing demo first.`,
      });
    }

    // 2. Check global sandbox capacity
    const totalActiveSandboxes = await this.prisma.sandboxSession.count({
      where: { status: { in: ["starting", "running"] } },
    });

    if (totalActiveSandboxes >= MAX_TOTAL_SANDBOXES) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "The sandbox system is at capacity. Please try again in a few minutes.",
      });
    }

    // 3. Load module with latest version
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
      select: {
        id: true,
        name: true,
        status: true,
        versions: {
          where: versionId ? { id: versionId } : { isLatest: true },
          select: {
            id: true,
            version: true,
            dockerImage: true,
            builtImageTag: true,
            exposedPort: true,
            healthCheckPath: true,
            requiredEnvVars: true,
          },
          take: 1,
        },
      },
    });

    if (!module || module.status !== "PUBLISHED") {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Module not found or not published",
      });
    }

    const version = module.versions[0];
    if (!version) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No version available for this module",
      });
    }

    // 4. Check that module has a deployable image
    const imageToUse = version.builtImageTag || version.dockerImage;
    if (!imageToUse) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "This module does not have a container image available for demo",
      });
    }

    // 5. Find available sandbox port
    const sandboxPort = await this.findAvailableSandboxPort();

    // 6. Create sandbox session record with user-chosen duration
    const expiresAt = new Date(Date.now() + duration * 60 * 1000);
    const session = await this.prisma.sandboxSession.create({
      data: {
        userId,
        moduleId,
        versionId: version.id,
        status: "starting",
        port: sandboxPort,
        expiresAt,
      },
    });

    // 7. Build env vars from the module's requiredEnvVars
    const envVars = this.buildSandboxEnv(version.requiredEnvVars, sandboxPort, version.exposedPort || 3000, session.id);

    // 8. Provision container asynchronously
    this.provisionSandboxContainer(
      session.id,
      imageToUse,
      sandboxPort,
      version.exposedPort || 80,
      version.healthCheckPath || "/",
      envVars,
    ).catch((err) => {
      log.error(` Provision error for session ${session.id}:`, err);
    });

    return {
      sessionId: session.id,
      port: sandboxPort,
      expiresAt: expiresAt.toISOString(),
      durationMinutes: duration,
      status: "starting" as const,
      moduleName: module.name,
      moduleVersion: version.version,
    };
  }

  // ==================== PROVISION CONTAINER ====================

  private async provisionSandboxContainer(
    sessionId: string,
    dockerImage: string,
    hostPort: number,
    containerPort: number,
    healthPath: string,
    envVars: Record<string, string>,
  ) {
    try {
      // 1. Create isolated sandbox network
      const networkName = `forge-sandbox-${sessionId}`;
      await this.networkManager.createNetwork(networkName);

      // 2. Pull image if needed (skip locally built images)
      if (!dockerImage.startsWith("forge-modules/")) {
        await this.containerManager.pullImage(dockerImage);
      }

      // 3. Create container with sandbox limits
      const containerName = `forge-sandbox-${sessionId.slice(0, 12)}`;
      const containerConfig: ContainerConfig = {
        name: containerName,
        image: dockerImage,
        env: envVars,
        ports: [{ container: containerPort, host: hostPort }],
        extraHosts: ["host.docker.internal:host-gateway"],
        network: networkName,
        resources: {
          cpuLimit: SANDBOX_CPU_LIMIT,
          memoryLimitMb: SANDBOX_MEMORY_LIMIT_MB,
        },
        restartPolicy: "no",
        labels: {
          "forge.managed": "true",
          "forge.sandbox": "true",
          "forge.sandbox.session": sessionId,
        },
      };

      const containerId = await this.containerManager.createContainer(containerConfig);

      // 4. Start the container
      await this.containerManager.startContainer(containerId);

      // 5. Quick health check
      const healthEndpoint = `http://localhost:${hostPort}${healthPath}`;
      const healthResult = await this.healthChecker.checkWithRetries(healthEndpoint, 3, 2000, 8000);

      // 6. Update session as running
      await this.prisma.sandboxSession.update({
        where: { id: sessionId },
        data: {
          containerId,
          networkId: networkName,
          status: "running",
        },
      });

      if (!healthResult.healthy) {
        log.warn(` Sandbox ${sessionId} is running but health check did not pass: ${healthResult.error}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to start sandbox container";
      await this.prisma.sandboxSession.update({
        where: { id: sessionId },
        data: {
          status: "failed",
          errorMessage,
        },
      });
    }
  }

  // ==================== GET STATUS ====================

  async getStatus(userId: string, sessionId: string) {
    const session = await this.prisma.sandboxSession.findUnique({
      where: { id: sessionId },
      include: {
        module: { select: { id: true, name: true, slug: true, logoUrl: true } },
        version: { select: { id: true, version: true } },
      },
    });

    // If session was already cleaned up (deleted from DB), return expired status gracefully
    if (!session || session.userId !== userId) {
      return {
        id: sessionId,
        status: "expired",
        remainingSeconds: 0,
        port: null,
        containerId: null,
        networkId: null,
        errorMessage: null,
        module: null,
        version: null,
      };
    }

    // Check if expired but not yet cleaned up
    if (session.status === "running" && new Date() > session.expiresAt) {
      await this.cleanupSession(session.id, session.containerId, session.networkId);
      return {
        ...session,
        status: "expired",
        remainingSeconds: 0,
      };
    }

    const remainingSeconds = Math.max(
      0,
      Math.floor((session.expiresAt.getTime() - Date.now()) / 1000),
    );

    return {
      ...session,
      remainingSeconds,
    };
  }

  // ==================== STOP DEMO ====================

  async stopDemo(userId: string, sessionId: string) {
    const session = await this.prisma.sandboxSession.findUnique({
      where: { id: sessionId },
      select: { id: true, userId: true, containerId: true, networkId: true, status: true },
    });

    // If session already cleaned up (deleted from DB), return success gracefully
    if (!session || session.userId !== userId) {
      return { success: true, message: "Session already ended" };
    }

    if (session.status === "expired" || session.status === "failed") {
      return { success: true, message: "Session already ended" };
    }

    await this.cleanupSession(session.id, session.containerId, session.networkId);

    return { success: true, message: "Sandbox demo stopped" };
  }

  // ==================== LIST SANDBOXES ====================

  async listForUser(userId: string, status?: string) {
    const where: Record<string, unknown> = { userId };
    if (status) {
      where.status = status;
    }

    const sessions = await this.prisma.sandboxSession.findMany({
      where,
      include: {
        module: { select: { id: true, name: true, slug: true, logoUrl: true } },
        version: { select: { id: true, version: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return sessions.map((s) => ({
      ...s,
      remainingSeconds: s.status === "running"
        ? Math.max(0, Math.floor((s.expiresAt.getTime() - Date.now()) / 1000))
        : 0,
    }));
  }

  // ==================== CLEANUP ====================

  /**
   * Clean up a single sandbox session:
   * Phase 1: Stop container + remove network + mark as "expired" in DB.
   * Phase 2 (separate): Old expired records are deleted from DB after a grace period.
   */
  private async cleanupSession(
    sessionId: string,
    containerId: string | null,
    networkId: string | null,
  ) {
    // 1. Stop and remove container
    if (containerId) {
      try { await this.containerManager.stopContainer(containerId); } catch { /* already stopped */ }
      try { await this.containerManager.removeContainer(containerId, true); } catch { /* already removed */ }
    }

    // 2. Remove the network
    if (networkId) {
      try { await this.networkManager.removeNetwork(networkId); } catch { /* already removed */ }
    }

    // 3. Mark as expired (NOT delete — frontend may still be polling)
    try {
      await this.prisma.sandboxSession.update({
        where: { id: sessionId },
        data: { status: "expired" },
      });
    } catch { /* record may already be gone */ }
  }

  /**
   * Runs every 15s. Two phases:
   * 1. Find sessions past expiry that are still "starting"/"running" → clean up Docker + mark expired.
   * 2. Delete expired/failed session records older than 5 minutes (grace period for UI polling).
   */
  async cleanupExpired() {
    // Phase 1: Clean up active sessions that have expired
    const expired = await this.prisma.sandboxSession.findMany({
      where: {
        status: { in: ["starting", "running"] },
        expiresAt: { lt: new Date() },
      },
      select: { id: true, containerId: true, networkId: true },
    });

    let cleaned = 0;
    for (const session of expired) {
      try {
        await this.cleanupSession(session.id, session.containerId, session.networkId);
        cleaned++;
      } catch (err) {
        log.error(` Failed to cleanup session ${session.id}:`, err);
      }
    }

    if (cleaned > 0) {
      log.info(` Cleaned up ${cleaned} expired sandbox session(s)`);
    }

    // Phase 2: Delete old expired/failed records from DB (5-minute grace period for UI)
    const gracePeriod = new Date(Date.now() - 5 * 60 * 1000);
    try {
      const deleted = await this.prisma.sandboxSession.deleteMany({
        where: {
          status: { in: ["expired", "failed"] },
          expiresAt: { lt: gracePeriod },
        },
      });
      if (deleted.count > 0) {
        log.info(` Purged ${deleted.count} old session record(s) from DB`);
      }
    } catch (err) {
      log.error("Failed to purge old records:", err);
    }

    return cleaned;
  }

  /**
   * Start the periodic cleanup interval (call once at app startup).
   */
  startCleanupInterval() {
    if (this.cleanupTimer) return;
    this.cleanupTimer = setInterval(async () => {
      try {
        await this.cleanupExpired();
      } catch (err) {
        log.error("Cleanup interval error:", err);
      }
    }, CLEANUP_INTERVAL_MS);
  }

  stopCleanupInterval() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  // ==================== HELPERS ====================

  private resolveDuration(requested?: number): number {
    if (!requested) return DEFAULT_DURATION_MINUTES;
    if ((SANDBOX_DURATIONS as readonly number[]).includes(requested)) return requested;
    return DEFAULT_DURATION_MINUTES;
  }

  private buildSandboxEnv(
    requiredEnvVars: unknown,
    hostPort: number,
    containerPort: number,
    sessionId: string,
  ): Record<string, string> {
    const env: Record<string, string> = {};

    if (requiredEnvVars && typeof requiredEnvVars === "object" && !Array.isArray(requiredEnvVars)) {
      for (const [key, value] of Object.entries(requiredEnvVars as Record<string, string>)) {
        let resolved = String(value);
        resolved = resolved.replace(/localhost/g, "host.docker.internal");
        resolved = resolved.replace(/127\.0\.0\.1/g, "host.docker.internal");
        env[key] = resolved;
      }
    }

    if (!env.PORT) env.PORT = String(containerPort);
    if (!env.NODE_ENV) env.NODE_ENV = "production";

    return env;
  }

  private async findAvailableSandboxPort(): Promise<number> {
    const [usedSandboxPorts, usedDeployPorts] = await Promise.all([
      this.prisma.sandboxSession.findMany({
        where: { port: { not: null }, status: { in: ["starting", "running"] } },
        select: { port: true },
      }),
      this.prisma.deployment.findMany({
        where: { assignedPort: { not: null }, status: { notIn: ["TERMINATED"] } },
        select: { assignedPort: true },
      }),
    ]);

    const usedSet = new Set<number>();
    for (const s of usedSandboxPorts) { if (s.port) usedSet.add(s.port); }
    for (const d of usedDeployPorts) { if (d.assignedPort) usedSet.add(d.assignedPort); }

    return findAvailablePortInRange("sandbox", usedSet);
  }
}
