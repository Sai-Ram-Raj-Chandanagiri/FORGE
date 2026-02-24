import { z } from "zod";

export const chatMessageSchema = z.object({
  agentType: z.enum(["setup", "workflow", "monitor", "integration"]),
  message: z.string().min(1).max(5000),
  conversationId: z.string().optional(),
});

export const createWorkflowSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(2000).optional(),
  triggerEvent: z.string(),
  conditions: z.unknown(),
  actions: z.unknown(),
});

export const toggleWorkflowSchema = z.object({
  id: z.string(),
  isActive: z.boolean(),
});

export const listConversationsSchema = z.object({
  agentType: z.enum(["setup", "workflow", "monitor", "integration"]).optional(),
  limit: z.number().int().min(1).max(50).default(20),
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>;
export type ToggleWorkflowInput = z.infer<typeof toggleWorkflowSchema>;
export type ListConversationsInput = z.infer<typeof listConversationsSchema>;
