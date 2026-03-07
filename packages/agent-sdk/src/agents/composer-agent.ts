/**
 * Composer Agent — The flagship FORGE agent.
 * Orchestrates the entire platform composition flow:
 * understand → search → acquire → deploy → integrate → layout → deliver.
 */

import type { LLMProvider } from "../llm/provider";
import type { ToolExecutor } from "./base-agent";
import { BaseAgent } from "./base-agent";
import {
  COMPOSER_AGENT_SYSTEM_PROMPT,
  COMPOSER_AGENT_GREETING,
} from "../llm/prompts/composer-agent";
import { DATABASE_TOOLS } from "../tools/database-tools";
import { DOCKER_TOOLS } from "../tools/docker-tools";
import { BRIDGE_TOOLS } from "../tools/bridge-tools";
import { LAYOUT_TOOLS } from "../tools/layout-tools";
import { NOTIFICATION_TOOLS } from "../tools/notification-tools";
import { EXPORT_TOOLS } from "../tools/export-tools";

export class ComposerAgent extends BaseAgent {
  constructor(provider: LLMProvider, toolExecutor?: ToolExecutor) {
    super(
      provider,
      {
        type: "composer",
        systemPrompt: COMPOSER_AGENT_SYSTEM_PROMPT,
        greeting: COMPOSER_AGENT_GREETING,
        tools: [
          ...DATABASE_TOOLS,
          ...DOCKER_TOOLS,
          ...BRIDGE_TOOLS,
          ...LAYOUT_TOOLS,
          ...NOTIFICATION_TOOLS,
          ...EXPORT_TOOLS,
        ],
        maxTurns: 15,
      },
      toolExecutor,
    );
  }
}
