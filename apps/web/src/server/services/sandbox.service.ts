import { TRPCError } from "@trpc/server";
import { type PrismaClient } from "@forge/db";
import {
  ContainerManager,
  HealthChecker,
  NetworkManager,
  type ContainerConfig,
} from "@forge/docker-manager";

/** Sandbox port range — separate from deployment range (3001-4000) */
const SANDBOX_PORT_START = 4001;
const SANDBOX_PORT_END = 5000;

/** Resource limits for sandbox containers — lighter than real deployments */
const SANDBOX_CPU_LIMIT = 0.25;
const SANDBOX_MEMORY_LIMIT_MB = 256;

/** Sandbox time-to-live in minutes */
const SANDBOX_TTL_MINUTES = 15;

/** Max concurrent sandboxes per user */
const MAX_CONCURRENT_SANDBOXES = 2;

/** Cleanup interval in milliseconds (60 seconds) */
const CLEANUP_INTERVAL_MS = 60_000;

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

  async startDemo(userId: string, moduleId: string, versionId?: string) {
    // 1. Check concurrent sandbox limit
    const activeSandboxes = await this.prisma.sandboxSession.count({
      where: {
        userId,
        status: { in: ["starting", "running"] },
      },
    });

    if (activeSandboxes >= MAX_CONCURRENT_SANDBOXES) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: `You can only have ${MAX_CONCURRENT_SANDBOXES} active sandbox demos at a time. Please stop an existing demo first.`,
      });
    }

    // 2. Load module with latest version
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

    // 3. Check that module has a deployable image
    const imageToUse = version.builtImageTag || version.dockerImage;
    if (!imageToUse) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "This module does not have a container image available for demo",
      });
    }

    // 4. Find available sandbox port
    const sandboxPort = await this.findAvailableSandboxPort();

    // 5. Create sandbox session record
    const expiresAt = new Date(Date.now() + SANDBOX_TTL_MINUTES * 60 * 1000);
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

    // 6. Provision container asynchronously
    this.provisionSandboxContainer(
      session.id,
      imageToUse,
      sandboxPort,
      version.exposedPort || 80,
      version.healthCheckPath || "/",
    ).catch((err) => {
      console.error(`[SandboxService] Provision error for session ${session.id}:`, err);
    });

    return {
      sessionId: session.id,
      port: sandboxPort,
      expiresAt: expiresAt.toISOString(),
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
        env: {},
        ports: [{ container: containerPort, host: hostPort }],
        network: networkName,
        resources: {
          cpuLimit: SANDBOX_CPU_LIMIT,
          memoryLimitMb: SANDBOX_MEMORY_LIMIT_MB,
        },
        restartPolicy: "no", // Don't restart if it crashes — it's a demo
        labels: {
          "forge.managed": "true",
          "forge.sandbox": "true",
          "forge.sandbox.session": sessionId,
        },
      };

      const containerId = await this.containerManager.createContainer(containerConfig);

      // 4. Start the container
      await this.containerManager.startContainer(containerId);

      // 5. Quick health check (less aggressive than deployments)
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
        console.warn(`[SandboxService] Sandbox ${sessionId} is running but health check did not pass: ${healthResult.error}`);
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

    if (!session || session.userId !== userId) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Sandbox session not found" });
    }

    // Check if expired but not yet cleaned up
    if (session.status === "running" && new Date() > session.expiresAt) {
      // Trigger cleanup for this session
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

    if (!session || session.userId !== userId) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Sandbox session not found" });
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
   * Clean up a single sandbox session: stop container, remove network, update DB.
   */
  private async cleanupSession(
    sessionId: string,
    containerId: string | null,
    networkId: string | null,
  ) {
    try {
      if (containerId) {
        try {
          await this.containerManager.stopContainer(containerId);
        } catch {
          // Container may already be stopped
        }
        try {
          await this.containerManager.removeContainer(containerId, true);
        } catch {
          // Container may already be removed
        }
      }

      if (networkId) {
        try {
          await this.networkManager.removeNetwork(networkId);
        } catch {
          // Network may already be removed or in use
        }
      }
    } catch (err) {
      console.error(`[SandboxService] Cleanup error for session ${sessionId}:`, err);
    }

    await this.prisma.sandboxSession.update({
      where: { id: sessionId },
      data: { status: "expired" },
    });
  }

  /**
   * Runs periodically to clean up all expired sandbox sessions.
   */
  async cleanupExpired() {
    const expired = await this.prisma.sandboxSession.findMany({
      where: {
        status: { in: ["starting", "running"] },
        expiresAt: { lt: new Date() },
      },
      select: { id: true, containerId: true, networkId: true },
    });

    if (expired.length === 0) return 0;

    let cleaned = 0;
    for (const session of expired) {
      await this.cleanupSession(session.id, session.containerId, session.networkId);
      cleaned++;
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
        const count = await this.cleanupExpired();
        if (count > 0) {
          console.log(`[SandboxService] Cleaned up ${count} expired sandbox sessions`);
        }
      } catch (err) {
        console.error("[SandboxService] Cleanup interval error:", err);
      }
    }, CLEANUP_INTERVAL_MS);
  }

  /**
   * Stop the periodic cleanup interval.
   */
  stopCleanupInterval() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  // ==================== HELPERS ====================

  private async findAvailableSandboxPort(): Promise<number> {
    // Check both sandbox sessions AND deployments to avoid port conflicts
    const [usedSandboxPorts, usedDeployPorts] = await Promise.all([
      this.prisma.sandboxSession.findMany({
        where: {
          port: { not: null },
          status: { in: ["starting", "running"] },
        },
        select: { port: true },
      }),
      this.prisma.deployment.findMany({
        where: {
          assignedPort: { not: null },
          status: { notIn: ["TERMINATED"] },
        },
        select: { assignedPort: true },
      }),
    ]);

    const usedSet = new Set<number>();
    for (const s of usedSandboxPorts) {
      if (s.port) usedSet.add(s.port);
    }
    for (const d of usedDeployPorts) {
      if (d.assignedPort) usedSet.add(d.assignedPort);
    }

    for (let port = SANDBOX_PORT_START; port <= SANDBOX_PORT_END; port++) {
      if (!usedSet.has(port)) return port;
    }

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "No available sandbox ports. Please try again later.",
    });
  }
}
