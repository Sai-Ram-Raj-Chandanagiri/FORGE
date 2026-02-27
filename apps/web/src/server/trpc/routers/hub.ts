import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../trpc";
import {
  createProjectSchema,
  createCommentSchema,
  createSubmissionSchema,
  listProjectsSchema,
} from "@/lib/validators/hub";
import { HubService } from "@/server/services/hub.service";

export const hubRouter = router({
  listProjects: publicProcedure.input(listProjectsSchema).query(async ({ ctx, input }) => {
    const service = new HubService(ctx.prisma);
    const userId = (ctx.session?.user as { id?: string } | undefined)?.id;
    return service.listProjects(input, userId);
  }),

  getProjectBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const service = new HubService(ctx.prisma);
      const userId = (ctx.session?.user as { id?: string } | undefined)?.id;
      return service.getProjectBySlug(input.slug, userId);
    }),

  getMyProjects: protectedProcedure.query(async ({ ctx }) => {
    const service = new HubService(ctx.prisma);
    return service.getMyProjects(ctx.user.id);
  }),

  createProject: protectedProcedure.input(createProjectSchema).mutation(async ({ ctx, input }) => {
    const service = new HubService(ctx.prisma);
    return service.createProject(ctx.user.id, input);
  }),

  starProject: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const service = new HubService(ctx.prisma);
      return service.starProject(ctx.user.id, input.projectId);
    }),

  addComment: protectedProcedure.input(createCommentSchema).mutation(async ({ ctx, input }) => {
    const service = new HubService(ctx.prisma);
    return service.addComment(ctx.user.id, input);
  }),

  createSubmission: protectedProcedure
    .input(createSubmissionSchema)
    .mutation(async ({ ctx, input }) => {
      const service = new HubService(ctx.prisma);
      return service.createSubmission(ctx.user.id, input);
    }),

  getMySubmissions: protectedProcedure.query(async ({ ctx }) => {
    const service = new HubService(ctx.prisma);
    return service.getMySubmissions(ctx.user.id);
  }),

  getDeveloperProfile: publicProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ ctx, input }) => {
      const service = new HubService(ctx.prisma);
      return service.getDeveloperProfile(input.username);
    }),
});
