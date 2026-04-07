import { TRPCError } from "@trpc/server";
import { type PrismaClient, Prisma } from "@forge/db";
import {
  createOrchestrator,
  type AgentOrchestrator,
  type LLMMessage,
  type AgentType,
} from "@forge/agent-sdk";
import { logger } from "@/lib/logger";
import { ForgeToolExecutor } from "./forge-tool-executor";
import { AgentProfileService } from "./agent-profile.service";
import { GovernanceService } from "./governance.service";
import { CreditService } from "./credit.service";
import type {
  ChatMessageInput,
  CreateWorkflowInput,
  ToggleWorkflowInput,
  ListConversationsInput,
} from "@/lib/validators/agent";

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

const log = logger.forService("AgentService");

// Singleton orchestrator — lazy-initialized on first chat() call
let orchestratorInstance: AgentOrchestrator | null = null;
let orchestratorChecked = false;

function getOrchestrator(prisma: PrismaClient): AgentOrchestrator | null {
  if (orchestratorChecked) return orchestratorInstance;
  orchestratorChecked = true;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    log.warn(
      "GEMINI_API_KEY not set — agents will use placeholder responses. " +
        "Get a free key at https://aistudio.google.com/apikey",
    );
    return null;
  }

  const toolExecutor = new ForgeToolExecutor(prisma);
  orchestratorInstance = createOrchestrator(apiKey, toolExecutor);
  return orchestratorInstance;
}

// Reset singleton (used by tests)
export function _resetOrchestrator() {
  orchestratorInstance = null;
  orchestratorChecked = false;
}

export class AgentService {
  constructor(private prisma: PrismaClient) {}

  // ==================== CONVERSATIONS ====================

