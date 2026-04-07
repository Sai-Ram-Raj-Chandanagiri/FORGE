import { type PrismaClient, Prisma } from "@forge/db";
import { logger } from "@/lib/logger";

const log = logger.forService("PredictiveService");

// ==================== TYPES ====================

export interface UsageTrend {
  date: string;
  cpuHours: number;
  memoryGbHours: number;
  networkGb: number;
  estimatedCost: number;
}

export interface UsageTrendsResult {
  trends: UsageTrend[];
  trendDirection: "up" | "down" | "stable";
  percentChange: number;
}

export interface Anomaly {
  deploymentId: string;
  deploymentName: string;
  metric: string;
  value: number;
  mean: number;
  stddev: number;
  severity: "WARNING" | "CRITICAL";
  detectedAt: string;
}

export interface CostForecast {
  month: string;
  projected: number;
  lowerBound: number;
  upperBound: number;
}

export interface CostForecastResult {
  forecasts: CostForecast[];
  insufficient?: boolean;
}

export interface ModuleRecommendation {
  moduleId: string;
  name: string;
  slug: string;
  shortDescription: string;
  pricingModel: string;
  averageRating: number;
  downloadCount: number;
  score: number;
}

export interface DashboardInsights {
  trends?: UsageTrendsResult;
  anomalies?: Anomaly[];
  forecast?: CostForecastResult;
  recommendations?: ModuleRecommendation[];
  errors: string[];
}

// ==================== COST RATES ====================

const CPU_COST_PER_HOUR = 0.01;
const MEMORY_COST_PER_GB_HOUR = 0.005;
const NETWORK_COST_PER_GB = 0.02;

// ==================== SERVICE ====================

export class PredictiveService {
  constructor(private prisma: PrismaClient) {}

  async getUsageTrends(
    userId: string,
    period: "7d" | "30d" | "90d",
  ): Promise<UsageTrendsResult> {
    const periodDays = period === "7d" ? 7 : period === "30d" ? 30 : 90;
    const cacheTtlMs =
      period === "7d" ? 60 * 60 * 1000 : 6 * 60 * 60 * 1000;
    const cacheKey = `usage_trends_${period}`;

    // Check cache
    const cached = await this.getCachedInsight<UsageTrendsResult>(
      userId,
      cacheKey,
    );
    if (cached) return cached;

    const startDate = new Date(
      Date.now() - periodDays * 24 * 60 * 60 * 1000,
    );

    // Get user's deployments
    const deployments = await this.prisma.deployment.findMany({
      where: { userId },
      select: { id: true },
    });

    const deploymentIds = deployments.map((d) => d.id);

    if (deploymentIds.length === 0) {
      const empty: UsageTrendsResult = {
        trends: [],
        trendDirection: "stable",
        percentChange: 0,
      };
      return empty;
    }

    // Fetch usage records
    const records = await this.prisma.usageRecord.findMany({
      where: {
        deploymentId: { in: deploymentIds },
        periodStart: { gte: startDate },
      },
      orderBy: { periodStart: "asc" },
    });

    // Bucket by date
    const dailyMap = new Map<
      string,
      { cpuSeconds: number; memoryMbHours: number; networkBytes: number }
    >();

    for (const rec of records) {
      const dateStr = rec.periodStart.toISOString().split("T")[0]!;
      const existing = dailyMap.get(dateStr) || {
        cpuSeconds: 0,
        memoryMbHours: 0,
        networkBytes: 0,
      };
      existing.cpuSeconds += rec.cpuSeconds;
      existing.memoryMbHours += rec.memoryMbHours;
      existing.networkBytes +=
        Number(rec.networkInBytes) + Number(rec.networkOutBytes);
      dailyMap.set(dateStr, existing);
    }

    const trends: UsageTrend[] = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => {
        const cpuHours = data.cpuSeconds / 3600;
        const memoryGbHours = data.memoryMbHours / 1024;
        const networkGb = data.networkBytes / (1024 * 1024 * 1024);
        return {
          date,
          cpuHours: parseFloat(cpuHours.toFixed(4)),
          memoryGbHours: parseFloat(memoryGbHours.toFixed(4)),
          networkGb: parseFloat(networkGb.toFixed(4)),
          estimatedCost: parseFloat(
            (
              cpuHours * CPU_COST_PER_HOUR +
              memoryGbHours * MEMORY_COST_PER_GB_HOUR +
              networkGb * NETWORK_COST_PER_GB
            ).toFixed(6),
          ),
        };
      });

    // Calculate trend direction via simple slope
    let trendDirection: "up" | "down" | "stable" = "stable";
    let percentChange = 0;

    if (trends.length >= 2) {
      const firstCost = trends[0]!.estimatedCost;
      const lastCost = trends[trends.length - 1]!.estimatedCost;
      if (firstCost > 0) {
        percentChange = parseFloat(
          (((lastCost - firstCost) / firstCost) * 100).toFixed(2),
        );
      }
      if (percentChange > 5) trendDirection = "up";
      else if (percentChange < -5) trendDirection = "down";
    }

