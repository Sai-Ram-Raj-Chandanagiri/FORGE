import { TRPCError } from "@trpc/server";
import { type PrismaClient } from "@forge/db";
import type { CreateDeploymentInput } from "@/lib/validators/deployment";

export class DeploymentService {
  constructor(private prisma: PrismaClient) {}

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

    const deployment = await this.prisma.deployment.create({
      data: {
        userId,
        moduleId: input.moduleId,
        versionId: input.versionId,
        name: input.name,
        status: "PENDING",
        configuration: input.configuration,
        autoRestart: input.autoRestart,
      },
      include: {
        module: { select: { id: true, name: true, slug: true, logoUrl: true } },
        version: { select: { id: true, version: true, dockerImage: true } },
      },
    });

    // Log creation
    await this.prisma.deploymentLog.create({
      data: {
        deploymentId: deployment.id,
        level: "info",
        message: `Deployment "${input.name}" created for ${version.module.name} v${version.version}`,
      },
    });

    return deployment;
  }

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

  async updateStatus(
    userId: string,
    deploymentId: string,
    status: "RUNNING" | "STOPPED" | "FAILED" | "TERMINATED",
    errorMessage?: string,
  ) {
    const deployment = await this.prisma.deployment.findUnique({
      where: { id: deploymentId },
      select: { userId: true, name: true },
    });

    if (!deployment || deployment.userId !== userId) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Deployment not found" });
    }

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

    await this.prisma.deploymentLog.create({
      data: {
        deploymentId,
        level: status === "FAILED" ? "error" : "info",
        message: `Deployment status changed to ${status}${errorMessage ? `: ${errorMessage}` : ""}`,
      },
    });

    return updated;
  }

  async start(userId: string, deploymentId: string) {
    return this.updateStatus(userId, deploymentId, "RUNNING");
  }

  async stop(userId: string, deploymentId: string) {
    return this.updateStatus(userId, deploymentId, "STOPPED");
  }

  async restart(userId: string, deploymentId: string) {
    await this.updateStatus(userId, deploymentId, "STOPPED");
    return this.updateStatus(userId, deploymentId, "RUNNING");
  }

  async terminate(userId: string, deploymentId: string) {
    return this.updateStatus(userId, deploymentId, "TERMINATED");
  }

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
}
