import { TRPCError } from "@trpc/server";
import { createMockPrismaClient } from "@forge/db";
import { HubService } from "@/server/services/hub.service";
import type {
  ListProjectsInput,
  CreateCommentInput,
  CreateSubmissionInput,
} from "@/lib/validators/hub";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const AUTHOR = {
  id: "user-1",
  name: "Test Author",
  username: "testauthor",
  avatarUrl: null,
};

function makeMockProject(overrides: Record<string, unknown> = {}) {
  return {
    id: "proj-1",
    name: "Test Project",
    slug: "test-project-ab12",
    description: "A test project description",
    repositoryUrl: null,
    isPublic: true,
    status: "ACTIVE",
    stars: 5,
    authorId: "user-1",
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    author: AUTHOR,
    tags: [{ tag: { name: "react", slug: "react" } }],
    _count: { comments: 2, collaborators: 1, starredBy: 5 },
    ...overrides,
  };
}

function makeListInput(overrides: Partial<ListProjectsInput> = {}): ListProjectsInput {
  return {
    sortBy: "newest",
    page: 1,
    limit: 12,
    ...overrides,
  };
}

function makeCommentInput(overrides: Partial<CreateCommentInput> = {}): CreateCommentInput {
  return {
    projectId: "proj-1",
    body: "Great project!",
    ...overrides,
  };
}

