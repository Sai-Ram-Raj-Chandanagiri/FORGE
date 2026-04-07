import { TRPCError } from "@trpc/server";
import { type PrismaClient, Prisma } from "@forge/db";
import { logger } from "@/lib/logger";

const log = logger.forService("ActionQueueService");

// ==================== INPUT/OUTPUT TYPES ====================

export interface EnqueueActionInput {
  agentType: string;
  actionType: string;
  payload: Record<string, unknown>;
  requiresApproval?: boolean;
  scheduledFor?: Date;
  conversationId?: string;
  priority?: "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
}

export interface PaginatedInput {
  page?: number;
  limit?: number;
}

export interface ActionHistoryInput extends PaginatedInput {
  status?: string;
}

export interface CreateScheduledTaskInput {
  name: string;
  description?: string;
  agentType: string;
  cronExpression: string;
  actionType: string;
  payload: Record<string, unknown>;
}

export interface UpdateScheduledTaskInput {
  id: string;
  name?: string;
  description?: string;
  cronExpression?: string;
  isActive?: boolean;
  payload?: Record<string, unknown>;
}

// ==================== CRON HELPER ====================

/**
 * Parse a single cron field and check if a value matches.
 * Supports: `*`, specific numbers, and `* /N` intervals.
 */
function cronFieldMatches(field: string, value: number, max: number): boolean {
  if (field === "*") return true;

  // Interval: */N
  if (field.startsWith("*/")) {
    const interval = parseInt(field.slice(2), 10);
    if (isNaN(interval) || interval <= 0) return false;
    return value % interval === 0;
  }

  // Specific number
  const num = parseInt(field, 10);
  if (isNaN(num)) return false;
  return value === num;
}

/**
 * Calculate the next run time for a 5-field cron expression.
 * Fields: minute hour dayOfMonth month dayOfWeek
 * Basic implementation handling *, specific numbers, and * /N.
 */
