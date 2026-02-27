import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { createDeploymentSchema, listDeploymentsSchema } from "@/lib/validators/deployment";
import { DeploymentService } from "@/server/services/deployment.service";

export const deploymentRouter = router({
  create: protectedProcedure.input(createDeploymentSchema).mutation(async ({ ctx, input }) => {
    const service = new DeploymentService(ctx.prisma);
    return service.create(ctx.user.id, input);
  }),

  list: protectedProcedure.input(listDeploymentsSchema).query(async ({ ctx, input }) => {
    const service = new DeploymentService(ctx.prisma);
    return service.list(ctx.user.id, input.status, input.page, input.limit);
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const service = new DeploymentService(ctx.prisma);
      return service.getById(ctx.user.id, input.id);
    }),

  start: protectedProcedure
    .input(z.object({ deploymentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const service = new DeploymentService(ctx.prisma);
      return service.start(ctx.user.id, input.deploymentId);
    }),

  stop: protectedProcedure
    .input(z.object({ deploymentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const service = new DeploymentService(ctx.prisma);
      return service.stop(ctx.user.id, input.deploymentId);
    }),

  restart: protectedProcedure
    .input(z.object({ deploymentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const service = new DeploymentService(ctx.prisma);
      return service.restart(ctx.user.id, input.deploymentId);
    }),

  terminate: protectedProcedure
    .input(z.object({ deploymentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const service = new DeploymentService(ctx.prisma);
      return service.terminate(ctx.user.id, input.deploymentId);
    }),

  getLogs: protectedProcedure
    .input(
      z.object({
        deploymentId: z.string(),
        limit: z.number().int().min(1).max(200).default(100),
        cursor: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const service = new DeploymentService(ctx.prisma);
      return service.getLogs(ctx.user.id, input.deploymentId, input.limit, input.cursor);
    }),

  getContainerLogs: protectedProcedure
    .input(
      z.object({
        deploymentId: z.string(),
        tail: z.number().int().min(1).max(500).default(100),
        since: z.number().int().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const service = new DeploymentService(ctx.prisma);
      return service.getContainerLogs(ctx.user.id, input.deploymentId, input.tail, input.since);
    }),

  getContainerStats: protectedProcedure
    .input(z.object({ deploymentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const service = new DeploymentService(ctx.prisma);
      return service.getContainerStats(ctx.user.id, input.deploymentId);
    }),

  getStats: protectedProcedure.query(async ({ ctx }) => {
    const service = new DeploymentService(ctx.prisma);
    return service.getStats(ctx.user.id);
  }),
});
