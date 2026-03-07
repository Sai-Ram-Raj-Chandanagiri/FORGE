/**
 * Project Export Service
 * Generates a portable project from the user's composed platform.
 * Outputs: docker-compose.yml, nginx.conf, dashboard HTML, env files, bridge scripts, README.
 */

import { type PrismaClient } from "@forge/db";
import { generateDashboardShell, type PlatformLayoutConfig } from "./workspace-dashboard";

export interface ExportFile {
  path: string;
  content: string;
}

export interface ExportedProject {
  name: string;
  files: ExportFile[];
}

interface DeploymentInfo {
  id: string;
  name: string;
  containerName: string | null;
  assignedPort: number | null;
  module: {
    slug: string;
    name: string;
    repositoryUrl: string | null;
    documentationUrl: string | null;
  };
  version: {
    version: string;
    dockerImage: string;
    sourceRepoUrl: string | null;
    sourceBranch: string | null;
    builtImageTag: string | null;
    exposedPort: number;
    healthCheckPath: string;
    requiredEnvVars: unknown;
    configSchema: unknown;
  };
  configuration: Record<string, unknown>;
}

interface BridgeInfo {
  id: string;
  name: string;
  bridgeType: string;
  config: Record<string, unknown>;
  sourceDeployment: { name: string; module: { slug: string } };
  targetDeployment: { name: string; module: { slug: string } };
}

export class ProjectExportService {
  constructor(private prisma: PrismaClient) {}

  async exportProject(userId: string): Promise<ExportedProject> {
    // Gather all data
    const workspace = await this.prisma.workspace.findUnique({
      where: { userId },
      include: {
        layout: true,
        bridges: true,
      },
    });

    if (!workspace) throw new Error("No workspace found");

    const deployments = await this.prisma.deployment.findMany({
      where: { userId, status: "RUNNING" },
      include: {
        module: {
          select: { slug: true, name: true, repositoryUrl: true, documentationUrl: true },
        },
        version: {
          select: {
            version: true,
            dockerImage: true,
            sourceRepoUrl: true,
            sourceBranch: true,
            builtImageTag: true,
            exposedPort: true,
            healthCheckPath: true,
            requiredEnvVars: true,
            configSchema: true,
          },
        },
      },
    });

    const depInfos: DeploymentInfo[] = deployments.map((d) => ({
      id: d.id,
      name: d.name,
      containerName: d.containerName,
      assignedPort: d.assignedPort,
      module: d.module,
      version: d.version,
      configuration: (d.configuration as Record<string, unknown>) || {},
    }));

    // Build a deployment lookup by ID for bridge resolution
    const depById = new Map(deployments.map((d) => [d.id, d]));

    const bridges: BridgeInfo[] = (workspace.bridges || []).map((b) => {
      const src = depById.get(b.sourceDeploymentId);
      const tgt = depById.get(b.targetDeploymentId);
      return {
        id: b.id,
        name: b.name,
        bridgeType: b.bridgeType,
        config: (b.configuration as Record<string, unknown>) || {},
        sourceDeployment: { name: src?.name ?? "unknown", module: { slug: src?.module.slug ?? "unknown" } },
        targetDeployment: { name: tgt?.name ?? "unknown", module: { slug: tgt?.module.slug ?? "unknown" } },
      };
    });

    const layout = workspace.layout
      ? (workspace.layout.layout as unknown as PlatformLayoutConfig)
      : null;

    const platformName = layout?.theme.brandName || workspace.name || "my-platform";
    const projectSlug = platformName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    const files: ExportFile[] = [
      { path: "docker-compose.yml", content: this.generateDockerCompose(depInfos, bridges, workspace.proxyPort) },
      { path: ".env", content: this.generateEnvFile(depInfos) },
      { path: ".env.example", content: this.generateEnvExample(depInfos) },
      { path: "nginx/nginx.conf", content: this.generateNginxConf(depInfos) },
      { path: "modules/README.md", content: this.generateModuleReadme(depInfos) },
      { path: "scripts/start.sh", content: this.generateStartScript() },
      { path: "scripts/stop.sh", content: this.generateStopScript() },
      { path: "scripts/status.sh", content: this.generateStatusScript() },
      { path: "Makefile", content: this.generateMakefile() },
      { path: "README.md", content: this.generateReadme(platformName, depInfos, bridges) },
    ];

    // Dashboard files (if layout exists)
    if (layout) {
      files.push({ path: "dashboard/index.html", content: generateDashboardShell(layout) });
      files.push({ path: "dashboard/platform.json", content: this.generatePlatformJson(layout, depInfos, bridges) });
    }

    // Bridge files
    files.push(...this.generateBridgeFiles(bridges));

    return { name: projectSlug, files };
  }

