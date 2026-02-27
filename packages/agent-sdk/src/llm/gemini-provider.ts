/**
 * Google Gemini 2.0 Flash Provider (PRIMARY — free tier)
 * 15 RPM, 1M TPM, 1500 RPD on free tier.
 */

import { GoogleGenAI, Type } from "@google/genai";
import type {
  LLMProvider,
  LLMProviderConfig,
  LLMMessage,
  LLMResponse,
  LLMTool,
} from "./provider";

export class GeminiProvider implements LLMProvider {
  readonly name = "gemini";
  private client: GoogleGenAI;
  private model: string;
  private defaultMaxTokens: number;
  private defaultTemperature: number;

  constructor(config: LLMProviderConfig) {
    this.client = new GoogleGenAI({ apiKey: config.apiKey });
    this.model = config.model || "gemini-3-flash-preview";
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
    const systemInstruction = messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n\n");

    const contents = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? ("model" as const) : ("user" as const),
        parts: [{ text: m.content }],
      }));

    const tools = options?.tools?.map((tool) => ({
      functionDeclarations: [
        {
          name: tool.name,
          description: tool.description,
          parameters: convertToGeminiSchema(tool.parameters),
        },
      ],
    }));

    try {
      const response = await this.client.models.generateContent({
        model: this.model,
        contents,
        config: {
          systemInstruction: systemInstruction || undefined,
          maxOutputTokens: options?.maxTokens ?? this.defaultMaxTokens,
          temperature: options?.temperature ?? this.defaultTemperature,
          tools: tools as never,
        },
      });

      const candidate = response.candidates?.[0];
      if (!candidate) {
        return {
          content: "",
          finishReason: "error",
        };
      }

      // Extract text content
      const textParts =
        candidate.content?.parts?.filter((p) => p.text) ?? [];
      const content = textParts.map((p) => p.text).join("");

      // Extract tool calls
      const functionCallParts =
        candidate.content?.parts?.filter((p) => p.functionCall) ?? [];
      const toolCalls = functionCallParts.map((p) => ({
        name: p.functionCall!.name!,
        arguments: (p.functionCall!.args ?? {}) as Record<string, unknown>,
      }));

      const finishReason =
        toolCalls.length > 0
          ? "tool_calls"
          : candidate.finishReason === "MAX_TOKENS"
            ? "max_tokens"
            : "stop";

      return {
        content,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        usage: response.usageMetadata
          ? {
            inputTokens: response.usageMetadata.promptTokenCount ?? 0,
            outputTokens: response.usageMetadata.candidatesTokenCount ?? 0,
          }
          : undefined,
        finishReason,
      };
    } catch (err) {
      return {
        content:
          err instanceof Error
            ? `LLM Error: ${err.message}`
            : "Unknown LLM error",
        finishReason: "error",
      };
    }
  }
}

/**
 * Convert JSON Schema-like parameter definitions to Gemini's schema format.
 */
function convertToGeminiSchema(
  params: Record<string, unknown>,
): Record<string, unknown> {
  const schema: Record<string, unknown> = { type: Type.OBJECT };
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  const props = (params.properties ?? params) as Record<
    string,
    Record<string, unknown>
  >;

  for (const [key, value] of Object.entries(props)) {
    const typeMap: Record<string, unknown> = {
      string: Type.STRING,
      number: Type.NUMBER,
      integer: Type.INTEGER,
      boolean: Type.BOOLEAN,
      array: Type.ARRAY,
      object: Type.OBJECT,
    };
    properties[key] = {
      type: typeMap[(value.type as string) ?? "string"] ?? Type.STRING,
      description: value.description ?? "",
    };
    if (value.required) required.push(key);
  }

  schema.properties = properties;
  if (required.length > 0) schema.required = required;
  return schema;
}

export function createGeminiProvider(config: LLMProviderConfig): GeminiProvider {
  return new GeminiProvider(config);
}
