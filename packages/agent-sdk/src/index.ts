// LLM Types (consumed by apps/web)
export type { LLMMessage } from "./llm/provider";

// Agent Types (consumed by apps/web)
export type { AgentType, BuiltInAgentType, AgentContext, ToolExecutor, ChatResult, AgentConfig } from "./agents/base-agent";

// Agent Classes
export { ComposerAgent } from "./agents/composer-agent";

// Orchestrator (consumed by apps/web)
export { AgentOrchestrator, createOrchestrator } from "./orchestrator";

// Tool definitions (consumed by apps/web for tool result rendering)
export { LAYOUT_TOOLS } from "./tools/layout-tools";
export { EXPORT_TOOLS } from "./tools/export-tools";
export { BLUEPRINT_TOOLS } from "./tools/blueprint-tools";
export { ACTION_QUEUE_TOOLS } from "./tools/action-queue-tools";
export { CROSS_MODULE_TOOLS } from "./tools/cross-module-tools";

// MCP Client
export { ForgeMcpClient } from "./mcp/mcp-client";
export type { McpToolDefinition, McpToolResult, ForgeMcpClientConfig } from "./mcp/mcp-client";
