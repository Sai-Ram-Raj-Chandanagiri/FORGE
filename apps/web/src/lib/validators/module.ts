import { z } from "zod";

export const createModuleSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be at most 100 characters"),
  shortDescription: z
    .string()
    .trim()
    .min(10, "Short description must be at least 10 characters")
    .max(200, "Short description must be at most 200 characters"),
  description: z
    .string()
    .trim()
    .min(50, "Description must be at least 50 characters")
    .max(10000, "Description must be at most 10,000 characters"),
  type: z.enum(["SINGLE_CONTAINER", "MULTI_CONTAINER"]),
  pricingModel: z.enum([
    "FREE",
    "ONE_TIME",
    "SUBSCRIPTION_MONTHLY",
    "SUBSCRIPTION_YEARLY",
    "USAGE_BASED",
  ]),
  price: z.number().min(0).optional(),
  currency: z.string().length(3).default("USD"),
  logoUrl: z.string().url().optional().or(z.literal("")),
  repositoryUrl: z.string().url().optional().or(z.literal("")),
  documentationUrl: z.string().url().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  categoryIds: z.array(z.string()).min(1, "Select at least one category"),
  tags: z.array(z.string()).max(10, "Maximum 10 tags"),
});

export const updateModuleSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(2).max(100).optional(),
  shortDescription: z.string().trim().min(10).max(200).optional(),
  description: z.string().trim().min(50).max(10000).optional(),
  pricingModel: z
    .enum(["FREE", "ONE_TIME", "SUBSCRIPTION_MONTHLY", "SUBSCRIPTION_YEARLY", "USAGE_BASED"])
    .optional(),
  price: z.number().min(0).optional(),
  currency: z.string().length(3).optional(),
  logoUrl: z.string().url().optional().or(z.literal("")),
  bannerUrl: z.string().url().optional().or(z.literal("")),
  repositoryUrl: z.string().url().optional().or(z.literal("")),
  documentationUrl: z.string().url().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  categoryIds: z.array(z.string()).optional(),
  tags: z.array(z.string()).max(10).optional(),
});

export const createVersionSchema = z.object({
  moduleId: z.string(),
  version: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/, "Version must be in semver format (e.g., 1.0.0)"),
  changelog: z.string().max(5000).optional(),
  dockerImage: z.string().min(1, "Docker image is required"),
  composeFileUrl: z.string().url().optional().or(z.literal("")),
  configSchema: z.record(z.unknown()).optional(),
  minResources: z
    .object({
      cpu: z.number().min(0.1).optional(),
      memoryMb: z.number().min(64).optional(),
      diskMb: z.number().min(100).optional(),
    })
    .optional(),
  // Build pipeline fields
  sourceRepoUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  sourceBranch: z.string().min(1).max(256).optional(),
  exposedPort: z.number().int().min(1).max(65535).optional(),
  healthCheckPath: z.string().regex(/^\//, "Health check path must start with /").optional(),
  requiredEnvVars: z.array(z.string()).optional(),
  customDockerfile: z.string().max(50000).optional(),
});

export const buildFromRepoSchema = z.object({
  versionId: z.string(),
});

export const getBuildStatusSchema = z.object({
  versionId: z.string(),
});

export const detectProjectSchema = z.object({
  repoUrl: z.string().url("Must be a valid URL"),
  branch: z.string().min(1).default("main"),
});

export const searchModulesSchema = z.object({
  query: z.string().max(200).optional(),
  categorySlug: z.string().optional(),
  tags: z.array(z.string()).optional(),
  pricingModel: z
    .enum(["FREE", "ONE_TIME", "SUBSCRIPTION_MONTHLY", "SUBSCRIPTION_YEARLY", "USAGE_BASED"])
    .optional(),
  sortBy: z
    .enum(["relevance", "newest", "popular", "rating", "name"])
    .default("relevance"),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(50).default(12),
});

export const createReviewSchema = z.object({
  moduleId: z.string(),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().min(3).max(100).optional(),
  body: z.string().trim().min(10).max(2000).optional(),
});

export const updateReviewSchema = z.object({
  moduleId: z.string(),
  rating: z.number().int().min(1).max(5).optional(),
  title: z.string().trim().min(3).max(100).optional(),
  body: z.string().trim().min(10).max(2000).optional(),
});

export type CreateModuleInput = z.infer<typeof createModuleSchema>;
export type UpdateModuleInput = z.infer<typeof updateModuleSchema>;
export type CreateVersionInput = z.infer<typeof createVersionSchema>;
export type SearchModulesInput = z.infer<typeof searchModulesSchema>;
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;
export type BuildFromRepoInput = z.infer<typeof buildFromRepoSchema>;
export type GetBuildStatusInput = z.infer<typeof getBuildStatusSchema>;
export type DetectProjectInput = z.infer<typeof detectProjectSchema>;
