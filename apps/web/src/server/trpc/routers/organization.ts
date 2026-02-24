import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import {
  createOrganizationSchema,
  updateOrganizationSchema,
  addMemberSchema,
  removeMemberSchema,
  updateMemberRoleSchema,
} from "@/lib/validators/organization";
import { OrganizationService } from "@/server/services/organization.service";

export const organizationRouter = router({
  create: protectedProcedure.input(createOrganizationSchema).mutation(async ({ ctx, input }) => {
    const service = new OrganizationService(ctx.prisma);
    return service.createOrganization(ctx.user.id, input);
  }),

  update: protectedProcedure.input(updateOrganizationSchema).mutation(async ({ ctx, input }) => {
    const service = new OrganizationService(ctx.prisma);
    return service.updateOrganization(ctx.user.id, input);
  }),

  getMyOrganizations: protectedProcedure.query(async ({ ctx }) => {
    const service = new OrganizationService(ctx.prisma);
    return service.getMyOrganizations(ctx.user.id);
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const service = new OrganizationService(ctx.prisma);
      return service.getOrganizationById(ctx.user.id, input.id);
    }),

  addMember: protectedProcedure.input(addMemberSchema).mutation(async ({ ctx, input }) => {
    const service = new OrganizationService(ctx.prisma);
    return service.addMember(ctx.user.id, input);
  }),

  removeMember: protectedProcedure.input(removeMemberSchema).mutation(async ({ ctx, input }) => {
    const service = new OrganizationService(ctx.prisma);
    return service.removeMember(ctx.user.id, input);
  }),

  updateMemberRole: protectedProcedure.input(updateMemberRoleSchema).mutation(async ({ ctx, input }) => {
    const service = new OrganizationService(ctx.prisma);
    return service.updateMemberRole(ctx.user.id, input);
  }),
});