  /**
   * Get module source information for the user's workspace.
   */
  async getModuleSources(userId: string) {
    const deployments = await this.prisma.deployment.findMany({
      where: { userId, status: "RUNNING" },
      include: {
        module: { select: { slug: true, name: true, repositoryUrl: true, documentationUrl: true } },
        version: {
          select: {
            version: true,
            dockerImage: true,
            sourceRepoUrl: true,
            sourceBranch: true,
            dockerfilePath: true,
            builtImageTag: true,
          },
        },
      },
    });

    return deployments.map((d) => ({
      moduleSlug: d.module.slug,
      moduleName: d.module.name,
      version: d.version.version,
      dockerImage: d.version.builtImageTag || d.version.dockerImage,
      sourceRepoUrl: d.version.sourceRepoUrl || d.module.repositoryUrl || null,
      sourceBranch: d.version.sourceBranch,
      dockerfilePath: d.version.dockerfilePath,
      documentationUrl: d.module.documentationUrl,
      hasSource: !!(d.version.sourceRepoUrl || d.module.repositoryUrl),
    }));
  }

  // ===================== GENERATORS =====================

  private generateDockerCompose(
    deployments: DeploymentInfo[],
    bridges: BridgeInfo[],
    proxyPort: number | null,
  ): string {
    const lines: string[] = [
      'version: "3.8"',
      "",
      "services:",
    ];

    // Module services
    for (const dep of deployments) {
      const slug = dep.module.slug;
      const image = dep.version.builtImageTag || dep.version.dockerImage;
      const containerName = `forge-${slug}`;
      const port = dep.version.exposedPort;

      lines.push(`  ${slug}:`);
      lines.push(`    image: ${image}`);
      lines.push(`    container_name: ${containerName}`);
      if (dep.assignedPort) {
        lines.push(`    ports:`);
        lines.push(`      - "\${${this.envKey(slug)}_PORT:-${dep.assignedPort}}:${port}"`);
      }
      lines.push(`    environment:`);

      // Extract env vars from configuration
      const envVars = this.extractEnvVars(dep);
      for (const [key, val] of Object.entries(envVars)) {
        lines.push(`      - ${key}=\${${key}}`);
      }

      lines.push(`    networks:`);
      lines.push(`      - platform-network`);
      lines.push(`    restart: unless-stopped`);
      lines.push(`    healthcheck:`);
      lines.push(`      test: ["CMD", "curl", "-f", "http://localhost:${port}${dep.version.healthCheckPath}"]`);
      lines.push(`      interval: 30s`);
      lines.push(`      timeout: 5s`);
      lines.push(`      retries: 3`);
      lines.push("");
    }

    // Nginx proxy service
    const dependsOn = deployments.map((d) => `      - ${d.module.slug}`);
    lines.push(`  nginx-proxy:`);
    lines.push(`    image: nginx:alpine`);
    lines.push(`    container_name: platform-proxy`);
    lines.push(`    ports:`);
    lines.push(`      - "\${PROXY_PORT:-${proxyPort || 4200}}:80"`);
    lines.push(`    volumes:`);
    lines.push(`      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro`);
    lines.push(`      - ./dashboard:/usr/share/nginx/html:ro`);
    lines.push(`    networks:`);
    lines.push(`      - platform-network`);
    if (dependsOn.length > 0) {
      lines.push(`    depends_on:`);
      lines.push(...dependsOn);
    }
    lines.push(`    restart: unless-stopped`);
    lines.push("");

    // Bridge services
    for (const bridge of bridges) {
      const bridgeSlug = bridge.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      lines.push(`  bridge-${bridgeSlug}:`);
      lines.push(`    build: ./bridges`);
      lines.push(`    container_name: bridge-${bridgeSlug}`);
      lines.push(`    environment:`);
      lines.push(`      - BRIDGE_NAME=${bridge.name}`);
      lines.push(`      - SOURCE_URL=http://${bridge.sourceDeployment.module.slug}:80/api`);
      lines.push(`      - TARGET_URL=http://${bridge.targetDeployment.module.slug}:80/api`);
      lines.push(`      - SYNC_INTERVAL=\${BRIDGE_SYNC_INTERVAL:-30}`);
      lines.push(`    networks:`);
      lines.push(`      - platform-network`);
      lines.push(`    depends_on:`);
      lines.push(`      - ${bridge.sourceDeployment.module.slug}`);
      lines.push(`      - ${bridge.targetDeployment.module.slug}`);
      lines.push(`    restart: unless-stopped`);
      lines.push("");
    }

    // Network
    lines.push("networks:");
    lines.push("  platform-network:");
    lines.push("    driver: bridge");

    return lines.join("\n") + "\n";
  }

