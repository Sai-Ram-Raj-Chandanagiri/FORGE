import { z } from "zod";

export const chatMessageSchema = z.object({
  agentType: z.enum(["setup", "workflow", "monitor", "integration", "composer"]),
  message: z.string().min(1).max(5000),
  conversationId: z.string().optional(),
});

export const createWorkflowSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(2000).optional(),
  triggerEvent: z.string(),
  conditions: z.unknown().refine(
    (val) => { try { return JSON.stringify(val ?? null).length <= 50000; } catch { return false; } },
    { message: "Conditions data too large (max 50KB)" },
  ),
  actions: z.unknown().refine(
    (val) => { try { return JSON.stringify(val ?? null).length <= 50000; } catch { return false; } },
    { message: "Actions data too large (max 50KB)" },
  ),
});

export const toggleWorkflowSchema = z.object({
  id: z.string(),
  isActive: z.boolean(),
});

export const listConversationsSchema = z.object({
  agentType: z.enum(["setup", "workflow", "monitor", "integration", "composer"]).optional(),
  limit: z.number().int().min(1).max(50).default(20),
});

// ==================== Action Queue ====================

export const approveActionSchema = z.object({
  actionId: z.string().min(1),
});

export const rejectActionSchema = z.object({
  actionId: z.string().min(1),
  reason: z.string().max(2000).optional(),
});

export const actionHistorySchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(50).default(20),
  status: z
    .enum([
      "PENDING",
      "APPROVED",
      "REJECTED",
      "EXECUTING",
      "COMPLETED",
      "FAILED",
      "CANCELLED",
    ])
    .optional(),
});

export const paginatedSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(50).default(20),
});

// ==================== Scheduled Tasks ====================

const CRON_REGEX =
  /^(\*|(\*\/)?[0-9]+)\s+(\*|(\*\/)?[0-9]+)\s+(\*|(\*\/)?[0-9]+)\s+(\*|(\*\/)?[0-9]+)\s+(\*|(\*\/)?[0-9]+)$/;

export const createScheduledTaskSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().max(2000).optional(),
  agentType: z.string().min(1).max(50),
  cronExpression: z
    .string()
    .trim()
    .refine((val) => CRON_REGEX.test(val), {
      message: "Invalid cron expression (5 fields: min hour dom month dow)",
    }),
  actionType: z.string().min(1).max(100),
  payload: z.record(z.unknown()).default({}),
});

export const updateScheduledTaskSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().max(2000).optional(),
  cronExpression: z
    .string()
    .trim()
    .refine((val) => CRON_REGEX.test(val), {
      message: "Invalid cron expression (5 fields: min hour dom month dow)",
    })
    .optional(),
  isActive: z.boolean().optional(),
  payload: z.record(z.unknown()).optional(),
});

// ==================== Agent Profile ====================

export const upsertProfileSchema = z.object({
  agentName: z.string().trim().min(1).max(100).optional(),
  avatarUrl: z.string().url().max(2048).optional(),
  personalityPreset: z
    .enum(["PROFESSIONAL", "FRIENDLY", "TECHNICAL", "CUSTOM"])
    .optional(),
  tone: z.string().max(5000).optional(),
  customSystemPromptSuffix: z.string().max(5000).optional(),
  communicationTemplates: z.record(z.unknown()).optional(),
  organizationId: z.string().optional(),
});

// ==================== Governance ====================

export const guardrailRulesSchema = z.object({
  allowedActions: z.array(z.string().max(100)).optional(),
  blockedActions: z.array(z.string().max(100)).optional(),
  maxActionsPerHour: z.number().int().min(1).max(1000).optional(),
  requireApprovalFor: z.array(z.string().max(100)).optional(),
});

export const upsertGuardrailSchema = z.object({
  agentType: z.string().max(50).optional(),
  rules: guardrailRulesSchema,
  isActive: z.boolean().optional(),
});

export const updateGuardrailSchema = z.object({
  guardrailId: z.string().min(1),
  agentType: z.string().max(50).optional(),
  rules: guardrailRulesSchema,
  isActive: z.boolean().optional(),
});

export const auditLogSchema = z.object({
  agentType: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const usageAnalyticsSchema = z.object({
  period: z.enum(["7d", "30d", "90d"]),
});

// ==================== Inferred Types ====================

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>;
export type ToggleWorkflowInput = z.infer<typeof toggleWorkflowSchema>;
export type ListConversationsInput = z.infer<typeof listConversationsSchema>;
