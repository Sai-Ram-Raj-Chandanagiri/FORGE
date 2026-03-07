import { router, protectedProcedure } from "../trpc";
import { ProjectExportService } from "../../services/project-export.service";

export const exportRouter = router({
  /**
   * Generate project files as JSON (file paths + contents).
   */
  generateProject: protectedProcedure.query(async ({ ctx }) => {
    const exportService = new ProjectExportService(ctx.prisma);
    const project = await exportService.exportProject(ctx.user.id);
    return {
      name: project.name,
      fileCount: project.files.length,
      files: project.files.map((f) => ({ path: f.path })),
    };
  }),

  /**
   * Get module source information for the user's workspace.
   */
  getModuleSources: protectedProcedure.query(async ({ ctx }) => {
    const exportService = new ProjectExportService(ctx.prisma);
    return exportService.getModuleSources(ctx.user.id);
  }),
});
