import { z } from "zod";

export const reviewModuleSchema = z.object({
  moduleId: z.string(),
  action: z.enum(["approve", "reject"]),
  reviewNotes: z.string().max(2000).optional(),
});

export const listUsersSchema = z.object({
  query: z.string().optional(),
  role: z.enum(["ADMIN", "ORG_ADMIN", "DEVELOPER", "USER"]).optional(),
  status: z.enum(["ACTIVE", "SUSPENDED", "PENDING_VERIFICATION"]).optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(50).default(20),
});

export const updateUserStatusSchema = z.object({
  userId: z.string(),
  status: z.enum(["ACTIVE", "SUSPENDED"]),
});

export type ReviewModuleInput = z.infer<typeof reviewModuleSchema>;
export type ListUsersInput = z.infer<typeof listUsersSchema>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
