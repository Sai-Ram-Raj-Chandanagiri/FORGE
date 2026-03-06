/**
 * Agent Tools — Workspace & Bridge Operations
 * Tools that agents can use to manage workspaces and data bridges.
 */

import type { LLMTool } from "../llm/provider";

export const BRIDGE_TOOLS: LLMTool[] = [
  {
    name: "get_workspace_status",
    description:
      "Get the user's workspace status including the portal URL, connected modules, and active data bridges.",
    parameters: {},
  },
  {
    name: "activate_workspace",
    description:
      "Activate the user's workspace portal. Starts an Nginx reverse proxy that provides a single URL to access all deployed modules via path-based routing.",
    parameters: {},
  },
  {
    name: "create_data_bridge",
    description:
      "Create a data bridge between two deployed modules to sync data. The bridge is a lightweight container that polls the source module's API and pushes data to the target module's API.",
    parameters: {
      name: {
        type: "string",
        description: "A descriptive name for this bridge (e.g., 'CRM to Donor Sync')",
      },
      sourceDeploymentId: {
        type: "string",
        description: "The deployment ID of the source module (data provider)",
      },
      targetDeploymentId: {
        type: "string",
        description: "The deployment ID of the target module (data consumer)",
      },
      bridgeType: {
        type: "string",
        description: "The bridge type: 'polling' (periodic), 'webhook' (event-driven), or 'event_stream' (real-time)",
      },
      sourceEndpoint: {
        type: "string",
        description: "API endpoint on the source module to read data from (e.g., '/api/contacts')",
      },
      targetEndpoint: {
        type: "string",
        description: "API endpoint on the target module to push data to (e.g., '/api/donors')",
      },
      syncFrequencySeconds: {
        type: "number",
        description: "How often to sync data, in seconds (default: 30, min: 5, max: 3600)",
      },
    },
  },
  {
    name: "list_bridges",
    description:
      "List all data bridges in the user's workspace, showing their status, sync count, and last sync time.",
    parameters: {},
  },
  {
    name: "stop_bridge",
    description: "Stop a running data bridge.",
    parameters: {
      bridgeId: {
        type: "string",
        description: "The bridge ID to stop",
      },
    },
  },
  {
    name: "delete_bridge",
    description: "Delete a data bridge (stops the container if running and removes the bridge record).",
    parameters: {
      bridgeId: {
        type: "string",
        description: "The bridge ID to delete",
      },
    },
  },
];
