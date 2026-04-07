import { TRPCError } from "@trpc/server";
import { type PrismaClient, Prisma } from "@forge/db";
import { logger } from "@/lib/logger";

// ==================== TYPES ====================

export interface GuardrailRules {
  allowedActions?: string[];
  blockedActions?: string[];
  maxActionsPerHour?: number;
  requireApprovalFor?: string[];
}

export interface UpsertGuardrailInput {
  agentType?: string;
  rules: GuardrailRules;
  isActive?: boolean;
}

export interface CheckActionResult {
  allowed: boolean;
  requiresApproval: boolean;
  reason?: string;
}

export interface LogAuditEntryInput {
  userId: string;
  agentType: string;
  action: string;
  reasoning?: string;
  inputTokens?: number;
  outputTokens?: number;
  durationMs?: number;
  success?: boolean;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  conversationId?: string;
}

export interface AuditLogInput {
  agentType?: string;
  page?: number;
  limit?: number;
  startDate?: Date;
  endDate?: Date;
}

export interface UsageAnalyticsInput {
  period: "7d" | "30d" | "90d";
}

export interface DailyUsage {
  date: string;
  tokens: number;
  cost: number;
  actions: number;
}

export interface UsageAnalytics {
  totalTokens: number;
  totalCost: number;
  totalActions: number;
  actionsByType: Record<string, number>;
  errorRate: number;
  dailyUsage: DailyUsage[];
}

// ==================== SERVICE ====================

const log = logger.forService("GovernanceService");

export class GovernanceService {
  constructor(private prisma: PrismaClient) {}

  // ==================== GUARDRAILS ====================

  async getGuardrails(userId: string, agentType?: string) {
    const where: Prisma.AgentGuardrailWhereInput = { userId };

    if (agentType) {
      // Include both agent-specific AND global (agentType=null) guardrails
      where.OR = [{ agentType }, { agentType: null }];
    }

    const guardrails = await this.prisma.agentGuardrail.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return guardrails;
  }

