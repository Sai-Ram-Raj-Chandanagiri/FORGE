/**
 * Agent Tools — Platform Layout Operations
 * Tools for AI agents to generate and manage unified platform dashboards.
 */

import type { LLMTool } from "../llm/provider";

export const LAYOUT_TOOLS: LLMTool[] = [
  {
    name: "generate_platform_layout",
    description:
      "Create a branded dashboard layout with sidebar navigation, module grouping, and theming for the workspace portal. Regenerates the Nginx config with the new dashboard shell.",
    parameters: {
      platformName: {
        type: "string",
        description: "The name of the platform (e.g., 'Hope Foundation Hub')",
      },
      primaryColor: {
        type: "string",
        description: "Brand color as hex (e.g., '#ef4444'). NGOs: #ef4444, Startups: #2563eb, Education: #22c55e, Healthcare: #14b8a6",
      },
      homepage: {
        type: "string",
        description: "Default homepage: 'dashboard' for overview, or a module slug to load on open",
      },
      sidebarItems: {
        type: "array",
        description: "Array of sidebar items: [{ moduleSlug, label, icon, group, order }]. Icons: shield, heart, users, bar-chart, folder, mail, credit-card, box, settings, zap",
      },
    },
  },
  {
    name: "get_platform_layout",
    description:
      "Read the current platform layout configuration including theme, sidebar items, and groups.",
    parameters: {},
  },
  {
    name: "update_platform_layout",
    description:
      "Modify parts of the platform layout — sidebar order, theme colors, labels, or groups. Only changed fields need to be provided.",
    parameters: {
      changes: {
        type: "object",
        description: "Partial layout changes: { theme?: { brandName?, primaryColor?, logoUrl? }, homepage?, sidebar?: [{ moduleSlug, label?, icon?, group?, order? }], groups?: [{ name, order }] }",
      },
    },
  },
];
