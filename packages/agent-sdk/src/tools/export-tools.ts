/**
 * Export Tools — Used by the Composer agent to export composed platforms.
 */

import type { LLMTool } from "../llm/provider";

export const EXPORT_TOOLS: LLMTool[] = [
  {
    name: "export_project",
    description:
      "Export the current composed platform as a portable project. Generates docker-compose.yml, nginx config, dashboard, env files, bridge scripts, and README. Returns a download URL for the ZIP file.",
    parameters: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_module_sources",
    description:
      "Get source repository URLs and access information for all deployed modules in the workspace. Shows which modules have open source code available.",
    parameters: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
];
