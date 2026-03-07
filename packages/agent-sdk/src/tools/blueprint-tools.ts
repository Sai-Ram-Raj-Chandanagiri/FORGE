/**
 * Blueprint Tools — Used by the Composer agent to save, search, and deploy blueprints.
 */

import type { LLMTool } from "../llm/provider";

export const BLUEPRINT_TOOLS: LLMTool[] = [
  {
    name: "save_blueprint",
    description:
      "Save the current workspace composition as a reusable Blueprint. Captures all deployed modules, bridges, and layout configuration. Offer this after completing a composition.",
    parameters: {
      name: {
        type: "string",
        description: "Blueprint name (e.g., 'NGO Starter Kit', 'Small Business Suite')",
      },
      description: {
        type: "string",
        description: "Short description of what this blueprint provides",
      },
      orgType: {
        type: "string",
        description: "Target organization type: ngo, startup, small_business, education, healthcare",
      },
      tags: {
        type: "array",
        description: "Searchable tags (e.g., ['donor-management', 'volunteer', 'reporting'])",
      },
    },
  },
  {
    name: "search_blueprints",
    description:
      "Search for published blueprints that match the user's needs. ALWAYS search before building from scratch — a ready-made blueprint saves time. Returns matching blueprints with module lists.",
    parameters: {
      query: {
        type: "string",
        description: "Search query (e.g., 'ngo donor management')",
      },
      orgType: {
        type: "string",
        description: "Filter by organization type: ngo, startup, small_business, education, healthcare",
      },
    },
  },
  {
    name: "deploy_blueprint",
    description:
      "Deploy a blueprint: acquire all modules, deploy them, create bridges, apply layout, and activate workspace in one shot. Much faster than building from scratch.",
    parameters: {
      blueprintSlug: {
        type: "string",
        description: "The slug of the blueprint to deploy",
      },
    },
  },
];
