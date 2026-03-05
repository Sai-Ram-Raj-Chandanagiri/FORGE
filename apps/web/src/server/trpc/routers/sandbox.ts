import { router, protectedProcedure } from "../trpc";
import { SandboxService } from "../../services/sandbox.service";
import {
  startSandboxSchema,
  getSandboxStatusSchema,
  stopSandboxSchema,
  listSandboxesSchema,
} from "@/lib/validators/sandbox";

export const sandboxRouter = router({
  /**
   * Start a sandbox demo for a published module.
   * Spins up a temporary container with resource limits and a 15-minute TTL.
   */
  startDemo: protectedProcedure
    .input(startSandboxSchema)
    .mutation(async ({ ctx, input }) => {
      const service = new SandboxService(ctx.prisma);
      return service.startDemo(ctx.user.id, input.moduleId, input.versionId, input.durationMinutes);
    }),

  /**
   * Get the current status of a sandbox session (running, expired, etc.)
   * Also returns the remaining time in seconds.
   */
  getStatus: protectedProcedure
    .input(getSandboxStatusSchema)
    .query(async ({ ctx, input }) => {
      const service = new SandboxService(ctx.prisma);
      return service.getStatus(ctx.user.id, input.sessionId);
    }),

  /**
   * Manually stop a sandbox demo before it expires.
   */
  stopDemo: protectedProcedure
    .input(stopSandboxSchema)
    .mutation(async ({ ctx, input }) => {
      const service = new SandboxService(ctx.prisma);
      return service.stopDemo(ctx.user.id, input.sessionId);
    }),

  /**
   * List all sandbox sessions for the current user.
   */
  list: protectedProcedure
    .input(listSandboxesSchema)
    .query(async ({ ctx, input }) => {
      const service = new SandboxService(ctx.prisma);
      return service.listForUser(ctx.user.id, input.status);
    }),
});
