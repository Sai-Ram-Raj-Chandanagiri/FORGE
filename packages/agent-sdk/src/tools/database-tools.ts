/**
 * Agent Tools — Database Operations
 * Tools for agents to query the FORGE database for modules, deployments, etc.
 */

import type { LLMTool } from "../llm/provider";

export const DATABASE_TOOLS: LLMTool[] = [
  {
    name: "search_modules",
    description:
      "Search the FORGE Store for modules matching criteria. Returns module names, descriptions, ratings, and pricing.",
    parameters: {
      query: {
        type: "string",
        description: "Search query text",
      },
      category: {
        type: "string",
        description: "Filter by category slug",
      },
      pricingModel: {
        type: "string",
        description: "Filter by pricing: FREE, ONE_TIME, SUBSCRIPTION_MONTHLY, SUBSCRIPTION_YEARLY",
      },
      limit: {
        type: "number",
        description: "Maximum results to return (default 10)",
      },
    },
  },
  {
    name: "get_module_details",
    description:
      "Get detailed information about a specific module including versions, requirements, and config schema.",
    parameters: {
      moduleSlug: {
        type: "string",
        description: "The slug of the module to look up",
      },
    },
  },
  {
    name: "get_user_deployments",
    description:
      "Get all deployments for the current user with status and metrics.",
    parameters: {
      includeMetrics: {
        type: "boolean",
        description: "Whether to include resource usage metrics",
      },
    },
  },
  {
    name: "get_deployment_metrics",
    description:
      "Get detailed metrics for a specific deployment over a time period.",
    parameters: {
      deploymentId: {
        type: "string",
        description: "The deployment ID",
      },
      period: {
        type: "string",
        description: "Time period: 1h, 6h, 24h, 7d, 30d",
      },
    },
  },
  {
    name: "get_user_purchases",
    description: "Get all modules the user has purchased/acquired.",
    parameters: {},
  },
];
