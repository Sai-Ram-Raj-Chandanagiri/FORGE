import { createMockPrismaClient } from "@forge/db";
import { OrganizationService } from "@/server/services/organization.service";
import { TRPCError } from "@trpc/server";

describe("OrganizationService", () => {
  let prisma: ReturnType<typeof createMockPrismaClient>;
  let service: OrganizationService;

  beforeEach(() => {
    prisma = createMockPrismaClient();
    service = new OrganizationService(prisma);
  });

  // ---------------------------------------------------------------------------
  // createOrganization
  // ---------------------------------------------------------------------------
  describe("createOrganization", () => {
    const userId = "user-1";
    const input = {
      name: "My Organization",
      description: "A test org",
      website: "https://example.com",
    };

    it("should create an organization with an OWNER membership", async () => {
      prisma.organization.findUnique.mockResolvedValue(null);

      const createdOrg = {
        id: "org-1",
        name: input.name,
        slug: "my-organization",
        description: input.description,
        website: input.website,
        ownerId: userId,
        members: [
          {
            userId,
            role: "OWNER",
            user: {
              id: userId,
              name: "Test User",
              username: "testuser",
              email: "test@example.com",
              avatarUrl: null,
            },
          },
        ],
      };
      prisma.organization.create.mockResolvedValue(createdOrg);

      const result = await service.createOrganization(userId, input);

      expect(result).toEqual(createdOrg);

      // Verify slug lookup was performed
      expect(prisma.organization.findUnique).toHaveBeenCalledWith({
        where: { slug: "my-organization" },
      });

      // Verify create call includes nested member creation with OWNER role
      expect(prisma.organization.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: input.name,
            slug: "my-organization",
            description: input.description,
            website: input.website,
            ownerId: userId,
            members: {
              create: {
                userId,
                role: "OWNER",
              },
            },
          }),
        }),
      );
    });

    it("should throw CONFLICT when an organization with the same slug exists", async () => {
      prisma.organization.findUnique.mockResolvedValue({
        id: "existing-org",
        slug: "my-organization",
      });

      await expect(
        service.createOrganization(userId, input),
      ).rejects.toThrow(TRPCError);

      await expect(
        service.createOrganization(userId, input),
      ).rejects.toMatchObject({
        code: "CONFLICT",
      });

      expect(prisma.organization.create).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // updateOrganization
  // ---------------------------------------------------------------------------
  describe("updateOrganization", () => {
    const userId = "user-1";
    const orgId = "org-1";
    const input = {
      id: orgId,
      name: "Updated Name",
      description: "Updated description",
    };

    it("should update the organization when called by the OWNER", async () => {
      prisma.orgMembership.findUnique.mockResolvedValue({
        userId,
        organizationId: orgId,
        role: "OWNER",
      });

      const updatedOrg = {
        id: orgId,
        name: input.name,
        description: input.description,
      };
      prisma.organization.update.mockResolvedValue(updatedOrg);

      const result = await service.updateOrganization(userId, input);

      expect(result).toEqual(updatedOrg);

      expect(prisma.orgMembership.findUnique).toHaveBeenCalledWith({
        where: {
          userId_organizationId: {
            userId,
            organizationId: orgId,
          },
        },
      });

      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: orgId },
        data: expect.objectContaining({
          name: input.name,
          description: input.description,
        }),
      });
    });

    it("should throw FORBIDDEN when the caller is not an OWNER", async () => {
      prisma.orgMembership.findUnique.mockResolvedValue({
        userId,
        organizationId: orgId,
        role: "ADMIN",
      });

      await expect(
        service.updateOrganization(userId, input),
      ).rejects.toThrow(TRPCError);

      await expect(
        service.updateOrganization(userId, input),
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    });

    it("should throw FORBIDDEN when no membership exists", async () => {
      prisma.orgMembership.findUnique.mockResolvedValue(null);

      await expect(
        service.updateOrganization(userId, input),
      ).rejects.toThrow(TRPCError);

      await expect(
        service.updateOrganization(userId, input),
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    });
  });

  // ---------------------------------------------------------------------------
  // addMember
  // ---------------------------------------------------------------------------
  describe("addMember", () => {
    const callerId = "user-owner";
    const targetEmail = "newmember@example.com";
    const targetUserId = "user-target";
    const orgId = "org-1";
    const input = {
      organizationId: orgId,
      email: targetEmail,
      role: "MEMBER" as const,
    };

    it("should add a member when called by an OWNER", async () => {
      // Caller is OWNER
      prisma.orgMembership.findUnique
        .mockResolvedValueOnce({
          userId: callerId,
          organizationId: orgId,
          role: "OWNER",
        })
        // Target user has no existing membership
        .mockResolvedValueOnce(null);

      prisma.user.findUnique.mockResolvedValue({
        id: targetUserId,
        email: targetEmail,
      });

      const createdMembership = {
        userId: targetUserId,
        organizationId: orgId,
        role: "MEMBER",
        user: {
          id: targetUserId,
          name: "New Member",
          username: "newmember",
          email: targetEmail,
          avatarUrl: null,
        },
      };
      prisma.orgMembership.create.mockResolvedValue(createdMembership);

      const result = await service.addMember(callerId, input);

      expect(result).toEqual(createdMembership);

      // Verify caller membership was checked
      expect(prisma.orgMembership.findUnique).toHaveBeenCalledWith({
        where: {
          userId_organizationId: {
            userId: callerId,
            organizationId: orgId,
          },
        },
      });

      // Verify target user was looked up by email
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: targetEmail },
      });

      // Verify membership creation
      expect(prisma.orgMembership.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            userId: targetUserId,
            organizationId: orgId,
            role: "MEMBER",
          },
        }),
      );
    });

    it("should add a member when called by an ADMIN", async () => {
      prisma.orgMembership.findUnique
        .mockResolvedValueOnce({
          userId: callerId,
          organizationId: orgId,
          role: "ADMIN",
        })
        .mockResolvedValueOnce(null);

      prisma.user.findUnique.mockResolvedValue({
        id: targetUserId,
        email: targetEmail,
      });

      const createdMembership = {
        userId: targetUserId,
        organizationId: orgId,
        role: "MEMBER",
        user: {
          id: targetUserId,
          name: "New Member",
          username: "newmember",
          email: targetEmail,
          avatarUrl: null,
        },
      };
      prisma.orgMembership.create.mockResolvedValue(createdMembership);

      const result = await service.addMember(callerId, input);

      expect(result).toEqual(createdMembership);
    });

    it("should throw FORBIDDEN when the caller is not OWNER or ADMIN", async () => {
      prisma.orgMembership.findUnique.mockResolvedValueOnce({
        userId: callerId,
        organizationId: orgId,
        role: "MEMBER",
      });

      await expect(service.addMember(callerId, input)).rejects.toThrow(
        TRPCError,
      );

      prisma.orgMembership.findUnique.mockResolvedValueOnce({
        userId: callerId,
        organizationId: orgId,
        role: "VIEWER",
      });

      await expect(service.addMember(callerId, input)).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    });

    it("should throw NOT_FOUND when the target user email does not exist", async () => {
      prisma.orgMembership.findUnique.mockResolvedValueOnce({
        userId: callerId,
        organizationId: orgId,
        role: "OWNER",
      });

      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.addMember(callerId, input)).rejects.toThrow(
        TRPCError,
      );

      // Reset mocks for the second assertion
      prisma.orgMembership.findUnique.mockResolvedValueOnce({
        userId: callerId,
        organizationId: orgId,
        role: "OWNER",
      });
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.addMember(callerId, input)).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });

    it("should throw CONFLICT when the user is already a member", async () => {
      prisma.orgMembership.findUnique
        .mockResolvedValueOnce({
          userId: callerId,
          organizationId: orgId,
          role: "OWNER",
        })
        .mockResolvedValueOnce({
          userId: targetUserId,
          organizationId: orgId,
          role: "MEMBER",
        });

      prisma.user.findUnique.mockResolvedValue({
        id: targetUserId,
        email: targetEmail,
      });

      await expect(service.addMember(callerId, input)).rejects.toThrow(
        TRPCError,
      );

      // Reset for second assertion
      prisma.orgMembership.findUnique
        .mockResolvedValueOnce({
          userId: callerId,
          organizationId: orgId,
          role: "OWNER",
        })
        .mockResolvedValueOnce({
          userId: targetUserId,
          organizationId: orgId,
          role: "MEMBER",
        });

      prisma.user.findUnique.mockResolvedValue({
        id: targetUserId,
        email: targetEmail,
      });

      await expect(service.addMember(callerId, input)).rejects.toMatchObject({
        code: "CONFLICT",
      });
    });
  });

  // ---------------------------------------------------------------------------
  // removeMember
  // ---------------------------------------------------------------------------
  describe("removeMember", () => {
    const callerId = "user-owner";
    const targetUserId = "user-target";
    const orgId = "org-1";
    const input = {
      organizationId: orgId,
      userId: targetUserId,
    };

    it("should remove a member successfully", async () => {
      // Caller is OWNER
      prisma.orgMembership.findUnique
        .mockResolvedValueOnce({
          userId: callerId,
          organizationId: orgId,
          role: "OWNER",
        })
        // Target is a regular MEMBER
        .mockResolvedValueOnce({
          userId: targetUserId,
          organizationId: orgId,
          role: "MEMBER",
        });

      prisma.orgMembership.delete.mockResolvedValue({});

      const result = await service.removeMember(callerId, input);

      expect(result).toEqual({ success: true });

      expect(prisma.orgMembership.delete).toHaveBeenCalledWith({
        where: {
          userId_organizationId: {
            userId: targetUserId,
            organizationId: orgId,
          },
        },
      });
    });

    it("should throw FORBIDDEN when the caller is not OWNER or ADMIN", async () => {
      prisma.orgMembership.findUnique.mockResolvedValueOnce({
        userId: callerId,
        organizationId: orgId,
        role: "MEMBER",
      });

      await expect(service.removeMember(callerId, input)).rejects.toThrow(
        TRPCError,
      );

      prisma.orgMembership.findUnique.mockResolvedValueOnce({
        userId: callerId,
        organizationId: orgId,
        role: "MEMBER",
      });

      await expect(
        service.removeMember(callerId, input),
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    });

    it("should throw FORBIDDEN when no caller membership exists", async () => {
      prisma.orgMembership.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.removeMember(callerId, input),
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    });

    it("should throw FORBIDDEN when trying to remove the OWNER", async () => {
      prisma.orgMembership.findUnique
        .mockResolvedValueOnce({
          userId: callerId,
          organizationId: orgId,
          role: "OWNER",
        })
        .mockResolvedValueOnce({
          userId: targetUserId,
          organizationId: orgId,
          role: "OWNER",
        });

      await expect(service.removeMember(callerId, input)).rejects.toThrow(
        TRPCError,
      );

      prisma.orgMembership.findUnique
        .mockResolvedValueOnce({
          userId: callerId,
          organizationId: orgId,
          role: "OWNER",
        })
        .mockResolvedValueOnce({
          userId: targetUserId,
          organizationId: orgId,
          role: "OWNER",
        });

      await expect(
        service.removeMember(callerId, input),
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    });
  });

  // ---------------------------------------------------------------------------
  // updateMemberRole
  // ---------------------------------------------------------------------------
  describe("updateMemberRole", () => {
    const callerId = "user-owner";
    const targetUserId = "user-target";
    const orgId = "org-1";
    const input = {
      organizationId: orgId,
      userId: targetUserId,
      role: "ADMIN" as const,
    };

    it("should update the member role when called by the OWNER", async () => {
      prisma.orgMembership.findUnique
        .mockResolvedValueOnce({
          userId: callerId,
          organizationId: orgId,
          role: "OWNER",
        })
        .mockResolvedValueOnce({
          userId: targetUserId,
          organizationId: orgId,
          role: "MEMBER",
        });

      const updatedMembership = {
        userId: targetUserId,
        organizationId: orgId,
        role: "ADMIN",
        user: {
          id: targetUserId,
          name: "Target User",
          username: "targetuser",
          email: "target@example.com",
          avatarUrl: null,
        },
      };
      prisma.orgMembership.update.mockResolvedValue(updatedMembership);

      const result = await service.updateMemberRole(callerId, input);

      expect(result).toEqual(updatedMembership);

      expect(prisma.orgMembership.update).toHaveBeenCalledWith({
        where: {
          userId_organizationId: {
            userId: targetUserId,
            organizationId: orgId,
          },
        },
        data: { role: "ADMIN" },
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
    });

    it("should throw FORBIDDEN when the caller is not the OWNER", async () => {
      prisma.orgMembership.findUnique.mockResolvedValueOnce({
        userId: callerId,
        organizationId: orgId,
        role: "ADMIN",
      });

      await expect(
        service.updateMemberRole(callerId, input),
      ).rejects.toThrow(TRPCError);

      prisma.orgMembership.findUnique.mockResolvedValueOnce({
        userId: callerId,
        organizationId: orgId,
        role: "ADMIN",
      });

      await expect(
        service.updateMemberRole(callerId, input),
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    });

    it("should throw FORBIDDEN when no caller membership exists", async () => {
      prisma.orgMembership.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.updateMemberRole(callerId, input),
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    });

    it("should throw FORBIDDEN when trying to change the OWNER's role", async () => {
      prisma.orgMembership.findUnique
        .mockResolvedValueOnce({
          userId: callerId,
          organizationId: orgId,
          role: "OWNER",
        })
        .mockResolvedValueOnce({
          userId: targetUserId,
          organizationId: orgId,
          role: "OWNER",
        });

      await expect(
        service.updateMemberRole(callerId, input),
      ).rejects.toThrow(TRPCError);

      prisma.orgMembership.findUnique
        .mockResolvedValueOnce({
          userId: callerId,
          organizationId: orgId,
          role: "OWNER",
        })
        .mockResolvedValueOnce({
          userId: targetUserId,
          organizationId: orgId,
          role: "OWNER",
        });

      await expect(
        service.updateMemberRole(callerId, input),
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    });
  });
});
