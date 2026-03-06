/**
 * FORGE Agent Orchestrator
 * Central coordinator for all FORGE agents. Manages agent lifecycle,
 * routes requests, and coordinates A2A communication.
 */

import type { LLMProvider, LLMProviderConfig } from "./llm/provider";
import { GeminiProvider } from "./llm/gemini-provider";
import { ClaudeProvider } from "./llm/claude-provider";
import type { AgentType, AgentContext, ToolExecutor } from "./agents/base-agent";
import { BaseAgent } from "./agents/base-agent";
import { SetupAgent } from "./agents/setup-agent";
import { WorkflowAgent } from "./agents/workflow-agent";
import { MonitorAgent } from "./agents/monitor-agent";
import { IntegrationAgent } from "./agents/integration-agent";
import { ComposerAgent } from "./agents/composer-agent";
import { A2AClient } from "./protocol/a2a-client";
import type { LLMMessage } from "./llm/provider";

export interface OrchestratorConfig {
  llmProvider: "gemini" | "claude";
  llmConfig: LLMProviderConfig;
  toolExecutor?: ToolExecutor;
}

export class AgentOrchestrator {
  private provider: LLMProvider;
  private agents: Map<AgentType, BaseAgent> = new Map();
  private a2aClient: A2AClient;
  private toolExecutor?: ToolExecutor;

  constructor(config: OrchestratorConfig) {
    this.provider =
      config.llmProvider === "claude"
        ? new ClaudeProvider(config.llmConfig)
        : new GeminiProvider(config.llmConfig);

    this.toolExecutor = config.toolExecutor;
    this.a2aClient = new A2AClient();

    // Initialize all agents
    this.agents.set("setup", new SetupAgent(this.provider, this.toolExecutor));
    this.agents.set(
      "workflow",
      new WorkflowAgent(this.provider, this.toolExecutor),
    );
    this.agents.set(
      "monitor",
      new MonitorAgent(this.provider, this.toolExecutor),
    );
    this.agents.set(
      "integration",
      new IntegrationAgent(this.provider, this.toolExecutor),
    );
    this.agents.set(
      "composer",
      new ComposerAgent(this.provider, this.toolExecutor),
    );
  }

  /**
   * Get a specific agent by type.
   */
  getAgent(type: AgentType): BaseAgent {
    const agent = this.agents.get(type);
    if (!agent) throw new Error(`Unknown agent type: ${type}`);
    return agent;
  }

  /**
   * Get the greeting message for a specific agent.
   */
  getGreeting(type: AgentType): string {
    return this.getAgent(type).greeting;
  }

  /**
   * Send a chat message to a specific agent.
   */
  async chat(
    type: AgentType,
    messages: LLMMessage[],
    context: AgentContext,
  ): Promise<{ response: string; toolResults?: Record<string, unknown>[] }> {
    const agent = this.getAgent(type);
    return agent.chat(messages, context);
  }

  /**
   * Get the A2A client for inter-agent communication.
   */
  getA2AClient(): A2AClient {
    return this.a2aClient;
  }

  /**
   * List all available agent types with their greetings.
   */
  listAgents(): { type: AgentType; greeting: string }[] {
    return Array.from(this.agents.entries()).map(([type, agent]) => ({
      type,
      greeting: agent.greeting,
    }));
  }
}

/**
 * Create an orchestrator with Gemini (free tier) as the default provider.
 */
export function createOrchestrator(
  apiKey: string,
  toolExecutor?: ToolExecutor,
): AgentOrchestrator {
  return new AgentOrchestrator({
    llmProvider: "gemini",
    llmConfig: {
      apiKey,
      model: "gemini-3-flash-preview",
    },
    toolExecutor,
  });
}
