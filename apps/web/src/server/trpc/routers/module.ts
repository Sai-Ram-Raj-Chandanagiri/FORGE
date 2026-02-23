import { z } from "zod";
import { router, developerProcedure } from "../trpc";
import {
  createModuleSchema,
  updateModuleSchema,
  createVersionSchema,
} from "@/lib/validators/module";
import { ModuleService } from "@/server/services/module.service";

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
});