function makeSubmissionInput(
  overrides: Partial<CreateSubmissionInput> = {},
): CreateSubmissionInput {
  return {
    appName: "My App",
    companyName: "My Company",
    version: "1.0.0",
    about: "A detailed description of the application that is at least twenty characters.",
    fileUrl: "https://example.com/file.zip",
    labels: ["utility"],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("HubService", () => {
  let prisma: ReturnType<typeof createMockPrismaClient>;
  let service: HubService;

  beforeEach(() => {
    prisma = createMockPrismaClient();

    // The mock factory may not include projectStar. Add it manually if missing.
    if (!prisma.projectStar) {
      prisma.projectStar = {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
      };
    }

    service = new HubService(prisma as unknown as import("@forge/db").PrismaClient);
  });

  // -----------------------------------------------------------------------
  // starProject
  // -----------------------------------------------------------------------
  describe("starProject", () => {
    it("should star a project: creates ProjectStar + increments count", async () => {
      const userId = "user-1";
      const projectId = "proj-1";

      // Project exists with 5 stars
      prisma.project.findUnique.mockResolvedValue({ id: projectId, stars: 5 });

      // User has NOT starred yet
      prisma.projectStar.findUnique.mockResolvedValue(null);

      // Transaction mocks (the $transaction mock from factory will Promise.all them)
      prisma.projectStar.create.mockResolvedValue({
        id: "star-1",
        userId,
        projectId,
      });
      prisma.project.update.mockResolvedValue({
        id: projectId,
        stars: 6,
      });

      const result = await service.starProject(userId, projectId);

      expect(result).toEqual({ starred: true, stars: 6 });

      // Verified project existence
      expect(prisma.project.findUnique).toHaveBeenCalledWith({
        where: { id: projectId },
        select: { id: true, stars: true },
      });

      // Checked for existing star with compound key
      expect(prisma.projectStar.findUnique).toHaveBeenCalledWith({
        where: { userId_projectId: { userId, projectId } },
      });

      // Transaction was called with star creation + count increment
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.projectStar.create).toHaveBeenCalledWith({
        data: { userId, projectId },
      });
      expect(prisma.project.update).toHaveBeenCalledWith({
        where: { id: projectId },
        data: { stars: { increment: 1 } },
      });
    });

    it("should unstar a project: deletes ProjectStar + decrements count", async () => {
      const userId = "user-1";
      const projectId = "proj-1";

      // Project exists with 5 stars
      prisma.project.findUnique.mockResolvedValue({ id: projectId, stars: 5 });

      // User HAS already starred
      const existingStar = { id: "star-1", userId, projectId };
      prisma.projectStar.findUnique.mockResolvedValue(existingStar);

      // Transaction mocks
      prisma.projectStar.delete.mockResolvedValue(existingStar);
      prisma.project.update.mockResolvedValue({
        id: projectId,
        stars: 4,
      });

      const result = await service.starProject(userId, projectId);

      expect(result).toEqual({ starred: false, stars: 4 });

      // Transaction was called with star deletion + count decrement
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.projectStar.delete).toHaveBeenCalledWith({
        where: { id: existingStar.id },
      });
      expect(prisma.project.update).toHaveBeenCalledWith({
        where: { id: projectId },
        data: { stars: { decrement: 1 } },
      });
    });

    it("should clamp to zero when unstarring a project with 0 stars", async () => {
      const userId = "user-1";
      const projectId = "proj-1";

      // Edge case: stars is already 0
      prisma.project.findUnique.mockResolvedValue({ id: projectId, stars: 0 });

      const existingStar = { id: "star-1", userId, projectId };
      prisma.projectStar.findUnique.mockResolvedValue(existingStar);

      prisma.projectStar.delete.mockResolvedValue(existingStar);
      prisma.project.update.mockResolvedValue({ id: projectId, stars: 0 });

      const result = await service.starProject(userId, projectId);

      // Math.max(0, 0 - 1) = 0
      expect(result).toEqual({ starred: false, stars: 0 });
    });

    it("should throw NOT_FOUND when project does not exist", async () => {
      prisma.project.findUnique.mockResolvedValue(null);

      await expect(service.starProject("user-1", "nonexistent")).rejects.toThrow(TRPCError);
      await expect(service.starProject("user-1", "nonexistent")).rejects.toMatchObject({
        code: "NOT_FOUND",
      });

      // Should not check for existing star
      expect(prisma.projectStar.findUnique).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // listProjects
  // -----------------------------------------------------------------------
  describe("listProjects", () => {
    it("should list projects with isStarred = true when userId provided and project is starred", async () => {
      const userId = "user-1";
      const input = makeListInput();

      const projectWithStar = makeMockProject({
        starredBy: [{ id: "star-1" }],
      });

      prisma.project.findMany.mockResolvedValue([projectWithStar]);
      prisma.project.count.mockResolvedValue(1);

      const result = await service.listProjects(input, userId);

      expect(result.projects).toHaveLength(1);
      expect(result.projects[0]!.isStarred).toBe(true);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);

      // findMany includes starredBy filter when userId is provided
      const findManyCall = prisma.project.findMany.mock.calls[0]![0];
      expect(findManyCall.include.starredBy).toEqual({
        where: { userId },
        select: { id: true },
        take: 1,
      });
    });

    it("should list projects with isStarred = false when userId provided but not starred", async () => {
      const userId = "user-1";
      const input = makeListInput();

      const projectWithoutStar = makeMockProject({
        starredBy: [],
      });

      prisma.project.findMany.mockResolvedValue([projectWithoutStar]);
      prisma.project.count.mockResolvedValue(1);

      const result = await service.listProjects(input, userId);

      expect(result.projects).toHaveLength(1);
      expect(result.projects[0]!.isStarred).toBe(false);
    });

    it("should list projects with isStarred = false when no userId provided", async () => {
      const input = makeListInput();

      const project = makeMockProject();
      prisma.project.findMany.mockResolvedValue([project]);
      prisma.project.count.mockResolvedValue(1);

      const result = await service.listProjects(input);

      expect(result.projects).toHaveLength(1);
      expect(result.projects[0]!.isStarred).toBe(false);

      // findMany should NOT include starredBy when no userId
      const findManyCall = prisma.project.findMany.mock.calls[0]![0];
      expect(findManyCall.include.starredBy).toBeUndefined();
    });

    it("should apply query filter when provided", async () => {
      const input = makeListInput({ query: "react" });

      prisma.project.findMany.mockResolvedValue([]);
      prisma.project.count.mockResolvedValue(0);

      await service.listProjects(input);

      const findManyCall = prisma.project.findMany.mock.calls[0]![0];
      expect(findManyCall.where.OR).toEqual([
        { name: { contains: "react", mode: "insensitive" } },
        { description: { contains: "react", mode: "insensitive" } },
      ]);
    });

    it("should apply tags filter when provided", async () => {
      const input = makeListInput({ tags: ["react", "typescript"] });

      prisma.project.findMany.mockResolvedValue([]);
      prisma.project.count.mockResolvedValue(0);

      await service.listProjects(input);

      const findManyCall = prisma.project.findMany.mock.calls[0]![0];
      expect(findManyCall.where.tags).toEqual({
        some: { tag: { slug: { in: ["react", "typescript"] } } },
      });
    });

    it("should sort by popularity when sortBy is 'popular'", async () => {
      const input = makeListInput({ sortBy: "popular" });

      prisma.project.findMany.mockResolvedValue([]);
      prisma.project.count.mockResolvedValue(0);

      await service.listProjects(input);

      const findManyCall = prisma.project.findMany.mock.calls[0]![0];
      expect(findManyCall.orderBy).toEqual({ stars: "desc" });
    });

    it("should sort by name when sortBy is 'name'", async () => {
      const input = makeListInput({ sortBy: "name" });

      prisma.project.findMany.mockResolvedValue([]);
      prisma.project.count.mockResolvedValue(0);

      await service.listProjects(input);

      const findManyCall = prisma.project.findMany.mock.calls[0]![0];
      expect(findManyCall.orderBy).toEqual({ name: "asc" });
    });

    it("should sort by createdAt desc by default (newest)", async () => {
      const input = makeListInput({ sortBy: "newest" });

      prisma.project.findMany.mockResolvedValue([]);
      prisma.project.count.mockResolvedValue(0);

      await service.listProjects(input);

      const findManyCall = prisma.project.findMany.mock.calls[0]![0];
      expect(findManyCall.orderBy).toEqual({ createdAt: "desc" });
    });

    it("should paginate correctly", async () => {
      const input = makeListInput({ page: 3, limit: 10 });

      prisma.project.findMany.mockResolvedValue([]);
      prisma.project.count.mockResolvedValue(25);

      const result = await service.listProjects(input);

      const findManyCall = prisma.project.findMany.mock.calls[0]![0];
      expect(findManyCall.skip).toBe(20); // (3 - 1) * 10
      expect(findManyCall.take).toBe(10);
      expect(result.totalPages).toBe(3); // Math.ceil(25 / 10)
      expect(result.page).toBe(3);
    });
  });

  // -----------------------------------------------------------------------
  // getProjectBySlug
  // -----------------------------------------------------------------------
  describe("getProjectBySlug", () => {
    it("should return project with isStarred = true when user has starred", async () => {
      const userId = "user-1";
      const slug = "test-project-ab12";

      const projectData = makeMockProject({
        starredBy: [{ id: "star-1" }],
        collaborators: [],
        comments: [],
      });

      prisma.project.findUnique.mockResolvedValue(projectData);

      const result = await service.getProjectBySlug(slug, userId);

      expect(result).not.toBeNull();
      expect(result!.isStarred).toBe(true);
      expect(result!.name).toBe("Test Project");

      // findUnique includes starredBy filter when userId is provided
      const findUniqueCall = prisma.project.findUnique.mock.calls[0]![0];
      expect(findUniqueCall.where).toEqual({ slug });
      expect(findUniqueCall.include.starredBy).toEqual({
        where: { userId },
        select: { id: true },
        take: 1,
      });
    });

    it("should return project with isStarred = false when user has not starred", async () => {
      const userId = "user-1";
      const slug = "test-project-ab12";

      const projectData = makeMockProject({
        starredBy: [],
        collaborators: [],
        comments: [],
      });

      prisma.project.findUnique.mockResolvedValue(projectData);

      const result = await service.getProjectBySlug(slug, userId);

      expect(result).not.toBeNull();
      expect(result!.isStarred).toBe(false);
    });

    it("should return project with isStarred = false when no userId provided", async () => {
      const slug = "test-project-ab12";

      const projectData = makeMockProject({
        collaborators: [],
        comments: [],
      });

      prisma.project.findUnique.mockResolvedValue(projectData);

      const result = await service.getProjectBySlug(slug);

      expect(result).not.toBeNull();
      expect(result!.isStarred).toBe(false);

      // findUnique should NOT include starredBy when no userId
      const findUniqueCall = prisma.project.findUnique.mock.calls[0]![0];
      expect(findUniqueCall.include.starredBy).toBeUndefined();
    });

    it("should return null for nonexistent slug", async () => {
      prisma.project.findUnique.mockResolvedValue(null);

      const result = await service.getProjectBySlug("nonexistent-slug");

      expect(result).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // addComment
  // -----------------------------------------------------------------------
  describe("addComment", () => {
    it("should create a comment on an existing project", async () => {
      const userId = "user-1";
      const input = makeCommentInput();

      // Project exists
      prisma.project.findUnique.mockResolvedValue({ id: "proj-1" });

      const mockComment = {
        id: "comment-1",
        projectId: "proj-1",
        userId,
        body: "Great project!",
        parentId: null,
        createdAt: new Date("2025-01-15"),
        user: AUTHOR,
      };
      prisma.comment.create.mockResolvedValue(mockComment);

      const result = await service.addComment(userId, input);

      expect(result).toEqual(mockComment);

      // Verified project exists
      expect(prisma.project.findUnique).toHaveBeenCalledWith({
        where: { id: "proj-1" },
        select: { id: true },
      });

      // Comment was created with correct data
      expect(prisma.comment.create).toHaveBeenCalledWith({
        data: {
          projectId: "proj-1",
          userId,
          body: "Great project!",
          parentId: undefined,
        },
        include: {
          user: { select: { id: true, name: true, username: true, avatarUrl: true } },
        },
      });
    });

    it("should create a reply comment with parentId", async () => {
      const userId = "user-1";
      const input = makeCommentInput({ parentId: "comment-parent" });

      prisma.project.findUnique.mockResolvedValue({ id: "proj-1" });

      const mockReply = {
        id: "comment-2",
        projectId: "proj-1",
        userId,
        body: "Great project!",
        parentId: "comment-parent",
        createdAt: new Date("2025-01-15"),
        user: AUTHOR,
      };
      prisma.comment.create.mockResolvedValue(mockReply);

      const result = await service.addComment(userId, input);

      expect(result).toEqual(mockReply);

      const createCall = prisma.comment.create.mock.calls[0]![0];
      expect(createCall.data.parentId).toBe("comment-parent");
    });

    it("should throw NOT_FOUND when project does not exist", async () => {
      prisma.project.findUnique.mockResolvedValue(null);

      await expect(
        service.addComment("user-1", makeCommentInput()),
      ).rejects.toThrow(TRPCError);
      await expect(
        service.addComment("user-1", makeCommentInput()),
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
      });

      // Should not create a comment
      expect(prisma.comment.create).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // createSubmission
  // -----------------------------------------------------------------------
  describe("createSubmission", () => {
    it("should create a submission with SUBMITTED status", async () => {
      const userId = "user-1";
      const input = makeSubmissionInput();

      const mockSubmission = {
        id: "sub-1",
        userId,
        appName: "My App",
        companyName: "My Company",
        version: "1.0.0",
        about: input.about,
        changelog: undefined,
        extraInfo: undefined,
        labels: ["utility"],
        fileUrl: "https://example.com/file.zip",
        status: "SUBMITTED",
        submittedAt: new Date("2025-01-15"),
      };
      prisma.submission.create.mockResolvedValue(mockSubmission);

      const result = await service.createSubmission(userId, input);

      expect(result).toEqual(mockSubmission);
      expect(prisma.submission.create).toHaveBeenCalledWith({
        data: {
          userId,
          appName: "My App",
          companyName: "My Company",
          version: "1.0.0",
          about: input.about,
          changelog: undefined,
          extraInfo: undefined,
          labels: ["utility"],
          fileUrl: "https://example.com/file.zip",
          status: "SUBMITTED",
        },
      });
    });

    it("should include optional changelog and extraInfo when provided", async () => {
      const userId = "user-1";
      const input = makeSubmissionInput({
        changelog: "- Fixed bugs\n- Added features",
        extraInfo: "Some additional context",
      });

      prisma.submission.create.mockResolvedValue({
        id: "sub-2",
        ...input,
        userId,
        status: "SUBMITTED",
      });

      await service.createSubmission(userId, input);

      const createCall = prisma.submission.create.mock.calls[0]![0];
      expect(createCall.data.changelog).toBe("- Fixed bugs\n- Added features");
      expect(createCall.data.extraInfo).toBe("Some additional context");
    });
  });

  // -----------------------------------------------------------------------
  // createProject
  // -----------------------------------------------------------------------
  describe("createProject", () => {
    it("should create a project with tags and slug", async () => {
      const userId = "user-1";
      const input = {
        name: "My New Project",
        description: "A project description",
        isPublic: true,
        tags: ["react", "typescript"],
      };

      // Tag upserts
      prisma.tag.upsert
        .mockResolvedValueOnce({ id: "tag-1", name: "react", slug: "react" })
        .mockResolvedValueOnce({ id: "tag-2", name: "typescript", slug: "typescript" });

      const expectedProject = makeMockProject({ name: "My New Project" });
      prisma.project.create.mockResolvedValue(expectedProject);

      const result = await service.createProject(userId, input);

      expect(result).toEqual(expectedProject);

      // Tags were upserted
      expect(prisma.tag.upsert).toHaveBeenCalledTimes(2);
      expect(prisma.tag.upsert).toHaveBeenCalledWith({
        where: { slug: "react" },
        create: { name: "react", slug: "react" },
        update: {},
      });

      // Project was created with correct data
      const createCall = prisma.project.create.mock.calls[0]![0];
      expect(createCall.data.authorId).toBe(userId);
      expect(createCall.data.name).toBe("My New Project");
      expect(createCall.data.slug).toMatch(/^my-new-project-/);
      expect(createCall.data.isPublic).toBe(true);
      expect(createCall.data.status).toBe("ACTIVE");
      expect(createCall.data.tags).toEqual({
        create: [{ tagId: "tag-1" }, { tagId: "tag-2" }],
      });
    });
  });

  // -----------------------------------------------------------------------
  // getMyProjects
  // -----------------------------------------------------------------------
  describe("getMyProjects", () => {
    it("should return all projects for the user", async () => {
      const userId = "user-1";
      const projects = [makeMockProject(), makeMockProject({ id: "proj-2", name: "Second" })];

      prisma.project.findMany.mockResolvedValue(projects);

      const result = await service.getMyProjects(userId);

      expect(result).toEqual(projects);
      expect(prisma.project.findMany).toHaveBeenCalledWith({
        where: { authorId: userId },
        include: {
          author: { select: { id: true, name: true, username: true, avatarUrl: true } },
          tags: { include: { tag: { select: { name: true, slug: true } } } },
          _count: { select: { comments: true, collaborators: true, starredBy: true } },
        },
        orderBy: { updatedAt: "desc" },
      });
    });
  });

  // -----------------------------------------------------------------------
  // getMySubmissions
  // -----------------------------------------------------------------------
  describe("getMySubmissions", () => {
    it("should return submissions with moduleSlug enrichment", async () => {
      const userId = "user-1";
      const submissions = [
        { id: "sub-1", userId, appName: "App 1", status: "SUBMITTED", moduleId: "mod-1" },
        { id: "sub-2", userId, appName: "App 2", status: "APPROVED", moduleId: null },
      ];

      prisma.submission.findMany.mockResolvedValue(submissions);
      prisma.module.findMany.mockResolvedValue([
        { id: "mod-1", slug: "app-one" },
      ]);

      const result = await service.getMySubmissions(userId);

      expect(result).toEqual([
        { ...submissions[0], moduleSlug: "app-one" },
        { ...submissions[1], moduleSlug: null },
      ]);
      expect(prisma.submission.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { submittedAt: "desc" },
      });
      expect(prisma.module.findMany).toHaveBeenCalledWith({
        where: { id: { in: ["mod-1"] } },
        select: { id: true, slug: true },
      });
    });

    it("should skip module lookup when no submissions have moduleId", async () => {
      const userId = "user-1";
      const submissions = [
        { id: "sub-1", userId, appName: "App 1", status: "SUBMITTED", moduleId: null },
      ];

      prisma.submission.findMany.mockResolvedValue(submissions);

      const result = await service.getMySubmissions(userId);

      expect(result).toEqual([{ ...submissions[0], moduleSlug: null }]);
      expect(prisma.module.findMany).not.toHaveBeenCalled();
    });
  });
});
