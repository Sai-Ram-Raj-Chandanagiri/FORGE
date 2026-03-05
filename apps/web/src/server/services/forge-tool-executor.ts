/**
 * ForgeToolExecutor — Routes agent tool calls to real FORGE services.
 * Implements the ToolExecutor interface from @forge/agent-sdk.
 */

import type { ToolExecutor, AgentContext } from "@forge/agent-sdk";
import type { PrismaClient } from "@forge/db";
import { SearchService } from "./search.service";
import { ModuleService } from "./module.service";
import { DeploymentService } from "./deployment.service";
import { WorkspaceService } from "./workspace.service";

export class ForgeToolExecutor implements ToolExecutor {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async execute(
    toolName: string,
    args: Record<string, unknown>,
    context: AgentContext,
  ): Promise<Record<string, unknown>> {
    switch (toolName) {
      // ===== Database / Store Tools =====
      case "search_modules":
        return this.searchModules(args);
      case "get_module_details":
        return this.getModuleDetails(args);
      case "get_user_purchases":
        return this.getUserPurchases(context);
      case "get_user_deployments":
        return this.getUserDeployments(context);
      case "get_deployment_metrics":
        return this.getDeploymentMetrics(args, context);

      // ===== Docker / Deployment Tools =====
      case "list_deployments":
        return this.listDeployments(args, context);
      case "get_deployment_status":
        return this.getDeploymentStatus(args, context);
      case "restart_deployment":
        return this.restartDeployment(args, context);
      case "stop_deployment":
        return this.stopDeployment(args, context);

      // ===== Workspace / Bridge Tools =====
      case "get_workspace_status":
        return this.getWorkspaceStatus(context);
      case "activate_workspace":
        return this.activateWorkspaceAction(context);
      case "create_data_bridge":
        return this.createDataBridge(args, context);
      case "list_bridges":
        return this.listBridgesAction(context);
      case "stop_bridge":
        return this.stopBridgeAction(args, context);
      case "delete_bridge":
        return this.deleteBridgeAction(args, context);

      // ===== Notification Tools =====
      case "send_notification":
        return this.sendNotification(args, context);

      default:
        return { error: `Unknown tool: ${toolName}`, success: false };
    }
  }

  // ===== Database / Store Tools =====

  private async searchModules(args: Record<string, unknown>): Promise<Record<string, unknown>> {
    const searchService = new SearchService(this.prisma);
    const result = await searchService.searchModules({
      query: (args.query as string) || undefined,
      categorySlug: (args.category as string) || undefined,
      pricingModel: (args.pricingModel as "FREE" | "ONE_TIME" | "SUBSCRIPTION_MONTHLY" | "SUBSCRIPTION_YEARLY" | "USAGE_BASED") || undefined,
      sortBy: "popular",
      page: 1,
      limit: (args.limit as number) || 10,
    });
    return {
      modules: result.modules.map((m) => ({
        name: m.name,
        slug: m.slug,
        description: m.shortDescription,
        pricingModel: m.pricingModel,
        rating: m.averageRating,
        downloads: m.downloadCount,
      })),
      total: result.total,
    };
  }

  private async getModuleDetails(args: Record<string, unknown>): Promise<Record<string, unknown>> {
    const moduleService = new ModuleService(this.prisma);
    const slug = args.moduleSlug as string;
    if (!slug) return { error: "moduleSlug is required" };
    try {
      const mod = await moduleService.getBySlug(slug);
      if (!mod) return { error: "Module not found" };
      return {
        name: mod.name,
        slug: mod.slug,
        description: mod.shortDescription,
        type: mod.type,
        pricingModel: mod.pricingModel,
        price: mod.price,
        versions: (mod.versions as unknown as { version: string; isLatest: boolean }[]).map((v) => ({
          version: v.version,
          isLatest: v.isLatest,
        })),
      };
    } catch {
      return { error: "Module not found" };
    }
  }

  private async getUserPurchases(context: AgentContext): Promise<Record<string, unknown>> {
    const moduleService = new ModuleService(this.prisma);
    const purchases = await moduleService.getMyPurchases(context.userId);
    const list = purchases as unknown as { module: { name: string; slug: string } }[];
    return {
      purchases: list.map((p) => ({
        name: p.module.name,
        slug: p.module.slug,
      })),
      count: list.length,
    };
  }

