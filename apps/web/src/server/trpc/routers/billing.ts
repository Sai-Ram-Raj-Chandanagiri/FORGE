import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { PaymentService } from "@/server/services/payment.service";

export const billingRouter = router({
  getUsageSummary: protectedProcedure.query(async ({ ctx }) => {
    const prisma = ctx.prisma;

    // Get all deployment IDs belonging to the current user
    const deployments = await prisma.deployment.findMany({
      where: { userId: ctx.user.id },
      select: { id: true },
    });

    const deploymentIds = deployments.map((d) => d.id);

    if (deploymentIds.length === 0) {
      return {
        totalCpuHours: 0,
        totalMemoryGbHours: 0,
        totalNetworkGb: 0,
        totalDeployments: 0,
        estimatedCost: 0,
      };
    }

    // Aggregate usage records across all user deployments
    const usageAgg = await prisma.usageRecord.aggregate({
      where: { deploymentId: { in: deploymentIds } },
      _sum: {
        cpuSeconds: true,
        memoryMbHours: true,
        networkInBytes: true,
        networkOutBytes: true,
      },
    });

    const totalCpuHours = (usageAgg._sum.cpuSeconds ?? 0) / 3600;
    const totalMemoryGbHours = (usageAgg._sum.memoryMbHours ?? 0) / 1024;
    const totalNetworkInGb = Number(usageAgg._sum.networkInBytes ?? 0) / (1024 * 1024 * 1024);
    const totalNetworkOutGb = Number(usageAgg._sum.networkOutBytes ?? 0) / (1024 * 1024 * 1024);
    const totalNetworkGb = totalNetworkInGb + totalNetworkOutGb;

    // Estimate cost: cpu * $0.05/hr + memory * $0.01/GB-hr + network * $0.001/GB
    const estimatedCost =
      totalCpuHours * 0.05 +
      totalMemoryGbHours * 0.01 +
      totalNetworkGb * 0.001;

    return {
      totalCpuHours: Math.round(totalCpuHours * 100) / 100,
      totalMemoryGbHours: Math.round(totalMemoryGbHours * 100) / 100,
      totalNetworkGb: Math.round(totalNetworkGb * 100) / 100,
      totalDeployments: deploymentIds.length,
      estimatedCost: Math.round(estimatedCost * 100) / 100,
    };
  }),

  getUsageHistory: protectedProcedure
    .input(
      z.object({
        deploymentId: z.string().optional(),
        days: z.number().int().min(1).max(90).default(30),
      }),
    )
    .query(async ({ ctx, input }) => {
      const prisma = ctx.prisma;
      const since = new Date();
      since.setDate(since.getDate() - input.days);

      // Build the where clause based on whether a specific deployment is requested
      let deploymentFilter: { in: string[] } | string;

      if (input.deploymentId) {
        // Verify the deployment belongs to the user
        const deployment = await prisma.deployment.findFirst({
          where: { id: input.deploymentId, userId: ctx.user.id },
          select: { id: true },
        });

        if (!deployment) {
          return [];
        }

        deploymentFilter = input.deploymentId;
      } else {
        const deployments = await prisma.deployment.findMany({
          where: { userId: ctx.user.id },
          select: { id: true },
        });

        if (deployments.length === 0) {
          return [];
        }

        deploymentFilter = { in: deployments.map((d) => d.id) };
      }

      const records = await prisma.usageRecord.findMany({
        where: {
          deploymentId: deploymentFilter,
          recordedAt: { gte: since },
        },
        orderBy: { recordedAt: "asc" },
        select: {
          recordedAt: true,
          cpuSeconds: true,
          memoryMbHours: true,
          networkInBytes: true,
          networkOutBytes: true,
        },
      });

      return records.map((r) => ({
        date: r.recordedAt,
        cpuSeconds: r.cpuSeconds,
        memoryMbHours: r.memoryMbHours,
        networkBytes: Number(r.networkInBytes) + Number(r.networkOutBytes),
      }));
    }),

  getPurchaseHistory: protectedProcedure.query(async ({ ctx }) => {
    const prisma = ctx.prisma;

    const purchases = await prisma.purchase.findMany({
      where: { userId: ctx.user.id },
      include: {
        module: {
          select: { name: true, slug: true, pricingModel: true },
        },
      },
      orderBy: { purchasedAt: "desc" },
    });

    return purchases.map((p) => ({
      id: p.id,
      moduleName: p.module.name,
      moduleSlug: p.module.slug,
      pricingModel: p.module.pricingModel,
      pricePaid: p.pricePaid,
      currency: p.currency,
      purchasedAt: p.purchasedAt,
      status: p.status,
      subscriptionId: p.subscriptionId,
    }));
  }),

  cancelSubscription: protectedProcedure
    .input(z.object({ purchaseId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const paymentService = new PaymentService(ctx.prisma);
      await paymentService.cancelSubscription(ctx.user.id, input.purchaseId);
      return { success: true };
    }),
});
