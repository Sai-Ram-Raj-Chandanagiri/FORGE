import { z } from "zod";

export const usageTrendsSchema = z.object({
  period: z.enum(["7d", "30d", "90d"]),
});

export const costForecastSchema = z.object({
  months: z.number().int().min(1).max(12).default(3),
});

export const anomalySchema = z.object({
  severity: z.enum(["WARNING", "CRITICAL"]).optional(),
});

export const dashboardInsightsSchema = z.object({
  period: z.enum(["7d", "30d", "90d"]).default("7d"),
});

export const recommendationSchema = z.object({
  limit: z.number().int().min(1).max(20).default(5),
});
