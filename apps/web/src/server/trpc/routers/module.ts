import { z } from "zod";
import { router, publicProcedure, developerProcedure } from "../trpc";
import {
  createModuleSchema,
  updateModuleSchema,
  createVersionSchema,
  buildFromRepoSchema,
  getBuildStatusSchema,
  detectProjectSchema,
  publishAgentModuleSchema,
} from "@/lib/validators/module";
import { ModuleService } from "@/server/services/module.service";
import { AgentMarketplaceService } from "@/server/services/agent-marketplace.service";
import { SecurityScannerService } from "@/server/services/security-scanner.service";
import { ImageBuilder, ProjectDetector } from "@forge/docker-manager";
import * as path from "path";
import * as fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export const moduleRouter = router({
  create: developerProcedure.input(createModuleSchema).mutation(async ({ ctx, input }) => {
    const moduleService = new ModuleService(ctx.prisma);
    return moduleService.create(ctx.user.id, input);
  }),

  update: developerProcedure.input(updateModuleSchema).mutation(async ({ ctx, input }) => {
    const moduleService = new ModuleService(ctx.prisma);
    return moduleService.update(ctx.user.id, input);
  }),

  publish: developerProcedure
    .input(z.object({ moduleId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const moduleService = new ModuleService(ctx.prisma);
      return moduleService.publish(ctx.user.id, input.moduleId);
    }),

  archive: developerProcedure
    .input(z.object({ moduleId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const moduleService = new ModuleService(ctx.prisma);
      return moduleService.archive(ctx.user.id, input.moduleId);
    }),

  createVersion: developerProcedure.input(createVersionSchema).mutation(async ({ ctx, input }) => {
    const moduleService = new ModuleService(ctx.prisma);
    return moduleService.createVersion(ctx.user.id, input);
  }),

  getMyModules: developerProcedure.query(async ({ ctx }) => {
    const moduleService = new ModuleService(ctx.prisma);
    return moduleService.getMyModules(ctx.user.id);
  }),

  getBySlugForEdit: developerProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const moduleService = new ModuleService(ctx.prisma);
      return moduleService.getBySlugForAuthor(input.slug, ctx.user.id);
    }),

  // ==================== Build Pipeline Endpoints ====================

  buildFromRepo: developerProcedure
    .input(buildFromRepoSchema)
    .mutation(async ({ ctx, input }) => {
      const moduleService = new ModuleService(ctx.prisma);
      return moduleService.buildFromRepo(ctx.user.id, input.versionId);
    }),

  buildWithCustomDockerfile: developerProcedure
    .input(z.object({
      versionId: z.string(),
      customDockerfile: z.string().min(1).max(50000),
    }))
    .mutation(async ({ ctx, input }) => {
      const moduleService = new ModuleService(ctx.prisma);
      return moduleService.buildWithCustomDockerfile(
        ctx.user.id,
        input.versionId,
        input.customDockerfile,
      );
    }),

  getBuildStatus: developerProcedure
    .input(getBuildStatusSchema)
    .query(async ({ ctx, input }) => {
      const moduleService = new ModuleService(ctx.prisma);
      return moduleService.getBuildStatus(ctx.user.id, input.versionId);
    }),

  // ==================== Agent Marketplace ====================

  publishAgentModule: developerProcedure
    .input(publishAgentModuleSchema)
    .mutation(async ({ ctx, input }) => {
      const service = new AgentMarketplaceService(ctx.prisma);
      return service.publishAgentModule(ctx.user.id, input);
    }),

  getComplianceSummary: publicProcedure
    .input(z.object({ moduleId: z.string() }))
    .query(async ({ ctx, input }) => {
      const service = new SecurityScannerService(ctx.prisma);
      return service.getComplianceSummary(input.moduleId);
    }),

  triggerSecurityScan: developerProcedure
    .input(z.object({ versionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const service = new SecurityScannerService(ctx.prisma);
      return service.scanModule(input.versionId, ctx.user.id);
    }),

  /**
   * Detects project type from a GitHub repo URL without building.
   * Clones the repo temporarily, scans files, returns detection result.
   */
  detectProject: developerProcedure
    .input(detectProjectSchema)
    .mutation(async ({ input }) => {
      const tempDir = path.join(
        process.env.TEMP || process.env.TMPDIR || "/tmp",
        `forge-detect-${Date.now()}`,
      );

      try {
        // Shallow clone
        const sanitizedUrl = input.repoUrl.replace(/[;&|`$]/g, "");
        const sanitizedBranch = input.branch.replace(/[;&|`$]/g, "");
        await execAsync(
          `git clone --depth 1 --branch "${sanitizedBranch}" "${sanitizedUrl}" "${tempDir}"`,
          { timeout: 60_000 },
        );

        const detector = new ProjectDetector();
        const detection = detector.detect(tempDir);

        let generatedDockerfile: string | null = null;
        if (!detection.hasDockerfile) {
          generatedDockerfile = detector.generateDockerfile(detection);
        }

        let existingDockerfile: string | null = null;
        if (detection.hasDockerfile && detection.dockerfilePath) {
          const dfPath = path.join(tempDir, detection.dockerfilePath);
          if (fs.existsSync(dfPath)) {
            existingDockerfile = fs.readFileSync(dfPath, "utf-8");
          }
        }

        return {
          ...detection,
          generatedDockerfile,
          existingDockerfile,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to detect project";
        return {
          type: "unknown" as const,
          hasDockerfile: false,
          error: message,
          generatedDockerfile: null,
          existingDockerfile: null,
        };
      } finally {
        // Clean up
        if (fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      }
    }),
});
