/**
 * Action Queue Tools — Let agents enqueue actions for approval/scheduling.
 */

import type { LLMTool } from "../llm/provider";

export const ACTION_QUEUE_TOOLS: LLMTool[] = [
  {
    name: "enqueue_action",
    description:
      "Schedule an action for later execution or flag it for user approval. " +
      "Use this when an action needs human review (e.g., deploying a module, " +
      "sending notifications, deleting resources) or should run at a specific time.",
    parameters: {
      type: "object",
      properties: {
        actionType: {
          type: "string",
          description:
            "The type of action to enqueue (e.g., deploy_module, send_notification, restart_deployment)",
        },
        payload: {
          type: "object",
          description: "The action payload — same arguments you would pass to the tool directly",
        },
        requiresApproval: {
          type: "boolean",
          description: "Whether the action requires user approval before execution. Default: true",
        },
        scheduledFor: {
          type: "string",
          description:
            "ISO 8601 datetime for when the action should execute (e.g., '2025-01-15T09:00:00Z'). " +
            "Omit for immediate execution after approval.",
        },
        priority: {
          type: "string",
          enum: ["LOW", "NORMAL", "HIGH", "CRITICAL"],
          description: "Action priority. Default: NORMAL",
        },
      },
      required: ["actionType", "payload"],
    },
  },
  {
    name: "list_pending_approvals",
    description:
      "List actions that are waiting for the user's approval. " +
      "Use this to show the user what actions are queued and awaiting their review.",
    parameters: {
      type: "object",
      properties: {
        page: {
          type: "number",
          description: "Page number (default: 1)",
        },
        limit: {
          type: "number",
          description: "Items per page (default: 20, max: 50)",
        },
      },
    },
  },
];
