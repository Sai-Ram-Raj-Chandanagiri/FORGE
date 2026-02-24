/**
 * Workflow Agent — Cross-module automation builder.
 * Translates natural language to event-driven workflow rules.
 */

import type { LLMProvider } from "../llm/provider";
import type { ToolExecutor } from "./base-agent";
import { BaseAgent } from "./base-agent";
import {
  WORKFLOW_AGENT_SYSTEM_PROMPT,
  WORKFLOW_AGENT_GREETING,
} from "../llm/prompts/workflow-agent";
import { DATABASE_TOOLS } from "../tools/database-tools";
import { NOTIFICATION_TOOLS } from "../tools/notification-tools";

export class WorkflowAgent extends BaseAgent {
  constructor(provider: LLMProvider, toolExecutor?: ToolExecutor) {
    super(
      provider,
      {
        type: "workflow",
        systemPrompt: WORKFLOW_AGENT_SYSTEM_PROMPT,
        greeting: WORKFLOW_AGENT_GREETING,
        tools: [
          ...DATABASE_TOOLS.filter((t) =>
            ["get_user_deployments", "get_module_details"].includes(t.name),
          ),
          ...NOTIFICATION_TOOLS,
        ],
        maxTurns: 5,
      },
      toolExecutor,
    );
  }

  /**
   * Parse a workflow definition from agent response.
   */
  static parseWorkflowDefinition(
    response: string,
  ): WorkflowDefinition | null {
    const jsonMatch = response.match(/```json\s*([\s\S]*?)```/);
    if (!jsonMatch) return null;

    try {
      const data = JSON.parse(jsonMatch[1]);
      if (data.name && data.trigger && data.actions) {
        return data as WorkflowDefinition;
      }
    } catch {
      return null;
    }
    return null;
  }
}

export interface WorkflowTrigger {
  event: string;
  source: string;
  filter?: Record<string, unknown>;
}

export interface WorkflowCondition {
  field: string;
  operator: "eq" | "neq" | "gt" | "lt" | "contains";
  value: unknown;
}

export interface WorkflowAction {
  type: string;
  target: string;
  payload: Record<string, unknown>;
  delay?: number;
}

export interface WorkflowDefinition {
  name: string;
  description: string;
  trigger: WorkflowTrigger;
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
}
