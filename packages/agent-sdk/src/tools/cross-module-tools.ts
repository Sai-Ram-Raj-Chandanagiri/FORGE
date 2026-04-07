/**
 * Cross-Module Tools — Let agents query data from deployed modules.
 */

import type { LLMTool } from "../llm/provider";

export const CROSS_MODULE_TOOLS: LLMTool[] = [
  {
    name: "query_module_data",
    description:
      "Query data from a deployed module's API endpoint. Use this to fetch live data " +
      "from any running module in the user's workspace (e.g., CRM contacts, inventory items, " +
      "analytics data). The module must be deployed and running.",
    parameters: {
      type: "object",
      properties: {
        deploymentId: {
          type: "string",
          description: "The ID of the deployment to query",
        },
        endpoint: {
          type: "string",
          description:
            "The API endpoint path to call (e.g., '/api/contacts', '/api/data'). " +
            "Must be a relative path, no absolute URLs.",
        },
        method: {
          type: "string",
          enum: ["GET", "POST"],
          description: "HTTP method. Default: GET",
        },
        body: {
          type: "object",
          description: "Request body for POST requests",
        },
      },
      required: ["deploymentId", "endpoint"],
    },
  },
  {
    name: "aggregate_cross_module",
    description:
      "Query multiple deployed modules and combine their data. Use this when the user " +
      "wants to compare or merge data from different modules (e.g., 'show me CRM contacts " +
      "matched with billing invoices').",
    parameters: {
      type: "object",
      properties: {
        queries: {
          type: "array",
          description: "Array of module queries (max 5)",
          items: {
            type: "object",
            properties: {
              deploymentId: { type: "string" },
              endpoint: { type: "string" },
              label: {
                type: "string",
                description: "Label for this data source in the result",
              },
            },
            required: ["deploymentId", "endpoint", "label"],
          },
        },
        mergeMode: {
          type: "string",
          enum: ["merge", "summary"],
          description:
            "How to combine results. 'merge' = combine all data, " +
            "'summary' = count and summarize each source. Default: merge",
        },
      },
      required: ["queries"],
    },
  },
];
