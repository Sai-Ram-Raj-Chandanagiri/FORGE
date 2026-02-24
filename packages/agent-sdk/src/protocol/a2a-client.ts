/**
 * Google A2A Protocol — Client
 * Makes A2A requests to remote agent sidecars.
 */

import type { AgentCard } from "./agent-card";
import { validateAgentCard } from "./agent-card";
import type { A2ATask } from "./task-manager";

export class A2AClient {
  private agentCards: Map<string, AgentCard> = new Map();

  async discoverAgent(url: string): Promise<AgentCard | null> {
    try {
      const cardUrl = url.endsWith("/")
        ? `${url}.well-known/agent.json`
        : `${url}/.well-known/agent.json`;

      const response = await fetch(cardUrl, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      if (!response.ok) return null;

      const card = await response.json();
      if (!validateAgentCard(card)) return null;

      this.agentCards.set(card.name, card as AgentCard);
      return card as AgentCard;
    } catch {
      return null;
    }
  }

  async sendTask(
    agentName: string,
    skillId: string,
    input: Record<string, unknown>,
  ): Promise<A2ATask | null> {
    const card = this.agentCards.get(agentName);
    if (!card) return null;

    const skill = card.skills.find((s) => s.id === skillId);
    if (!skill) return null;

    try {
      const response = await fetch(`${card.url}/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...this.getAuthHeaders(card),
        },
        body: JSON.stringify({ skillId, input }),
      });

      if (!response.ok) return null;
      return (await response.json()) as A2ATask;
    } catch {
      return null;
    }
  }

  async getTaskStatus(
    agentName: string,
    taskId: string,
  ): Promise<A2ATask | null> {
    const card = this.agentCards.get(agentName);
    if (!card) return null;

    try {
      const response = await fetch(`${card.url}/tasks/${taskId}`, {
        headers: {
          Accept: "application/json",
          ...this.getAuthHeaders(card),
        },
      });

      if (!response.ok) return null;
      return (await response.json()) as A2ATask;
    } catch {
      return null;
    }
  }

  getRegisteredAgents(): AgentCard[] {
    return Array.from(this.agentCards.values());
  }

  registerAgent(card: AgentCard): void {
    this.agentCards.set(card.name, card);
  }

  private getAuthHeaders(card: AgentCard): Record<string, string> {
    if (card.authentication.type === "api_key" && card.authentication.credentials) {
      return { "X-API-Key": card.authentication.credentials.apiKey ?? "" };
    }
    if (card.authentication.type === "bearer" && card.authentication.credentials) {
      return { Authorization: `Bearer ${card.authentication.credentials.token ?? ""}` };
    }
    return {};
  }
}
