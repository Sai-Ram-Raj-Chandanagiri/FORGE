import { TRPCError } from "@trpc/server";
import { type PrismaClient } from "@forge/db";
import {
  ContainerManager,
  HealthChecker,
  NetworkManager,
  type ContainerConfig,
  type ContainerStats,
} from "@forge/docker-manager";
import type { CreateDeploymentInput } from "@/lib/validators/deployment";

/** Port range allocated for FORGE-managed containers */
const PORT_RANGE_START = 3001;
const PORT_RANGE_END = 4000;

/** Default resource limits for containers */
const DEFAULT_CPU_LIMIT = 0.5;
const DEFAULT_MEMORY_LIMIT_MB = 512;

export class DeploymentService {
  private containerManager: ContainerManager;
  private healthChecker: HealthChecker;
  private networkManager: NetworkManager;

  constructor(private prisma: PrismaClient) {
    this.containerManager = new ContainerManager();
    this.healthChecker = new HealthChecker();
    this.networkManager = new NetworkManager();
  }

  // ==================== DEPLOY (CREATE) ====================

  async create(userId: string, input: CreateDeploymentInput) {
    // Verify module version exists
    const version = await this.prisma.moduleVersion.findUnique({
      where: { id: input.versionId },
      include: { module: { select: { id: true, name: true, status: true } } },
    });

    if (!version) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Module version not found" });
    }

    // Verify the user has purchased the module (or is the author)
    const module = await this.prisma.module.findUnique({
      where: { id: input.moduleId },
      select: { authorId: true },
    });

