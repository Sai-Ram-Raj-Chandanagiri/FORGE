/**
 * Agent Tools — Docker Operations
 * Tools that agents can use to manage deployments.
 */

import type { LLMTool } from "../llm/provider";

export const DOCKER_TOOLS: LLMTool[] = [
  {
    name: "deploy_module",
    description:
      "Deploy a module from the FORGE Store. Creates a new container deployment with the specified configuration.",
    parameters: {
      moduleSlug: {
        type: "string",
        description: "The slug of the module to deploy",
      },
      version: {
        type: "string",
        description: "The version to deploy (semver format)",
      },
      name: {
        type: "string",
        description: "A display name for this deployment",
      },
      envVars: {
        type: "object",
        description: "Environment variables to set for the container",
      },
    },
  },
  {
    name: "list_deployments",
    description: "List all active deployments for the current user.",
    parameters: {
      status: {
        type: "string",
        description:
          "Filter by status: RUNNING, STOPPED, FAILED, or all. Defaults to all.",
      },
    },
  },
  {
    name: "get_deployment_status",
    description:
      "Get the current status, health, and resource usage of a specific deployment.",
    parameters: {
      deploymentId: {
        type: "string",
        description: "The deployment ID to check",
      },
    },
  },
  {
    name: "restart_deployment",
    description: "Restart a deployment container.",
    parameters: {
      deploymentId: {
        type: "string",
        description: "The deployment ID to restart",
      },
    },
  },
  {
    name: "stop_deployment",
    description: "Stop a running deployment container.",
    parameters: {
      deploymentId: {
        type: "string",
        description: "The deployment ID to stop",
      },
    },
  },
  {
    name: "scale_deployment",
    description:
      "Adjust resource limits for a deployment (CPU, memory).",
    parameters: {
      deploymentId: {
        type: "string",
        description: "The deployment ID to scale",
      },
      cpuLimit: {
        type: "number",
        description: "CPU limit in cores (e.g., 0.5, 1, 2)",
      },
      memoryLimitMb: {
        type: "number",
        description: "Memory limit in MB (e.g., 256, 512, 1024)",
      },
    },
  },
];
