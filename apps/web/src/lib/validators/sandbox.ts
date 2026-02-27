import { z } from "zod";

// ---- Start a sandbox demo session ----
export const startSandboxSchema = z.object({
  moduleId: z.string().min(1, "Module ID is required"),
  versionId: z.string().min(1, "Version ID is required").optional(),
});
export type StartSandboxInput = z.infer<typeof startSandboxSchema>;

// ---- Get sandbox session status ----
export const getSandboxStatusSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
});
export type GetSandboxStatusInput = z.infer<typeof getSandboxStatusSchema>;

// ---- Stop a sandbox session ----
export const stopSandboxSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
});
export type StopSandboxInput = z.infer<typeof stopSandboxSchema>;

// ---- List user's active sandboxes ----
export const listSandboxesSchema = z.object({
  status: z.enum(["starting", "running", "expired", "failed"]).optional(),
});
export type ListSandboxesInput = z.infer<typeof listSandboxesSchema>;
