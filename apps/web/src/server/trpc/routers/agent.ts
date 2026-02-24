import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import {
  chatMessageSchema,
  createWorkflowSchema,
  toggleWorkflowSchema,
  listConversationsSchema,
} from "@/lib/validators/agent";
import { AgentService } from "@/server/services/agent.service";

export const agentRouter = router({
  chat: protectedProcedure.input(chatMessageSchema).mutation(async ({ ctx, input }) => {
    const service = new AgentService(ctx.prisma);
    return service.chat(ctx.user.id, input);
  }),

  listConversations: protectedProcedure
    .input(listConversationsSchema)
    .query(async ({ ctx, input }) => {
      const service = new AgentService(ctx.prisma);
      return service.listConversations(ctx.user.id, input);
    }),

  getConversation: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const service = new AgentService(ctx.prisma);
      return service.getConversation(ctx.user.id, input.conversationId);
    }),

  createWorkflow: protectedProcedure
    .input(createWorkflowSchema)
    .mutation(async ({ ctx, input }) => {
      const service = new AgentService(ctx.prisma);
      return service.createWorkflow(ctx.user.id, input);
    }),

  listWorkflows: protectedProcedure.query(async ({ ctx }) => {
    const service = new AgentService(ctx.prisma);
    return service.listWorkflows(ctx.user.id);
  }),

  toggleWorkflow: protectedProcedure
    .input(toggleWorkflowSchema)
    .mutation(async ({ ctx, input }) => {
      const service = new AgentService(ctx.prisma);
      return service.toggleWorkflow(ctx.user.id, input);
    }),

  deleteWorkflow: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const service = new AgentService(ctx.prisma);
      return service.deleteWorkflow(ctx.user.id, input.id);
    }),

  getInsights: protectedProcedure.query(async ({ ctx }) => {
    const service = new AgentService(ctx.prisma);
    return service.getInsights(ctx.user.id);
  }),
});
