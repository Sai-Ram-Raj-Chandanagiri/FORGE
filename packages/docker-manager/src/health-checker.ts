export interface HealthCheckResult {
  healthy: boolean;
  statusCode?: number;
  responseTime: number; // ms
  error?: string;
  checkedAt: string;
}

export class HealthChecker {
  async check(url: string, timeoutMs = 5000): Promise<HealthCheckResult> {
    const start = Date.now();
    const checkedAt = new Date().toISOString();

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        signal: controller.signal,
        method: "GET",
      });

      clearTimeout(timeout);
      const responseTime = Date.now() - start;

      return {
        healthy: response.status >= 200 && response.status < 400,
        statusCode: response.status,
        responseTime,
        checkedAt,
      };
    } catch (err) {
      return {
        healthy: false,
        responseTime: Date.now() - start,
        error: err instanceof Error ? err.message : "Unknown error",
        checkedAt,
      };
    }
  }

  async checkWithRetries(
    url: string,
    retries = 3,
    delayMs = 2000,
    timeoutMs = 5000,
  ): Promise<HealthCheckResult> {
    let lastResult: HealthCheckResult | undefined;

    for (let i = 0; i <= retries; i++) {
      lastResult = await this.check(url, timeoutMs);
      if (lastResult.healthy) return lastResult;
      if (i < retries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    return lastResult!;
  }
}
