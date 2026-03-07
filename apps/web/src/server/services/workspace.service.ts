import { TRPCError } from "@trpc/server";
import { type PrismaClient, type Prisma } from "@forge/db";
import {
  ContainerManager,
  NetworkManager,
  type ContainerConfig,
} from "@forge/docker-manager";
import type { CreateBridgeInput } from "@/lib/validators/workspace";
import { findAvailablePortInRange } from "./port-allocator";
import { generateDashboardShell, type PlatformLayoutConfig } from "./workspace-dashboard";
import { generateAutoLayout, type DeployedModule } from "./layout-generator";
import { logger } from "@/lib/logger";

const log = logger.forService("WorkspaceService");

/** Nginx Docker image — lightweight and battle-tested */
const NGINX_IMAGE = "nginx:alpine";

/** Bridge container image — lightweight Node.js runtime */
const BRIDGE_IMAGE = "node:20-alpine";

export class WorkspaceService {
  private containerManager: ContainerManager;
  private networkManager: NetworkManager;

  constructor(private prisma: PrismaClient) {
    this.containerManager = new ContainerManager();
    this.networkManager = new NetworkManager();
  }

  // ==================== WORKSPACE LIFECYCLE ====================

  /**
   * Get or create a workspace record for the user.
   */
  async getOrCreateWorkspace(userId: string) {
    let workspace = await this.prisma.workspace.findUnique({
      where: { userId },
      include: {
        bridges: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!workspace) {
      workspace = await this.prisma.workspace.create({
        data: {
          userId,
          name: "My Workspace",
          networkName: `forge-workspace-${userId.slice(0, 12)}`,
          status: "inactive",
        },
        include: {
          bridges: true,
        },
      });
    }

    return workspace;
  }

  /**
   * Get the workspace with full status info including connected deployments.
   */
  async getWorkspaceStatus(userId: string) {
    const workspace = await this.getOrCreateWorkspace(userId);

    // Get all non-terminated deployments for this user
    const deployments = await this.prisma.deployment.findMany({
      where: {
        userId,
        status: { notIn: ["TERMINATED"] },
      },
      include: {
        module: { select: { id: true, name: true, slug: true, logoUrl: true } },
        version: { select: { id: true, version: true, exposedPort: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Build connected module info with proxy paths
    const connectedModules = deployments.map((d) => ({
      deploymentId: d.id,
      name: d.name,
      moduleSlug: d.module.slug,
      moduleName: d.module.name,
      logoUrl: d.module.logoUrl,
      status: d.status,
      assignedPort: d.assignedPort,
      proxyPath: `/apps/${d.module.slug}`,
      directUrl: d.assignedPort ? `http://localhost:${d.assignedPort}` : null,
    }));

    return {
      workspace: {
        id: workspace.id,
        name: workspace.name,
        status: workspace.status,
        proxyPort: workspace.proxyPort,
        portalUrl: workspace.proxyPort
          ? `http://localhost:${workspace.proxyPort}`
          : null,
        errorMessage: workspace.errorMessage,
        createdAt: workspace.createdAt,
        updatedAt: workspace.updatedAt,
      },
      connectedModules,
      bridges: workspace.bridges.map((b) => ({
        id: b.id,
        name: b.name,
        sourceDeploymentId: b.sourceDeploymentId,
        targetDeploymentId: b.targetDeploymentId,
        bridgeType: b.bridgeType,
        status: b.status,
        lastSyncAt: b.lastSyncAt,
        syncCount: b.syncCount,
        errorMessage: b.errorMessage,
      })),
    };
  }

  /**
   * Activate the workspace — create network, deploy Nginx proxy, connect containers.
   */
  async activateWorkspace(userId: string) {
    const workspace = await this.getOrCreateWorkspace(userId);

    if (workspace.status === "active") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Workspace is already active",
      });
    }

    try {
      await this.prisma.workspace.update({
        where: { id: workspace.id },
        data: { status: "starting", errorMessage: null },
      });

      const networkName = workspace.networkName || `forge-workspace-${userId.slice(0, 12)}`;

      // 1. Create workspace network
      await this.networkManager.createNetwork(networkName);

      // 2. Find available proxy port
      const proxyPort = await this.findAvailableProxyPort();

      // 3. Pull Nginx image
      try {
        await this.containerManager.pullImage(NGINX_IMAGE);
      } catch {
        // Image may already be available locally
      }

      // 4. Connect all RUNNING deployment containers to workspace network
      const deployments = await this.prisma.deployment.findMany({
        where: {
          userId,
          status: "RUNNING",
          containerName: { not: null },
        },
        include: {
          module: { select: { slug: true } },
          version: { select: { exposedPort: true } },
        },
      });

      for (const dep of deployments) {
        if (!dep.containerName) continue;
        try {
          await this.networkManager.connectContainer(networkName, dep.containerName);
        } catch (err) {
          log.error(` Failed to connect deployment ${dep.id}:`, err);
        }
      }

      // 5. Fetch layout and bridges for dashboard shell
      const platformLayout = await this.prisma.platformLayout.findUnique({
        where: { workspaceId: workspace.id },
      });
      const layoutConfig = platformLayout?.layout as PlatformLayoutConfig | null;

      const bridgeRecords = await this.prisma.dataBridge.findMany({
        where: { workspaceId: workspace.id },
        select: { name: true, status: true, syncCount: true, lastSyncAt: true, sourceDeploymentId: true, targetDeploymentId: true },
      });

      const nginxConf = this.generateNginxConfig(deployments, layoutConfig, bridgeRecords);
      const proxyContainerId = await this.deployNginxProxy(
        userId,
        workspace.id,
        networkName,
        proxyPort,
        nginxConf,
      );

      // 6. Update workspace record
      await this.prisma.workspace.update({
        where: { id: workspace.id },
        data: {
          status: "active",
          proxyPort,
          proxyContainerId,
          networkName,
        },
      });

      return this.getWorkspaceStatus(userId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to activate workspace";
      await this.prisma.workspace.update({
        where: { id: workspace.id },
        data: { status: "error", errorMessage },
      });
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Workspace activation failed: ${errorMessage}`,
      });
    }
  }

  /**
   * Deactivate the workspace — stop proxy, clean up network.
   */
  async deactivateWorkspace(userId: string) {
    const workspace = await this.getOrCreateWorkspace(userId);

    if (workspace.status !== "active" && workspace.status !== "error") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Workspace is not active",
      });
    }

    // 1. Stop all bridges first
    for (const bridge of workspace.bridges) {
      if (bridge.containerId && bridge.status === "running") {
        try {
          await this.containerManager.stopContainer(bridge.containerId);
          await this.containerManager.removeContainer(bridge.containerId, true);
        } catch {
          // Bridge container may already be gone
        }
        await this.prisma.dataBridge.update({
          where: { id: bridge.id },
          data: { status: "stopped", containerId: null },
        });
      }
    }

    // 2. Stop and remove Nginx proxy
    if (workspace.proxyContainerId) {
      try {
        await this.containerManager.stopContainer(workspace.proxyContainerId);
        await this.containerManager.removeContainer(workspace.proxyContainerId, true);
      } catch {
        // Container may already be gone
      }
    }

    // 3. Disconnect all deployment containers from workspace network
    if (workspace.networkName) {
      const deployments = await this.prisma.deployment.findMany({
        where: {
          userId,
          status: { notIn: ["TERMINATED"] },
          containerName: { not: null },
        },
      });

      for (const dep of deployments) {
        if (!dep.containerName) continue;
        try {
          await this.networkManager.disconnectContainer(workspace.networkName, dep.containerName);
        } catch {
          // Container may not be connected
        }
      }

      // 4. Remove workspace network
      try {
        await this.networkManager.removeNetwork(workspace.networkName);
      } catch {
        // Network may already be removed
      }
    }

    // 5. Update workspace record
    await this.prisma.workspace.update({
      where: { id: workspace.id },
      data: {
        status: "inactive",
        proxyPort: null,
        proxyContainerId: null,
        errorMessage: null,
      },
    });

    return this.getWorkspaceStatus(userId);
  }

  // ==================== DEPLOYMENT CONNECTION ====================

  /**
   * Connect a deployment container to the workspace network and update Nginx config.
   * Called from DeploymentService when a container starts.
   */
  async connectDeployment(userId: string, deploymentId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { userId },
    });

    // No workspace or not active — nothing to do
    if (!workspace || workspace.status !== "active" || !workspace.networkName) {
      return;
    }

    const deployment = await this.prisma.deployment.findUnique({
      where: { id: deploymentId },
      include: {
        module: { select: { slug: true } },
        version: { select: { exposedPort: true } },
      },
    });

    if (!deployment?.containerName) return;

    try {
      // 1. Connect container to workspace network
      await this.networkManager.connectContainer(workspace.networkName, deployment.containerName);

      // 2. Auto-add module to PlatformLayout sidebar if layout exists
      await this.autoAddToSidebar(workspace.id, deployment.module.slug);

      // 3. Regenerate Nginx config with the new deployment included
      await this.reloadNginxConfig(userId, workspace);
    } catch (err) {
      log.error(` Failed to connect deployment ${deploymentId}:`, err);
    }
  }

  /**
   * Disconnect a deployment container from the workspace network and update Nginx config.
   * Called from DeploymentService when a container is terminated.
   */
  async disconnectDeployment(userId: string, deploymentId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { userId },
    });

    if (!workspace || !workspace.networkName) return;

    const deployment = await this.prisma.deployment.findUnique({
      where: { id: deploymentId },
      select: { containerName: true },
    });

    if (!deployment?.containerName) return;

    try {
      await this.networkManager.disconnectContainer(workspace.networkName, deployment.containerName);

      // Remove module from PlatformLayout sidebar
      await this.autoRemoveFromSidebar(workspace.id, deploymentId);

      // Regenerate Nginx config without this deployment
      if (workspace.status === "active") {
        await this.reloadNginxConfig(userId, workspace);
      }
    } catch {
      // Container may not be connected
    }
  }

  // ==================== DATA BRIDGES ====================

  /**
   * Create a data bridge between two deployed modules.
   */
  async createBridge(userId: string, input: CreateBridgeInput) {
    const workspace = await this.getOrCreateWorkspace(userId);

    // Verify both deployments exist and belong to user
    const [source, target] = await Promise.all([
      this.prisma.deployment.findUnique({
        where: { id: input.sourceDeploymentId },
        include: { module: { select: { name: true, slug: true } } },
      }),
      this.prisma.deployment.findUnique({
        where: { id: input.targetDeploymentId },
        include: { module: { select: { name: true, slug: true } } },
      }),
    ]);

    if (!source || source.userId !== userId) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Source deployment not found" });
    }
    if (!target || target.userId !== userId) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Target deployment not found" });
    }

    // Create bridge record
    const bridge = await this.prisma.dataBridge.create({
      data: {
        workspaceId: workspace.id,
        name: input.name,
        sourceDeploymentId: input.sourceDeploymentId,
        targetDeploymentId: input.targetDeploymentId,
        bridgeType: input.bridgeType,
        configuration: input.configuration as unknown as Prisma.InputJsonValue,
        status: "inactive",
      },
    });

    // If workspace is active, start the bridge container
    if (workspace.status === "active") {
      await this.startBridgeContainer(userId, bridge.id);
    }

    return bridge;
  }

  /**
   * Start a bridge container that syncs data between two modules.
   */
  async startBridge(userId: string, bridgeId: string) {
    const bridge = await this.getBridgeForUser(userId, bridgeId);

    if (bridge.status === "running") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Bridge is already running" });
    }

    const workspace = await this.prisma.workspace.findUnique({
      where: { userId },
    });

    if (!workspace || workspace.status !== "active") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Workspace must be active to start a bridge",
      });
    }

    await this.startBridgeContainer(userId, bridgeId);
    return this.prisma.dataBridge.findUnique({ where: { id: bridgeId } });
  }

  /**
   * Stop a running bridge.
   */
  async stopBridge(userId: string, bridgeId: string) {
    const bridge = await this.getBridgeForUser(userId, bridgeId);

    if (bridge.containerId) {
      try {
        await this.containerManager.stopContainer(bridge.containerId);
        await this.containerManager.removeContainer(bridge.containerId, true);
      } catch {
        // Container may already be gone
      }
    }

    return this.prisma.dataBridge.update({
      where: { id: bridgeId },
      data: { status: "stopped", containerId: null },
    });
  }

  /**
   * Delete a bridge (stops container if running).
   */
  async deleteBridge(userId: string, bridgeId: string) {
    const bridge = await this.getBridgeForUser(userId, bridgeId);

    // Stop container if running
    if (bridge.containerId) {
      try {
        await this.containerManager.stopContainer(bridge.containerId);
        await this.containerManager.removeContainer(bridge.containerId, true);
      } catch {
        // Container may already be gone
      }
    }

    await this.prisma.dataBridge.delete({ where: { id: bridgeId } });
    return { success: true };
  }

  /**
   * List all bridges for a user's workspace.
   */
  async listBridges(userId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { userId },
    });

    if (!workspace) return [];

    return this.prisma.dataBridge.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "desc" },
    });
  }

  // ==================== NGINX PROXY ====================

  /**
   * Generate nginx.conf content from current RUNNING deployments.
   * Each deployment gets a `location /apps/{slug}/` block that proxies to its container.
   */
  private generateNginxConfig(
    deployments: {
      containerName: string | null;
      module: { slug: string };
      version: { exposedPort: number | null };
    }[],
    layout?: PlatformLayoutConfig | null,
    bridges?: { name: string; status: string; syncCount: number; lastSyncAt: Date | null; sourceDeploymentId: string; targetDeploymentId: string }[],
  ): string {
    const activeDeployments = deployments.filter((d) => d.containerName);

    const locationBlocks = activeDeployments
      .map((d) => {
        const slug = d.module.slug;
        const port = d.version.exposedPort || 80;
        return `
        location /apps/${slug}/ {
            proxy_pass http://${d.containerName}:${port}/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header X-Forwarded-Prefix /apps/${slug};
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }`;
      })
      .join("\n");

    // Build platform JSON for /api/platform endpoint
    const platformJson = this.buildPlatformJson(activeDeployments, layout, bridges);
    const escapedPlatformJson = JSON.stringify(platformJson).replace(/'/g, "\\u0027");

    // Build dashboard shell HTML or fallback
    let indexHtml: string;
    if (layout) {
      indexHtml = generateDashboardShell(layout);
    } else {
      // Fallback: simple link list
      const moduleLinks = activeDeployments
        .map((d) => `<li><a href="/apps/${d.module.slug}/">${d.module.slug}</a></li>`)
        .join("");
      indexHtml = `<!DOCTYPE html><html><head><title>FORGE Workspace Portal</title><style>body{font-family:system-ui,sans-serif;max-width:600px;margin:60px auto;padding:0 20px}h1{color:#333}a{color:#2563eb;text-decoration:none}a:hover{text-decoration:underline}li{margin:8px 0;font-size:1.1em}</style></head><body><h1>FORGE Workspace Portal</h1><p>Connected modules:</p><ul>${moduleLinks || "<li>No modules connected</li>"}</ul></body></html>`;
    }
    const escapedHtml = indexHtml.replace(/'/g, "'\\''");

    return `worker_processes auto;
events {
    worker_connections 1024;
}
http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    sendfile on;
    keepalive_timeout 65;

    server {
        listen 80;
        server_name _;

        # Platform JSON API
        location = /api/platform {
            default_type application/json;
            add_header Cache-Control "no-cache";
            add_header Access-Control-Allow-Origin "*";
            return 200 '${escapedPlatformJson}';
        }

        # Portal index page (dashboard shell or fallback)
        location = / {
            default_type text/html;
            return 200 '${escapedHtml}';
        }
${locationBlocks}

        # Catch-all
        location / {
            return 404 '{"error":"Not found. Available paths: /apps/{module-slug}/"}';
        }
    }
}`;
  }

  private buildPlatformJson(
    deployments: { containerName: string | null; module: { slug: string }; version: { exposedPort: number | null } }[],
    layout?: PlatformLayoutConfig | null,
    bridges?: { name: string; status: string; syncCount: number; lastSyncAt: Date | null; sourceDeploymentId: string; targetDeploymentId: string }[],
  ): Record<string, unknown> {
    const sidebarMap = new Map<string, { label: string; icon: string; group: string }>();
    if (layout) {
      for (const item of layout.sidebar) {
        sidebarMap.set(item.moduleSlug, { label: item.label, icon: item.icon, group: item.group });
      }
    }

    return {
      name: layout?.theme.brandName || "FORGE Workspace",
      theme: layout?.theme || { primaryColor: "#6366f1", brandName: "FORGE Workspace" },
      modules: deployments.map((d) => {
        const info = sidebarMap.get(d.module.slug);
        return {
          slug: d.module.slug,
          label: info?.label || d.module.slug,
          icon: info?.icon || "box",
          group: info?.group || "Modules",
          status: d.containerName ? "RUNNING" : "STOPPED",
          proxyPath: `/apps/${d.module.slug}/`,
        };
      }),
      bridges: (bridges || []).map((b) => ({
        name: b.name,
        status: b.status,
        syncCount: b.syncCount,
        lastSync: b.lastSyncAt?.toISOString() || null,
      })),
      groups: layout?.groups || [{ name: "Modules", order: 1 }],
    };
  }

  /**
   * Deploy an Nginx reverse proxy container with the given config.
   */
  private async deployNginxProxy(
    userId: string,
    workspaceId: string,
    networkName: string,
    proxyPort: number,
    nginxConf: string,
  ): Promise<string> {
    // Encode nginx config as base64 to safely pass through env/cmd
    const confBase64 = Buffer.from(nginxConf).toString("base64");

    const proxyConfig: ContainerConfig = {
      name: `forge-proxy-${userId.slice(0, 12)}`,
      image: NGINX_IMAGE,
      cmd: [
        "sh",
        "-c",
        `echo "${confBase64}" | base64 -d > /etc/nginx/nginx.conf && nginx -g "daemon off;"`,
      ],
      ports: [{ container: 80, host: proxyPort }],
      network: networkName,
      restartPolicy: "unless-stopped",
      labels: {
        "forge.managed": "true",
        "forge.workspace.id": workspaceId,
        "forge.user.id": userId,
        "forge.workspace.proxy": "true",
      },
    };

    const containerId = await this.containerManager.createContainer(proxyConfig);
    await this.containerManager.startContainer(containerId);
    log.info(`Nginx proxy started on port ${proxyPort}`);
    return containerId;
  }

  /**
   * Public method to regenerate the Nginx proxy config.
   * Called by ForgeToolExecutor when layout changes.
   */
  async regenerateProxy(userId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { userId },
    });
    if (!workspace || workspace.status !== "active") return;
    await this.reloadNginxConfig(userId, workspace);
  }

  /**
   * Regenerate Nginx config and recreate the proxy container.
   * Called when deployments change while the workspace is active.
   */
  private async reloadNginxConfig(
    userId: string,
    workspace: { id: string; proxyContainerId: string | null; proxyPort: number | null; networkName: string | null },
  ) {
    if (!workspace.networkName || !workspace.proxyPort) return;

    // Get current RUNNING deployments
    const deployments = await this.prisma.deployment.findMany({
      where: {
        userId,
        status: "RUNNING",
        containerName: { not: null },
      },
      include: {
        module: { select: { slug: true } },
        version: { select: { exposedPort: true } },
      },
    });

    // Fetch layout and bridges for dashboard shell
    const platformLayout = await this.prisma.platformLayout.findUnique({
      where: { workspaceId: workspace.id },
    });
    const layoutConfig = platformLayout?.layout as PlatformLayoutConfig | null;

    const bridgeRecords = await this.prisma.dataBridge.findMany({
      where: { workspaceId: workspace.id },
      select: { name: true, status: true, syncCount: true, lastSyncAt: true, sourceDeploymentId: true, targetDeploymentId: true },
    });

    const nginxConf = this.generateNginxConfig(deployments, layoutConfig, bridgeRecords);

    // Remove old proxy container
    if (workspace.proxyContainerId) {
      try {
        await this.containerManager.stopContainer(workspace.proxyContainerId);
        await this.containerManager.removeContainer(workspace.proxyContainerId, true);
      } catch {
        // Container may already be gone
      }
    }

    // Deploy new proxy with updated config
    const newProxyId = await this.deployNginxProxy(
      userId,
      workspace.id,
      workspace.networkName,
      workspace.proxyPort,
      nginxConf,
    );

    // Update workspace record with new container ID
    await this.prisma.workspace.update({
      where: { id: workspace.id },
      data: { proxyContainerId: newProxyId },
    });
  }

  // ==================== AUTO-LAYOUT HELPERS ====================

  /**
   * Auto-add a newly connected module to the platform sidebar.
   * If no PlatformLayout exists yet, create one from all connected deployments.
   */
  private async autoAddToSidebar(workspaceId: string, moduleSlug: string) {
    try {
      const layout = await this.prisma.platformLayout.findUnique({
        where: { workspaceId },
      });

      // Get module info for heuristics
      const mod = await this.prisma.module.findUnique({
        where: { slug: moduleSlug },
        select: {
          slug: true,
          name: true,
          categories: { select: { category: { select: { name: true } } } },
          tags: { select: { tag: { select: { name: true } } } },
        },
      });
      if (!mod) return;

      const deployed: DeployedModule = {
        slug: mod.slug,
        name: mod.name,
        category: mod.categories[0]?.category.name,
        tags: mod.tags.map((t) => t.tag.name),
      };

      if (!layout) {
        // No layout yet — generate one from all connected deployments
        const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
        if (!workspace) return;

        const allDeployments = await this.prisma.deployment.findMany({
          where: { userId: workspace.userId, status: "RUNNING" },
          include: {
            module: {
              select: {
                slug: true,
                name: true,
                categories: { select: { category: { select: { name: true } } } },
                tags: { select: { tag: { select: { name: true } } } },
              },
            },
          },
        });

        const allModules: DeployedModule[] = allDeployments.map((d) => ({
          slug: d.module.slug,
          name: d.module.name,
          category: d.module.categories[0]?.category.name,
          tags: d.module.tags.map((t) => t.tag.name),
        }));
        const autoLayout = generateAutoLayout(allModules, workspace?.name || undefined);

        await this.prisma.platformLayout.create({
          data: {
            workspaceId,
            name: autoLayout.theme.brandName,
            layout: autoLayout as unknown as Prisma.InputJsonValue,
          },
        });
      } else {
        // Layout exists — add this module to sidebar
        const current = layout.layout as unknown as PlatformLayoutConfig;
        const alreadyExists = current.sidebar.some((s) => s.moduleSlug === moduleSlug);
        if (alreadyExists) return;

        const autoItem = generateAutoLayout([deployed]);
        const newItem = autoItem.sidebar[0];
        if (!newItem) return;

        newItem.order = current.sidebar.length + 1;
        current.sidebar.push(newItem);

        // Add group if new
        if (!current.groups.some((g) => g.name === newItem.group)) {
          current.groups.push({ name: newItem.group, order: current.groups.length + 1 });
        }

        await this.prisma.platformLayout.update({
          where: { workspaceId },
          data: { layout: current as unknown as Prisma.InputJsonValue },
        });
      }
    } catch (err) {
      log.warn("autoAddToSidebar failed (non-fatal)", { workspaceId, moduleSlug, error: err });
    }
  }

  /**
   * Auto-remove a disconnected module from the platform sidebar.
   */
  private async autoRemoveFromSidebar(workspaceId: string, deploymentId: string) {
    try {
      const layout = await this.prisma.platformLayout.findUnique({
        where: { workspaceId },
      });
      if (!layout) return;

      // Look up the deployment to find which module slug to remove
      const deployment = await this.prisma.deployment.findUnique({
        where: { id: deploymentId },
        select: { module: { select: { slug: true } } },
      });
      if (!deployment) return;

      const current = layout.layout as unknown as PlatformLayoutConfig;
      const slug = deployment.module.slug;

      current.sidebar = current.sidebar.filter((s) => s.moduleSlug !== slug);
      // Re-order remaining items
      current.sidebar.forEach((s, i) => { s.order = i + 1; });

      // Reset homepage if it was the removed module
      if (current.homepage === slug) {
        current.homepage = "dashboard";
      }

      // Remove empty groups
      const usedGroups = new Set(current.sidebar.map((s) => s.group));
      current.groups = current.groups.filter((g) => usedGroups.has(g.name));

      await this.prisma.platformLayout.update({
        where: { workspaceId },
        data: { layout: current as unknown as Prisma.InputJsonValue },
      });
    } catch (err) {
      log.warn("autoRemoveFromSidebar failed (non-fatal)", { workspaceId, deploymentId, error: err });
    }
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Start a bridge container.
   */
  private async startBridgeContainer(userId: string, bridgeId: string) {
    const bridge = await this.prisma.dataBridge.findUnique({
      where: { id: bridgeId },
    });
    if (!bridge) return;

    const workspace = await this.prisma.workspace.findUnique({
      where: { userId },
    });
    if (!workspace?.networkName) return;

    // Get source and target deployment info
    const [source, target] = await Promise.all([
      this.prisma.deployment.findUnique({
        where: { id: bridge.sourceDeploymentId },
        include: { module: { select: { slug: true } } },
      }),
      this.prisma.deployment.findUnique({
        where: { id: bridge.targetDeploymentId },
        include: { module: { select: { slug: true } } },
      }),
    ]);

    if (!source?.containerName || !target?.containerName) {
      await this.prisma.dataBridge.update({
        where: { id: bridgeId },
        data: {
          status: "error",
          errorMessage: "Source or target deployment container not found",
        },
      });
      return;
    }

    const config = bridge.configuration as Record<string, unknown>;
    const syncFrequency = (config.syncFrequencySeconds as number) || 30;
    const sourceEndpoint = (config.sourceEndpoint as string) || "/api/data";
    const targetEndpoint = (config.targetEndpoint as string) || "/api/data";
    const sourcePort = source.assignedPort || 80;
    const targetPort = target.assignedPort || 80;

    // Build a simple bridge script that polls source and pushes to target.
    // Containers communicate via Docker network using container names.
    const bridgeScript = `
const http = require('http');

const SOURCE_URL = 'http://${source.containerName}:${sourcePort}${sourceEndpoint}';
const TARGET_URL = 'http://${target.containerName}:${targetPort}${targetEndpoint}';
const SYNC_INTERVAL = ${syncFrequency * 1000};
const BRIDGE_ID = '${bridgeId}';

let syncCount = 0;

function fetch(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(data); }
      });
    }).on('error', reject);
  });
}

function post(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const parsed = new URL(url);
    const req = http.request({
      hostname: parsed.hostname,
      port: parsed.port || 80,
      path: parsed.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': data.length },
    }, (res) => {
      let resp = '';
      res.on('data', (chunk) => resp += chunk);
      res.on('end', () => resolve(resp));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function sync() {
  try {
    console.log('[Bridge ' + BRIDGE_ID.slice(0,8) + '] Syncing...');
    const sourceData = await fetch(SOURCE_URL);
    await post(TARGET_URL, { bridgeId: BRIDGE_ID, data: sourceData });
    syncCount++;
    console.log('[Bridge ' + BRIDGE_ID.slice(0,8) + '] Sync #' + syncCount + ' complete');
  } catch (err) {
    console.error('[Bridge ' + BRIDGE_ID.slice(0,8) + '] Sync error:', err.message);
  }
}

// Health check server
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'running', syncCount, bridgeId: BRIDGE_ID }));
}).listen(3099);

console.log('[Bridge ' + BRIDGE_ID.slice(0,8) + '] Started. Syncing every ' + (SYNC_INTERVAL/1000) + 's');
setInterval(sync, SYNC_INTERVAL);
sync();
`;

    try {
      // Pull bridge image if needed
      try {
        await this.containerManager.pullImage(BRIDGE_IMAGE);
      } catch {
        // Image may already be available
      }

      const containerConfig: ContainerConfig = {
        name: `forge-bridge-${bridgeId.slice(0, 8)}`,
        image: BRIDGE_IMAGE,
        cmd: ["node", "-e", bridgeScript],
        network: workspace.networkName,
        resources: {
          cpuLimit: 0.1,
          memoryLimitMb: 64,
        },
        restartPolicy: "unless-stopped",
        labels: {
          "forge.managed": "true",
          "forge.bridge": "true",
          "forge.bridge.id": bridgeId,
          "forge.workspace.id": workspace.id,
          "forge.user.id": userId,
        },
      };

      const containerId = await this.containerManager.createContainer(containerConfig);
      await this.containerManager.startContainer(containerId);

      await this.prisma.dataBridge.update({
        where: { id: bridgeId },
        data: {
          status: "running",
          containerId,
          errorMessage: null,
        },
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to start bridge container";
      await this.prisma.dataBridge.update({
        where: { id: bridgeId },
        data: { status: "error", errorMessage },
      });
    }
  }

  /**
   * Find an available port for the proxy.
   */
  private async findAvailableProxyPort(): Promise<number> {
    const usedPorts = await this.prisma.workspace.findMany({
      where: {
        proxyPort: { not: null },
        status: { in: ["active", "starting"] },
      },
      select: { proxyPort: true },
    });

    const usedSet = new Set(usedPorts.map((w) => w.proxyPort).filter((p): p is number => p !== null));
    return findAvailablePortInRange("proxy", usedSet);
  }

  /**
   * Get a bridge and verify it belongs to the user.
   */
  private async getBridgeForUser(userId: string, bridgeId: string) {
    const bridge = await this.prisma.dataBridge.findUnique({
      where: { id: bridgeId },
      include: { workspace: { select: { userId: true } } },
    });

    if (!bridge || bridge.workspace.userId !== userId) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Bridge not found" });
    }

    return bridge;
  }
}
