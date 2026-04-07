/**
 * ForgeMcpClient — Lightweight MCP (Model Context Protocol) client
 * for connecting to external MCP servers and executing tools.
 *
 * Supports transports: SSE, stdio, streamable-http
 */

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
}

export interface McpToolResult {
  content: unknown;
  isError?: boolean;
}

export interface ForgeMcpClientConfig {
  serverUrl: string;
  transport: "SSE" | "STDIO" | "STREAMABLE_HTTP";
  authToken?: string;
  timeoutMs?: number;
}

export class ForgeMcpClient {
  private config: ForgeMcpClientConfig;
  private connected = false;
  private cachedTools: McpToolDefinition[] = [];

  constructor(config: ForgeMcpClientConfig) {
    this.config = {
      ...config,
      timeoutMs: config.timeoutMs ?? 10000,
    };
  }

  get isConnected(): boolean {
    return this.connected;
  }

  async connect(): Promise<void> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(`${this.config.serverUrl}/health`, {
        method: "GET",
        headers: this.getHeaders(),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`MCP server returned ${response.status}`);
      }

      this.connected = true;
    } catch (err) {
      this.connected = false;
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error(`Connection timed out after ${this.config.timeoutMs}ms`);
      }
      throw err;
    }
  }

  async listTools(): Promise<McpToolDefinition[]> {
    if (!this.connected) {
      await this.connect();
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(`${this.config.serverUrl}/tools`, {
        method: "GET",
        headers: this.getHeaders(),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Failed to list tools: ${response.status}`);
      }

      const data = (await response.json()) as { tools?: McpToolDefinition[] };
      this.cachedTools = data.tools ?? [];
      return this.cachedTools;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error("List tools timed out");
      }
      throw err;
    }
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<McpToolResult> {
    if (!this.connected) {
      await this.connect();
    }

    const callTimeout = Math.max(this.config.timeoutMs ?? 10000, 30000);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), callTimeout);

    try {
      const response = await fetch(`${this.config.serverUrl}/tools/${name}`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(args),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return {
          content: `MCP tool error: ${response.status} ${response.statusText}`,
          isError: true,
        };
      }

      const data = await response.json();
      return { content: data };
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return { content: "MCP tool call timed out", isError: true };
      }
      return {
        content: err instanceof Error ? err.message : "MCP tool call failed",
        isError: true,
      };
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.cachedTools = [];
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.config.authToken) {
      headers["Authorization"] = `Bearer ${this.config.authToken}`;
    }
    return headers;
  }
}