function calculateNextRun(cronExpression: string): Date {
  const parts = cronExpression.trim().split(/\s+/);
  if (parts.length !== 5) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Invalid cron expression: expected 5 fields, got ${parts.length}`,
    });
  }

  const [minuteField, hourField, dayOfMonthField, monthField, dayOfWeekField] =
    parts as [string, string, string, string, string];

  const now = new Date();
  // Start checking from the next minute
  const candidate = new Date(now);
  candidate.setSeconds(0, 0);
  candidate.setMinutes(candidate.getMinutes() + 1);

  // Search up to 366 days ahead
  const maxIterations = 366 * 24 * 60;
  for (let i = 0; i < maxIterations; i++) {
    const minute = candidate.getMinutes();
    const hour = candidate.getHours();
    const dayOfMonth = candidate.getDate();
    const month = candidate.getMonth() + 1; // cron months are 1-12
    const dayOfWeek = candidate.getDay(); // 0=Sunday

    if (
      cronFieldMatches(minuteField, minute, 59) &&
      cronFieldMatches(hourField, hour, 23) &&
      cronFieldMatches(dayOfMonthField, dayOfMonth, 31) &&
      cronFieldMatches(monthField, month, 12) &&
      cronFieldMatches(dayOfWeekField, dayOfWeek, 6)
    ) {
      return candidate;
    }

    candidate.setMinutes(candidate.getMinutes() + 1);
  }

  // Fallback: 24 hours from now
  const fallback = new Date();
  fallback.setHours(fallback.getHours() + 24);
  return fallback;
}

const CRON_REGEX = /^(\*|(\*\/)?[0-9]+)\s+(\*|(\*\/)?[0-9]+)\s+(\*|(\*\/)?[0-9]+)\s+(\*|(\*\/)?[0-9]+)\s+(\*|(\*\/)?[0-9]+)$/;

const PRIORITY_ORDER: Record<string, number> = {
  LOW: 1,
  NORMAL: 2,
  HIGH: 3,
  CRITICAL: 4,
};

// ==================== SERVICE ====================

export class ActionQueueService {
  constructor(private prisma: PrismaClient) {}

  // ---------- 1. enqueueAction ----------

  async enqueueAction(userId: string, data: EnqueueActionInput) {
    if (data.scheduledFor && data.scheduledFor <= new Date()) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "scheduledFor must be in the future",
      });
    }

    const item = await this.prisma.actionQueueItem.create({
      data: {
        userId,
        agentType: data.agentType,
        actionType: data.actionType,
        payload: data.payload as Prisma.InputJsonValue,
        requiresApproval: data.requiresApproval ?? false,
        scheduledFor: data.scheduledFor ?? null,
        conversationId: data.conversationId ?? null,
        priority: data.priority ?? "NORMAL",
      },
    });

    log.info(
      `Enqueued action ${item.id}: ${data.agentType}/${data.actionType} for user ${userId}`,
    );

    return item;
  }

  // ---------- 2. listPendingApprovals ----------

  async listPendingApprovals(userId: string, input: PaginatedInput) {
    const page = input.page ?? 1;
    const limit = input.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = {
      userId,
      requiresApproval: true,
      status: "PENDING" as const,
    };

    const [items, total] = await Promise.all([
      this.prisma.actionQueueItem.findMany({
        where,
        orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
        skip,
        take: limit,
      }),
      this.prisma.actionQueueItem.count({ where }),
    ]);

    return { items, total };
  }

  // ---------- 3. approveAction ----------

  async approveAction(userId: string, actionId: string) {
    const action = await this.prisma.actionQueueItem.findFirst({
      where: { id: actionId, userId },
    });

    if (!action) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Action not found",
      });
    }

    if (action.status !== "PENDING") {
      throw new TRPCError({
        code: "CONFLICT",
        message: `Cannot approve action with status "${action.status}"`,
      });
    }

    const updated = await this.prisma.actionQueueItem.update({
      where: { id: actionId },
      data: {
        status: "APPROVED",
        approvedBy: userId,
        approvedAt: new Date(),
      },
    });

    return updated;
  }

  // ---------- 4. rejectAction ----------

  async rejectAction(userId: string, actionId: string, reason?: string) {
    const action = await this.prisma.actionQueueItem.findFirst({
      where: { id: actionId, userId },
    });

    if (!action) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Action not found",
      });
    }

    if (action.status !== "PENDING") {
      throw new TRPCError({
        code: "CONFLICT",
        message: `Cannot reject action with status "${action.status}"`,
      });
    }

    const updated = await this.prisma.actionQueueItem.update({
      where: { id: actionId },
      data: {
        status: "REJECTED",
        rejectedReason: reason ?? null,
      },
    });

    return updated;
  }

  // ---------- 5. cancelAction ----------

  async cancelAction(userId: string, actionId: string) {
    const action = await this.prisma.actionQueueItem.findFirst({
      where: { id: actionId, userId },
    });

    if (!action) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Action not found",
      });
    }

    if (action.status !== "PENDING" && action.status !== "APPROVED") {
      throw new TRPCError({
        code: "CONFLICT",
        message: `Cannot cancel action with status "${action.status}"`,
      });
    }

    const updated = await this.prisma.actionQueueItem.update({
      where: { id: actionId },
      data: { status: "CANCELLED" },
    });

    return updated;
  }

  // ---------- 6. executeAction ----------

  async executeAction(actionId: string) {
    return this.prisma.$transaction(async (tx) => {
      const action = await tx.actionQueueItem.findUnique({
        where: { id: actionId },
      });

      if (!action) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Action not found",
        });
      }

      const canExecute =
        action.status === "APPROVED" ||
        (action.status === "PENDING" && !action.requiresApproval);

      if (!canExecute) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Cannot execute action with status "${action.status}" (requiresApproval=${action.requiresApproval})`,
        });
      }

      const updated = await tx.actionQueueItem.update({
        where: { id: actionId },
        data: { status: "EXECUTING" },
      });

      return updated;
    });
  }

  // ---------- 7. completeAction ----------

  async completeAction(actionId: string, result: Record<string, unknown>) {
    const updated = await this.prisma.actionQueueItem.update({
      where: { id: actionId },
      data: {
        status: "COMPLETED",
        result: result as Prisma.InputJsonValue,
        executedAt: new Date(),
      },
    });

    return updated;
  }

  // ---------- 8. failAction ----------

  async failAction(actionId: string, errorMessage: string) {
    const action = await this.prisma.actionQueueItem.findUnique({
      where: { id: actionId },
    });

    if (!action) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Action not found",
      });
    }

    if (action.retryCount < action.maxRetries) {
      const updated = await this.prisma.actionQueueItem.update({
        where: { id: actionId },
        data: {
          retryCount: { increment: 1 },
          status: "PENDING",
        },
      });
      return updated;
    }

    const updated = await this.prisma.actionQueueItem.update({
      where: { id: actionId },
      data: {
        status: "FAILED",
        errorMessage,
      },
    });

    return updated;
  }

  // ---------- 9. processQueue ----------

  async processQueue() {
    const now = new Date();

    const items = await this.prisma.actionQueueItem.findMany({
      where: {
        OR: [
          { status: "APPROVED" },
          { status: "PENDING", requiresApproval: false },
        ],
        AND: {
          OR: [{ scheduledFor: null }, { scheduledFor: { lte: now } }],
        },
      },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      take: 50,
    });

    let processed = 0;
    let failed = 0;

    for (const item of items) {
      try {
        await this.executeAction(item.id);
        processed++;
      } catch (err) {
        failed++;
        log.error(`Failed to execute action ${item.id}: ${String(err)}`);
      }
    }

    return { processed, failed };
  }

  // ---------- 10. getActionHistory ----------

  async getActionHistory(userId: string, input: ActionHistoryInput) {
    const page = input.page ?? 1;
    const limit = input.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ActionQueueItemWhereInput = { userId };
    if (input.status) {
      where.status = input.status as any;
    }

    const [items, total] = await Promise.all([
      this.prisma.actionQueueItem.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.actionQueueItem.count({ where }),
    ]);

    return { items, total };
  }

  // ---------- 11. createScheduledTask ----------

  async createScheduledTask(userId: string, data: CreateScheduledTaskInput) {
    if (!CRON_REGEX.test(data.cronExpression)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Invalid cron expression: "${data.cronExpression}"`,
      });
    }

    const existingCount = await this.prisma.scheduledAgentTask.count({
      where: { userId },
    });

    if (existingCount >= 20) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Maximum of 20 scheduled tasks per user",
      });
    }

    const nextRunAt = calculateNextRun(data.cronExpression);

    const task = await this.prisma.scheduledAgentTask.create({
      data: {
        userId,
        agentType: data.agentType,
        name: data.name,
        description: data.description ?? null,
        cronExpression: data.cronExpression,
        actionType: data.actionType,
        payload: data.payload as Prisma.InputJsonValue,
        nextRunAt,
      },
    });

    log.info(`Created scheduled task ${task.id} for user ${userId}`);

    return task;
  }

  // ---------- 12. listScheduledTasks ----------

  async listScheduledTasks(userId: string) {
    return this.prisma.scheduledAgentTask.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  // ---------- 13. updateScheduledTask ----------

  async updateScheduledTask(
    userId: string,
    taskId: string,
    data: UpdateScheduledTaskInput,
  ) {
    const task = await this.prisma.scheduledAgentTask.findFirst({
      where: { id: taskId, userId },
    });

    if (!task) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Scheduled task not found",
      });
    }

    const updateData: Prisma.ScheduledAgentTaskUpdateInput = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.payload !== undefined) {
      updateData.payload = data.payload as Prisma.InputJsonValue;
    }
    if (data.cronExpression !== undefined) {
      if (!CRON_REGEX.test(data.cronExpression)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Invalid cron expression: "${data.cronExpression}"`,
        });
      }
      updateData.cronExpression = data.cronExpression;
      updateData.nextRunAt = calculateNextRun(data.cronExpression);
    }

    const updated = await this.prisma.scheduledAgentTask.update({
      where: { id: taskId },
      data: updateData,
    });

    return updated;
  }

  // ---------- 14. deleteScheduledTask ----------

  async deleteScheduledTask(userId: string, taskId: string) {
    const task = await this.prisma.scheduledAgentTask.findFirst({
      where: { id: taskId, userId },
    });

    if (!task) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Scheduled task not found",
      });
    }

    await this.prisma.scheduledAgentTask.delete({
      where: { id: taskId },
    });

    return { success: true };
  }

  // ---------- 15. processScheduledTasks ----------

  async processScheduledTasks() {
    const now = new Date();

    const tasks = await this.prisma.scheduledAgentTask.findMany({
      where: {
        isActive: true,
        nextRunAt: { lte: now },
      },
      take: 50,
    });

    let triggered = 0;

    for (const task of tasks) {
      try {
        await this.enqueueAction(task.userId, {
          agentType: task.agentType,
          actionType: task.actionType,
          payload: (task.payload as Record<string, unknown>) ?? {},
        });

        const newNextRunAt = calculateNextRun(task.cronExpression);

        await this.prisma.scheduledAgentTask.update({
          where: { id: task.id },
          data: {
            lastRunAt: now,
            runCount: { increment: 1 },
            nextRunAt: newNextRunAt,
          },
        });

        triggered++;
      } catch (err) {
        log.error(
          `Failed to process scheduled task ${task.id}: ${String(err)}`,
        );
      }
    }

    return { triggered };
  }
}
