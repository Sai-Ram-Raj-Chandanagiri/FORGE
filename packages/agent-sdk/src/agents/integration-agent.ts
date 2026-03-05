/**
 * Integration Agent — Module composition and data bridging.
 * Analyzes module APIs, suggests integrations, generates Compose configs.
 */

import type { LLMProvider } from "../llm/provider";
import type { ToolExecutor } from "./base-agent";
import { BaseAgent } from "./base-agent";
import {
  INTEGRATION_AGENT_SYSTEM_PROMPT,
  INTEGRATION_AGENT_GREETING,
} from "../llm/prompts/integration-agent";
import { DATABASE_TOOLS } from "../tools/database-tools";
import { DOCKER_TOOLS } from "../tools/docker-tools";
import { BRIDGE_TOOLS } from "../tools/bridge-tools";

export class IntegrationAgent extends BaseAgent {
  constructor(provider: LLMProvider, toolExecutor?: ToolExecutor) {
    super(
      provider,
      {
        type: "integration",
        systemPrompt: INTEGRATION_AGENT_SYSTEM_PROMPT,
        greeting: INTEGRATION_AGENT_GREETING,
        tools: [
          ...DATABASE_TOOLS.filter((t) =>
            [
              "get_user_deployments",
              "get_module_details",
              "search_modules",
            ].includes(t.name),
          ),
          ...DOCKER_TOOLS.filter((t) =>
            ["deploy_module", "list_deployments"].includes(t.name),
          ),
          ...BRIDGE_TOOLS,
        ],
        maxTurns: 8,
      },
      toolExecutor,
    );
  }

  /**
   * Parse integration suggestions from agent response.
   */
  static parseIntegrations(
    response: string,
  ): IntegrationSuggestion | null {
    const jsonMatch = response.match(/```json\s*([\s\S]*?)```/);
    if (!jsonMatch?.[1]) return null;

    try {
      const data = JSON.parse(jsonMatch[1]);
      if (data.integrations && Array.isArray(data.integrations)) {
        return data as IntegrationSuggestion;
      }
    } catch {
      return null;
    }
    return null;
  }
}

export interface IntegrationMapping {
  sourceField: string;
  targetField: string;
  transform?: string;
}

export interface Integration {
  name: string;
  description: string;
  sourceModule: string;
  targetModule: string;
  pattern:
    | "data_sync"
    | "event_bridge"
    | "shared_db"
    | "api_gateway"
    | "shared_storage";
  configuration: {
    mappings: IntegrationMapping[];
    direction: "one_way" | "bidirectional";
    syncFrequency: "realtime" | "batch_hourly" | "batch_daily";
  };
}

export interface IntegrationSuggestion {
  integrations: Integration[];
  composeOverrides: {
    sharedNetworks: string[];
    sharedVolumes: string[];
    environmentVariables: Record<string, string>;
  };
}
