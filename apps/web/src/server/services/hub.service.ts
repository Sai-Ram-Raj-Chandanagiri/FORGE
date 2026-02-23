import { TRPCError } from "@trpc/server";
import { type PrismaClient } from "@forge/db";
import type {
  CreateProjectInput,
  UpdateProjectInput,
  CreateCommentInput,
  CreateSubmissionInput,
  ListProjectsInput,
} from "@/lib/validators/hub";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export class HubService {
  constructor(private prisma: PrismaClient) {}

  // ==================== PROJECTS ====================

  async createProject(userId: string, input: CreateProjectInput) {
    const slug = slugify(input.name) + "-" + Math.random().toString(36).slice(2, 6);

    const tagRecords = await Promise.all(
      input.tags.map(async (tagName) => {
        const tagSlug = slugify(tagName);
        return this.prisma.tag.upsert({
          where: { slug: tagSlug },
          create: { name: tagName, slug: tagSlug },
          update: {},
        });
      }),
    );

    return this.prisma.project.create({
      data: {
        authorId: userId,
        name: input.name,
        slug,
        description: input.description,
        repositoryUrl: input.repositoryUrl || null,
        isPublic: input.isPublic,
        status: "ACTIVE",
        tags: {
          create: tagRecords.map((t) => ({ tagId: t.id })),
        },
      },
      include: {
        author: { select: { id: true, name: true, username: true, avatarUrl: true } },
        tags: { include: { tag: { select: { name: true, slug: true } } } },
        _count: { select: { comments: true, collaborators: true } },
      },
    });
  }

  async listProjects(input: ListProjectsInput) {
    const where: Record<string, unknown> = {
      isPublic: true,
      status: "ACTIVE",
    };

    if (input.query) {
      where.OR = [
        { name: { contains: input.query, mode: "insensitive" } },
        { description: { contains: input.query, mode: "insensitive" } },
      ];
    }

    if (input.tags && input.tags.length > 0) {
      where.tags = { some: { tag: { slug: { in: input.tags } } } };
    }

    let orderBy: Record<string, string>;
    switch (input.sortBy) {
      case "popular":
        orderBy = { stars: "desc" };
        break;
      case "name":
        orderBy = { name: "asc" };
        break;
      default:
        orderBy = { createdAt: "desc" };
    }

    const skip = (input.page - 1) * input.limit;

    const [projects, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        include: {
          author: { select: { id: true, name: true, username: true, avatarUrl: true } },
          tags: { include: { tag: { select: { name: true, slug: true } } } },
          _count: { select: { comments: true, collaborators: true } },
        },
        orderBy,
        skip,
        take: input.limit,
      }),
      this.prisma.project.count({ where }),
    ]);

    return { projects, total, page: input.page, totalPages: Math.ceil(total / input.limit) };
  }

  async getProjectBySlug(slug: string) {
    return this.prisma.project.findUnique({
      where: { slug },
      include: {
        author: { select: { id: true, name: true, username: true, avatarUrl: true, bio: true } },
        tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
        collaborators: {
          include: {
            user: { select: { id: true, name: true, username: true, avatarUrl: true } },
          },
        },
        comments: {
          where: { parentId: null },
          include: {
            user: { select: { id: true, name: true, username: true, avatarUrl: true } },
            replies: {
              include: {
                user: { select: { id: true, name: true, username: true, avatarUrl: true } },
              },
              orderBy: { createdAt: "asc" },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        _count: { select: { comments: true, collaborators: true } },
      },
    });
  }

  async getMyProjects(userId: string) {
    return this.prisma.project.findMany({
      where: { authorId: userId },
      include: {
        author: { select: { id: true, name: true, username: true, avatarUrl: true } },
        tags: { include: { tag: { select: { name: true, slug: true } } } },
        _count: { select: { comments: true, collaborators: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  async starProject(userId: string, projectId: string) {
    // Simple increment — in production you'd have a UserStar join table
    await this.prisma.project.update({
      where: { id: projectId },
      data: { stars: { increment: 1 } },
    });
    return { success: true };
  }

  // ==================== COMMENTS ====================

  async addComment(userId: string, input: CreateCommentInput) {
    const project = await this.prisma.project.findUnique({
      where: { id: input.projectId },
      select: { id: true },
    });

    if (!project) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
    }

    return this.prisma.comment.create({
      data: {
        projectId: input.projectId,
        userId,
        body: input.body,
        parentId: input.parentId,
      },
      include: {
        user: { select: { id: true, name: true, username: true, avatarUrl: true } },
      },
    });
  }

  // ==================== SUBMISSIONS ====================

  async createSubmission(userId: string, input: CreateSubmissionInput) {
    return this.prisma.submission.create({
      data: {
        userId,
        appName: input.appName,
        companyName: input.companyName,
        version: input.version,
        about: input.about,
        changelog: input.changelog,
        extraInfo: input.extraInfo,
        labels: input.labels,
        fileUrl: input.fileUrl,
        status: "SUBMITTED",
      },
    });
  }

  async getMySubmissions(userId: string) {
    return this.prisma.submission.findMany({
      where: { userId },
      orderBy: { submittedAt: "desc" },
    });
  }

  // ==================== DEVELOPER PROFILES ====================

  async getDeveloperProfile(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
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

    if (!user) return null;

    const [modules, projects] = await Promise.all([
      this.prisma.module.findMany({
        where: { authorId: user.id, status: "PUBLISHED" },
        select: {
          id: true,
          name: true,
          slug: true,
          shortDescription: true,
          logoUrl: true,
          averageRating: true,
          downloadCount: true,
        },
        take: 6,
        orderBy: { downloadCount: "desc" },
      }),
      this.prisma.project.findMany({
        where: { authorId: user.id, isPublic: true, status: "ACTIVE" },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          stars: true,
        },
        take: 6,
        orderBy: { stars: "desc" },
      }),
    ]);

    return { ...user, modules, projects };
  }
}
