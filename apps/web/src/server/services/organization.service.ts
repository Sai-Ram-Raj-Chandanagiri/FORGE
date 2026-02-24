import { TRPCError } from "@trpc/server";
import { type PrismaClient } from "@forge/db";
import type {
  CreateOrganizationInput,
  UpdateOrganizationInput,
  AddMemberInput,
  RemoveMemberInput,
  UpdateMemberRoleInput,
} from "@/lib/validators/organization";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export class OrganizationService {
  constructor(private prisma: PrismaClient) {}

  async createOrganization(userId: string, input: CreateOrganizationInput) {
    const slug = slugify(input.name);

    const existing = await this.prisma.organization.findUnique({
      where: { slug },
    });
    if (existing) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "An organization with a similar name already exists",
      });
    }

    const organization = await this.prisma.organization.create({
      data: {
        name: input.name,
        slug,
        description: input.description,
        website: input.website || null,
        ownerId: userId,
        members: {
          create: {
            userId,
            role: "OWNER",
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    return organization;
  }

  async updateOrganization(userId: string, input: UpdateOrganizationInput) {
    const membership = await this.prisma.orgMembership.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: input.id,
        },
      },
    });

    if (!membership || membership.role !== "OWNER") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only the organization owner can update organization details",
      });
    }

    const { id, ...updateData } = input;

    return this.prisma.organization.update({
      where: { id },
      data: {
        ...(updateData.name !== undefined && { name: updateData.name }),
        ...(updateData.description !== undefined && {
          description: updateData.description,
        }),
        ...(updateData.website !== undefined && {
          website: updateData.website || null,
        }),
      },
    });
  }

  async getMyOrganizations(userId: string) {
    const memberships = await this.prisma.orgMembership.findMany({
      where: { userId },
      include: {
        organization: {
          include: {
            _count: {
              select: { members: true },
            },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    });

    return memberships.map((m) => ({
      ...m.organization,
      memberCount: m.organization._count.members,
      myRole: m.role,
    }));
  }

  async getOrganizationById(userId: string, orgId: string) {
    const membership = await this.prisma.orgMembership.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: orgId,
        },
      },
    });

    if (!membership) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You are not a member of this organization",
      });
    }

    const organization = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: { joinedAt: "asc" },
        },
        _count: {
          select: { members: true },
        },
      },
    });

    if (!organization) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Organization not found",
      });
    }

    return {
      ...organization,
      memberCount: organization._count.members,
      myRole: membership.role,
    };
  }

  async addMember(userId: string, input: AddMemberInput) {
    const callerMembership = await this.prisma.orgMembership.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: input.organizationId,
        },
      },
    });

    if (
      !callerMembership ||
      (callerMembership.role !== "OWNER" && callerMembership.role !== "ADMIN")
    ) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only owners and admins can add members",
      });
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!targetUser) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No user found with that email address",
      });
    }

    const existingMembership = await this.prisma.orgMembership.findUnique({
      where: {
        userId_organizationId: {
          userId: targetUser.id,
          organizationId: input.organizationId,
        },
      },
    });

    if (existingMembership) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "User is already a member of this organization",
      });
    }

    const membership = await this.prisma.orgMembership.create({
      data: {
        userId: targetUser.id,
        organizationId: input.organizationId,
        role: input.role,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    return membership;
  }

  async removeMember(userId: string, input: RemoveMemberInput) {
    const callerMembership = await this.prisma.orgMembership.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: input.organizationId,
        },
      },
    });

    if (
      !callerMembership ||
      (callerMembership.role !== "OWNER" && callerMembership.role !== "ADMIN")
    ) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only owners and admins can remove members",
      });
    }

    const targetMembership = await this.prisma.orgMembership.findUnique({
      where: {
        userId_organizationId: {
          userId: input.userId,
          organizationId: input.organizationId,
        },
      },
    });

    if (!targetMembership) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Member not found in this organization",
      });
    }

    if (targetMembership.role === "OWNER") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Cannot remove the organization owner",
      });
    }

    await this.prisma.orgMembership.delete({
      where: {
        userId_organizationId: {
          userId: input.userId,
          organizationId: input.organizationId,
        },
      },
    });

    return { success: true };
  }

  async updateMemberRole(userId: string, input: UpdateMemberRoleInput) {
    const callerMembership = await this.prisma.orgMembership.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: input.organizationId,
        },
      },
    });

    if (!callerMembership || callerMembership.role !== "OWNER") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only the organization owner can change member roles",
      });
    }

    const targetMembership = await this.prisma.orgMembership.findUnique({
      where: {
        userId_organizationId: {
          userId: input.userId,
          organizationId: input.organizationId,
        },
      },
    });

    if (!targetMembership) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Member not found in this organization",
      });
    }

    if (targetMembership.role === "OWNER") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Cannot change the role of the organization owner",
      });
    }

    return this.prisma.orgMembership.update({
      where: {
        userId_organizationId: {
          userId: input.userId,
          organizationId: input.organizationId,
        },
      },
      data: { role: input.role },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });
  }
}