    const result: UsageTrendsResult = {
      trends,
      trendDirection,
      percentChange,
    };

    // Cache
    await this.setCachedInsight(userId, cacheKey, result, cacheTtlMs);
    return result;
  }

  async detectAnomalies(userId: string): Promise<Anomaly[]> {
    const deployments = await this.prisma.deployment.findMany({
      where: { userId },
      select: { id: true, name: true },
    });

    if (deployments.length === 0) return [];

    const anomalies: Anomaly[] = [];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    for (const deployment of deployments) {
      const records = await this.prisma.usageRecord.findMany({
        where: {
          deploymentId: deployment.id,
          periodStart: { gte: thirtyDaysAgo },
        },
        orderBy: { periodStart: "asc" },
      });

      if (records.length < 7) continue;

      // Check CPU
      const cpuValues = records.map((r) => r.cpuSeconds);
      this.checkForAnomalies(
        cpuValues,
        records,
        deployment,
        "cpuSeconds",
        sevenDaysAgo,
        anomalies,
      );

      // Check memory
      const memValues = records.map((r) => r.memoryMbHours);
      this.checkForAnomalies(
        memValues,
        records,
        deployment,
        "memoryMbHours",
        sevenDaysAgo,
        anomalies,
      );
    }

    return anomalies;
  }

  private checkForAnomalies(
    values: number[],
    records: { periodStart: Date }[],
    deployment: { id: string; name: string },
    metric: string,
    cutoff: Date,
    anomalies: Anomaly[],
  ) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance =
      values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
    const stddev = Math.sqrt(variance);

    if (stddev === 0) return;

    for (let i = 0; i < records.length; i++) {
      const rec = records[i]!;
      if (rec.periodStart < cutoff) continue;

      const val = values[i]!;
      const zScore = (val - mean) / stddev;

      if (zScore > 2) {
        anomalies.push({
          deploymentId: deployment.id,
          deploymentName: deployment.name,
          metric,
          value: parseFloat(val.toFixed(2)),
          mean: parseFloat(mean.toFixed(2)),
          stddev: parseFloat(stddev.toFixed(2)),
          severity: zScore > 3 ? "CRITICAL" : "WARNING",
          detectedAt: rec.periodStart.toISOString(),
        });
      }
    }
  }

  async forecastCosts(
    userId: string,
    months: number,
  ): Promise<CostForecastResult> {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const deployments = await this.prisma.deployment.findMany({
      where: { userId },
      select: { id: true },
    });

    if (deployments.length === 0) {
      return { forecasts: [], insufficient: true };
    }

    const records = await this.prisma.usageRecord.findMany({
      where: {
        deploymentId: { in: deployments.map((d) => d.id) },
        periodStart: { gte: ninetyDaysAgo },
      },
      orderBy: { periodStart: "asc" },
    });

    if (records.length < 14) {
      return { forecasts: [], insufficient: true };
    }

    // Aggregate daily costs
    const dailyCosts = new Map<string, number>();
    for (const rec of records) {
      const dateStr = rec.periodStart.toISOString().split("T")[0]!;
      const cost =
        (rec.cpuSeconds / 3600) * CPU_COST_PER_HOUR +
        (rec.memoryMbHours / 1024) * MEMORY_COST_PER_GB_HOUR +
        (Number(rec.networkInBytes) + Number(rec.networkOutBytes)) /
          (1024 * 1024 * 1024) *
          NETWORK_COST_PER_GB;
      dailyCosts.set(dateStr, (dailyCosts.get(dateStr) || 0) + cost);
    }

    const costArray = Array.from(dailyCosts.values());

    // Simple linear regression
    const n = costArray.length;
    const xMean = (n - 1) / 2;
    const yMean = costArray.reduce((a, b) => a + b, 0) / n;
    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (costArray[i]! - yMean);
      denominator += (i - xMean) ** 2;
    }

    const slope = denominator !== 0 ? numerator / denominator : 0;
    const intercept = yMean - slope * xMean;

    const forecasts: CostForecast[] = [];
    const now = new Date();

    for (let m = 1; m <= months; m++) {
      const futureDate = new Date(now);
      futureDate.setMonth(futureDate.getMonth() + m);
      const daysFromStart = n + m * 30;
      const dailyProjected = slope * daysFromStart + intercept;
      const monthlyCost = Math.max(0, dailyProjected * 30);

      forecasts.push({
        month: futureDate.toISOString().slice(0, 7),
        projected: parseFloat(monthlyCost.toFixed(2)),
        lowerBound: parseFloat((monthlyCost * 0.85).toFixed(2)),
        upperBound: parseFloat((monthlyCost * 1.15).toFixed(2)),
      });
    }

    return { forecasts };
  }

  async getRecommendations(
    userId: string,
  ): Promise<ModuleRecommendation[]> {
    // Get user's purchased module categories/tags
    const purchases = await this.prisma.purchase.findMany({
      where: { userId, status: "ACTIVE" },
      select: { moduleId: true },
    });

    const authoredModules = await this.prisma.module.findMany({
      where: { authorId: userId },
      select: { id: true },
    });

    const ownedIds = new Set([
      ...purchases.map((p) => p.moduleId),
      ...authoredModules.map((m) => m.id),
    ]);

    if (ownedIds.size === 0) {
      // No purchases — recommend popular modules
      const popular = await this.prisma.module.findMany({
        where: { status: "PUBLISHED" },
        orderBy: { downloadCount: "desc" },
        take: 5,
        select: {
          id: true,
          name: true,
          slug: true,
          shortDescription: true,
          pricingModel: true,
          averageRating: true,
          downloadCount: true,
        },
      });

      return popular.map((m) => {
        const rating = typeof m.averageRating === "number"
          ? m.averageRating
          : Number(m.averageRating);
        return {
          moduleId: m.id,
          name: m.name,
          slug: m.slug,
          shortDescription: m.shortDescription,
          pricingModel: m.pricingModel,
          averageRating: rating,
          downloadCount: m.downloadCount,
          score: m.downloadCount * rating,
        };
      });
    }

    // Get categories of owned modules
    const ownedCategories = await this.prisma.moduleCategory.findMany({
      where: { moduleId: { in: Array.from(ownedIds) } },
      select: { categoryId: true },
    });

    const categoryIds = [
      ...new Set(ownedCategories.map((c) => c.categoryId)),
    ];

    // Find similar modules not owned
    const recommendations = await this.prisma.module.findMany({
      where: {
        status: "PUBLISHED",
        id: { notIn: Array.from(ownedIds) },
        categories: {
          some: { categoryId: { in: categoryIds } },
        },
      },
      orderBy: [
        { downloadCount: "desc" },
        { averageRating: "desc" },
      ],
      take: 5,
      select: {
        id: true,
        name: true,
        slug: true,
        shortDescription: true,
        pricingModel: true,
        averageRating: true,
        downloadCount: true,
      },
    });

    return recommendations.map((m) => {
      const rating = typeof m.averageRating === "number"
        ? m.averageRating
        : Number(m.averageRating);
      return {
        moduleId: m.id,
        name: m.name,
        slug: m.slug,
        shortDescription: m.shortDescription,
        pricingModel: m.pricingModel,
        averageRating: rating,
        downloadCount: m.downloadCount,
        score: m.downloadCount * rating,
      };
    });
  }

  async getDashboardInsights(userId: string): Promise<DashboardInsights> {
    const errors: string[] = [];

    const results = await Promise.allSettled([
      this.getUsageTrends(userId, "7d"),
      this.detectAnomalies(userId),
      this.forecastCosts(userId, 3),
      this.getRecommendations(userId),
    ]);

    const trends =
      results[0]!.status === "fulfilled" ? results[0]!.value : undefined;
    if (results[0]!.status === "rejected") errors.push("Failed to load usage trends");

    const anomalies =
      results[1]!.status === "fulfilled" ? results[1]!.value : undefined;
    if (results[1]!.status === "rejected") errors.push("Failed to detect anomalies");

    const forecast =
      results[2]!.status === "fulfilled" ? results[2]!.value : undefined;
    if (results[2]!.status === "rejected") errors.push("Failed to forecast costs");

    const recommendations =
      results[3]!.status === "fulfilled" ? results[3]!.value : undefined;
    if (results[3]!.status === "rejected") errors.push("Failed to load recommendations");

    return { trends, anomalies, forecast, recommendations, errors };
  }

  // ==================== CACHE HELPERS ====================

  private async getCachedInsight<T>(
    userId: string,
    insightType: string,
  ): Promise<T | null> {
    const cached = await this.prisma.cachedInsight.findFirst({
      where: {
        userId,
        insightType,
        validUntil: { gt: new Date() },
      },
    });

    if (!cached) return null;
    return cached.data as T;
  }

  private async setCachedInsight(
    userId: string,
    insightType: string,
    data: unknown,
    ttlMs: number,
  ): Promise<void> {
    try {
      const validUntil = new Date(Date.now() + ttlMs);

      const existing = await this.prisma.cachedInsight.findFirst({
        where: { userId, insightType },
      });

      if (existing) {
        await this.prisma.cachedInsight.update({
          where: { id: existing.id },
          data: {
            data: data as Prisma.InputJsonValue,
            validUntil,
          },
        });
      } else {
        await this.prisma.cachedInsight.create({
          data: {
            userId,
            insightType,
            data: data as Prisma.InputJsonValue,
            validUntil,
          },
        });
      }
    } catch (err) {
      log.warn("Failed to cache insight", { userId, insightType, err });
    }
  }
}
