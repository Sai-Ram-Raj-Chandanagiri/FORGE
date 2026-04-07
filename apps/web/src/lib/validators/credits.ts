import { z } from "zod";

export const purchasePackSchema = z.object({
  packId: z.string(),
});

export const transactionHistorySchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  type: z
    .enum([
      "PURCHASE",
      "AGENT_CHAT",
      "DEPLOYMENT_HOUR",
      "SANDBOX_SESSION",
      "CROSS_MODULE_QUERY",
      "MCP_TOOL_CALL",
      "BONUS",
      "REFUND",
      "AUTO_TOP_UP",
    ])
    .optional(),
});

export const autoTopUpSchema = z.object({
  packId: z.string(),
});

export type PurchasePackInput = z.infer<typeof purchasePackSchema>;
export type TransactionHistoryInput = z.infer<typeof transactionHistorySchema>;
export type AutoTopUpInput = z.infer<typeof autoTopUpSchema>;
