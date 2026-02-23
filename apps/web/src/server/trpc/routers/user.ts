import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, publicProcedure } from "../trpc";

export const userRouter = router({
  getProfile: publicProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { username: input.username },
        select: {
          id: true,
          name: true,
          username: true,
          avatarUrl: true,
          bio: true,
          role: true,
          createdAt: true,
          _count: {
            select: {
              publishedModules: true,
              projects: true,
              reviews: true,
            },
          },
        },
      });

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      return user;
    }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(50).optional(),
        bio: z.string().max(500).optional(),
        avatarUrl: z.string().url().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: input,
        select: {
          id: true,
          name: true,
          username: true,
          bio: true,
          avatarUrl: true,
        },
      });
      return user;
    }),

  getDashboard: protectedProcedure.query(async ({ ctx }) => {
    const [modulesCount, deploymentsCount, purchasesCount, projectsCount] =
      await Promise.all([
        ctx.prisma.module.count({ where: { authorId: ctx.user.id } }),
        ctx.prisma.deployment.count({
          where: { userId: ctx.user.id, status: { in: ["RUNNING", "STOPPED", "PENDING"] } },
        }),
        ctx.prisma.purchase.count({ where: { userId: ctx.user.id, status: "ACTIVE" } }),
        ctx.prisma.project.count({ where: { authorId: ctx.user.id } }),
      ]);

    const activeDeployments = await ctx.prisma.deployment.count({
      where: { userId: ctx.user.id, status: "RUNNING" },
    });

    return {
      modules: modulesCount,
      deployments: deploymentsCount,
      activeDeployments,
      purchases: purchasesCount,
      projects: projectsCount,
    };
  }),

  getNotifications: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        cursor: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const notifications = await ctx.prisma.notification.findMany({
        where: { userId: ctx.user.id },
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      });

      let nextCursor: string | undefined;
      if (notifications.length > input.limit) {
        const nextItem = notifications.pop();
        nextCursor = nextItem?.id;
      }

      return { notifications, nextCursor };
    }),

  markNotificationRead: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.notification.updateMany({
        where: { id: input.id, userId: ctx.user.id },
        data: { read: true },
      });
      return { success: true };
    }),
});
