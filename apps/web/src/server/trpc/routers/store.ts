import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../trpc";
import { searchModulesSchema } from "@/lib/validators/module";
import { SearchService } from "@/server/services/search.service";
import { ModuleService } from "@/server/services/module.service";

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

  purchase: protectedProcedure
    .input(z.object({ moduleId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const moduleService = new ModuleService(ctx.prisma);
      return moduleService.purchase(ctx.user.id, input.moduleId);
    }),
});
