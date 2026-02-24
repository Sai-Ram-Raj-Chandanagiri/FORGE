/**
 * Setup Agent — Intelligent onboarding and configuration.
 * Analyzes org description, recommends modules, generates deployment configs.
 */

import type { LLMProvider } from "../llm/provider";
import type { ToolExecutor } from "./base-agent";
import { BaseAgent } from "./base-agent";
import {
  SETUP_AGENT_SYSTEM_PROMPT,
  SETUP_AGENT_GREETING,
} from "../llm/prompts/setup-agent";
import { DATABASE_TOOLS } from "../tools/database-tools";
import { DOCKER_TOOLS } from "../tools/docker-tools";

export class SetupAgent extends BaseAgent {
  constructor(provider: LLMProvider, toolExecutor?: ToolExecutor) {
    super(
      provider,
      {
        type: "setup",
        systemPrompt: SETUP_AGENT_SYSTEM_PROMPT,
        greeting: SETUP_AGENT_GREETING,
        tools: [
          ...DATABASE_TOOLS.filter((t) =>
            ["search_modules", "get_module_details"].includes(t.name),
          ),
          ...DOCKER_TOOLS.filter((t) =>
            ["deploy_module", "list_deployments"].includes(t.name),
          ),
        ],
        maxTurns: 5,
      },
      toolExecutor,
    );
  }

  /**
   * Parse module recommendations from agent response.
   */
  static parseRecommendations(response: string): ModuleRecommendation[] | null {
    const jsonMatch = response.match(/```json\s*([\s\S]*?)```/);
    if (!jsonMatch) return null;

    try {
      const data = JSON.parse(jsonMatch[1]);
      if (data.recommendations && Array.isArray(data.recommendations)) {
        return data.recommendations;
      }
    } catch {
      return null;
    }
    return null;
  }
}

export interface ModuleRecommendation {
  moduleSlug: string;
  reason: string;
  priority: "essential" | "recommended" | "optional";
  confidence: "high" | "medium" | "low";
}