  async chat(userId: string, input: ChatMessageInput) {
    const { agentType, message, conversationId } = input;

    // Credit pre-check: agent chat costs 1 credit
    const creditService = new CreditService(this.prisma);
    const creditCheck = await creditService.checkSufficientCredits(userId, 1);
    if (!creditCheck.sufficient) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Insufficient credits: agent chat requires 1 credit (you have ${creditCheck.balance}). Purchase more at /settings/credits.`,
      });
    }

    // Get or create conversation
    let conversation;
    if (conversationId) {
      conversation = await this.prisma.agentConversation.findFirst({
        where: { id: conversationId, userId },
      });
      if (!conversation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found",
        });
      }
    }

    if (!conversation) {
      conversation = await this.prisma.agentConversation.create({
        data: {
          userId,
          agentType,
          messages: [] as unknown as Prisma.InputJsonValue,
          context: {} as Prisma.InputJsonValue,
          status: "active",
        },
      });
    }

    // Parse existing messages
    const existingMessages = (conversation.messages ?? []) as unknown as ConversationMessage[];

    // Add user message
    const updatedMessages: ConversationMessage[] = [
      ...existingMessages,
      {
        role: "user" as const,
        content: message,
        timestamp: new Date().toISOString(),
      },
    ];

    // Generate agent response — real LLM or fallback
    let agentResponse: string;
    let toolResults: Record<string, unknown>[] | undefined;
    let usageData: { inputTokens: number; outputTokens: number } | undefined;

    const orchestrator = getOrchestrator(this.prisma);
    const startTime = Date.now();

    if (orchestrator) {
      // Inject personality suffix if configured
      try {
        const profileService = new AgentProfileService(this.prisma);
        const suffix = await profileService.getSystemPromptSuffix(userId);
        if (suffix) {
          orchestrator.setPersonalitySuffix(agentType as AgentType, suffix);
        }
      } catch (err) {
        log.warn("Failed to load agent personality:", err);
      }

      // Convert ConversationMessage[] to LLMMessage[] for the orchestrator
      const llmMessages: LLMMessage[] = updatedMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      try {
        const result = await orchestrator.chat(
          agentType as AgentType,
          llmMessages,
          { userId, conversationId: conversation.id, metadata: { agentType } },
        );
        agentResponse = result.response;
        toolResults = result.toolResults;
        usageData = result.usage;
      } catch (err) {
        log.error("LLM call failed, using fallback:", err);
        agentResponse = generateAgentResponse(agentType, message);
      }
    } else {
      agentResponse = generateAgentResponse(agentType, message);
    }

    const durationMs = Date.now() - startTime;

    // Deduct 1 credit for chat (fire-and-forget; already pre-checked)
    creditService
      .deductCredits(userId, 1, "AGENT_CHAT", `${agentType} chat`, conversation.id)
      .catch((err) => log.error("Credit deduction failed for agent chat", err));

    // Fire-and-forget audit logging
    const governanceService = new GovernanceService(this.prisma);
    governanceService
      .logAuditEntry({
        userId,
        agentType,
        action: "chat",
        inputTokens: usageData?.inputTokens,
        outputTokens: usageData?.outputTokens,
        durationMs,
        success: true,
        conversationId: conversation.id,
      })
      .catch((err) => log.error("Audit log failed", err));

    updatedMessages.push({
      role: "assistant" as const,
      content: agentResponse,
      timestamp: new Date().toISOString(),
    });

    // Update conversation
    await this.prisma.agentConversation.update({
      where: { id: conversation.id },
      data: {
        messages: updatedMessages as unknown as Prisma.InputJsonValue,
      },
    });

    // Log the action (include tool results if any)
    await this.prisma.agentAction.create({
      data: {
        conversationId: conversation.id,
        actionType: toolResults ? "chat_with_tools" : "chat",
        payload: { message } as Prisma.InputJsonValue,
        result: {
          response: agentResponse,
          ...(toolResults ? { toolResults } : {}),
        } as Prisma.InputJsonValue,
      },
    });

    return {
      conversationId: conversation.id,
      response: agentResponse,
      messages: updatedMessages,
      toolResults,
    };
  }

  async listConversations(userId: string, input: ListConversationsInput) {
    const where: Record<string, unknown> = { userId };
    if (input.agentType) {
      where.agentType = input.agentType;
    }

    const conversations = await this.prisma.agentConversation.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: input.limit,
      include: {
        _count: { select: { actions: true } },
      },
    });

    return conversations.map((c) => ({
      id: c.id,
      agentType: c.agentType,
      status: c.status,
      messageCount: ((c.messages as unknown as ConversationMessage[]) ?? []).length,
      actionCount: c._count.actions,
      lastMessage: getLastMessage(c.messages as unknown as ConversationMessage[]),
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));
  }

  async getConversation(userId: string, conversationId: string) {
    const conversation = await this.prisma.agentConversation.findFirst({
      where: { id: conversationId, userId },
      include: {
        actions: {
          orderBy: { executedAt: "desc" },
          take: 20,
        },
      },
    });

    if (!conversation) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Conversation not found",
      });
    }

    return {
      id: conversation.id,
      agentType: conversation.agentType,
      status: conversation.status,
      messages: (conversation.messages ?? []) as unknown as ConversationMessage[],
      actions: conversation.actions.map((a) => ({
        id: a.id,
        actionType: a.actionType,
        targetModule: a.targetModule,
        payload: a.payload,
        result: a.result,
        executedAt: a.executedAt.toISOString(),
      })),
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
    };
  }

  // ==================== WORKFLOWS ====================

  async createWorkflow(userId: string, input: CreateWorkflowInput) {
    return this.prisma.workflowRule.create({
      data: {
        userId,
        name: input.name,
        description: input.description,
        triggerEvent: input.triggerEvent,
        conditions: (input.conditions ?? {}) as Prisma.InputJsonValue,
        actions: (input.actions ?? []) as Prisma.InputJsonValue,
        isActive: false,
      },
    });
  }

  async listWorkflows(userId: string) {
    return this.prisma.workflowRule.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });
  }

  async toggleWorkflow(userId: string, input: ToggleWorkflowInput) {
    const workflow = await this.prisma.workflowRule.findFirst({
      where: { id: input.id, userId },
    });

    if (!workflow) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Workflow not found",
      });
    }

    return this.prisma.workflowRule.update({
      where: { id: input.id },
      data: { isActive: input.isActive },
    });
  }

  async deleteWorkflow(userId: string, id: string) {
    const workflow = await this.prisma.workflowRule.findFirst({
      where: { id, userId },
    });

    if (!workflow) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Workflow not found",
      });
    }

    await this.prisma.workflowRule.delete({ where: { id } });
    return { success: true };
  }

  // ==================== INSIGHTS ====================

  async getInsights(userId: string) {
    const [deploymentCount, workflowCount, conversationCount] =
      await Promise.all([
        this.prisma.deployment.count({
          where: { userId, status: "RUNNING" },
        }),
        this.prisma.workflowRule.count({
          where: { userId, isActive: true },
        }),
        this.prisma.agentConversation.count({
          where: { userId },
        }),
      ]);

    return {
      activeDeployments: deploymentCount,
      activeWorkflows: workflowCount,
      totalConversations: conversationCount,
      insights: [
        {
          type: "info" as const,
          title: "System Status",
          description: `You have ${deploymentCount} active deployment${deploymentCount !== 1 ? "s" : ""} and ${workflowCount} active workflow${workflowCount !== 1 ? "s" : ""}.`,
        },
      ],
    };
  }
}

function getLastMessage(messages: ConversationMessage[]): string | null {
  if (!messages || messages.length === 0) return null;
  const last = messages[messages.length - 1]!;
  return last.content.slice(0, 100) + (last.content.length > 100 ? "..." : "");
}

/**
 * Placeholder responses — used when GEMINI_API_KEY is not configured.
 */
function generateAgentResponse(agentType: string, message: string): string {
  const lowerMessage = message.toLowerCase();

  switch (agentType) {
    case "setup":
      if (lowerMessage.includes("ngo") || lowerMessage.includes("nonprofit")) {
        return "Based on your organization type, I'd recommend starting with these modules:\n\n1. **CRM / Contact Management** — Track donors, beneficiaries, and stakeholders\n2. **Donor & Fundraising Manager** — Manage donations and campaigns\n3. **HR & Volunteer Management** — Onboard and schedule volunteers\n4. **Analytics & Reporting Dashboard** — Track impact metrics\n\nWould you like me to help you deploy these modules? I can configure them for your specific needs.";
      }
      if (lowerMessage.includes("startup") || lowerMessage.includes("business")) {
        return "For a startup, I'd recommend:\n\n1. **CRM / Contact Management** — Manage leads and customer relationships\n2. **Project & Task Management** — Track tasks with Kanban boards\n3. **Financial / Expense Tracker** — Monitor expenses and invoicing\n4. **Communication Hub** — Internal team messaging\n\nHow large is your team? This will help me fine-tune the deployment configuration.";
      }
      return "I'd love to help you set up FORGE! Could you tell me more about:\n1. What type of organization are you? (NGO, startup, enterprise, etc.)\n2. How large is your team?\n3. What are the main challenges you're looking to solve?\n\n*Note: Connect a Gemini API key for AI-powered recommendations.*";

    case "workflow":
      if (lowerMessage.includes("donor") || lowerMessage.includes("crm")) {
        return 'I can help you create that automation! Here\'s what I understand:\n\n**Trigger:** New record created in CRM module\n**Action:** Create corresponding record in Donor Manager + Send welcome notification\n\nI\'ll need to verify that both modules are deployed and accessible. Would you like me to proceed with creating this workflow?';
      }
      return "I can help you create cross-module automations. Try describing what you'd like to automate in plain language, for example:\n\n- \"When a new donor is added in CRM, send a welcome email\"\n- \"Every Monday, generate a weekly analytics report\"\n- \"If a deployment fails, notify me and try restarting it\"\n\n*Note: Connect a Gemini API key for AI-powered workflow generation.*";

    case "monitor":
      return "Here's a quick health overview of your deployments:\n\nI'll analyze your deployment metrics to check for:\n- Resource usage anomalies (CPU, memory spikes)\n- Health check failures\n- Cost optimization opportunities\n- Scaling recommendations\n\nTo provide detailed insights, I need access to your deployment metrics. Would you like me to run a full analysis?\n\n*Note: Connect a Gemini API key for AI-powered monitoring insights.*";

    case "integration":
      return "I can help you connect your deployed modules! Here's what I can do:\n\n- **Analyze** your current deployments for integration opportunities\n- **Create** data bridges between modules (e.g., CRM → Email Marketing)\n- **Generate** Docker Compose configs for connected services\n\nWhich modules would you like to connect, or should I analyze your deployments for suggestions?\n\n*Note: Connect a Gemini API key for AI-powered integration analysis.*";

    default:
      return "I'm here to help! Please let me know what you'd like to do.";
  }
}
