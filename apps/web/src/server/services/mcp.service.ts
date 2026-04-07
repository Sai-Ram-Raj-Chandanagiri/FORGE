import { TRPCError } from "@trpc/server";
import { type PrismaClient, Prisma } from "@forge/db";
import { logger } from "@/lib/logger";
import * as crypto from "crypto";

const log = logger.forService("McpService");

// ==================== TYPES ====================

export interface AddConnectionInput {
  name: string;
  serverUrl: string;
  transport: "SSE" | "STDIO" | "STREAMABLE_HTTP";
  authToken?: string;
}

export interface McpTool {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
}

export interface McpToolExecutionResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

// ==================== ENCRYPTION HELPERS ====================

function getEncryptionKey(): Buffer {
  const key = process.env.MCP_ENCRYPTION_KEY;
  if (!key) {
    // Fall back to a derived key from NEXTAUTH_SECRET for dev environments
    const secret = process.env.NEXTAUTH_SECRET || "dev-fallback-key-not-for-production";
    return crypto.createHash("sha256").update(secret).digest();
  }
  return Buffer.from(key, "hex");
}

function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

function decrypt(encryptedText: string): string {
  const key = getEncryptionKey();
  const parts = encryptedText.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted text format");
  }
  const iv = Buffer.from(parts[0]!, "hex");
  const authTag = Buffer.from(parts[1]!, "hex");
  const encrypted = parts[2]!;
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// ==================== SERVICE ====================

const ALLOWED_SCHEMES = ["http://", "https://", "stdio://"];

export class McpService {
  constructor(private prisma: PrismaClient) {}

