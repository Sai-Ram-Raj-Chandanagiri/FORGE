import { z } from "zod";

export const createDeploymentSchema = z.object({
  moduleId: z.string(),
  versionId: z.string(),
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be at most 50 characters")
    .regex(/^[a-zA-Z0-9-_]+$/, "Name can only contain letters, numbers, hyphens, and underscores"),
  configuration: z
    .record(z.string().max(100), z.string().max(10000))
    .refine((c) => Object.keys(c).length <= 100, {
      message: "Configuration must have at most 100 entries",
    })
    .default({}),
  autoRestart: z.boolean().default(true),
});

export const updateDeploymentConfigSchema = z.object({
  deploymentId: z.string(),
  configuration: z
    .record(z.string().max(100), z.string().max(10000))
    .refine((c) => Object.keys(c).length <= 100, {
      message: "Configuration must have at most 100 entries",
    }),
});

export const listDeploymentsSchema = z.object({
  status: z
    .enum(["PENDING", "PROVISIONING", "RUNNING", "STOPPED", "FAILED", "TERMINATED"])
    .optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(50).default(20),
});

export type CreateDeploymentInput = z.infer<typeof createDeploymentSchema>;
export type UpdateDeploymentConfigInput = z.infer<typeof updateDeploymentConfigSchema>;
export type ListDeploymentsInput = z.infer<typeof listDeploymentsSchema>;
