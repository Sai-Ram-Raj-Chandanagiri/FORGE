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

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>;
export type ToggleWorkflowInput = z.infer<typeof toggleWorkflowSchema>;
export type ListConversationsInput = z.infer<typeof listConversationsSchema>;