  private generateEnvFile(deployments: DeploymentInfo[]): string {
    const lines: string[] = ["# Auto-generated environment variables", "# Edit values as needed for your deployment", ""];

    for (const dep of deployments) {
      lines.push(`# ${dep.module.name}`);
      const envVars = this.extractEnvVars(dep);
      for (const [key, val] of Object.entries(envVars)) {
        lines.push(`${key}=${val}`);
      }
      if (dep.assignedPort) {
        lines.push(`${this.envKey(dep.module.slug)}_PORT=${dep.assignedPort}`);
      }
      lines.push("");
    }

    lines.push("# Proxy");
    lines.push("PROXY_PORT=4200");
    lines.push("");
    lines.push("# Bridges");
    lines.push("BRIDGE_SYNC_INTERVAL=30");

    return lines.join("\n") + "\n";
  }

  private generateEnvExample(deployments: DeploymentInfo[]): string {
    const lines: string[] = ["# Environment variables template", "# Copy to .env and fill in values", ""];

    for (const dep of deployments) {
      lines.push(`# ${dep.module.name}`);
      const envVars = this.extractEnvVars(dep);
      for (const key of Object.keys(envVars)) {
        lines.push(`${key}=`);
      }
      if (dep.assignedPort) {
        lines.push(`${this.envKey(dep.module.slug)}_PORT=`);
      }
      lines.push("");
    }

    lines.push("PROXY_PORT=4200");
    lines.push("BRIDGE_SYNC_INTERVAL=30");

    return lines.join("\n") + "\n";
  }

  private generateNginxConf(deployments: DeploymentInfo[]): string {
    const lines: string[] = [
      "events { worker_connections 1024; }",
      "",
      "http {",
      "  include /etc/nginx/mime.types;",
      "  default_type application/octet-stream;",
      "",
    ];

    // Upstream blocks
    for (const dep of deployments) {
      const slug = dep.module.slug;
      lines.push(`  upstream ${slug} {`);
      lines.push(`    server ${slug}:${dep.version.exposedPort};`);
      lines.push(`  }`);
      lines.push("");
    }

    lines.push("  server {");
    lines.push("    listen 80;");
    lines.push("");

    // Dashboard
    lines.push("    location / {");
    lines.push("      root /usr/share/nginx/html;");
    lines.push("      index index.html;");
    lines.push("      try_files $uri $uri/ /index.html;");
    lines.push("    }");
    lines.push("");

    // Module routes
    for (const dep of deployments) {
      const slug = dep.module.slug;
      lines.push(`    location /apps/${slug}/ {`);
      lines.push(`      proxy_pass http://${slug}/;`);
      lines.push("      proxy_set_header Host $host;");
      lines.push("      proxy_set_header X-Real-IP $remote_addr;");
      lines.push("      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;");
      lines.push("      proxy_set_header X-Forwarded-Proto $scheme;");
      lines.push("    }");
      lines.push("");
    }

    lines.push("  }");
    lines.push("}");

    return lines.join("\n") + "\n";
  }

  private generatePlatformJson(
    layout: PlatformLayoutConfig,
    deployments: DeploymentInfo[],
    bridges: BridgeInfo[],
  ): string {
    const json = {
      theme: layout.theme,
      homepage: layout.homepage,
      sidebar: layout.sidebar,
      groups: layout.groups,
      modules: deployments.map((d) => ({
        slug: d.module.slug,
        name: d.module.name,
        path: `/apps/${d.module.slug}/`,
        status: "running",
      })),
      bridges: bridges.map((b) => ({
        name: b.name,
        source: b.sourceDeployment.module.slug,
        target: b.targetDeployment.module.slug,
        type: b.bridgeType,
      })),
    };

    return JSON.stringify(json, null, 2) + "\n";
  }

