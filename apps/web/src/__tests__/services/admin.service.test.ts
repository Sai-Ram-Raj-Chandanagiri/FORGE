import { createMockPrismaClient } from "@forge/db";
import { AdminService } from "@/server/services/admin.service";
import { TRPCError } from "@trpc/server";

describe("AdminService", () => {
  let mockPrisma: ReturnType<typeof createMockPrismaClient>;
  let service: AdminService;

  beforeEach(() => {
    mockPrisma = createMockPrismaClient();
    service = new AdminService(mockPrisma);
  });

  // ---------------------------------------------------------------------------
  // getReviewQueue
  // ---------------------------------------------------------------------------
  describe("getReviewQueue", () => {
    it("returns modules and pagination info", async () => {
      const mockModules = [
        { id: "mod-1", name: "Module A", status: "PENDING_REVIEW" },
        { id: "mod-2", name: "Module B", status: "PENDING_REVIEW" },
      ];

      mockPrisma.module.findMany.mockResolvedValue(mockModules);
      mockPrisma.module.count.mockResolvedValue(12);

      const result = await service.getReviewQueue(2, 5);

      expect(result).toEqual({
        modules: mockModules,
        total: 12,
        page: 2,
        limit: 5,
        totalPages: 3, // Math.ceil(12 / 5)
      });

      expect(mockPrisma.module.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: "PENDING_REVIEW" },
          skip: 5, // (2 - 1) * 5
          take: 5,
          orderBy: { updatedAt: "asc" },
        }),
      );

      expect(mockPrisma.module.count).toHaveBeenCalledWith({
        where: { status: "PENDING_REVIEW" },
      });
    });
  });

  // ---------------------------------------------------------------------------
  // reviewModule
  // ---------------------------------------------------------------------------
  describe("reviewModule", () => {
    const adminUserId = "admin-1";

    it("approves a module - sets status to PUBLISHED, creates notification and audit log", async () => {
      const foundModule = {
        id: "mod-1",
        name: "My Module",
        status: "PENDING_REVIEW",
        authorId: "author-1",
      };
      const updatedModule = {
        ...foundModule,
        status: "PUBLISHED",
        slug: "my-module",
        publishedAt: new Date(),
      };

      mockPrisma.module.findUnique.mockResolvedValue(foundModule);
      mockPrisma.module.update.mockResolvedValue(updatedModule);
      mockPrisma.notification.create.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await service.reviewModule(adminUserId, {
        moduleId: "mod-1",
        action: "approve",
      });

      expect(result).toEqual(updatedModule);

      // Module updated to PUBLISHED with publishedAt
      expect(mockPrisma.module.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "mod-1" },
          data: expect.objectContaining({
            status: "PUBLISHED",
            publishedAt: expect.any(Date),
          }),
        }),
      );

      // Notification created for the author
      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "author-1",
          type: "SUBMISSION_STATUS",
          title: 'Module "My Module" has been approved',
          body: expect.stringContaining("approved"),
          link: `/store/modules/${updatedModule.slug}`,
        }),
      });

      // Audit log created
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: adminUserId,
          action: "MODULE_APPROVED",
          entityType: "Module",
          entityId: "mod-1",
          metadata: expect.objectContaining({
            moduleName: "My Module",
          }),
        }),
      });
    });

    it("rejects a module - sets status to REJECTED, notification includes review notes", async () => {
      const foundModule = {
        id: "mod-2",
        name: "Bad Module",
        status: "PENDING_REVIEW",
        authorId: "author-2",
      };
      const updatedModule = {
        ...foundModule,
        status: "REJECTED",
        slug: "bad-module",
      };

      mockPrisma.module.findUnique.mockResolvedValue(foundModule);
      mockPrisma.module.update.mockResolvedValue(updatedModule);
      mockPrisma.notification.create.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await service.reviewModule(adminUserId, {
        moduleId: "mod-2",
        action: "reject",
        reviewNotes: "Does not meet quality standards",
      });

      expect(result).toEqual(updatedModule);

      // Module updated to REJECTED, no publishedAt
      expect(mockPrisma.module.update).toHaveBeenCalledWith({
        where: { id: "mod-2" },
        data: { status: "REJECTED" },
      });

      // Notification body mentions the review notes
      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "author-2",
          type: "SUBMISSION_STATUS",
          title: 'Module "Bad Module" has been rejected',
          body: expect.stringContaining("Does not meet quality standards"),
        }),
      });

      // Audit log records MODULE_REJECTED with review notes
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: adminUserId,
          action: "MODULE_REJECTED",
          entityType: "Module",
          entityId: "mod-2",
          metadata: expect.objectContaining({
            moduleName: "Bad Module",
            reviewNotes: "Does not meet quality standards",
          }),
        }),
      });
    });

    it("throws NOT_FOUND if the module does not exist", async () => {
      mockPrisma.module.findUnique.mockResolvedValue(null);

      await expect(
        service.reviewModule(adminUserId, {
          moduleId: "nonexistent",
          action: "approve",
        }),
      ).rejects.toThrow(TRPCError);

      await expect(
        service.reviewModule(adminUserId, {
          moduleId: "nonexistent",
          action: "approve",
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("throws BAD_REQUEST if the module is not in PENDING_REVIEW status", async () => {
      mockPrisma.module.findUnique.mockResolvedValue({
        id: "mod-3",
        name: "Already Published",
        status: "PUBLISHED",
        authorId: "author-3",
      });

      await expect(
        service.reviewModule(adminUserId, {
          moduleId: "mod-3",
          action: "approve",
        }),
      ).rejects.toThrow(TRPCError);

      await expect(
        service.reviewModule(adminUserId, {
          moduleId: "mod-3",
          action: "approve",
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });
  });

  // ---------------------------------------------------------------------------
  // listUsers
  // ---------------------------------------------------------------------------
  describe("listUsers", () => {
    it("returns users with pagination", async () => {
      const mockUsers = [
        { id: "u-1", name: "Alice", role: "USER", status: "ACTIVE" },
        { id: "u-2", name: "Bob", role: "DEVELOPER", status: "ACTIVE" },
      ];

      mockPrisma.user.findMany.mockResolvedValue(mockUsers);
      mockPrisma.user.count.mockResolvedValue(25);

      const result = await service.listUsers({ page: 2, limit: 10 });

      expect(result).toEqual({
        users: mockUsers,
        total: 25,
        page: 2,
        limit: 10,
        totalPages: 3, // Math.ceil(25 / 10)
      });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10, // (2 - 1) * 10
          take: 10,
          orderBy: { createdAt: "desc" },
        }),
      );

      expect(mockPrisma.user.count).toHaveBeenCalled();
    });

    it("applies query filter with OR conditions", async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await service.listUsers({ query: "alice", page: 1, limit: 20 });

      const findManyCall = mockPrisma.user.findMany.mock.calls[0][0];
      expect(findManyCall.where).toEqual(
        expect.objectContaining({
          OR: [
            { name: { contains: "alice", mode: "insensitive" } },
            { email: { contains: "alice", mode: "insensitive" } },
            { username: { contains: "alice", mode: "insensitive" } },
          ],
        }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // updateUserStatus
  // ---------------------------------------------------------------------------
  describe("updateUserStatus", () => {
    it("successfully updates user status", async () => {
      const foundUser = { id: "u-1", role: "USER", status: "ACTIVE" };
      const updatedUser = {
        id: "u-1",
        name: "Alice",
        username: "alice",
        email: "alice@example.com",
        role: "USER",
        status: "SUSPENDED",
      };

      mockPrisma.user.findUnique.mockResolvedValue(foundUser);
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateUserStatus({
        userId: "u-1",
        status: "SUSPENDED",
      });

      expect(result).toEqual(updatedUser);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "u-1" },
        data: { status: "SUSPENDED" },
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          role: true,
          status: true,
        },
      });
    });

    it("throws NOT_FOUND if the user does not exist", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updateUserStatus({ userId: "ghost", status: "SUSPENDED" }),
      ).rejects.toThrow(TRPCError);

      await expect(
        service.updateUserStatus({ userId: "ghost", status: "SUSPENDED" }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("throws FORBIDDEN if the user is an ADMIN", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "admin-99",
        role: "ADMIN",
        status: "ACTIVE",
      });

      await expect(
        service.updateUserStatus({ userId: "admin-99", status: "SUSPENDED" }),
      ).rejects.toThrow(TRPCError);

      await expect(
        service.updateUserStatus({ userId: "admin-99", status: "SUSPENDED" }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  });

  // ---------------------------------------------------------------------------
  // getSystemMetrics
  // ---------------------------------------------------------------------------
  describe("getSystemMetrics", () => {
    it("returns all metrics", async () => {
      mockPrisma.user.count.mockResolvedValue(100);
      // module.count is called twice: once for total, once for published
      mockPrisma.module.count
        .mockResolvedValueOnce(50)
        .mockResolvedValueOnce(30);
      // deployment.count is called twice: once for total, once for running
      mockPrisma.deployment.count
        .mockResolvedValueOnce(200)
        .mockResolvedValueOnce(15);
      mockPrisma.organization.count.mockResolvedValue(10);

      const result = await service.getSystemMetrics();

      expect(result).toEqual({
        totalUsers: 100,
        totalModules: 50,
        publishedModules: 30,
        totalDeployments: 200,
        runningDeployments: 15,
        totalOrganizations: 10,
      });

      expect(mockPrisma.user.count).toHaveBeenCalledTimes(1);
      expect(mockPrisma.module.count).toHaveBeenCalledTimes(2);
      expect(mockPrisma.deployment.count).toHaveBeenCalledTimes(2);
      expect(mockPrisma.organization.count).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // getSubmissionQueue
  // ---------------------------------------------------------------------------
  describe("getSubmissionQueue", () => {
    it("returns SUBMITTED and IN_REVIEW submissions with pagination", async () => {
      const mockSubmissions = [
        { id: "sub-1", appName: "App A", status: "SUBMITTED", user: { id: "u-1", name: "Alice" } },
        { id: "sub-2", appName: "App B", status: "IN_REVIEW", user: { id: "u-2", name: "Bob" } },
      ];

      mockPrisma.submission.findMany.mockResolvedValue(mockSubmissions);
      mockPrisma.submission.count.mockResolvedValue(8);

      const result = await service.getSubmissionQueue(1, 20);

      expect(result).toEqual({
        submissions: mockSubmissions,
        total: 8,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      expect(mockPrisma.submission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: { in: ["SUBMITTED", "IN_REVIEW"] } },
          orderBy: { submittedAt: "asc" },
          skip: 0,
          take: 20,
        }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // reviewSubmission
  // ---------------------------------------------------------------------------
  describe("reviewSubmission", () => {
    const adminUserId = "admin-1";

    it("approves a submission — creates Module + ModuleVersion, links submission, notifies user", async () => {
      const submission = {
        id: "sub-1",
        appName: "My App",
        about: "A detailed description of the application",
        version: "1.0.0",
        changelog: "Initial release",
        fileUrl: "https://registry.example.com/my-app:1.0.0",
        userId: "author-1",
        status: "SUBMITTED",
        user: { id: "author-1", name: "Author", username: "author" },
      };

      mockPrisma.submission.findUnique.mockResolvedValue(submission);

      const createdModule = {
        id: "mod-new",
        name: "My App",
        slug: "my-app-ab12",
        status: "PUBLISHED",
      };
      mockPrisma.module.create.mockResolvedValue(createdModule);
      mockPrisma.submission.update.mockResolvedValue({});
      mockPrisma.notification.create.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await service.reviewSubmission(adminUserId, {
        submissionId: "sub-1",
        action: "approve",
        reviewNotes: "Looks great!",
      });

      expect(result.status).toBe("APPROVED");
      expect(result.moduleId).toBe("mod-new");

      // Module was created with correct data
      expect(mockPrisma.module.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "My App",
            authorId: "author-1",
            status: "PUBLISHED",
            pricingModel: "FREE",
            versions: {
              create: expect.objectContaining({
                version: "1.0.0",
                changelog: "Initial release",
                isLatest: true,
              }),
            },
          }),
        }),
      );

      // Submission was linked to the created module
      expect(mockPrisma.submission.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "sub-1" },
          data: expect.objectContaining({
            status: "APPROVED",
            moduleId: "mod-new",
            reviewNotes: "Looks great!",
            reviewedBy: adminUserId,
          }),
        }),
      );

      // Notification sent to the submitter
      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "author-1",
          type: "SUBMISSION_STATUS",
          title: expect.stringContaining("approved"),
        }),
      });

      // Audit log created
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: adminUserId,
          action: "SUBMISSION_APPROVED",
          entityType: "Submission",
          entityId: "sub-1",
        }),
      });
    });

    it("rejects a submission — updates status, notifies user with feedback", async () => {
      const submission = {
        id: "sub-2",
        appName: "Bad App",
        about: "Some description",
        version: "0.1.0",
        changelog: null,
        fileUrl: "https://example.com/bad-app",
        userId: "author-2",
        status: "SUBMITTED",
        user: { id: "author-2", name: "Dev", username: "dev" },
      };

      mockPrisma.submission.findUnique.mockResolvedValue(submission);
      mockPrisma.submission.update.mockResolvedValue({});
      mockPrisma.notification.create.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await service.reviewSubmission(adminUserId, {
        submissionId: "sub-2",
        action: "reject",
        reviewNotes: "Missing documentation",
      });

      expect(result).toEqual({ status: "REJECTED" });

      // No module created
      expect(mockPrisma.module.create).not.toHaveBeenCalled();

      // Submission updated to REJECTED
      expect(mockPrisma.submission.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "sub-2" },
          data: expect.objectContaining({
            status: "REJECTED",
            reviewNotes: "Missing documentation",
            reviewedBy: adminUserId,
          }),
        }),
      );

      // Notification includes feedback
      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "author-2",
          type: "SUBMISSION_STATUS",
          body: expect.stringContaining("Missing documentation"),
        }),
      });

      // Audit log records SUBMISSION_REJECTED
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: "SUBMISSION_REJECTED",
          entityId: "sub-2",
        }),
      });
    });

    it("throws NOT_FOUND when submission does not exist", async () => {
      mockPrisma.submission.findUnique.mockResolvedValue(null);

      await expect(
        service.reviewSubmission(adminUserId, {
          submissionId: "nonexistent",
          action: "approve",
        }),
      ).rejects.toThrow(TRPCError);

      await expect(
        service.reviewSubmission(adminUserId, {
          submissionId: "nonexistent",
          action: "approve",
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("throws BAD_REQUEST when submission is already approved", async () => {
      mockPrisma.submission.findUnique.mockResolvedValue({
        id: "sub-3",
        appName: "Already Done",
        status: "APPROVED",
        userId: "author-3",
        user: { id: "author-3", name: "Dev", username: "dev" },
      });

      await expect(
        service.reviewSubmission(adminUserId, {
          submissionId: "sub-3",
          action: "approve",
        }),
      ).rejects.toThrow(TRPCError);

      await expect(
        service.reviewSubmission(adminUserId, {
          submissionId: "sub-3",
          action: "approve",
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });
  });

  // ---------------------------------------------------------------------------
  // getAuditLogs
  // ---------------------------------------------------------------------------
  describe("getAuditLogs", () => {
    it("returns logs with pagination", async () => {
      const mockLogs = [
        {
          id: "log-1",
          userId: "admin-1",
          action: "MODULE_APPROVED",
          createdAt: new Date(),
        },
        {
          id: "log-2",
          userId: "admin-1",
          action: "MODULE_REJECTED",
          createdAt: new Date(),
        },
      ];

      mockPrisma.auditLog.findMany.mockResolvedValue(mockLogs);
      mockPrisma.auditLog.count.mockResolvedValue(42);

      const result = await service.getAuditLogs(1, 50);

      expect(result).toEqual({
        logs: mockLogs,
        total: 42,
        page: 1,
        limit: 50,
        totalPages: 1, // Math.ceil(42 / 50)
      });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: "desc" },
          skip: 0,
          take: 50,
        }),
      );

      expect(mockPrisma.auditLog.count).toHaveBeenCalled();
    });
  });
});
