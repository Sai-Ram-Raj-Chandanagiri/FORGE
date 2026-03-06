export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  toolResults?: { tool: string; success: boolean; result?: Record<string, unknown>; error?: string }[];
}

export interface ConversationItem {
  id: string;
  agentType: string;
  status: string;
  messageCount: number;
  actionCount: number;
  lastMessage: string | null;
  createdAt: string;
  updatedAt: string;
}
