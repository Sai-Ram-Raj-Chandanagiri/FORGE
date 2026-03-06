import { TRPCError } from "@trpc/server";
import { Prisma, type PrismaClient } from "@forge/db";
import { isAdmin } from "@/lib/role-utils";
import type {
  ReviewModuleInput,
  ReviewSubmissionInput,
  ListUsersInput,
  UpdateUserStatusInput,
} from "@/lib/validators/admin";

export class AdminService {
  constructor(private prisma: PrismaClient) {}

  async getReviewQueue(page = 1, limit = 20) {
    const where = { status: "PENDING_REVIEW" as const };

    const [modules, total] = await Promise.all([
      this.prisma.module.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              username: true,
              email: true,
              avatarUrl: true,
            },
          },
          categories: {
            include: {
              category: { select: { id: true, name: true, slug: true } },
            },
          },
          tags: {
            include: {
              tag: { select: { id: true, name: true, slug: true } },
            },
          },
          versions: {
            where: { isLatest: true },
            take: 1,
          },
        },
        orderBy: { updatedAt: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.module.count({ where }),
    ]);

    return {
      modules,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async reviewModule(adminUserId: string, input: ReviewModuleInput) {
    const module = await this.prisma.module.findUnique({
      where: { id: input.moduleId },
      select: { id: true, name: true, status: true, authorId: true },
    });

    if (!module) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Module not found",
      });
    }

    if (module.status !== "PENDING_REVIEW") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Module is not pending review",
      });
    }

    const isApproved = input.action === "approve";

    const updatedModule = await this.prisma.module.update({
      where: { id: input.moduleId },
      data: {
        status: isApproved ? "PUBLISHED" : "REJECTED",
        ...(isApproved && { publishedAt: new Date() }),
      },
    });

    // Create notification for the module author
    await this.prisma.notification.create({
      data: {
        userId: module.authorId,
        type: "SUBMISSION_STATUS",
        title: isApproved
          ? `Module "${module.name}" has been approved`
          : `Module "${module.name}" has been rejected`,
        body: isApproved
          ? `Your module "${module.name}" has been approved and is now published on the FORGE Store.`
          : `Your module "${module.name}" has been rejected.${input.reviewNotes ? ` Review notes: ${input.reviewNotes}` : ""}`,
        link: `/store/modules/${updatedModule.slug}`,
      },
    });

    // Log the review action in audit log
    await this.prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: isApproved ? "MODULE_APPROVED" : "MODULE_REJECTED",
        entityType: "Module",
        entityId: input.moduleId,
        metadata: {
          moduleName: module.name,
          reviewNotes: input.reviewNotes ?? null,
        } as Prisma.InputJsonValue,
      },
    });

    return updatedModule;
  }

  async listUsers(input: ListUsersInput) {
    const where: Prisma.UserWhereInput = {};

    if (input.query) {
      where.OR = [
        { name: { contains: input.query, mode: "insensitive" } },
        { email: { contains: input.query, mode: "insensitive" } },
        { username: { contains: input.query, mode: "insensitive" } },
      ];
    }

    if (input.role) {
      where.role = input.role;
    }

    if (input.status) {
      where.status = input.status;
    }

    const page = input.page ?? 1;
    const limit = input.limit ?? 20;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          avatarUrl: true,
          role: true,
          status: true,
          createdAt: true,
          _count: {
            select: {
              publishedModules: true,
              deployments: true,
              orgMemberships: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateUserStatus(input: UpdateUserStatusInput) {
    const user = await this.prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true, role: true, status: true },
    });

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    if (isAdmin(user.role)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Cannot change the status of an admin user",
      });
    }

    return this.prisma.user.update({
      where: { id: input.userId },
      data: { status: input.status },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        status: true,
      },
    });
  }

  // ==================== SUBMISSION PIPELINE ====================

  async getSubmissionQueue(page = 1, limit = 20) {
    const where = { status: { in: ["SUBMITTED" as const, "IN_REVIEW" as const] } };

    const [submissions, total] = await Promise.all([
      this.prisma.submission.findMany({
        where,
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
        orderBy: { submittedAt: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.submission.count({ where }),
    ]);

    return {
      submissions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async reviewSubmission(adminUserId: string, input: ReviewSubmissionInput) {
    const submission = await this.prisma.submission.findUnique({
      where: { id: input.submissionId },
      include: {
        user: { select: { id: true, name: true, username: true } },
      },
    });

    if (!submission) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Submission not found",
      });
    }

    if (!["SUBMITTED", "IN_REVIEW"].includes(submission.status)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Submission is not pending review",
      });
    }

    const isApproved = input.action === "approve";

    if (isApproved) {
      // Create a new Module + ModuleVersion from the submission
      const slug =
        submission.appName
          .toLowerCase()
          .replace(/[^\w\s-]/g, "")
          .replace(/[\s_]+/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "") +
        "-" +
        Math.random().toString(36).slice(2, 6);

      const newModule = await this.prisma.module.create({
        data: {
          name: submission.appName,
          slug,
          shortDescription: submission.about.slice(0, 200),
          description: submission.about,
          authorId: submission.userId,
          status: "PUBLISHED",
          type: "SINGLE_CONTAINER",
          pricingModel: "FREE",
          publishedAt: new Date(),
          versions: {
            create: {
              version: submission.version,
              changelog: submission.changelog,
              dockerImage: submission.fileUrl,
              isLatest: true,
            },
          },
        },
      });

      // Link the submission to the created module
      await this.prisma.submission.update({
        where: { id: input.submissionId },
        data: {
          status: "APPROVED",
          moduleId: newModule.id,
          reviewNotes: input.reviewNotes,
          reviewedAt: new Date(),
          reviewedBy: adminUserId,
        },
      });

      // Notify the submitter
      await this.prisma.notification.create({
        data: {
          userId: submission.userId,
          type: "SUBMISSION_STATUS",
          title: `Submission "${submission.appName}" approved!`,
          body: `Your submission "${submission.appName}" has been approved and is now published on the FORGE Store.${input.reviewNotes ? ` Notes: ${input.reviewNotes}` : ""}`,
          link: `/store/${slug}`,
        },
      });

      // Audit log
      await this.prisma.auditLog.create({
        data: {
          userId: adminUserId,
          action: "SUBMISSION_APPROVED",
          entityType: "Submission",
          entityId: input.submissionId,
          metadata: {
            appName: submission.appName,
            moduleId: newModule.id,
            reviewNotes: input.reviewNotes ?? null,
          } as Prisma.InputJsonValue,
        },
      });

      return { status: "APPROVED" as const, moduleId: newModule.id, moduleSlug: slug };
    } else {
      // Reject: update submission status
      await this.prisma.submission.update({
        where: { id: input.submissionId },
        data: {
          status: "REJECTED",
          reviewNotes: input.reviewNotes,
          reviewedAt: new Date(),
          reviewedBy: adminUserId,
        },
      });

      // Notify the submitter
      await this.prisma.notification.create({
        data: {
          userId: submission.userId,
          type: "SUBMISSION_STATUS",
          title: `Submission "${submission.appName}" was not approved`,
          body: `Your submission "${submission.appName}" was not approved.${input.reviewNotes ? ` Feedback: ${input.reviewNotes}` : ""} You can update and resubmit.`,
          link: "/hub/submissions",
        },
      });

      // Audit log
      await this.prisma.auditLog.create({
        data: {
          userId: adminUserId,
          action: "SUBMISSION_REJECTED",
          entityType: "Submission",
          entityId: input.submissionId,
          metadata: {
            appName: submission.appName,
            reviewNotes: input.reviewNotes ?? null,
          } as Prisma.InputJsonValue,
        },
      });

      return { status: "REJECTED" as const };
    }
  }

  async getSystemMetrics() {
    const [
      totalUsers,
      totalModules,
      publishedModules,
      totalDeployments,
      runningDeployments,
      totalOrganizations,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.module.count(),
      this.prisma.module.count({ where: { status: "PUBLISHED" } }),
      this.prisma.deployment.count(),
      this.prisma.deployment.count({ where: { status: "RUNNING" } }),
      this.prisma.organization.count(),
    ]);

    return {
      totalUsers,
      totalModules,
      publishedModules,
      totalDeployments,
      runningDeployments,
      totalOrganizations,
    };
  }

  async getAuditLogs(page = 1, limit = 50) {
    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count(),
    ]);

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
