/**
 * LLM Provider Abstraction Layer
 * Swap between Gemini (free) and Claude (premium) transparently.
 */

export interface LLMMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface LLMToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface LLMResponse {
  content: string;
  toolCalls?: LLMToolCall[];
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  finishReason: "stop" | "tool_calls" | "max_tokens" | "error";
}

export interface LLMTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface LLMProviderConfig {
  apiKey: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMProvider {
  readonly name: string;
  chat(
    messages: LLMMessage[],
    options?: {
      tools?: LLMTool[];
      temperature?: number;
      maxTokens?: number;
    },
  ): Promise<LLMResponse>;
}

export type LLMProviderFactory = (config: LLMProviderConfig) => LLMProvider;
