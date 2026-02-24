import { z } from "zod";

export const createOrganizationSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(2000).optional(),
  website: z.string().url().optional().or(z.literal("")),
});

export const updateOrganizationSchema = z.object({
  id: z.string(),
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(2000).optional(),
  website: z.string().url().optional().or(z.literal("")),
});

export const addMemberSchema = z.object({
  organizationId: z.string(),
  email: z.string().email(),
  role: z.enum(["ADMIN", "MEMBER", "VIEWER"]).default("MEMBER"),
});

export const removeMemberSchema = z.object({
  organizationId: z.string(),
  userId: z.string(),
});

export const updateMemberRoleSchema = z.object({
  organizationId: z.string(),
  userId: z.string(),
  role: z.enum(["ADMIN", "MEMBER", "VIEWER"]),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type RemoveMemberInput = z.infer<typeof removeMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
