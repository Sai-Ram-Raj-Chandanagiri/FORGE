import { z } from "zod";
import { router, adminProcedure } from "../trpc";
import {
  reviewModuleSchema,
  reviewSubmissionSchema,
  listUsersSchema,
  updateUserStatusSchema,
} from "@/lib/validators/admin";
import { AdminService } from "@/server/services/admin.service";

export const adminRouter = router({
  getReviewQueue: adminProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const service = new AdminService(ctx.prisma);
      return service.getReviewQueue(input.page, input.limit);
    }),

  reviewModule: adminProcedure.input(reviewModuleSchema).mutation(async ({ ctx, input }) => {
    const service = new AdminService(ctx.prisma);
    return service.reviewModule(ctx.user.id, input);
  }),

  listUsers: adminProcedure.input(listUsersSchema).query(async ({ ctx, input }) => {
    const service = new AdminService(ctx.prisma);
    return service.listUsers(input);
  }),

  updateUserStatus: adminProcedure.input(updateUserStatusSchema).mutation(async ({ ctx, input }) => {
    const service = new AdminService(ctx.prisma);
    return service.updateUserStatus(input);
  }),

  getSubmissionQueue: adminProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const service = new AdminService(ctx.prisma);
      return service.getSubmissionQueue(input.page, input.limit);
    }),

  reviewSubmission: adminProcedure
    .input(reviewSubmissionSchema)
    .mutation(async ({ ctx, input }) => {
      const service = new AdminService(ctx.prisma);
      return service.reviewSubmission(ctx.user.id, input);
    }),

  getSystemMetrics: adminProcedure.query(async ({ ctx }) => {
    const service = new AdminService(ctx.prisma);
    return service.getSystemMetrics();
  }),

  getAuditLogs: adminProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      const service = new AdminService(ctx.prisma);
      return service.getAuditLogs(input.page, input.limit);
    }),
});
