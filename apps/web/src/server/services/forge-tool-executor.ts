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
import { ProjectExportService } from "./project-export.service";

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
      case "purchase_module":
        return this.purchaseModule(args, context);

      // ===== Docker / Deployment Tools =====
      case "deploy_module":
        return this.deployModule(args, context);
      case "scale_deployment":
        return this.scaleDeployment(args, context);
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

      // ===== Layout Tools =====
      case "generate_platform_layout":
        return this.generatePlatformLayout(args, context);
      case "get_platform_layout":
        return this.getPlatformLayout(context);
      case "update_platform_layout":
        return this.updatePlatformLayout(args, context);

      // ===== Export Tools =====
      case "export_project":
        return this.exportProject(context);
      case "get_module_sources":
        return this.getModuleSources(context);

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

  // ===== Deploy Module =====

  private async deployModule(
    args: Record<string, unknown>,
    context: AgentContext,
  ): Promise<Record<string, unknown>> {
    const moduleSlug = args.moduleSlug as string;
    if (!moduleSlug) return { error: "moduleSlug is required" };

    try {
      const moduleService = new ModuleService(this.prisma);

      // Look up the module by slug
      const mod = await moduleService.getBySlug(moduleSlug);
      if (!mod) return { error: `Module "${moduleSlug}" not found` };

      // Find the target version (specific version or latest)
      const requestedVersion = args.version as string | undefined;
      const versions = mod.versions as unknown as {
        id: string;
        version: string;
        isLatest: boolean;
      }[];
      let targetVersion = requestedVersion
        ? versions.find((v) => v.version === requestedVersion)
        : versions.find((v) => v.isLatest);
      if (!targetVersion && versions.length > 0) {
        targetVersion = versions[0]!;
      }
      if (!targetVersion) return { error: "No deployable version found" };

      // Check ownership — user is author or has purchase
      const isAuthor = mod.author?.id === context.userId;
      if (!isAuthor) {
        const purchases = await moduleService.getMyPurchases(context.userId);
        const purchaseList = purchases as unknown as { module: { slug: string } }[];
        const owned = purchaseList.some((p) => p.module.slug === moduleSlug);

        if (!owned) {
          // Auto-purchase if FREE
          if (mod.pricingModel === "FREE") {
            try {
              await moduleService.purchase(context.userId, mod.id);
            } catch (purchaseErr) {
              // Already owned is fine
              const msg = purchaseErr instanceof Error ? purchaseErr.message : "";
              if (!msg.includes("already own")) {
                return { error: `Failed to acquire module: ${msg}` };
              }
            }
          } else {
            return {
              error: "Module not owned. Purchase it first.",
              requiresPayment: true,
              storeUrl: `/store/${moduleSlug}`,
            };
          }
        }
      }

      // Build a deployment name from args or module slug
      const deployName = (args.name as string) || `${moduleSlug}-deploy`;
      const sanitizedName = deployName
        .replace(/[^a-zA-Z0-9-_]/g, "-")
        .substring(0, 50);

      // Prepare env vars
      const envVars = (args.envVars as Record<string, string>) || {};

      const deploymentService = new DeploymentService(this.prisma);
      const deployment = await deploymentService.create(context.userId, {
        moduleId: mod.id,
        versionId: targetVersion.id,
        name: sanitizedName,
        configuration: envVars,
        autoRestart: true,
      });

      return {
        success: true,
        deploymentId: deployment.id,
        name: deployment.name,
        status: deployment.status,
        port: deployment.assignedPort,
      };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Failed to deploy module" };
    }
  }

  // ===== Purchase Module =====

  private async purchaseModule(
    args: Record<string, unknown>,
    context: AgentContext,
  ): Promise<Record<string, unknown>> {
    const moduleSlug = args.moduleSlug as string;
    if (!moduleSlug) return { error: "moduleSlug is required" };

    try {
      const moduleService = new ModuleService(this.prisma);
      const mod = await moduleService.getBySlug(moduleSlug);
      if (!mod) return { error: `Module "${moduleSlug}" not found` };

      if (mod.pricingModel === "FREE") {
        try {
          await moduleService.purchase(context.userId, mod.id);
        } catch (purchaseErr) {
          const msg = purchaseErr instanceof Error ? purchaseErr.message : "";
          if (msg.includes("already own")) {
            return { success: true, owned: true, alreadyOwned: true };
          }
          return { error: `Failed to acquire module: ${msg}` };
        }
        return { success: true, owned: true };
      }

      // Paid module — agent tells user to pay manually
      return {
        requiresPayment: true,
        price: mod.price?.toString() ?? "unknown",
        pricingModel: mod.pricingModel,
        storeUrl: `/store/${moduleSlug}`,
        message: `This module costs ${mod.price?.toString() ?? "?"} (${mod.pricingModel}). Please purchase it from the FORGE Store.`,
      };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Failed to purchase module" };
    }
  }

  // ===== Scale Deployment =====

  private async scaleDeployment(
    args: Record<string, unknown>,
    context: AgentContext,
  ): Promise<Record<string, unknown>> {
    const deploymentId = args.deploymentId as string;
    if (!deploymentId) return { error: "deploymentId is required" };

    const cpuLimit = args.cpuLimit as number | undefined;
    const memoryLimitMb = args.memoryLimitMb as number | undefined;

    if (!cpuLimit && !memoryLimitMb) {
      return { error: "At least one of cpuLimit or memoryLimitMb is required" };
    }

    try {
      const deployment = await this.prisma.deployment.findFirst({
        where: { id: deploymentId, userId: context.userId },
        select: { id: true, configuration: true },
      });

      if (!deployment) return { error: "Deployment not found" };

      const currentConfig = (deployment.configuration as Record<string, string>) || {};
      const updatedConfig: Record<string, string> = { ...currentConfig };

      if (cpuLimit !== undefined) updatedConfig["FORGE_CPU_LIMIT"] = String(cpuLimit);
      if (memoryLimitMb !== undefined) updatedConfig["FORGE_MEMORY_LIMIT_MB"] = String(memoryLimitMb);

      await this.prisma.deployment.update({
        where: { id: deploymentId },
        data: { configuration: updatedConfig as import("@forge/db").Prisma.InputJsonValue },
      });

      return {
        success: true,
        deploymentId,
        cpuLimit: cpuLimit ?? currentConfig["FORGE_CPU_LIMIT"] ?? "unchanged",
        memoryLimitMb: memoryLimitMb ?? currentConfig["FORGE_MEMORY_LIMIT_MB"] ?? "unchanged",
      };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Failed to scale deployment" };
    }
  }

  // ===== Layout Tools =====

  private async generatePlatformLayout(
    args: Record<string, unknown>,
    context: AgentContext,
  ): Promise<Record<string, unknown>> {
    const platformName = (args.platformName as string) || "My Platform";
    const primaryColor = (args.primaryColor as string) || "#6366f1";
    const homepage = (args.homepage as string) || "dashboard";
    const sidebarItems = (args.sidebarItems as { moduleSlug: string; label: string; icon: string; group: string; order: number }[]) || [];

    try {
      // Get or create workspace
      const workspace = await this.prisma.workspace.findUnique({
        where: { userId: context.userId },
      });

      if (!workspace) {
        return { error: "No workspace found. Activate workspace first." };
      }

      // Build the layout config
      const groups = Array.from(new Set(sidebarItems.map((item) => item.group)))
        .map((name, idx) => ({ name, order: idx + 1 }));

      const layoutConfig = {
        theme: {
          brandName: platformName,
          primaryColor,
          logoUrl: null,
        },
        homepage,
        sidebar: sidebarItems.map((item, idx) => ({
          moduleSlug: item.moduleSlug,
          label: item.label || item.moduleSlug,
          icon: item.icon || "box",
          group: item.group || "Modules",
          order: item.order ?? idx + 1,
        })),
        groups,
      };

      // Upsert the PlatformLayout record
      await this.prisma.platformLayout.upsert({
        where: { workspaceId: workspace.id },
        create: {
          workspaceId: workspace.id,
          name: platformName,
          layout: layoutConfig as import("@forge/db").Prisma.InputJsonValue,
        },
        update: {
          name: platformName,
          layout: layoutConfig as import("@forge/db").Prisma.InputJsonValue,
        },
      });

      // Regenerate Nginx config if workspace is active
      if (workspace.status === "active") {
        const workspaceService = new WorkspaceService(this.prisma);
        try {
          await workspaceService.regenerateProxy(context.userId);
        } catch {
          // Non-fatal — layout saved, proxy will update on next activation
        }
      }

      return {
        success: true,
        platformName,
        portalUrl: workspace.proxyPort ? `http://localhost:${workspace.proxyPort}` : null,
        sidebar: layoutConfig.sidebar,
        groups: layoutConfig.groups,
      };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Failed to generate layout" };
    }
  }

  private async getPlatformLayout(
    context: AgentContext,
  ): Promise<Record<string, unknown>> {
    try {
      const workspace = await this.prisma.workspace.findUnique({
        where: { userId: context.userId },
        include: { layout: true },
      });

      if (!workspace) return { error: "No workspace found" };
      if (!workspace.layout) return { hasLayout: false, message: "No platform layout configured" };

      return {
        hasLayout: true,
        name: workspace.layout.name,
        layout: workspace.layout.layout,
      };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Failed to get layout" };
    }
  }

  private async updatePlatformLayout(
    args: Record<string, unknown>,
    context: AgentContext,
  ): Promise<Record<string, unknown>> {
    const changes = args.changes as Record<string, unknown> | undefined;
    if (!changes) return { error: "changes object is required" };

    try {
      const workspace = await this.prisma.workspace.findUnique({
        where: { userId: context.userId },
        include: { layout: true },
      });

      if (!workspace) return { error: "No workspace found" };
      if (!workspace.layout) return { error: "No platform layout exists. Use generate_platform_layout first." };

      const currentLayout = workspace.layout.layout as Record<string, unknown>;

      // Merge changes into current layout
      const updatedLayout = { ...currentLayout };

      if (changes.theme) {
        updatedLayout.theme = { ...(currentLayout.theme as Record<string, unknown> || {}), ...(changes.theme as Record<string, unknown>) };
      }
      if (changes.homepage !== undefined) {
        updatedLayout.homepage = changes.homepage;
      }
      if (changes.sidebar) {
        updatedLayout.sidebar = changes.sidebar;
      }
      if (changes.groups) {
        updatedLayout.groups = changes.groups;
      }

      const newName = (changes.theme as Record<string, unknown>)?.brandName as string | undefined;

      await this.prisma.platformLayout.update({
        where: { workspaceId: workspace.id },
        data: {
          layout: updatedLayout as import("@forge/db").Prisma.InputJsonValue,
          ...(newName ? { name: newName } : {}),
        },
      });

      // Regenerate Nginx config if workspace is active
      if (workspace.status === "active") {
        const workspaceService = new WorkspaceService(this.prisma);
        try {
          await workspaceService.regenerateProxy(context.userId);
        } catch {
          // Non-fatal
        }
      }

      return { success: true, layout: updatedLayout };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Failed to update layout" };
    }
  }

  // ===== Export Tools =====

  private async exportProject(context: AgentContext): Promise<Record<string, unknown>> {
    try {
      const exportService = new ProjectExportService(this.prisma);
      const project = await exportService.exportProject(context.userId);

      return {
        success: true,
        projectName: project.name,
        fileCount: project.files.length,
        files: project.files.map((f) => f.path),
        downloadUrl: `/api/export?userId=${context.userId}`,
      };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Failed to export project" };
    }
  }

  private async getModuleSources(context: AgentContext): Promise<Record<string, unknown>> {
    try {
      const exportService = new ProjectExportService(this.prisma);
      const sources = await exportService.getModuleSources(context.userId);

      return {
        success: true,
        modules: sources,
      };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Failed to get module sources" };
    }
  }
}
