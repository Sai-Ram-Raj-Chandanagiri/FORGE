/**
 * Google A2A Protocol — Agent Card
 * Each deployed module can include an A2A-compliant agent sidecar
 * that publishes its capabilities via an Agent Card.
 */

export interface AgentSkill {
  id: string;
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
}

export interface AgentAuthConfig {
  type: "none" | "api_key" | "bearer" | "oauth2";
  credentials?: Record<string, string>;
}

export interface AgentCard {
  name: string;
  description: string;
  url: string;
  version: string;
  skills: AgentSkill[];
  authentication: AgentAuthConfig;
  metadata?: Record<string, unknown>;
}

export function createAgentCard(params: {
  name: string;
  description: string;
  url: string;
  skills: AgentSkill[];
  authentication?: AgentAuthConfig;
}): AgentCard {
  return {
    name: params.name,
    description: params.description,
    url: params.url,
    version: "1.0.0",
    skills: params.skills,
    authentication: params.authentication ?? { type: "none" },
  };
}

export function validateAgentCard(card: unknown): card is AgentCard {
  if (!card || typeof card !== "object") return false;
  const c = card as Record<string, unknown>;
  return (
    typeof c.name === "string" &&
    typeof c.description === "string" &&
    typeof c.url === "string" &&
    Array.isArray(c.skills)
  );
}
