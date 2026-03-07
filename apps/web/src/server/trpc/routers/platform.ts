import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { Prisma } from "@forge/db";
import { WorkspaceService } from "../../services/workspace.service";
import type { PlatformLayoutConfig, SidebarItem, SidebarGroup } from "../../services/workspace-dashboard";

export const platformRouter = router({
  /**
   * Get the current platform layout for the user's workspace.
   */
  getLayout: protectedProcedure.query(async ({ ctx }) => {
    const workspace = await ctx.prisma.workspace.findUnique({
      where: { userId: ctx.user.id },
      include: { layout: true },
    });

    if (!workspace) return { hasLayout: false, workspace: null, layout: null };
    if (!workspace.layout) return { hasLayout: false, workspace: { id: workspace.id, status: workspace.status, proxyPort: workspace.proxyPort }, layout: null };

    return {
      hasLayout: true,
      workspace: { id: workspace.id, status: workspace.status, proxyPort: workspace.proxyPort },
      layout: {
        id: workspace.layout.id,
        name: workspace.layout.name,
        config: workspace.layout.layout as unknown as PlatformLayoutConfig,
        updatedAt: workspace.layout.updatedAt.toISOString(),
      },
    };
  }),

  /**
   * Update the platform layout (partial update).
   */
  updateLayout: protectedProcedure
    .input(
      z.object({
        theme: z.object({
          brandName: z.string().max(100).optional(),
          primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
          logoUrl: z.string().url().nullable().optional(),
        }).optional(),
        homepage: z.string().max(100).optional(),
        sidebar: z.array(z.object({
          moduleSlug: z.string(),
          label: z.string().max(50),
          icon: z.string().max(30),
          group: z.string().max(50),
          order: z.number().int().min(0),
        })).optional(),
        groups: z.array(z.object({
          name: z.string().max(50),
          order: z.number().int().min(0),
        })).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const workspace = await ctx.prisma.workspace.findUnique({
        where: { userId: ctx.user.id },
        include: { layout: true },
      });

      if (!workspace) throw new Error("No workspace found");
      if (!workspace.layout) throw new Error("No layout exists. Generate one first via the Composer agent.");

      const current = workspace.layout.layout as unknown as PlatformLayoutConfig;

      const updated: PlatformLayoutConfig = {
        theme: input.theme ? { ...current.theme, ...input.theme } : current.theme,
        homepage: input.homepage ?? current.homepage,
        sidebar: (input.sidebar as SidebarItem[]) ?? current.sidebar,
        groups: (input.groups as SidebarGroup[]) ?? current.groups,
      };

      await ctx.prisma.platformLayout.update({
        where: { workspaceId: workspace.id },
        data: {
          name: input.theme?.brandName ?? workspace.layout.name,
          layout: updated as unknown as Prisma.InputJsonValue,
        },
      });

      // Regenerate proxy if active
      if (workspace.status === "active") {
        const workspaceService = new WorkspaceService(ctx.prisma);
        try {
          await workspaceService.regenerateProxy(ctx.user.id);
        } catch {
          // Non-fatal
        }
      }

      return { success: true, layout: updated };
    }),

  /**
   * Update just the theme (name, color, logo).
   */
  updateTheme: protectedProcedure
    .input(
      z.object({
        brandName: z.string().max(100).optional(),
        primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
        logoUrl: z.string().url().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const workspace = await ctx.prisma.workspace.findUnique({
        where: { userId: ctx.user.id },
        include: { layout: true },
      });

      if (!workspace?.layout) throw new Error("No layout exists");

      const current = workspace.layout.layout as unknown as PlatformLayoutConfig;
      const updatedTheme = { ...current.theme, ...input };
      const updated = { ...current, theme: updatedTheme };

      await ctx.prisma.platformLayout.update({
        where: { workspaceId: workspace.id },
        data: {
          name: input.brandName ?? workspace.layout.name,
          layout: updated as unknown as Prisma.InputJsonValue,
        },
      });

      if (workspace.status === "active") {
        const workspaceService = new WorkspaceService(ctx.prisma);
        try { await workspaceService.regenerateProxy(ctx.user.id); } catch { /* non-fatal */ }
      }

      return { success: true, theme: updatedTheme };
    }),

  /**
   * Reorder sidebar items.
   */
  reorderSidebar: protectedProcedure
    .input(
      z.object({
        sidebar: z.array(z.object({
          moduleSlug: z.string(),
          label: z.string().max(50),
          icon: z.string().max(30),
          group: z.string().max(50),
          order: z.number().int().min(0),
        })),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const workspace = await ctx.prisma.workspace.findUnique({
        where: { userId: ctx.user.id },
        include: { layout: true },
      });

      if (!workspace?.layout) throw new Error("No layout exists");

      const current = workspace.layout.layout as unknown as PlatformLayoutConfig;
      const updated = { ...current, sidebar: input.sidebar as SidebarItem[] };

      await ctx.prisma.platformLayout.update({
        where: { workspaceId: workspace.id },
        data: { layout: updated as unknown as Prisma.InputJsonValue },
      });

      if (workspace.status === "active") {
        const workspaceService = new WorkspaceService(ctx.prisma);
        try { await workspaceService.regenerateProxy(ctx.user.id); } catch { /* non-fatal */ }
      }

      return { success: true };
    }),
});