  async addConnection(userId: string, data: AddConnectionInput) {
    // Validate URL scheme
    const hasAllowedScheme = ALLOWED_SCHEMES.some((s) => data.serverUrl.startsWith(s));
    if (!hasAllowedScheme) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Invalid server URL scheme. Allowed: ${ALLOWED_SCHEMES.join(", ")}`,
      });
    }

    // Max 10 connections per user
    const count = await this.prisma.mcpConnection.count({
      where: { userId },
    });

    if (count >= 10) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Maximum 10 MCP connections per user",
      });
    }

    // Encrypt auth token if provided
    let authConfig: Prisma.InputJsonValue | null = null;
    if (data.authToken) {
      const encryptedToken = encrypt(data.authToken);
      authConfig = { encryptedToken } as unknown as Prisma.InputJsonValue;
    }

    const connection = await this.prisma.mcpConnection.create({
      data: {
        userId,
        name: data.name,
        serverUrl: data.serverUrl,
        transport: data.transport,
        authConfig: authConfig ?? Prisma.JsonNull,
        status: "DISCONNECTED",
        isActive: true,
      },
    });

    log.info("MCP connection added", { userId, connectionId: connection.id, name: data.name });

    // Auto-test the connection
    const testResult = await this.testConnection(connection.id, userId).catch((err) => {
      log.warn("Auto-test failed for new connection", { connectionId: connection.id, error: String(err) });
      return null;
    });

    return {
      connection,
      testResult,
    };
  }

  async testConnection(connectionId: string, userId: string) {
    const connection = await this.prisma.mcpConnection.findFirst({
      where: { id: connectionId, userId },
    });

    if (!connection) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "MCP connection not found",
      });
    }

    try {
      // Simulate MCP connection test
      // In production, this would use ForgeMcpClient to actually connect
      const tools = await this.discoverTools(connection.serverUrl, connection.authConfig);

      await this.prisma.mcpConnection.update({
        where: { id: connectionId },
        data: {
          status: "CONNECTED",
          tools: tools as unknown as Prisma.InputJsonValue,
          errorMessage: null,
          lastTestedAt: new Date(),
        },
      });

      log.info("MCP connection tested successfully", { connectionId, toolCount: tools.length });
      return { success: true, tools };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Connection failed";

      await this.prisma.mcpConnection.update({
        where: { id: connectionId },
        data: {
          status: "ERROR",
          errorMessage,
          lastTestedAt: new Date(),
        },
      });

      log.warn("MCP connection test failed", { connectionId, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }

  async refreshTools(connectionId: string, userId: string) {
    return this.testConnection(connectionId, userId);
  }

  async executeExternalTool(
    connectionId: string,
    userId: string,
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<McpToolExecutionResult> {
    const connection = await this.prisma.mcpConnection.findFirst({
      where: { id: connectionId, userId, isActive: true },
    });

    if (!connection) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "MCP connection not found or inactive",
      });
    }

    if (connection.status !== "CONNECTED") {
      return { success: false, error: "MCP server is not connected. Test the connection first." };
    }

    // Rate limit: 60 calls/min per user
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const recentCalls = await this.prisma.agentAuditEntry.count({
      where: {
        userId,
        action: { startsWith: "mcp_tool:" },
        createdAt: { gte: oneMinuteAgo },
      },
    });

    if (recentCalls >= 60) {
      return { success: false, error: "Rate limit: max 60 MCP tool calls per minute" };
    }

    try {
      // In production, this would use ForgeMcpClient to actually call the tool
      // For now, simulate with an HTTP call to the MCP server
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${connection.serverUrl}/tools/${toolName}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(connection.authConfig
            ? { Authorization: `Bearer ${this.getAuthToken(connection.authConfig)}` }
            : {}),
        },
        body: JSON.stringify(args),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return {
          success: false,
          error: `MCP server returned ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();
      log.info("MCP tool executed", { connectionId, toolName, userId });
      return { success: true, data };
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return { success: false, error: "MCP tool execution timed out after 30 seconds" };
      }
      const errorMessage = err instanceof Error ? err.message : "MCP tool execution failed";
      log.error("MCP tool execution failed", { connectionId, toolName, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }

  async getAllUserTools(userId: string) {
    const connections = await this.prisma.mcpConnection.findMany({
      where: { userId, isActive: true, status: "CONNECTED" },
      select: {
        id: true,
        name: true,
        tools: true,
      },
    });

    const allTools: (McpTool & { connectionId: string; connectionName: string })[] = [];

    for (const conn of connections) {
      const tools = (conn.tools ?? []) as unknown as McpTool[];
      for (const tool of tools) {
        allTools.push({
          ...tool,
          name: `${conn.name}_${tool.name}`,
          connectionId: conn.id,
          connectionName: conn.name,
        });
      }
    }

    return allTools;
  }

  async listConnections(userId: string) {
    const connections = await this.prisma.mcpConnection.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return connections.map((c) => ({
      ...c,
      authConfig: c.authConfig ? { hasToken: true } : null,
    }));
  }

  async removeConnection(connectionId: string, userId: string) {
    const connection = await this.prisma.mcpConnection.findFirst({
      where: { id: connectionId, userId },
    });

    if (!connection) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "MCP connection not found",
      });
    }

    await this.prisma.mcpConnection.delete({
      where: { id: connectionId },
    });

    log.info("MCP connection removed", { userId, connectionId });
    return { success: true };
  }

  async toggleConnection(connectionId: string, userId: string, isActive: boolean) {
    const connection = await this.prisma.mcpConnection.findFirst({
      where: { id: connectionId, userId },
    });

    if (!connection) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "MCP connection not found",
      });
    }

    await this.prisma.mcpConnection.update({
      where: { id: connectionId },
      data: { isActive },
    });

    log.info("MCP connection toggled", { connectionId, isActive });
    return { success: true };
  }

  // ==================== PRIVATE HELPERS ====================

  private async discoverTools(serverUrl: string, authConfig: unknown): Promise<McpTool[]> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (authConfig) {
        const token = this.getAuthToken(authConfig);
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
      }

      const response = await fetch(`${serverUrl}/tools`, {
        method: "GET",
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json() as { tools?: McpTool[] };
      return data.tools ?? [];
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error("Connection timed out after 10 seconds");
      }
      throw err;
    }
  }

  private getAuthToken(authConfig: unknown): string | null {
    if (!authConfig || typeof authConfig !== "object") return null;
    const config = authConfig as Record<string, unknown>;
    const encryptedToken = config.encryptedToken as string | undefined;
    if (!encryptedToken) return null;
    try {
      return decrypt(encryptedToken);
    } catch {
      log.error("Failed to decrypt MCP auth token");
      return null;
    }
  }
}