  async upsertGuardrail(userId: string, data: UpsertGuardrailInput) {
    // Atomic count-check + insert to prevent concurrent creation past the 10-guardrail limit
    const guardrail = await this.prisma.$transaction(async (tx) => {
      const existingCount = await tx.agentGuardrail.count({ where: { userId } });
      if (existingCount >= 10) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Maximum of 10 guardrails per user. Delete an existing guardrail before creating a new one.",
        });
      }
      return tx.agentGuardrail.create({
        data: {
          userId,
          agentType: data.agentType ?? null,
          rules: data.rules as Prisma.InputJsonValue,
          isActive: data.isActive ?? true,
        },
      });
    });

    log.info("Guardrail created", { userId, guardrailId: guardrail.id });
    return guardrail;
  }

  async updateGuardrail(
    userId: string,
    guardrailId: string,
    data: UpsertGuardrailInput,
  ) {
    const existing = await this.prisma.agentGuardrail.findUnique({
      where: { id: guardrailId },
    });

    if (!existing) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Guardrail not found",
      });
    }

    if (existing.userId !== userId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not own this guardrail",
      });
    }

    const updated = await this.prisma.agentGuardrail.update({
      where: { id: guardrailId },
      data: {
        agentType: data.agentType ?? null,
        rules: data.rules as Prisma.InputJsonValue,
        isActive: data.isActive ?? existing.isActive,
      },
    });

    log.info("Guardrail updated", { userId, guardrailId });
    return updated;
  }

  async deleteGuardrail(userId: string, guardrailId: string) {
    const existing = await this.prisma.agentGuardrail.findUnique({
      where: { id: guardrailId },
    });

    if (!existing) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Guardrail not found",
      });
    }

    if (existing.userId !== userId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not own this guardrail",
      });
    }

    await this.prisma.agentGuardrail.delete({
      where: { id: guardrailId },
    });

    log.info("Guardrail deleted", { userId, guardrailId });
  }

  // ==================== ACTION CHECK ====================

  async checkAction(
    userId: string,
    agentType: string,
    actionType: string,
  ): Promise<CheckActionResult> {
    // Fetch all applicable guardrails (agent-specific + global, only active)
    const guardrails = await this.prisma.agentGuardrail.findMany({
      where: {
        userId,
        isActive: true,
        OR: [{ agentType }, { agentType: null }],
      },
    });

    if (guardrails.length === 0) {
      return { allowed: true, requiresApproval: false };
    }

    // a) Check blockedActions
    for (const guardrail of guardrails) {
      const rules = guardrail.rules as unknown as GuardrailRules;
      if (rules.blockedActions?.includes(actionType)) {
        return {
          allowed: false,
          requiresApproval: false,
          reason: "Action blocked by guardrail",
        };
      }
    }

    // b) Check allowedActions — if ANY guardrail has an allowedActions list
    //    and actionType is NOT in any of them, block
    const guardrailsWithAllowedLists = guardrails.filter((g) => {
      const rules = g.rules as unknown as GuardrailRules;
      return rules.allowedActions && rules.allowedActions.length > 0;
    });

    if (guardrailsWithAllowedLists.length > 0) {
      const isInAnyAllowedList = guardrailsWithAllowedLists.some((g) => {
        const rules = g.rules as unknown as GuardrailRules;
        return rules.allowedActions!.includes(actionType);
      });

      if (!isInAnyAllowedList) {
        return {
          allowed: false,
          requiresApproval: false,
          reason: "Action not in allowed list",
        };
      }
    }

    // c) Check maxActionsPerHour — rate limiting
    for (const guardrail of guardrails) {
      const rules = guardrail.rules as unknown as GuardrailRules;
      if (rules.maxActionsPerHour != null) {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentCount = await this.prisma.agentAuditEntry.count({
          where: {
            userId,
            createdAt: { gte: oneHourAgo },
          },
        });

        if (recentCount >= rules.maxActionsPerHour) {
          return {
            allowed: false,
            requiresApproval: false,
            reason: "Rate limit exceeded",
          };
        }
      }
    }

    // d) Check requireApprovalFor
    for (const guardrail of guardrails) {
      const rules = guardrail.rules as unknown as GuardrailRules;
      if (rules.requireApprovalFor?.includes(actionType)) {
        return { allowed: true, requiresApproval: true };
      }
    }

    // e) Default: allowed
    return { allowed: true, requiresApproval: false };
  }

  // ==================== AUDIT LOGGING ====================

  async logAuditEntry(data: LogAuditEntryInput) {
    try {
      const inputTokens = data.inputTokens ?? 0;
      const outputTokens = data.outputTokens ?? 0;

      // Gemini Flash pricing
      const estimatedCost =
        inputTokens * 0.000003 + outputTokens * 0.000015;

      const entry = await this.prisma.agentAuditEntry.create({
        data: {
          userId: data.userId,
          agentType: data.agentType,
          action: data.action,
          reasoning: data.reasoning,
          inputTokens,
          outputTokens,
          estimatedCost: new Prisma.Decimal(estimatedCost.toFixed(6)),
          durationMs: data.durationMs,
          success: data.success ?? true,
          errorMessage: data.errorMessage,
          metadata: (data.metadata as Prisma.InputJsonValue) ?? undefined,
          conversationId: data.conversationId,
        },
      });

      return entry;
    } catch (error) {
      // Fire-and-forget: log internally but don't propagate
      log.error("Failed to log audit entry", { error, data });
      return null;
    }
  }

  // ==================== AUDIT LOG QUERY ====================

  async getAuditLog(userId: string, input: AuditLogInput) {
    const page = input.page ?? 1;
    const limit = input.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.AgentAuditEntryWhereInput = { userId };

    if (input.agentType) {
      where.agentType = input.agentType;
    }

    if (input.startDate || input.endDate) {
      where.createdAt = {};
      if (input.startDate) {
        where.createdAt.gte = input.startDate;
      }
      if (input.endDate) {
        where.createdAt.lte = input.endDate;
      }
    }

    const [entries, total] = await Promise.all([
      this.prisma.agentAuditEntry.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.agentAuditEntry.count({ where }),
    ]);

    return {
      entries: entries.map((entry) => ({
        ...entry,
        createdAt: entry.createdAt.toISOString(),
        estimatedCost: entry.estimatedCost.toNumber(),
      })),
      total,
    };
  }

  // ==================== USAGE ANALYTICS ====================

  async getUsageAnalytics(
    userId: string,
    input: UsageAnalyticsInput,
  ): Promise<UsageAnalytics> {
    const periodDays = input.period === "7d" ? 7 : input.period === "30d" ? 30 : 90;
    const startDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

    const where: Prisma.AgentAuditEntryWhereInput = {
      userId,
      createdAt: { gte: startDate },
    };

    // Aggregations
    const [aggregation, errorCount, totalCount, actionGroups, entries] =
      await Promise.all([
        this.prisma.agentAuditEntry.aggregate({
          where,
          _sum: {
            inputTokens: true,
            outputTokens: true,
            estimatedCost: true,
          },
          _count: true,
        }),
        this.prisma.agentAuditEntry.count({
          where: { ...where, success: false },
        }),
        this.prisma.agentAuditEntry.count({ where }),
        this.prisma.agentAuditEntry.groupBy({
          by: ["action"],
          where,
          _count: true,
        }),
        this.prisma.agentAuditEntry.findMany({
          where,
          select: {
            createdAt: true,
            inputTokens: true,
            outputTokens: true,
            estimatedCost: true,
          },
        }),
      ]);

    const totalTokens =
      (aggregation._sum.inputTokens ?? 0) +
      (aggregation._sum.outputTokens ?? 0);
    const totalCost = aggregation._sum.estimatedCost
      ? aggregation._sum.estimatedCost.toNumber()
      : 0;
    const totalActions = aggregation._count;
    const errorRate = totalCount > 0 ? (errorCount / totalCount) * 100 : 0;

    // actionsByType
    const actionsByType: Record<string, number> = {};
    for (const group of actionGroups) {
      actionsByType[group.action] = group._count;
    }

    // dailyUsage — bucket entries by date in JavaScript
    const dailyMap = new Map<
      string,
      { tokens: number; cost: number; actions: number }
    >();

    for (const entry of entries) {
      const dateStr = entry.createdAt.toISOString().split("T")[0]!;
      const existing = dailyMap.get(dateStr) || {
        tokens: 0,
        cost: 0,
        actions: 0,
      };
      existing.tokens += entry.inputTokens + entry.outputTokens;
      existing.cost += entry.estimatedCost.toNumber();
      existing.actions += 1;
      dailyMap.set(dateStr, existing);
    }

    const dailyUsage: DailyUsage[] = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        tokens: data.tokens,
        cost: parseFloat(data.cost.toFixed(6)),
        actions: data.actions,
      }));

    return {
      totalTokens,
      totalCost,
      totalActions,
      actionsByType,
      errorRate: parseFloat(errorRate.toFixed(2)),
      dailyUsage,
    };
  }
}