  private generateModuleReadme(deployments: DeploymentInfo[]): string {
    const lines: string[] = [
      "# Modules",
      "",
      "This platform is composed of the following modules:",
      "",
    ];

    for (const dep of deployments) {
      const v = dep.version;
      const m = dep.module;

      lines.push(`## ${m.name}`);
      lines.push("");
      lines.push(`- **Version**: ${v.version}`);
      lines.push(`- **Docker Image**: \`${v.builtImageTag || v.dockerImage}\``);
      lines.push(`- **Exposed Port**: ${v.exposedPort}`);
      lines.push(`- **Health Check**: \`${v.healthCheckPath}\``);

      if (v.sourceRepoUrl) {
        lines.push(`- **Source Repository**: ${v.sourceRepoUrl}`);
        if (v.sourceBranch) lines.push(`  - Branch: \`${v.sourceBranch}\``);
      } else if (m.repositoryUrl) {
        lines.push(`- **Repository**: ${m.repositoryUrl}`);
      } else {
        lines.push(`- **Source**: Not available (pre-built image)`);
      }

      if (m.documentationUrl) {
        lines.push(`- **Documentation**: ${m.documentationUrl}`);
      }

      lines.push("");
    }

    return lines.join("\n");
  }

  private generateStartScript(): string {
    return [
      "#!/bin/bash",
      "set -e",
      'echo "Starting platform..."',
      "docker compose up -d",
      'echo "Platform started! Access it at http://localhost:${PROXY_PORT:-4200}"',
    ].join("\n") + "\n";
  }

  private generateStopScript(): string {
    return [
      "#!/bin/bash",
      "set -e",
      'echo "Stopping platform..."',
      "docker compose down",
      'echo "Platform stopped."',
    ].join("\n") + "\n";
  }

  private generateStatusScript(): string {
    return [
      "#!/bin/bash",
      'echo "=== Platform Status ==="',
      "docker compose ps",
      'echo ""',
      'echo "=== Health Checks ==="',
      "docker compose ps --format json | while read -r line; do",
      '  name=$(echo "$line" | grep -o \'"Name":"[^"]*"\' | cut -d\'"\' -f4)',
      '  status=$(echo "$line" | grep -o \'"Health":"[^"]*"\' | cut -d\'"\' -f4)',
      '  echo "  $name: $status"',
      "done",
    ].join("\n") + "\n";
  }

  private generateMakefile(): string {
    return [
      ".PHONY: start stop status logs",
      "",
      "start:",
      "\tdocker compose up -d",
      "",
      "stop:",
      "\tdocker compose down",
      "",
      "status:",
      "\tdocker compose ps",
      "",
      "logs:",
      "\tdocker compose logs -f",
      "",
      "restart:",
      "\tdocker compose restart",
    ].join("\n") + "\n";
  }

  private generateReadme(
    platformName: string,
    deployments: DeploymentInfo[],
    bridges: BridgeInfo[],
  ): string {
    const lines: string[] = [
      `# ${platformName}`,
      "",
      `A composed platform generated by FORGE, containing ${deployments.length} module(s)${bridges.length > 0 ? ` and ${bridges.length} data bridge(s)` : ""}.`,
      "",
      "## Quick Start",
      "",
      "```bash",
      "# Copy and configure environment variables",
      "cp .env.example .env",
      "# Edit .env with your values",
      "",
      "# Start the platform",
      "make start",
      "# or: docker compose up -d",
      "",
      "# Access the platform",
      "open http://localhost:4200",
      "```",
      "",
      "## Architecture",
      "",
      "```",
      "+------------------+",
      "|   Nginx Proxy    | :4200",
      "+------------------+",
      "         |",
    ];

    for (const dep of deployments) {
      lines.push(`    +--- ${dep.module.name} (:${dep.version.exposedPort})`);
    }

    lines.push("```");
    lines.push("");

    // Modules table
    lines.push("## Modules");
    lines.push("");
    lines.push("| Module | Version | Port | Health Check |");
    lines.push("|--------|---------|------|--------------|");
    for (const dep of deployments) {
      lines.push(`| ${dep.module.name} | ${dep.version.version} | ${dep.version.exposedPort} | \`${dep.version.healthCheckPath}\` |`);
    }
    lines.push("");

    // Bridges
    if (bridges.length > 0) {
      lines.push("## Data Bridges");
      lines.push("");
      for (const b of bridges) {
        lines.push(`- **${b.name}**: ${b.sourceDeployment.module.slug} -> ${b.targetDeployment.module.slug} (${b.bridgeType})`);
      }
      lines.push("");
    }

    // Project structure
    lines.push("## Project Structure");
    lines.push("");
    lines.push("```");
    lines.push("├── docker-compose.yml     # All services");
    lines.push("├── .env                   # Environment variables");
    lines.push("├── nginx/nginx.conf       # Reverse proxy config");
    lines.push("├── dashboard/             # Platform dashboard UI");
    lines.push("├── bridges/               # Data sync scripts");
    lines.push("├── modules/README.md      # Module source info");
    lines.push("├── scripts/               # Start/stop/status scripts");
    lines.push("├── Makefile               # make start|stop|status|logs");
    lines.push("└── README.md              # This file");
    lines.push("```");
    lines.push("");

    lines.push("## Customization");
    lines.push("");
    lines.push("- **Dashboard**: Edit `dashboard/index.html` to customize the UI");
    lines.push("- **Nginx**: Modify `nginx/nginx.conf` to add routes or SSL");
    lines.push("- **Environment**: Update `.env` to change ports or config");
    lines.push("- **Bridges**: Edit bridge scripts in `bridges/` to modify data sync logic");

    return lines.join("\n") + "\n";
  }

