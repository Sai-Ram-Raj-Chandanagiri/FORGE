import { router, protectedProcedure } from "../trpc";
import {
  usageTrendsSchema,
  costForecastSchema,
} from "@/lib/validators/insights";
import { PredictiveService } from "@/server/services/predictive.service";

export const insightsRouter = router({
  getDashboard: protectedProcedure.query(async ({ ctx }) => {
    const service = new PredictiveService(ctx.prisma);
    return service.getDashboardInsights(ctx.user.id);
  }),

  getUsageTrends: protectedProcedure
    .input(usageTrendsSchema)
    .query(async ({ ctx, input }) => {
      const service = new PredictiveService(ctx.prisma);
      return service.getUsageTrends(ctx.user.id, input.period);
    }),

  getAnomalies: protectedProcedure.query(async ({ ctx }) => {
    const service = new PredictiveService(ctx.prisma);
    return service.detectAnomalies(ctx.user.id);
  }),

  getCostForecast: protectedProcedure
    .input(costForecastSchema)
    .query(async ({ ctx, input }) => {
      const service = new PredictiveService(ctx.prisma);
      return service.forecastCosts(ctx.user.id, input.months);
    }),

  getRecommendations: protectedProcedure.query(async ({ ctx }) => {
    const service = new PredictiveService(ctx.prisma);
    return service.getRecommendations(ctx.user.id);
  }),
});
