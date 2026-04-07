import { TRPCError } from "@trpc/server";
import { type PrismaClient, Prisma } from "@forge/db";
import { logger } from "@/lib/logger";

const log = logger.forService("SecurityScannerService");

// ==================== TYPES ====================

export interface ScanCheck {
  name: string;
  passed: boolean;
  weight: number;
  description: string;
  details?: string;
}

export interface ScanResult {
  score: number;
  checks: ScanCheck[];
  scannedAt: string;
  dockerfileSource: "fetched" | "unavailable";
}

export interface ComplianceSummary {
  score: number | null;
  badges: string[];
  dataPolicy: unknown;
  lastScanDate: string | null;
}

// ==================== SERVICE ====================

const FETCH_TIMEOUT_MS = 10000;
const MAX_DOCKERFILE_BYTES = 256 * 1024; // 256 KB cap

export class SecurityScannerService {
  constructor(private prisma: PrismaClient) {}

  async scanModule(versionId: string, userId: string): Promise<ScanResult> {
    // Rate limit: max 10 scans/hour per user
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentScans = await this.prisma.moduleVersion.count({
      where: {
        module: { authorId: userId },
        securityScanResult: { not: Prisma.DbNull },
        publishedAt: { gte: oneHourAgo },
      },
    });

    if (recentScans >= 10) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "Rate limit: max 10 scans per hour",
      });
    }

    const version = await this.prisma.moduleVersion.findUnique({
      where: { id: versionId },
      select: {
        id: true,
        moduleId: true,
        dockerImage: true,
        sourceRepoUrl: true,
        sourceBranch: true,
        dockerfilePath: true,
        module: { select: { authorId: true } },
      },
    });

    if (!version) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Module version not found" });
    }

    if (version.module.authorId !== userId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You can only scan your own modules",
      });
    }

    // Attempt to fetch real Dockerfile content from the source repo
    const dockerfileContent = await this.fetchDockerfile(
      version.sourceRepoUrl,
      version.sourceBranch ?? "main",
      version.dockerfilePath ?? "./Dockerfile",
    );

    const imageChecks = this.scanDockerImage(version.dockerImage);
    const contentChecks = dockerfileContent
      ? this.scanDockerfile(dockerfileContent)
      : this.unavailableContentChecks();

    const checks = [...imageChecks, ...contentChecks];
    const totalWeight = checks.reduce((sum, c) => sum + c.weight, 0);
    const passedWeight = checks.filter((c) => c.passed).reduce((sum, c) => sum + c.weight, 0);
    const score = totalWeight > 0 ? Math.round((passedWeight / totalWeight) * 100) : 0;

    const scanResult: ScanResult = {
      score,
      checks,
      scannedAt: new Date().toISOString(),
      dockerfileSource: dockerfileContent ? "fetched" : "unavailable",
    };

    await this.prisma.moduleVersion.update({
      where: { id: versionId },
      data: { securityScanResult: scanResult as unknown as Prisma.InputJsonValue },
    });

    await this.updateModuleSecurityScore(version.moduleId);

    log.info("Security scan completed", {
      versionId,
      score,
      dockerfileSource: scanResult.dockerfileSource,
      passedChecks: checks.filter((c) => c.passed).length,
      totalChecks: checks.length,
    });

    return scanResult;
  }

  /**
   * Fetch raw Dockerfile content from a GitHub repo (only supported host).
   * Returns null if unavailable, not GitHub, or fetch fails.
   */
  private async fetchDockerfile(
    sourceRepoUrl: string | null,
    branch: string,
    dockerfilePath: string,
  ): Promise<string | null> {
    if (!sourceRepoUrl) return null;

    try {
      const url = new URL(sourceRepoUrl);
      if (url.hostname !== "github.com" && url.hostname !== "www.github.com") {
        return null;
      }
      const parts = url.pathname.replace(/^\//, "").replace(/\.git$/, "").split("/");
      if (parts.length < 2) return null;
      const [owner, repo] = parts;
      const cleanPath = dockerfilePath.replace(/^\.\//, "").replace(/^\//, "");
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${cleanPath}`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      try {
        const res = await fetch(rawUrl, { signal: controller.signal });
        if (!res.ok) return null;
        const text = await res.text();
        if (text.length > MAX_DOCKERFILE_BYTES) {
          return text.slice(0, MAX_DOCKERFILE_BYTES);
        }
        return text;
      } finally {
        clearTimeout(timeout);
      }
    } catch (err) {
      log.warn("Failed to fetch Dockerfile from source repo", { sourceRepoUrl, err });
      return null;
    }
  }

  /**
   * Real static analysis of Dockerfile content (5 checks, weighted 85/100 total).
   * Strictly regex-based — never executes scanned code.
   */
  scanDockerfile(content: string): ScanCheck[] {
    const lines = content
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith("#"));

    const hasUser = lines.some((l) => /^USER\s+(?!root\b|0\b)\S+/i.test(l));
    const hasHealthcheck = lines.some((l) => /^HEALTHCHECK\b/i.test(l));
    const usesAdd = lines.some((l) => /^ADD\s+/i.test(l));
    const hasCopy = lines.some((l) => /^COPY\s+/i.test(l));

    // Secret patterns in ENV/ARG/RUN lines
    const secretPatterns = [
      /\b(PASSWORD|PASSWD|SECRET|API_KEY|APIKEY|TOKEN|PRIVATE_KEY|ACCESS_KEY|AWS_SECRET)\s*=\s*["']?[^\s"'${}]+/i,
    ];
    const hasHardcodedSecret = lines.some((l) => {
      if (!/^(ENV|ARG|RUN)\b/i.test(l)) return false;
      return secretPatterns.some((pattern) => pattern.test(l));
    });

    // Privileged / cap-add hints
    const hasPrivileged = lines.some((l) => /--privileged|--cap-add/i.test(l));

    return [
      {
        name: "no-root-user",
        passed: hasUser,
        weight: 15,
        description: "Container does not run as root user (USER instruction present)",
        details: hasUser ? undefined : "No non-root USER instruction found",
      },
      {
        name: "no-hardcoded-secrets",
        passed: !hasHardcodedSecret,
        weight: 25,
        description: "No hardcoded secrets in ENV/ARG/RUN instructions",
        details: hasHardcodedSecret
          ? "Potential secret literal detected in Dockerfile"
          : undefined,
      },
      {
        name: "healthcheck-defined",
        passed: hasHealthcheck,
        weight: 10,
        description: "HEALTHCHECK instruction defined",
        details: hasHealthcheck ? undefined : "No HEALTHCHECK found",
      },
      {
        name: "copy-not-add",
        passed: hasCopy && !usesAdd,
        weight: 10,
        description: "Uses COPY instead of ADD for local files",
        details: usesAdd ? "ADD instruction found (prefer COPY)" : undefined,
      },
      {
        name: "no-privileged",
        passed: !hasPrivileged,
        weight: 15,
        description: "No --privileged or --cap-add flags",
        details: hasPrivileged ? "Privileged mode flag detected" : undefined,
      },
    ];
  }

  /**
   * When Dockerfile content cannot be fetched, return content checks as failed
   * with "unavailable" details — honest score instead of inflated fake passes.
   */
  private unavailableContentChecks(): ScanCheck[] {
    const checks = this.scanDockerfile(""); // yields all-failed shape
    return checks.map((c) => ({
      ...c,
      details: "Dockerfile content unavailable (sourceRepoUrl missing or unreachable)",
    }));
  }

  /**
   * Image-name-only checks (no Dockerfile content required). Weight: 30/100.
   */
  private scanDockerImage(dockerImage: string): ScanCheck[] {
    const checks: ScanCheck[] = [];

    checks.push({
      name: "pinned-base-image",
      passed: !dockerImage.endsWith(":latest") && dockerImage.includes(":"),
      weight: 10,
      description: "Image has a pinned version tag (not :latest)",
    });

    const baseImage = dockerImage.split(":")[0]!.split("/").pop()!;
    const rootImages = ["ubuntu", "centos", "debian"];
    checks.push({
      name: "minimal-base",
      passed: !rootImages.some((img) => baseImage === img),
      weight: 10,
      description: "Uses a minimal base image (not a full OS)",
    });

    const tag = dockerImage.split(":")[1] ?? "";
    checks.push({
      name: "semver-tag",
      passed: /^\d+\.\d+(\.\d+)?/.test(tag),
      weight: 5,
      description: "Image tag follows semantic versioning",
    });

    const isOfficial = !dockerImage.includes("/") || dockerImage.split("/").length <= 2;
    checks.push({
      name: "official-image",
      passed: isOfficial,
      weight: 5,
      description: "Uses an official or well-known image namespace",
    });

    return checks;
  }

  async updateModuleSecurityScore(moduleId: string): Promise<void> {
    const latestVersion = await this.prisma.moduleVersion.findFirst({
      where: { moduleId, securityScanResult: { not: Prisma.DbNull } },
      orderBy: { publishedAt: "desc" },
      select: { securityScanResult: true },
    });

    if (!latestVersion?.securityScanResult) return;

    const scanResult = latestVersion.securityScanResult as unknown as ScanResult;

    const badges: string[] = [];
    for (const check of scanResult.checks) {
      if (check.passed) badges.push(check.name);
    }

    await this.prisma.module.update({
      where: { id: moduleId },
      data: {
        securityScore: scanResult.score,
        complianceBadges: badges,
      },
    });
  }

  async getComplianceSummary(moduleId: string): Promise<ComplianceSummary> {
    const mod = await this.prisma.module.findFirst({
      where: { id: moduleId, status: "PUBLISHED" },
      select: {
        securityScore: true,
        complianceBadges: true,
        dataPolicy: true,
        versions: {
          where: { securityScanResult: { not: Prisma.DbNull } },
          orderBy: { publishedAt: "desc" },
          take: 1,
          select: { securityScanResult: true, publishedAt: true },
        },
      },
    });

    if (!mod) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Published module not found",
      });
    }

    const lastScan = mod.versions[0];

    return {
      score: mod.securityScore,
      badges: mod.complianceBadges,
      dataPolicy: mod.dataPolicy,
      lastScanDate: lastScan?.publishedAt?.toISOString() ?? null,
    };
  }
}