    if (module?.authorId !== userId) {
      const purchase = await this.prisma.purchase.findFirst({
        where: { userId, moduleId: input.moduleId, status: "ACTIVE" },
      });
      if (!purchase) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must acquire this module first",
        });
      }
    }

    // Find an available port
    const assignedPort = await this.findAvailablePort();

    // Create the deployment record
    const deployment = await this.prisma.deployment.create({
      data: {
        userId,
        moduleId: input.moduleId,
        versionId: input.versionId,
        name: input.name,
        status: "PENDING",
        configuration: input.configuration,
        autoRestart: input.autoRestart,
        assignedPort,
      },
      include: {
        module: { select: { id: true, name: true, slug: true, logoUrl: true } },
        version: { select: { id: true, version: true, dockerImage: true } },
      },
    });

    await this.log(deployment.id, "info", `Deployment "${input.name}" created for ${version.module.name} v${version.version}`);

    // Provision the container asynchronously
    this.provisionContainer(deployment.id, userId, version.dockerImage, input.name, assignedPort, input.configuration, input.autoRestart)
      .catch((err) => {
        console.error(`[DeploymentService] Provision error for ${deployment.id}:`, err);
      });

    return deployment;
  }

  /**
   * Pulls the image, creates the container, and starts it.
   * Updates deployment status at each step.
   */
  private async provisionContainer(
    deploymentId: string,
    userId: string,
    dockerImage: string,
    name: string,
    port: number,
    configuration: Record<string, string>,
    autoRestart: boolean,
  ) {
    try {
      // 1. Set status to PROVISIONING
      await this.prisma.deployment.update({
        where: { id: deploymentId },
        data: { status: "PROVISIONING" },
      });
      await this.log(deploymentId, "info", "Provisioning started — pulling image...");

      // 2. Ensure user network exists for isolation
      const networkName = `forge-${userId}`;
      await this.networkManager.createNetwork(networkName);

      // 3. Pull the Docker image
      await this.containerManager.pullImage(dockerImage);
      await this.log(deploymentId, "info", `Image "${dockerImage}" pulled successfully`);

      // 4. Build container config
      const containerName = `forge-${name}-${deploymentId.slice(0, 8)}`;
      const containerConfig: ContainerConfig = {
        name: containerName,
        image: dockerImage,
        env: configuration,
        ports: [{ container: 80, host: port }],
        network: networkName,
        resources: {
          cpuLimit: DEFAULT_CPU_LIMIT,
          memoryLimitMb: DEFAULT_MEMORY_LIMIT_MB,
        },
        restartPolicy: autoRestart ? "unless-stopped" : "no",
        labels: {
          "forge.managed": "true",
          "forge.deployment.id": deploymentId,
          "forge.user.id": userId,
        },
      };

      // 5. Create the container
      const containerId = await this.containerManager.createContainer(containerConfig);
      await this.log(deploymentId, "info", `Container created: ${containerName}`);

      // 6. Store container ID in DB
      await this.prisma.deployment.update({
        where: { id: deploymentId },
        data: { containerName: containerId },
      });

      // 7. Start the container
      await this.containerManager.startContainer(containerId);
      await this.log(deploymentId, "info", "Container started");

      // 8. Run health check
      const healthEndpoint = `http://localhost:${port}`;
      const healthResult = await this.healthChecker.checkWithRetries(healthEndpoint, 3, 2000, 5000);

      if (healthResult.healthy) {
        await this.prisma.deployment.update({
          where: { id: deploymentId },
          data: {
            status: "RUNNING",
            healthEndpoint,
            lastHealthCheck: new Date(),
            startedAt: new Date(),
          },
        });
        await this.log(deploymentId, "info", `Deployment is RUNNING — health check passed (${healthResult.responseTime}ms)`);
      } else {
        // Container started but health check didn't pass yet — still mark RUNNING
        await this.prisma.deployment.update({
          where: { id: deploymentId },
          data: {
            status: "RUNNING",
            healthEndpoint,
            startedAt: new Date(),
          },
        });
        await this.log(deploymentId, "warn", `Container is running but health check pending: ${healthResult.error || "non-2xx response"}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown provisioning error";
      await this.prisma.deployment.update({
        where: { id: deploymentId },
        data: { status: "FAILED", errorMessage },
      });
      await this.log(deploymentId, "error", `Provisioning failed: ${errorMessage}`);
    }
  }

  // ==================== LIST / GET ====================

  async list(userId: string, status?: string, page = 1, limit = 20) {
    const where = {
      userId,
      ...(status && { status: status as "PENDING" | "PROVISIONING" | "RUNNING" | "STOPPED" | "FAILED" | "TERMINATED" }),
    };

    const [deployments, total] = await Promise.all([
      this.prisma.deployment.findMany({
        where,
        include: {
          module: { select: { id: true, name: true, slug: true, logoUrl: true } },
          version: { select: { id: true, version: true, dockerImage: true } },
        },
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.deployment.count({ where }),
    ]);

    return { deployments, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getById(userId: string, deploymentId: string) {
    const deployment = await this.prisma.deployment.findUnique({
      where: { id: deploymentId },
      include: {
        module: {
          select: { id: true, name: true, slug: true, logoUrl: true, type: true },
        },
        version: {
          select: { id: true, version: true, dockerImage: true, configSchema: true, minResources: true },
        },
        logs: {
          orderBy: { timestamp: "desc" },
          take: 50,
        },
      },
    });

    if (!deployment || deployment.userId !== userId) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Deployment not found" });
    }

    return deployment;
  }

  // ==================== LIFECYCLE (START / STOP / RESTART / TERMINATE) ====================

  async start(userId: string, deploymentId: string) {
    const deployment = await this.getDeploymentForAction(userId, deploymentId);

    if (!deployment.containerName) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "No container associated with this deployment" });
    }

    try {
      await this.containerManager.startContainer(deployment.containerName);
      await this.log(deploymentId, "info", "Container started");

      if (deployment.healthEndpoint) {
        const health = await this.healthChecker.checkWithRetries(deployment.healthEndpoint, 3, 2000, 5000);
        if (health.healthy) {
          await this.log(deploymentId, "info", `Health check passed (${health.responseTime}ms)`);
        } else {
          await this.log(deploymentId, "warn", `Health check failed after start: ${health.error || "non-2xx"}`);
        }
      }

      return this.updateStatus(deploymentId, "RUNNING");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to start container";
      await this.log(deploymentId, "error", `Start failed: ${errorMessage}`);
      return this.updateStatus(deploymentId, "FAILED", errorMessage);
    }
  }

  async stop(userId: string, deploymentId: string) {
    const deployment = await this.getDeploymentForAction(userId, deploymentId);

    if (!deployment.containerName) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "No container associated with this deployment" });
    }

    try {
      await this.containerManager.stopContainer(deployment.containerName);
      await this.log(deploymentId, "info", "Container stopped");
      return this.updateStatus(deploymentId, "STOPPED");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to stop container";
      await this.log(deploymentId, "error", `Stop failed: ${errorMessage}`);
      return this.updateStatus(deploymentId, "FAILED", errorMessage);
    }
  }

  async restart(userId: string, deploymentId: string) {
    const deployment = await this.getDeploymentForAction(userId, deploymentId);

    if (!deployment.containerName) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "No container associated with this deployment" });
    }

    try {
      await this.containerManager.restartContainer(deployment.containerName);
      await this.log(deploymentId, "info", "Container restarted");

      if (deployment.healthEndpoint) {
        const health = await this.healthChecker.checkWithRetries(deployment.healthEndpoint, 3, 2000, 5000);
        if (health.healthy) {
          await this.log(deploymentId, "info", `Health check passed after restart (${health.responseTime}ms)`);
        } else {
          await this.log(deploymentId, "warn", `Health check failed after restart: ${health.error || "non-2xx"}`);
        }
      }

      return this.updateStatus(deploymentId, "RUNNING");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to restart container";
      await this.log(deploymentId, "error", `Restart failed: ${errorMessage}`);
      return this.updateStatus(deploymentId, "FAILED", errorMessage);
    }
  }

  async terminate(userId: string, deploymentId: string) {
    const deployment = await this.getDeploymentForAction(userId, deploymentId);

    try {
      if (deployment.containerName) {
        try {
          await this.containerManager.stopContainer(deployment.containerName);
        } catch {
          // Container may already be stopped
        }
        await this.containerManager.removeContainer(deployment.containerName, true);
        await this.log(deploymentId, "info", "Container removed");
      }

      return this.updateStatus(deploymentId, "TERMINATED");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to terminate container";
      await this.log(deploymentId, "error", `Terminate failed: ${errorMessage}`);
      return this.updateStatus(deploymentId, "TERMINATED", errorMessage);
    }
  }

  // ==================== LOGS & STATS ====================

  async getLogs(userId: string, deploymentId: string, limit = 100, cursor?: string) {
    const deployment = await this.prisma.deployment.findUnique({
      where: { id: deploymentId },
      select: { userId: true },
    });

    if (!deployment || deployment.userId !== userId) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Deployment not found" });
    }

    const logs = await this.prisma.deploymentLog.findMany({
      where: { deploymentId },
      orderBy: { timestamp: "desc" },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });

    let nextCursor: string | undefined;
    if (logs.length > limit) {
      const next = logs.pop();
      nextCursor = next?.id;
    }

    return { logs, nextCursor };
  }

  /**
   * Get live container logs directly from Docker (stdout/stderr).
   */
  async getContainerLogs(userId: string, deploymentId: string, tail = 100, since?: number) {
    const deployment = await this.prisma.deployment.findUnique({
      where: { id: deploymentId },
      select: { userId: true, containerName: true, status: true },
    });

    if (!deployment || deployment.userId !== userId) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Deployment not found" });
    }

    if (!deployment.containerName) {
      return { logs: "", available: false };
    }

    try {
      const logs = await this.containerManager.getContainerLogs(deployment.containerName, {
        tail,
        since,
        timestamps: true,
      });
      return { logs, available: true };
    } catch {
      return { logs: "", available: false };
    }
  }

  /**
   * Get live container resource stats from Docker.
   */
  async getContainerStats(userId: string, deploymentId: string): Promise<ContainerStats | null> {
    const deployment = await this.prisma.deployment.findUnique({
      where: { id: deploymentId },
      select: { userId: true, containerName: true, status: true },
    });

    if (!deployment || deployment.userId !== userId) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Deployment not found" });
    }

    if (!deployment.containerName || deployment.status !== "RUNNING") {
      return null;
    }

    try {
      return await this.containerManager.getContainerStats(deployment.containerName);
    } catch {
      return null;
    }
  }

  async getStats(userId: string) {
    const [running, stopped, total, failed] = await Promise.all([
      this.prisma.deployment.count({ where: { userId, status: "RUNNING" } }),
      this.prisma.deployment.count({ where: { userId, status: "STOPPED" } }),
      this.prisma.deployment.count({
        where: { userId, status: { notIn: ["TERMINATED"] } },
      }),
      this.prisma.deployment.count({ where: { userId, status: "FAILED" } }),
    ]);

    return { running, stopped, total, failed };
  }

  // ==================== HELPERS ====================

  private async getDeploymentForAction(userId: string, deploymentId: string) {
    const deployment = await this.prisma.deployment.findUnique({
      where: { id: deploymentId },
      select: { userId: true, name: true, containerName: true, healthEndpoint: true, status: true },
    });

    if (!deployment || deployment.userId !== userId) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Deployment not found" });
    }

    return deployment;
  }

  private async updateStatus(
    deploymentId: string,
    status: "RUNNING" | "STOPPED" | "FAILED" | "TERMINATED",
    errorMessage?: string,
  ) {
    const data: Record<string, unknown> = { status };
    if (status === "RUNNING") data.startedAt = new Date();
    if (status === "STOPPED" || status === "TERMINATED") data.stoppedAt = new Date();
    if (errorMessage) data.errorMessage = errorMessage;

    const updated = await this.prisma.deployment.update({
      where: { id: deploymentId },
      data,
      include: {
        module: { select: { id: true, name: true, slug: true, logoUrl: true } },
        version: { select: { id: true, version: true, dockerImage: true } },
      },
    });

    await this.log(
      deploymentId,
      status === "FAILED" ? "error" : "info",
      `Deployment status changed to ${status}${errorMessage ? `: ${errorMessage}` : ""}`,
    );

    return updated;
  }

  private async findAvailablePort(): Promise<number> {
    const usedPorts = await this.prisma.deployment.findMany({
      where: {
        assignedPort: { not: null },
        status: { notIn: ["TERMINATED"] },
      },
      select: { assignedPort: true },
    });

    const usedSet = new Set(usedPorts.map((d) => d.assignedPort));

    for (let port = PORT_RANGE_START; port <= PORT_RANGE_END; port++) {
      if (!usedSet.has(port)) return port;
    }

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "No available ports in the allocation range",
    });
  }

  private async log(deploymentId: string, level: string, message: string) {
    await this.prisma.deploymentLog.create({
      data: { deploymentId, level, message },
    });
  }
}
