// LLM Providers
export type {
  LLMProvider,
  LLMProviderConfig,
  LLMMessage,
  LLMResponse,
  LLMTool,
  LLMToolCall,
} from "./llm/provider";
export { GeminiProvider, createGeminiProvider } from "./llm/gemini-provider";
export { ClaudeProvider, createClaudeProvider } from "./llm/claude-provider";

// Agents
export type { AgentType, AgentContext, ToolExecutor, AgentConfig } from "./agents/base-agent";
export { BaseAgent } from "./agents/base-agent";
export { SetupAgent, type ModuleRecommendation } from "./agents/setup-agent";
export {
  WorkflowAgent,
  type WorkflowDefinition,
  type WorkflowTrigger,
  type WorkflowCondition,
  type WorkflowAction,
} from "./agents/workflow-agent";
export {
  MonitorAgent,
  type MonitorInsight,
  type MonitorInsights,
} from "./agents/monitor-agent";
export {
  IntegrationAgent,
  type Integration,
  type IntegrationMapping,
  type IntegrationSuggestion,
} from "./agents/integration-agent";

// Orchestrator
export {
  AgentOrchestrator,
  createOrchestrator,
  type OrchestratorConfig,
} from "./orchestrator";

// A2A Protocol
export type { AgentCard, AgentSkill, AgentAuthConfig } from "./protocol/agent-card";
export { createAgentCard, validateAgentCard } from "./protocol/agent-card";
export type { A2ATask, TaskStatus, TaskArtifact } from "./protocol/task-manager";
export { TaskManager } from "./protocol/task-manager";
export { A2AServer, type SkillHandler } from "./protocol/a2a-server";
export { A2AClient } from "./protocol/a2a-client";

// Tools
export { DOCKER_TOOLS } from "./tools/docker-tools";
export { DATABASE_TOOLS } from "./tools/database-tools";
export { NOTIFICATION_TOOLS } from "./tools/notification-tools";

// Prompts
export {
  SETUP_AGENT_SYSTEM_PROMPT,
  SETUP_AGENT_GREETING,
} from "./llm/prompts/setup-agent";
export {
  WORKFLOW_AGENT_SYSTEM_PROMPT,
  WORKFLOW_AGENT_GREETING,
} from "./llm/prompts/workflow-agent";
export {
  MONITOR_AGENT_SYSTEM_PROMPT,
  MONITOR_AGENT_GREETING,
} from "./llm/prompts/monitor-agent";
export {
  INTEGRATION_AGENT_SYSTEM_PROMPT,
  INTEGRATION_AGENT_GREETING,
} from "./llm/prompts/integration-agent";