  private generateBridgeFiles(bridges: BridgeInfo[]): ExportFile[] {
    const files: ExportFile[] = [];

    if (bridges.length === 0) return files;

    // Dockerfile for bridge containers
    files.push({
      path: "bridges/Dockerfile",
      content: [
        "FROM node:20-alpine",
        "WORKDIR /app",
        "COPY *.js ./",
        'CMD ["node", "bridge-runner.js"]',
      ].join("\n") + "\n",
    });

    // Bridge runner
    files.push({
      path: "bridges/bridge-runner.js",
      content: [
        "// Auto-generated bridge runner",
        "const http = require('http');",
        "",
        "const SOURCE_URL = process.env.SOURCE_URL;",
        "const TARGET_URL = process.env.TARGET_URL;",
        "const SYNC_INTERVAL = parseInt(process.env.SYNC_INTERVAL || '30', 10) * 1000;",
        "const BRIDGE_NAME = process.env.BRIDGE_NAME || 'bridge';",
        "",
        "function fetch(url) {",
        "  return new Promise((resolve, reject) => {",
        "    http.get(url, (res) => {",
        "      let data = '';",
        "      res.on('data', (chunk) => data += chunk);",
        "      res.on('end', () => {",
        "        try { resolve(JSON.parse(data)); }",
        "        catch { resolve(data); }",
        "      });",
        "    }).on('error', reject);",
        "  });",
        "}",
        "",
        "function post(url, body) {",
        "  return new Promise((resolve, reject) => {",
        "    const data = JSON.stringify(body);",
        "    const urlObj = new URL(url);",
        "    const req = http.request({",
        "      hostname: urlObj.hostname,",
        "      port: urlObj.port,",
        "      path: urlObj.pathname,",
        "      method: 'POST',",
        "      headers: { 'Content-Type': 'application/json', 'Content-Length': data.length },",
        "    }, (res) => {",
        "      let body = '';",
        "      res.on('data', (chunk) => body += chunk);",
        "      res.on('end', () => resolve(body));",
        "    });",
        "    req.on('error', reject);",
        "    req.write(data);",
        "    req.end();",
        "  });",
        "}",
        "",
        "async function sync() {",
        "  try {",
        "    console.log(`[${BRIDGE_NAME}] Syncing ${SOURCE_URL} -> ${TARGET_URL}`);",
        "    const data = await fetch(SOURCE_URL);",
        "    await post(TARGET_URL, { source: BRIDGE_NAME, data });",
        "    console.log(`[${BRIDGE_NAME}] Sync complete`);",
        "  } catch (err) {",
        "    console.error(`[${BRIDGE_NAME}] Sync failed:`, err.message);",
        "  }",
        "}",
        "",
        "console.log(`[${BRIDGE_NAME}] Starting bridge (interval: ${SYNC_INTERVAL / 1000}s)`);",
        "sync();",
        "setInterval(sync, SYNC_INTERVAL);",
      ].join("\n") + "\n",
    });

    return files;
  }

  // ===================== HELPERS =====================

  private extractEnvVars(dep: DeploymentInfo): Record<string, string> {
    const vars: Record<string, string> = {};
    const config = dep.configuration;
    const prefix = this.envKey(dep.module.slug);

    // Extract from configuration JSON
    if (config && typeof config === "object") {
      const env = (config as Record<string, unknown>).environmentVariables;
      if (env && typeof env === "object") {
        for (const [key, val] of Object.entries(env as Record<string, string>)) {
          vars[key] = String(val);
        }
      }
    }

    // If no env vars found, add defaults from requiredEnvVars
    if (Object.keys(vars).length === 0 && dep.version.requiredEnvVars) {
      const required = dep.version.requiredEnvVars;
      if (Array.isArray(required)) {
        for (const key of required) {
          if (typeof key === "string") vars[key] = "";
        }
      }
    }

    return vars;
  }

  private envKey(slug: string): string {
    return slug.toUpperCase().replace(/-/g, "_");
  }
}
