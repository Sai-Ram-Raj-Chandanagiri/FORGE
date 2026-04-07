import { TRPCError } from "@trpc/server";
import { type PrismaClient, Prisma } from "@forge/db";
import { logger } from "@/lib/logger";

const log = logger.forService("AgentMarketplaceService");

// ==================== TYPES ====================

export interface AgentConfig {
  systemPrompt: string;
  tools: { name: string; description: string; parameters: Record<string, unknown> }[];
  personality?: string;
  greeting: string;
}

export interface PublishAgentInput {
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  logoUrl?: string;
  pricingModel: "FREE" | "ONE_TIME" | "SUBSCRIPTION_MONTHLY" | "SUBSCRIPTION_YEARLY" | "USAGE_BASED";
  price?: number;
  agentConfig: AgentConfig;
  dataPolicy?: {
    dataCollected: string[];
    dataSentExternally: boolean;
    encryptionAtRest: boolean;
  };
}

// ==================== SERVICE ====================

export class AgentMarketplaceService {
  constructor(private prisma: PrismaClient) {}

  async listAgentModules(filters?: {
    query?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ModuleWhereInput = {
      type: "AGENT",
      status: "PUBLISHED",
    };

    if (filters?.query) {
      where.OR = [
        { name: { contains: filters.query, mode: "insensitive" } },
        { shortDescription: { contains: filters.query, mode: "insensitive" } },
      ];
    }

    const [modules, total] = await Promise.all([
      this.prisma.module.findMany({
        where,
        orderBy: { downloadCount: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          slug: true,
          shortDescription: true,
          pricingModel: true,
          price: true,
          logoUrl: true,
          averageRating: true,
          downloadCount: true,
          reviewCount: true,
          agentConfig: true,
          securityScore: true,
          complianceBadges: true,
          author: { select: { id: true, name: true, username: true } },
        },
      }),
      this.prisma.module.count({ where }),
    ]);

    return {
      modules: modules.map((m) => ({
        ...m,
        price: m.price?.toNumber() ?? null,
        averageRating: Number(m.averageRating),
      })),
      total,
    };
  }

  async installAgent(userId: string, moduleId: string) {
    const mod = await this.prisma.module.findUnique({
      where: { id: moduleId },
      select: {
        id: true,
        type: true,
        status: true,
        pricingModel: true,
        authorId: true,
      },
    });

    if (!mod || mod.type !== "AGENT" || mod.status !== "PUBLISHED") {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Agent module not found",
      });
    }

    // Check if already owned
    const existing = await this.prisma.purchase.findFirst({
      where: { userId, moduleId, status: "ACTIVE" },
    });

    if (existing) {
      return { success: true, alreadyOwned: true };
    }

    if (mod.pricingModel === "FREE" || mod.authorId === userId) {
      // Atomic: create purchase + increment download count together
      await this.prisma.$transaction([
        this.prisma.purchase.create({
          data: {
            userId,
            moduleId,
            pricePaid: new Prisma.Decimal(0),
            status: "ACTIVE",
          },
        }),
        this.prisma.module.update({
          where: { id: moduleId },
          data: { downloadCount: { increment: 1 } },
        }),
      ]);

      log.info("Agent installed", { userId, moduleId });
      return { success: true };
    }

    // Paid agent — return store URL
    const slug = await this.prisma.module.findUnique({
      where: { id: moduleId },
      select: { slug: true },
    });

    return {
      success: false,
      requiresPayment: true,
      storeUrl: `/store/${slug?.slug ?? moduleId}`,
    };
  }

  async getInstalledAgents(userId: string) {
    const builtIn = [
      "setup",
      "workflow",
      "monitor",
      "integration",
      "composer",
    ];

    const installed = await this.prisma.purchase.findMany({
      where: {
        userId,
        status: "ACTIVE",
        module: { type: "AGENT", status: "PUBLISHED" },
      },
      select: {
        module: {
          select: {
            id: true,
            name: true,
            slug: true,
            shortDescription: true,
            logoUrl: true,
            agentConfig: true,
          },
        },
      },
    });

    return {
      builtIn,
      installed: installed.map((p) => p.module),
    };
  }

  async publishAgentModule(userId: string, data: PublishAgentInput) {
    // Validate agent config
    if (!data.agentConfig.systemPrompt || data.agentConfig.systemPrompt.length > 10000) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "System prompt is required and must be under 10000 characters",
      });
    }

    if (!data.agentConfig.greeting || data.agentConfig.greeting.length > 500) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Greeting is required and must be under 500 characters",
      });
    }

    // Check slug uniqueness
    const existing = await this.prisma.module.findUnique({
      where: { slug: data.slug },
    });

    if (existing) {
      throw new TRPCError({
        code: "CONFLICT",
        message: `Slug "${data.slug}" is already taken`,
      });
    }

    const mod = await this.prisma.module.create({
      data: {
        name: data.name,
        slug: data.slug,
        shortDescription: data.shortDescription,
        description: data.description,
        authorId: userId,
        type: "AGENT",
        status: "DRAFT",
        pricingModel: data.pricingModel,
        price: data.price != null ? new Prisma.Decimal(data.price) : null,
        logoUrl: data.logoUrl ?? null,
        agentConfig: data.agentConfig as unknown as Prisma.InputJsonValue,
        dataPolicy: data.dataPolicy
          ? (data.dataPolicy as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
    });

    log.info("Agent module published", { userId, moduleId: mod.id });
    return mod;
  }

  async uninstallAgent(userId: string, moduleId: string) {
    const purchase = await this.prisma.purchase.findFirst({
      where: { userId, moduleId, status: "ACTIVE" },
    });

    if (!purchase) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Agent not installed",
      });
    }

    await this.prisma.purchase.update({
      where: { id: purchase.id },
      data: { status: "CANCELLED" },
    });

    log.info("Agent uninstalled", { userId, moduleId });
    return { success: true };
  }
}
