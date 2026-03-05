import { router, protectedProcedure } from "../trpc";
import { WorkspaceService } from "../../services/workspace.service";
import {
  createBridgeSchema,
  bridgeIdSchema,
} from "@/lib/validators/workspace";

export const workspaceRouter = router({
  /**
   * Get workspace status including connected modules and bridges.
   */
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const service = new WorkspaceService(ctx.prisma);
    return service.getWorkspaceStatus(ctx.user.id);
  }),

  /**
   * Activate the workspace — starts Traefik proxy, connects deployments.
   */
  activate: protectedProcedure.mutation(async ({ ctx }) => {
    const service = new WorkspaceService(ctx.prisma);
    return service.activateWorkspace(ctx.user.id);
  }),

  /**
   * Deactivate the workspace — stops proxy, disconnects containers.
   */
  deactivate: protectedProcedure.mutation(async ({ ctx }) => {
    const service = new WorkspaceService(ctx.prisma);
    return service.deactivateWorkspace(ctx.user.id);
  }),

  /**
   * Create a data bridge between two deployed modules.
   */
  createBridge: protectedProcedure
    .input(createBridgeSchema)
    .mutation(async ({ ctx, input }) => {
      const service = new WorkspaceService(ctx.prisma);
      return service.createBridge(ctx.user.id, input);
    }),

  /**
   * Start a stopped bridge.
   */
  startBridge: protectedProcedure
    .input(bridgeIdSchema)
    .mutation(async ({ ctx, input }) => {
      const service = new WorkspaceService(ctx.prisma);
      return service.startBridge(ctx.user.id, input.bridgeId);
    }),

  /**
   * Stop a running bridge.
   */
  stopBridge: protectedProcedure
    .input(bridgeIdSchema)
    .mutation(async ({ ctx, input }) => {
      const service = new WorkspaceService(ctx.prisma);
      return service.stopBridge(ctx.user.id, input.bridgeId);
    }),

  /**
   * Delete a bridge (stops container if running).
   */
  deleteBridge: protectedProcedure
    .input(bridgeIdSchema)
    .mutation(async ({ ctx, input }) => {
      const service = new WorkspaceService(ctx.prisma);
      return service.deleteBridge(ctx.user.id, input.bridgeId);
    }),

  /**
   * List all bridges in the user's workspace.
   */
  listBridges: protectedProcedure.query(async ({ ctx }) => {
    const service = new WorkspaceService(ctx.prisma);
    return service.listBridges(ctx.user.id);
  }),
});
