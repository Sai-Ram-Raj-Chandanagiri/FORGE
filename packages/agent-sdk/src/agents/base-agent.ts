/**
 * Base Agent — Foundation for all FORGE agents.
 * Provides conversation management, tool execution loop, and LLM interaction.
 */

import type {
  LLMProvider,
  LLMMessage,
  LLMTool,
  LLMResponse,
} from "../llm/provider";

export type AgentType = "setup" | "workflow" | "monitor" | "integration";

export interface AgentContext {
  userId: string;
  orgId?: string;
  conversationId?: string;
  metadata?: Record<string, unknown>;
}

export interface ToolExecutor {
  execute(
    toolName: string,
    args: Record<string, unknown>,
    context: AgentContext,
  ): Promise<Record<string, unknown>>;
}

export interface AgentConfig {
  type: AgentType;
  systemPrompt: string;
  greeting: string;
  tools: LLMTool[];
  maxTurns?: number;
}

export abstract class BaseAgent {
  protected provider: LLMProvider;
  protected config: AgentConfig;
  protected toolExecutor?: ToolExecutor;

  constructor(
    provider: LLMProvider,
    config: AgentConfig,
    toolExecutor?: ToolExecutor,
  ) {
    this.provider = provider;
    this.config = config;
    this.toolExecutor = toolExecutor;
  }

  get type(): AgentType {
    return this.config.type;
  }

  get greeting(): string {
    return this.config.greeting;
  }

  /**
   * Process a user message through the agent's LLM with tool execution loop.
   */
  async chat(
    messages: LLMMessage[],
    context: AgentContext,
  ): Promise<{ response: string; toolResults?: Record<string, unknown>[] }> {
    const conversationMessages: LLMMessage[] = [
      { role: "system", content: this.config.systemPrompt },
      ...messages,
    ];

    const maxTurns = this.config.maxTurns ?? 5;
    const toolResults: Record<string, unknown>[] = [];

    for (let turn = 0; turn < maxTurns; turn++) {
      const llmResponse = await this.provider.chat(conversationMessages, {
        tools: this.config.tools.length > 0 ? this.config.tools : undefined,
      });

      if (
        llmResponse.finishReason === "tool_calls" &&
        llmResponse.toolCalls &&
        this.toolExecutor
      ) {
        // Add assistant message with tool call intent
        conversationMessages.push({
          role: "assistant",
          content:
            llmResponse.content ||
            `Calling tools: ${llmResponse.toolCalls.map((t) => t.name).join(", ")}`,
        });

        // Execute each tool call
        for (const toolCall of llmResponse.toolCalls) {
          try {
            const result = await this.toolExecutor.execute(
              toolCall.name,
              toolCall.arguments,
              context,
            );
            toolResults.push({ tool: toolCall.name, success: true, result });
            conversationMessages.push({
              role: "user",
              content: `Tool result for ${toolCall.name}: ${JSON.stringify(result)}`,
            });
          } catch (err) {
            const error =
              err instanceof Error ? err.message : "Tool execution failed";
            toolResults.push({
              tool: toolCall.name,
              success: false,
              error,
            });
            conversationMessages.push({
              role: "user",
              content: `Tool error for ${toolCall.name}: ${error}`,
            });
          }
        }

        // Continue loop to let LLM process tool results
        continue;
      }

      // No tool calls — return the final response
      return {
        response: llmResponse.content || "I apologize, I couldn't generate a response.",
        toolResults: toolResults.length > 0 ? toolResults : undefined,
      };
    }

    // Max turns reached
    return {
      response:
        "I've reached the maximum number of processing steps. Here's what I've gathered so far. Please refine your request if you need more help.",
      toolResults: toolResults.length > 0 ? toolResults : undefined,
    };
  }

  /**
   * Override in subclasses to add pre-processing logic.
   */
  protected preprocessMessage(message: string, _context: AgentContext): string {
    return message;
  }
}
