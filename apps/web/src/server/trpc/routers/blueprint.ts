import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import type { Prisma } from "@forge/db";

export const blueprintRouter = router({
  /**
   * List user's own blueprints.
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.blueprint.findMany({
      where: { authorId: ctx.user.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        orgType: true,
        tags: true,
        isPublic: true,
        usageCount: true,
        status: true,
        version: true,
        modules: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }),

  /**
   * Browse public published blueprints.
   */
  browse: publicProcedure
    .input(
      z.object({
        query: z.string().optional(),
        orgType: z.string().optional(),
        limit: z.number().min(1).max(50).default(20),
        cursor: z.string().optional(),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const where: Prisma.BlueprintWhereInput = {
        isPublic: true,
        status: "published",
      };

      if (input?.orgType) {
        where.orgType = input.orgType;
      }

      if (input?.query) {
        where.OR = [
          { name: { contains: input.query, mode: "insensitive" } },
          { description: { contains: input.query, mode: "insensitive" } },
          { tags: { has: input.query.toLowerCase() } },
        ];
      }

      const blueprints = await ctx.prisma.blueprint.findMany({
        where,
        orderBy: { usageCount: "desc" },
        take: (input?.limit ?? 20) + 1,
        ...(input?.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          orgType: true,
          tags: true,
          usageCount: true,
          modules: true,
          version: true,
          author: { select: { name: true, username: true, avatarUrl: true } },
        },
      });

      const limit = input?.limit ?? 20;
      const hasMore = blueprints.length > limit;
      const items = hasMore ? blueprints.slice(0, limit) : blueprints;
      const nextCursor = hasMore ? items[items.length - 1]?.id : undefined;

      return { items, nextCursor };
    }),

  /**
   * Get blueprint by slug.
   */
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const bp = await ctx.prisma.blueprint.findUnique({
        where: { slug: input.slug },
        include: {
          author: { select: { name: true, username: true, avatarUrl: true } },
        },
      });

      if (!bp) throw new TRPCError({ code: "NOT_FOUND", message: "Blueprint not found" });

      return bp;
    }),

  /**
   * Save current workspace as a blueprint.
   */
  save: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        orgType: z.string().optional(),
        tags: z.array(z.string()).max(10).default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const workspace = await ctx.prisma.workspace.findUnique({
        where: { userId: ctx.user.id },
        include: { layout: true, bridges: true },
      });

      if (!workspace) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No workspace found" });
      }

      const deployments = await ctx.prisma.deployment.findMany({
        where: { userId: ctx.user.id, status: "RUNNING" },
        include: {
          module: { select: { slug: true, name: true } },
          version: { select: { version: true, dockerImage: true, exposedPort: true, healthCheckPath: true } },
        },
      });

      if (deployments.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No running deployments to save" });
      }

      const slug = input.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      // Check uniqueness
      const existing = await ctx.prisma.blueprint.findUnique({ where: { slug } });
      const finalSlug = existing ? `${slug}-${Date.now().toString(36)}` : slug;

      const modulesData = deployments.map((d) => ({
        moduleSlug: d.module.slug,
        moduleName: d.module.name,
        version: d.version.version,
        dockerImage: d.version.dockerImage,
        exposedPort: d.version.exposedPort,
        healthCheckPath: d.version.healthCheckPath,
      }));

      const bridgesData = workspace.bridges.map((b) => ({
        sourceDeploymentId: b.sourceDeploymentId,
        targetDeploymentId: b.targetDeploymentId,
        name: b.name,
        bridgeType: b.bridgeType,
        config: b.configuration,
      }));

      const layoutData = workspace.layout?.layout || null;

      const blueprint = await ctx.prisma.blueprint.create({
        data: {
          name: input.name,
          slug: finalSlug,
          description: input.description,
          authorId: ctx.user.id,
          modules: modulesData as unknown as Prisma.InputJsonValue,
          bridges: bridgesData as unknown as Prisma.InputJsonValue,
          layout: layoutData ? (layoutData as Prisma.InputJsonValue) : undefined,
          orgType: input.orgType,
          tags: input.tags.map((t) => t.toLowerCase()),
        },
      });

      return blueprint;
    }),

  /**
   * Publish a blueprint (make it public).
   */
  publish: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const bp = await ctx.prisma.blueprint.findUnique({ where: { id: input.id } });
      if (!bp || bp.authorId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your blueprint" });
      }

      return ctx.prisma.blueprint.update({
        where: { id: input.id },
        data: { isPublic: true, status: "published" },
      });
    }),

  /**
   * Delete a blueprint.
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const bp = await ctx.prisma.blueprint.findUnique({ where: { id: input.id } });
      if (!bp || bp.authorId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your blueprint" });
      }

      await ctx.prisma.blueprint.delete({ where: { id: input.id } });
      return { success: true };
    }),
});
