import { TRPCError } from "@trpc/server";
import { type PrismaClient, Prisma } from "@forge/db";
import { logger } from "@/lib/logger";

const log = logger.forService("CreditService");

// ==================== TYPES ====================

export const CREDIT_COSTS = {
  agent_chat: 1,
  deployment_hour: 5,
  sandbox_session: 2,
  cross_module_query: 1,
  mcp_tool_call: 1,
} as const;

export type CreditCostType = keyof typeof CREDIT_COSTS;

export interface TransactionHistoryInput {
  page?: number;
  limit?: number;
  type?: string;
}

export interface CreditSufficiencyResult {
  sufficient: boolean;
  balance: number;
  deficit?: number;
}

// ==================== SERVICE ====================

export class CreditService {
  constructor(private prisma: PrismaClient) {}

  async getBalance(userId: string) {
    let balance = await this.prisma.creditBalance.findUnique({
      where: { userId },
    });

    if (!balance) {
      balance = await this.prisma.creditBalance.create({
        data: { userId },
      });
    }

    return balance;
  }

  async deductCredits(
    userId: string,
    amount: number,
    type: string,
    description: string,
    referenceId?: string,
  ) {
    if (amount <= 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Deduction amount must be positive",
      });
    }

    return this.prisma.$transaction(async (tx) => {
      // Get or create balance
      let balance = await tx.creditBalance.findUnique({
        where: { userId },
      });

      if (!balance) {
        balance = await tx.creditBalance.create({
          data: { userId },
        });
      }

      if (balance.balance < amount) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Insufficient credits: need ${amount}, have ${balance.balance}`,
        });
      }

      // Deduct
      const updated = await tx.creditBalance.update({
        where: { userId },
        data: {
          balance: { decrement: amount },
          lifetimeSpent: { increment: amount },
        },
      });

      // Create transaction record
      await tx.creditTransaction.create({
        data: {
          balanceId: updated.id,
          amount: -amount,
          type: type as unknown as "PURCHASE" | "AGENT_CHAT" | "DEPLOYMENT_HOUR" | "SANDBOX_SESSION" | "CROSS_MODULE_QUERY" | "MCP_TOOL_CALL" | "BONUS" | "REFUND" | "AUTO_TOP_UP",
          description,
          referenceId: referenceId ?? null,
        } as Prisma.CreditTransactionUncheckedCreateInput,
      });

      log.info("Credits deducted", { userId, amount, type, remaining: updated.balance });

      // Check low balance alert
      if (updated.balance <= updated.lowBalanceAlert) {
        log.warn("Low credit balance", { userId, balance: updated.balance, threshold: updated.lowBalanceAlert });

        // Create notification for low balance
        await tx.notification.create({
          data: {
            userId,
            type: "SYSTEM_ANNOUNCEMENT",
            title: "Low Credit Balance",
            body: `Your credit balance is ${updated.balance}. Consider purchasing more credits.`,
            link: "/settings/credits",
          },
        }).catch(() => {
          // Non-critical, don't fail the transaction
        });
      }

      return updated;
    });
  }

  async addCredits(
    userId: string,
    amount: number,
    type: string,
    description: string,
    referenceId?: string,
  ) {
    if (amount <= 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Credit amount must be positive",
      });
    }

    return this.prisma.$transaction(async (tx) => {
      let balance = await tx.creditBalance.findUnique({
        where: { userId },
      });

      if (!balance) {
        balance = await tx.creditBalance.create({
          data: { userId },
        });
      }

      const updated = await tx.creditBalance.update({
        where: { userId },
        data: {
          balance: { increment: amount },
          lifetimeEarned: { increment: amount },
        },
      });

      await tx.creditTransaction.create({
        data: {
          balanceId: updated.id,
          amount,
          type: type as unknown as "PURCHASE" | "AGENT_CHAT" | "DEPLOYMENT_HOUR" | "SANDBOX_SESSION" | "CROSS_MODULE_QUERY" | "MCP_TOOL_CALL" | "BONUS" | "REFUND" | "AUTO_TOP_UP",
          description,
          referenceId: referenceId ?? null,
        } as Prisma.CreditTransactionUncheckedCreateInput,
      });

      log.info("Credits added", { userId, amount, type, newBalance: updated.balance });
      return updated;
    });
  }

  async purchasePack(userId: string, packId: string) {
    // Rate limit: max 5 purchases per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentPurchases = await this.prisma.creditTransaction.count({
      where: {
        balance: { userId },
        type: "PURCHASE",
        createdAt: { gte: oneHourAgo },
      },
    });

    if (recentPurchases >= 5) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "Rate limit: max 5 pack purchases per hour",
      });
    }

    const pack = await this.prisma.creditPack.findUnique({
      where: { id: packId },
    });

    if (!pack || !pack.isActive) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Credit pack not found or inactive",
      });
    }

    // For FREE packs or packs without Stripe, add credits directly
    if (pack.price.toNumber() === 0 || !pack.stripePriceId) {
      await this.addCredits(
        userId,
        pack.credits,
        "PURCHASE",
        `Purchased ${pack.name} (${pack.credits} credits)`,
        packId,
      );
      return { success: true, creditsAdded: pack.credits };
    }

    // For paid packs, return info for Stripe checkout
    return {
      success: false,
      requiresPayment: true,
      pack: {
        id: pack.id,
        name: pack.name,
        credits: pack.credits,
        price: pack.price.toNumber(),
        stripePriceId: pack.stripePriceId,
      },
    };
  }

  async checkSufficientCredits(userId: string, amount: number): Promise<CreditSufficiencyResult> {
    const balance = await this.getBalance(userId);
    const sufficient = balance.balance >= amount;
    return {
      sufficient,
      balance: balance.balance,
      deficit: sufficient ? undefined : amount - balance.balance,
    };
  }

  async setupAutoTopUp(userId: string, packId: string) {
    const pack = await this.prisma.creditPack.findUnique({
      where: { id: packId },
    });

    if (!pack || !pack.isActive) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Credit pack not found or inactive",
      });
    }

    await this.prisma.creditBalance.upsert({
      where: { userId },
      create: {
        userId,
        autoTopUp: true,
        autoTopUpPackId: packId,
      },
      update: {
        autoTopUp: true,
        autoTopUpPackId: packId,
      },
    });

    log.info("Auto top-up configured", { userId, packId });
    return { success: true };
  }

  async removeAutoTopUp(userId: string) {
    await this.prisma.creditBalance.upsert({
      where: { userId },
      create: { userId },
      update: {
        autoTopUp: false,
        autoTopUpPackId: null,
      },
    });

    log.info("Auto top-up removed", { userId });
    return { success: true };
  }

  async getTransactions(userId: string, input: TransactionHistoryInput) {
    const page = input.page ?? 1;
    const limit = input.limit ?? 20;
    const skip = (page - 1) * limit;

    const balance = await this.getBalance(userId);

    const where: Prisma.CreditTransactionWhereInput = {
      balanceId: balance.id,
    };

    if (input.type) {
      where.type = input.type as "PURCHASE" | "AGENT_CHAT" | "DEPLOYMENT_HOUR" | "SANDBOX_SESSION" | "CROSS_MODULE_QUERY" | "MCP_TOOL_CALL" | "BONUS" | "REFUND" | "AUTO_TOP_UP";
    }

    const [transactions, total] = await Promise.all([
      this.prisma.creditTransaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.creditTransaction.count({ where }),
    ]);

    return { transactions, total };
  }

  async getAvailablePacks() {
    const packs = await this.prisma.creditPack.findMany({
      where: { isActive: true },
      orderBy: { credits: "asc" },
    });

    return packs.map((p) => ({
      ...p,
      price: p.price.toNumber(),
    }));
  }
}
