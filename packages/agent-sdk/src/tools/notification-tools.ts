/**
 * Agent Tools — Notification Operations
 * Tools for agents to send notifications and alerts.
 */

import type { LLMTool } from "../llm/provider";

export const NOTIFICATION_TOOLS: LLMTool[] = [
  {
    name: "send_notification",
    description:
      "Send an in-app notification to the user.",
    parameters: {
      title: {
        type: "string",
        description: "Notification title",
      },
      body: {
        type: "string",
        description: "Notification message body",
      },
      type: {
        type: "string",
        description:
          "Notification type: DEPLOYMENT_ALERT, SYSTEM_ANNOUNCEMENT, SUBMISSION_STATUS",
      },
      link: {
        type: "string",
        description: "Optional link to navigate to when clicked",
      },
    },
  },
  {
    name: "send_email",
    description:
      "Send an email notification to the user.",
    parameters: {
      subject: {
        type: "string",
        description: "Email subject line",
      },
      body: {
        type: "string",
        description: "Email body content (plain text)",
      },
    },
  },
];
