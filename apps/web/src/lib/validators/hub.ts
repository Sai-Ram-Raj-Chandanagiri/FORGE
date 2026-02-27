import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(5000).optional(),
  repositoryUrl: z.string().url().optional().or(z.literal("")),
  isPublic: z.boolean().default(true),
  tags: z.array(z.string()).max(10).default([]),
});

export const updateProjectSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(5000).optional(),
  repositoryUrl: z.string().url().optional().or(z.literal("")),
  isPublic: z.boolean().optional(),
  status: z.enum(["ACTIVE", "ARCHIVED", "DRAFT"]).optional(),
  tags: z.array(z.string()).max(10).optional(),
});

export const createCommentSchema = z.object({
  projectId: z.string(),
  body: z.string().trim().min(1).max(2000),
  parentId: z.string().optional(),
});

export const createSubmissionSchema = z.object({
  appName: z.string().trim().min(2).max(100),
  companyName: z.string().trim().min(1).max(100),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, "Version must be semver format"),
  about: z.string().trim().min(20).max(5000),
  changelog: z.string().trim().max(5000).optional(),
  extraInfo: z.string().trim().max(2000).optional(),
  labels: z.array(z.string()).default([]),
  fileUrl: z.string().url(),
});

export const listProjectsSchema = z.object({
  query: z.string().optional(),
  tags: z.array(z.string()).optional(),
  sortBy: z.enum(["newest", "popular", "name"]).default("newest"),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(50).default(12),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;
export type ListProjectsInput = z.infer<typeof listProjectsSchema>;
