import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../trpc";
import { createReviewSchema, updateReviewSchema } from "@/lib/validators/module";
import { ReviewService } from "@/server/services/review.service";

export const reviewRouter = router({
  create: protectedProcedure.input(createReviewSchema).mutation(async ({ ctx, input }) => {
    const reviewService = new ReviewService(ctx.prisma);
    return reviewService.create(ctx.user.id, input);
  }),

  update: protectedProcedure.input(updateReviewSchema).mutation(async ({ ctx, input }) => {
    const reviewService = new ReviewService(ctx.prisma);
    return reviewService.update(ctx.user.id, input);
  }),

  delete: protectedProcedure
    .input(z.object({ moduleId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const reviewService = new ReviewService(ctx.prisma);
      return reviewService.delete(ctx.user.id, input.moduleId);
    }),

  getForModule: publicProcedure
    .input(
      z.object({
        moduleId: z.string(),
        cursor: z.string().optional(),
        limit: z.number().int().min(1).max(50).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      const reviewService = new ReviewService(ctx.prisma);
      return reviewService.getForModule(input.moduleId, input.cursor, input.limit);
    }),
});