  private async getUserDeployments(context: AgentContext): Promise<Record<string, unknown>> {
    const deploymentService = new DeploymentService(this.prisma);
    const result = await deploymentService.list(context.userId);
    return {
      deployments: result.deployments.map((d) => ({
        id: d.id,
        name: d.name,
        status: d.status,
        port: d.assignedPort,
      })),
      total: result.total,
    };
  }

  private async getDeploymentMetrics(
    args: Record<string, unknown>,
    context: AgentContext,
  ): Promise<Record<string, unknown>> {
    const deploymentService = new DeploymentService(this.prisma);
    const deploymentId = args.deploymentId as string;
    if (!deploymentId) return { error: "deploymentId is required" };
    try {
      const stats = await deploymentService.getContainerStats(context.userId, deploymentId);
      return { metrics: stats };
    } catch {
      return { error: "Could not retrieve metrics" };
    }
  }

  // ===== Docker / Deployment Tools =====

  private async listDeployments(
    args: Record<string, unknown>,
    context: AgentContext,
  ): Promise<Record<string, unknown>> {
    const deploymentService = new DeploymentService(this.prisma);
    const status = args.status as string | undefined;
    const result = await deploymentService.list(context.userId, status === "all" ? undefined : status);
    return {
      deployments: result.deployments.map((d) => ({
        id: d.id,
        name: d.name,
        status: d.status,
      })),
      total: result.total,
    };
  }

  private async getDeploymentStatus(
    args: Record<string, unknown>,
    context: AgentContext,
  ): Promise<Record<string, unknown>> {
    const deploymentService = new DeploymentService(this.prisma);
    const deploymentId = args.deploymentId as string;
    if (!deploymentId) return { error: "deploymentId is required" };
    try {
      const deployment = await deploymentService.getById(context.userId, deploymentId);
      return {
        id: deployment.id,
        name: deployment.name,
        status: deployment.status,
        port: deployment.assignedPort,
        containerName: deployment.containerName,
      };
    } catch {
      return { error: "Deployment not found" };
    }
  }

  private async restartDeployment(
    args: Record<string, unknown>,
    context: AgentContext,
  ): Promise<Record<string, unknown>> {
    const deploymentService = new DeploymentService(this.prisma);
    const deploymentId = args.deploymentId as string;
    if (!deploymentId) return { error: "deploymentId is required" };
    try {
      await deploymentService.restart(context.userId, deploymentId);
      return { success: true, message: "Deployment restarted" };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Failed to restart" };
    }
  }

  private async stopDeployment(
    args: Record<string, unknown>,
    context: AgentContext,
  ): Promise<Record<string, unknown>> {
    const deploymentService = new DeploymentService(this.prisma);
    const deploymentId = args.deploymentId as string;
    if (!deploymentId) return { error: "deploymentId is required" };
    try {
      await deploymentService.stop(context.userId, deploymentId);
      return { success: true, message: "Deployment stopped" };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Failed to stop" };
    }
  }

  // ===== Workspace / Bridge Tools =====

  private async getWorkspaceStatus(context: AgentContext): Promise<Record<string, unknown>> {
    const workspaceService = new WorkspaceService(this.prisma);
    try {
      const status = await workspaceService.getWorkspaceStatus(context.userId);
      return {
        workspace: status.workspace,
        connectedModules: status.connectedModules.map((m) => ({
          deploymentId: m.deploymentId,
          moduleName: m.moduleName,
          moduleSlug: m.moduleSlug,
          status: m.status,
          proxyPath: m.proxyPath,
          directUrl: m.directUrl,
        })),
        bridges: status.bridges.map((b) => ({
          id: b.id,
          name: b.name,
          status: b.status,
          syncCount: b.syncCount,
          lastSyncAt: b.lastSyncAt,
        })),
      };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Failed to get workspace status" };
    }
  }

