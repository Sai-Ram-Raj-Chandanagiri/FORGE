/**
 * Monitor Agent — Intelligent operations and anomaly detection.
 * Analyzes deployment metrics, detects anomalies, recommends scaling.
 */

import type { LLMProvider } from "../llm/provider";
import type { ToolExecutor } from "./base-agent";
import { BaseAgent } from "./base-agent";
import {
  MONITOR_AGENT_SYSTEM_PROMPT,
  MONITOR_AGENT_GREETING,
} from "../llm/prompts/monitor-agent";
import { DATABASE_TOOLS } from "../tools/database-tools";
import { DOCKER_TOOLS } from "../tools/docker-tools";
import { NOTIFICATION_TOOLS } from "../tools/notification-tools";

export class MonitorAgent extends BaseAgent {
  constructor(provider: LLMProvider, toolExecutor?: ToolExecutor) {
    super(
      provider,
      {
        type: "monitor",
        systemPrompt: MONITOR_AGENT_SYSTEM_PROMPT,
        greeting: MONITOR_AGENT_GREETING,
        tools: [
          ...DATABASE_TOOLS.filter((t) =>
            [
              "get_user_deployments",
              "get_deployment_metrics",
            ].includes(t.name),
          ),
          ...DOCKER_TOOLS.filter((t) =>
            [
              "get_deployment_status",
              "restart_deployment",
              "scale_deployment",
            ].includes(t.name),
          ),
          ...NOTIFICATION_TOOLS.filter((t) => t.name === "send_notification"),
        ],
        maxTurns: 5,
      },
      toolExecutor,
    );
  }

  /**
   * Parse monitoring insights from agent response.
   */
  static parseInsights(response: string): MonitorInsights | null {
    const jsonMatch = response.match(/```json\s*([\s\S]*?)```/);
    if (!jsonMatch) return null;

    try {
      const data = JSON.parse(jsonMatch[1]);
      if (data.insights && Array.isArray(data.insights)) {
        return data as MonitorInsights;
      }
    } catch {
      return null;
    }
    return null;
  }
}

export interface MonitorInsight {
  type: "anomaly" | "optimization" | "scaling" | "health" | "cost";
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  deploymentId?: string;
  recommendation: string;
  estimatedImpact?: string;
}

export interface MonitorInsights {
  summary: string;
  insights: MonitorInsight[];
  overallHealth: "healthy" | "degraded" | "critical";
}
