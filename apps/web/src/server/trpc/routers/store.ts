import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../trpc";
import { searchModulesSchema, listAgentModulesSchema } from "@/lib/validators/module";
import { SearchService } from "@/server/services/search.service";
import { ModuleService } from "@/server/services/module.service";
import { PaymentService } from "@/server/services/payment.service";
import { AgentMarketplaceService } from "@/server/services/agent-marketplace.service";

export const storeRouter = router({
  browse: publicProcedure.input(searchModulesSchema).query(async ({ ctx, input }) => {
    const searchService = new SearchService(ctx.prisma);
    return searchService.searchModules(input);
  }),

  search: publicProcedure.input(searchModulesSchema).query(async ({ ctx, input }) => {
    const searchService = new SearchService(ctx.prisma);
    return searchService.searchModules(input);
  }),

  getFeatured: publicProcedure.query(async ({ ctx }) => {
    const searchService = new SearchService(ctx.prisma);
    return searchService.getFeatured();
  }),

  getPopular: publicProcedure.query(async ({ ctx }) => {
    const searchService = new SearchService(ctx.prisma);
    return searchService.getPopular();
  }),

  getRecent: publicProcedure.query(async ({ ctx }) => {
    const searchService = new SearchService(ctx.prisma);
    return searchService.getRecentlyPublished();
  }),

  getCategories: publicProcedure.query(async ({ ctx }) => {
    const searchService = new SearchService(ctx.prisma);
    return searchService.getCategories();
  }),

  getCategoryBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const searchService = new SearchService(ctx.prisma);
      return searchService.getCategoryBySlug(input.slug);
    }),

  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const moduleService = new ModuleService(ctx.prisma);
      return moduleService.getBySlug(input.slug);
    }),

  getMyPurchases: protectedProcedure.query(async ({ ctx }) => {
    const moduleService = new ModuleService(ctx.prisma);
    return moduleService.getMyPurchases(ctx.user.id);
  }),

  checkPurchase: protectedProcedure
    .input(z.object({ moduleId: z.string() }))
    .query(async ({ ctx, input }) => {
      const existing = await ctx.prisma.purchase.findFirst({
        where: { userId: ctx.user.id, moduleId: input.moduleId, status: "ACTIVE" },
        select: { id: true },
      });
      return { purchased: !!existing };
    }),

  purchase: protectedProcedure
    .input(z.object({ moduleId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const moduleService = new ModuleService(ctx.prisma);
      const origin = process.env.NEXTAUTH_URL || "http://localhost:3000";
      return moduleService.purchase(ctx.user.id, input.moduleId, origin);
    }),

  cancelSubscription: protectedProcedure
    .input(z.object({ purchaseId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const paymentService = new PaymentService(ctx.prisma);
      await paymentService.cancelSubscription(ctx.user.id, input.purchaseId);
      return { success: true };
    }),

  // ==================== Agent Marketplace ====================

  listAgentModules: publicProcedure
    .input(listAgentModulesSchema)
    .query(async ({ ctx, input }) => {
      const service = new AgentMarketplaceService(ctx.prisma);
      return service.listAgentModules(input);
    }),

  getAgentModule: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const moduleService = new ModuleService(ctx.prisma);
      return moduleService.getBySlug(input.slug);
    }),

  installAgent: protectedProcedure
    .input(z.object({ moduleId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const service = new AgentMarketplaceService(ctx.prisma);
      return service.installAgent(ctx.user.id, input.moduleId);
    }),

  getInstalledAgents: protectedProcedure.query(async ({ ctx }) => {
    const service = new AgentMarketplaceService(ctx.prisma);
    return service.getInstalledAgents(ctx.user.id);
  }),

  uninstallAgent: protectedProcedure
    .input(z.object({ moduleId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const service = new AgentMarketplaceService(ctx.prisma);
      return service.uninstallAgent(ctx.user.id, input.moduleId);
    }),
});
