import { router, protectedProcedure } from "../trpc";
import {
  addConnectionSchema,
  connectionIdSchema,
  toggleConnectionSchema,
} from "@/lib/validators/mcp";
import { McpService } from "@/server/services/mcp.service";

export const mcpRouter = router({
  addConnection: protectedProcedure
    .input(addConnectionSchema)
    .mutation(async ({ ctx, input }) => {
      const service = new McpService(ctx.prisma);
      return service.addConnection(ctx.user.id, input);
    }),

  listConnections: protectedProcedure.query(async ({ ctx }) => {
    const service = new McpService(ctx.prisma);
    return service.listConnections(ctx.user.id);
  }),

  testConnection: protectedProcedure
    .input(connectionIdSchema)
    .mutation(async ({ ctx, input }) => {
      const service = new McpService(ctx.prisma);
      return service.testConnection(input.connectionId, ctx.user.id);
    }),

  refreshTools: protectedProcedure
    .input(connectionIdSchema)
    .mutation(async ({ ctx, input }) => {
      const service = new McpService(ctx.prisma);
      return service.refreshTools(input.connectionId, ctx.user.id);
    }),

  removeConnection: protectedProcedure
    .input(connectionIdSchema)
    .mutation(async ({ ctx, input }) => {
      const service = new McpService(ctx.prisma);
      return service.removeConnection(input.connectionId, ctx.user.id);
    }),

  toggleConnection: protectedProcedure
    .input(toggleConnectionSchema)
    .mutation(async ({ ctx, input }) => {
      const service = new McpService(ctx.prisma);
      return service.toggleConnection(input.connectionId, ctx.user.id, input.isActive);
    }),

  getUserTools: protectedProcedure.query(async ({ ctx }) => {
    const service = new McpService(ctx.prisma);
    return service.getAllUserTools(ctx.user.id);
  }),
});