  private async activateWorkspaceAction(context: AgentContext): Promise<Record<string, unknown>> {
    const workspaceService = new WorkspaceService(this.prisma);
    try {
      const result = await workspaceService.activateWorkspace(context.userId);
      return {
        success: true,
        portalUrl: result.workspace.portalUrl,
        status: result.workspace.status,
        connectedModules: result.connectedModules.length,
      };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Failed to activate workspace" };
    }
  }

  private async createDataBridge(
    args: Record<string, unknown>,
    context: AgentContext,
  ): Promise<Record<string, unknown>> {
    const workspaceService = new WorkspaceService(this.prisma);
    const name = args.name as string;
    const sourceDeploymentId = args.sourceDeploymentId as string;
    const targetDeploymentId = args.targetDeploymentId as string;
    const bridgeType = (args.bridgeType as string) || "polling";

    if (!name || !sourceDeploymentId || !targetDeploymentId) {
      return { error: "name, sourceDeploymentId, and targetDeploymentId are required" };
    }

    try {
      const bridge = await workspaceService.createBridge(context.userId, {
        name,
        sourceDeploymentId,
        targetDeploymentId,
        bridgeType: bridgeType as "polling" | "webhook" | "event_stream",
        configuration: {
          sourceEndpoint: (args.sourceEndpoint as string) || "/api/data",
          targetEndpoint: (args.targetEndpoint as string) || "/api/data",
          syncFrequencySeconds: (args.syncFrequencySeconds as number) || 30,
        },
      });
      return {
        success: true,
        bridgeId: bridge.id,
        name: bridge.name,
        status: bridge.status,
      };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Failed to create bridge" };
    }
  }

  private async listBridgesAction(context: AgentContext): Promise<Record<string, unknown>> {
    const workspaceService = new WorkspaceService(this.prisma);
    try {
      const bridges = await workspaceService.listBridges(context.userId);
      return {
        bridges: bridges.map((b) => ({
          id: b.id,
          name: b.name,
          bridgeType: b.bridgeType,
          status: b.status,
          syncCount: b.syncCount,
          lastSyncAt: b.lastSyncAt,
        })),
        count: bridges.length,
      };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Failed to list bridges" };
    }
  }

  private async stopBridgeAction(
    args: Record<string, unknown>,
    context: AgentContext,
  ): Promise<Record<string, unknown>> {
    const workspaceService = new WorkspaceService(this.prisma);
    const bridgeId = args.bridgeId as string;
    if (!bridgeId) return { error: "bridgeId is required" };
    try {
      await workspaceService.stopBridge(context.userId, bridgeId);
      return { success: true, message: "Bridge stopped" };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Failed to stop bridge" };
    }
  }

  private async deleteBridgeAction(
    args: Record<string, unknown>,
    context: AgentContext,
  ): Promise<Record<string, unknown>> {
    const workspaceService = new WorkspaceService(this.prisma);
    const bridgeId = args.bridgeId as string;
    if (!bridgeId) return { error: "bridgeId is required" };
    try {
      await workspaceService.deleteBridge(context.userId, bridgeId);
      return { success: true, message: "Bridge deleted" };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Failed to delete bridge" };
    }
  }

  // ===== Notification Tools =====

  private async sendNotification(
    args: Record<string, unknown>,
    context: AgentContext,
  ): Promise<Record<string, unknown>> {
    const title = args.title as string;
    const body = args.body as string;
    const VALID_TYPES = ["SUBMISSION_STATUS", "DEPLOYMENT_ALERT", "REVIEW_RECEIVED", "PURCHASE_CONFIRMATION", "SYSTEM_ANNOUNCEMENT", "COLLABORATION_INVITE"] as const;
    const rawType = (args.type as string) || "SYSTEM_ANNOUNCEMENT";
    const type = VALID_TYPES.includes(rawType as typeof VALID_TYPES[number])
      ? (rawType as typeof VALID_TYPES[number])
      : "SYSTEM_ANNOUNCEMENT";
    const link = args.link as string | undefined;

    if (!title || !body) return { error: "title and body are required" };

    const notification = await this.prisma.notification.create({
      data: {
        userId: context.userId,
        type,
        title,
        body,
        link: link ?? null,
      },
    });

    return { success: true, notificationId: notification.id };
  }
}
