import { z } from "zod";

// ── Workspace ──

export const getWorkspaceSchema = z.object({}).optional();

export const activateWorkspaceSchema = z.object({}).optional();

export const deactivateWorkspaceSchema = z.object({}).optional();

// ── Data Bridges ──

export const createBridgeSchema = z.object({
  name: z
    .string()
    .min(1, "Bridge name is required")
    .max(100, "Name too long"),
  sourceDeploymentId: z.string().min(1, "Source deployment is required"),
  targetDeploymentId: z.string().min(1, "Target deployment is required"),
  bridgeType: z.enum(["polling", "webhook", "event_stream"]),
  configuration: z.object({
    sourceEndpoint: z.string().optional(),
    targetEndpoint: z.string().optional(),
    syncFrequencySeconds: z.number().min(5).max(3600).default(30),
    mappings: z
      .array(
        z.object({
          sourceField: z.string(),
          targetField: z.string(),
          transform: z.string().optional(),
        }),
      )
      .optional(),
    headers: z.record(z.string(), z.string()).optional(),
  }),
});

export type CreateBridgeInput = z.infer<typeof createBridgeSchema>;

export const bridgeIdSchema = z.object({
  bridgeId: z.string().min(1),
});

export type BridgeIdInput = z.infer<typeof bridgeIdSchema>;
