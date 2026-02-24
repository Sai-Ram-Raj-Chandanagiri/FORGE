/**
 * Claude API Provider (FUTURE — premium upgrade path)
 * Stub implementation for future Claude API integration.
 */

import type {
  LLMProvider,
  LLMProviderConfig,
  LLMMessage,
  LLMResponse,
  LLMTool,
} from "./provider";

export class ClaudeProvider implements LLMProvider {
  readonly name = "claude";
  private apiKey: string;
  private model: string;
  private defaultMaxTokens: number;
  private defaultTemperature: number;

  constructor(config: LLMProviderConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || "claude-sonnet-4-5-20250929";
    this.defaultMaxTokens = config.maxTokens ?? 4096;
    this.defaultTemperature = config.temperature ?? 0.7;
  }

  async chat(
    messages: LLMMessage[],
    options?: {
      tools?: LLMTool[];
      temperature?: number;
      maxTokens?: number;
    },
  ): Promise<LLMResponse> {
    const systemPrompt = messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n\n");

    const apiMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    const body: Record<string, unknown> = {
      model: this.model,
      max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
      temperature: options?.temperature ?? this.defaultTemperature,
      messages: apiMessages,
    };

    if (systemPrompt) {
      body.system = systemPrompt;
    }

    if (options?.tools && options.tools.length > 0) {
      body.tools = options.tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        input_schema: {
          type: "object",
          properties: tool.parameters,
        },
      }));
    }

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          content: `Claude API Error (${response.status}): ${errorText}`,
          finishReason: "error",
        };
      }

      const data = (await response.json()) as {
        content: { type: string; text?: string; name?: string; input?: Record<string, unknown> }[];
        stop_reason: string;
        usage?: { input_tokens: number; output_tokens: number };
      };

      const textContent = data.content
        .filter((c) => c.type === "text")
        .map((c) => c.text ?? "")
        .join("");

      const toolUseBlocks = data.content.filter(
        (c) => c.type === "tool_use",
      );
      const toolCalls = toolUseBlocks.map((block) => ({
        name: block.name!,
        arguments: (block.input ?? {}) as Record<string, unknown>,
      }));

      return {
        content: textContent,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        usage: data.usage
          ? {
              inputTokens: data.usage.input_tokens,
              outputTokens: data.usage.output_tokens,
            }
          : undefined,
        finishReason:
          toolCalls.length > 0
            ? "tool_calls"
            : data.stop_reason === "max_tokens"
              ? "max_tokens"
              : "stop",
      };
    } catch (err) {
      return {
        content:
          err instanceof Error
            ? `Claude API Error: ${err.message}`
            : "Unknown error",
        finishReason: "error",
      };
    }
  }
}

export function createClaudeProvider(
  config: LLMProviderConfig,
): ClaudeProvider {
  return new ClaudeProvider(config);
}
