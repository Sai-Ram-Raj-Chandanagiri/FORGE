import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import {
  chatMessageSchema,
  createWorkflowSchema,
  toggleWorkflowSchema,
  listConversationsSchema,
  approveActionSchema,
  rejectActionSchema,
  actionHistorySchema,
  paginatedSchema,
  createScheduledTaskSchema,
  updateScheduledTaskSchema,
  upsertProfileSchema,
  upsertGuardrailSchema,
  updateGuardrailSchema,
  auditLogSchema,
  usageAnalyticsSchema,
} from "@/lib/validators/agent";
import { AgentService } from "@/server/services/agent.service";
import { ActionQueueService } from "@/server/services/action-queue.service";
import { AgentProfileService } from "@/server/services/agent-profile.service";
import { GovernanceService } from "@/server/services/governance.service";

export const agentRouter = router({
  // ==================== Chat ====================

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

  // ==================== Workflows ====================

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

  // ==================== Action Queue ====================

  listPendingApprovals: protectedProcedure
    .input(paginatedSchema)
    .query(async ({ ctx, input }) => {
      const service = new ActionQueueService(ctx.prisma);
      return service.listPendingApprovals(ctx.user.id, input);
    }),

  approveAction: protectedProcedure
    .input(approveActionSchema)
    .mutation(async ({ ctx, input }) => {
      const service = new ActionQueueService(ctx.prisma);
      return service.approveAction(ctx.user.id, input.actionId);
    }),

  rejectAction: protectedProcedure
    .input(rejectActionSchema)
    .mutation(async ({ ctx, input }) => {
      const service = new ActionQueueService(ctx.prisma);
      return service.rejectAction(ctx.user.id, input.actionId, input.reason);
    }),

  cancelAction: protectedProcedure
    .input(z.object({ actionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const service = new ActionQueueService(ctx.prisma);
      return service.cancelAction(ctx.user.id, input.actionId);
    }),

  getActionHistory: protectedProcedure
    .input(actionHistorySchema)
    .query(async ({ ctx, input }) => {
      const service = new ActionQueueService(ctx.prisma);
      return service.getActionHistory(ctx.user.id, input);
    }),

  // ==================== Scheduled Tasks ====================

  createScheduledTask: protectedProcedure
    .input(createScheduledTaskSchema)
    .mutation(async ({ ctx, input }) => {
      const service = new ActionQueueService(ctx.prisma);
      return service.createScheduledTask(ctx.user.id, input);
    }),

  listScheduledTasks: protectedProcedure.query(async ({ ctx }) => {
    const service = new ActionQueueService(ctx.prisma);
    return service.listScheduledTasks(ctx.user.id);
  }),

  updateScheduledTask: protectedProcedure
    .input(updateScheduledTaskSchema)
    .mutation(async ({ ctx, input }) => {
      const service = new ActionQueueService(ctx.prisma);
      return service.updateScheduledTask(ctx.user.id, input.id, input);
    }),

  deleteScheduledTask: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const service = new ActionQueueService(ctx.prisma);
      return service.deleteScheduledTask(ctx.user.id, input.id);
    }),

  // ==================== Agent Profile ====================

  getProfile: protectedProcedure
    .input(z.object({ organizationId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const service = new AgentProfileService(ctx.prisma);
      return service.getProfile(ctx.user.id, input?.organizationId);
    }),

  upsertProfile: protectedProcedure
    .input(upsertProfileSchema)
    .mutation(async ({ ctx, input }) => {
      const service = new AgentProfileService(ctx.prisma);
      return service.upsertProfile(ctx.user.id, input);
    }),

  deleteProfile: protectedProcedure
    .input(z.object({ profileId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const service = new AgentProfileService(ctx.prisma);
      await service.deleteProfile(ctx.user.id, input.profileId);
      return { success: true };
    }),

  // ==================== Governance ====================

  getGuardrails: protectedProcedure
    .input(z.object({ agentType: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const service = new GovernanceService(ctx.prisma);
      return service.getGuardrails(ctx.user.id, input?.agentType);
    }),

  upsertGuardrail: protectedProcedure
    .input(upsertGuardrailSchema)
    .mutation(async ({ ctx, input }) => {
      const service = new GovernanceService(ctx.prisma);
      return service.upsertGuardrail(ctx.user.id, input);
    }),

  updateGuardrail: protectedProcedure
    .input(updateGuardrailSchema)
    .mutation(async ({ ctx, input }) => {
      const service = new GovernanceService(ctx.prisma);
      return service.updateGuardrail(ctx.user.id, input.guardrailId, input);
    }),

  deleteGuardrail: protectedProcedure
    .input(z.object({ guardrailId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const service = new GovernanceService(ctx.prisma);
      await service.deleteGuardrail(ctx.user.id, input.guardrailId);
      return { success: true };
    }),

  getAuditLog: protectedProcedure
    .input(auditLogSchema)
    .query(async ({ ctx, input }) => {
      const service = new GovernanceService(ctx.prisma);
      return service.getAuditLog(ctx.user.id, input);
    }),

  getUsageAnalytics: protectedProcedure
    .input(usageAnalyticsSchema)
    .query(async ({ ctx, input }) => {
      const service = new GovernanceService(ctx.prisma);
      return service.getUsageAnalytics(ctx.user.id, input);
    }),
});
