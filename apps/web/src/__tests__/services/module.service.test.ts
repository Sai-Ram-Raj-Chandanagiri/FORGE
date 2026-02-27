import { TRPCError } from "@trpc/server";
import { createMockPrismaClient, Prisma } from "@forge/db";
import { ModuleService } from "@/server/services/module.service";
import type { CreateModuleInput, UpdateModuleInput } from "@/lib/validators/module";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockModule(overrides: Record<string, unknown> = {}) {
  return {
    id: "mod-1",
    name: "Test Module",
    slug: "test-module",
    shortDescription: "A short description for testing purposes",
    description: "A longer description that meets the minimum length requirement for module descriptions in the system.",
    type: "SINGLE_CONTAINER",
    pricingModel: "FREE",
    price: null,
    currency: "USD",
    logoUrl: null,
    repositoryUrl: null,
    documentationUrl: null,
    website: null,
    bannerUrl: null,
    featured: false,
    status: "DRAFT",
    authorId: "user-1",
    downloadCount: 0,
    averageRating: 0,
    reviewCount: 0,
    publishedAt: null,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    author: { id: "user-1", name: "Author", username: "author", avatarUrl: null },
    categories: [],
    tags: [],
    ...overrides,
  };
}

function makeCreateInput(overrides: Partial<CreateModuleInput> = {}): CreateModuleInput {
  return {
    name: "Test Module",
    shortDescription: "A short description for testing purposes",
    description:
      "A longer description that meets the minimum length requirement for module descriptions in the system.",
    type: "SINGLE_CONTAINER",
    pricingModel: "FREE",
    currency: "USD",
    categoryIds: ["cat-1"],
    tags: ["docker", "devops"],
    ...overrides,
  };
}

function makeUpdateInput(overrides: Partial<UpdateModuleInput> = {}): UpdateModuleInput {
  return {
    id: "mod-1",
    name: "Updated Module",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("ModuleService", () => {
  let prisma: ReturnType<typeof createMockPrismaClient>;
  let service: ModuleService;

  beforeEach(() => {
    prisma = createMockPrismaClient();
    service = new ModuleService(prisma);
  });

  // -----------------------------------------------------------------------
  // create
  // -----------------------------------------------------------------------
  describe("create", () => {
    it("should create a module with slug, upserted tags, and categories", async () => {
      const input = makeCreateInput();
      const authorId = "user-1";

      // No existing module with this slug
      prisma.module.findUnique.mockResolvedValue(null);

      // Tag upserts return tag records
      prisma.tag.upsert
        .mockResolvedValueOnce({ id: "tag-1", name: "docker", slug: "docker" })
        .mockResolvedValueOnce({ id: "tag-2", name: "devops", slug: "devops" });

      const expectedModule = makeMockModule();
      prisma.module.create.mockResolvedValue(expectedModule);

      const result = await service.create(authorId, input);

      expect(result).toEqual(expectedModule);

      // Slug check was performed
      expect(prisma.module.findUnique).toHaveBeenCalledWith({
        where: { slug: "test-module" },
      });

      // Tags were upserted
      expect(prisma.tag.upsert).toHaveBeenCalledTimes(2);
      expect(prisma.tag.upsert).toHaveBeenCalledWith({
        where: { slug: "docker" },
        create: { name: "docker", slug: "docker" },
        update: {},
      });
      expect(prisma.tag.upsert).toHaveBeenCalledWith({
        where: { slug: "devops" },
        create: { name: "devops", slug: "devops" },
        update: {},
      });

      // Module was created with correct data
      expect(prisma.module.create).toHaveBeenCalledTimes(1);
      const createCall = prisma.module.create.mock.calls[0][0];
      expect(createCall.data.name).toBe("Test Module");
      expect(createCall.data.slug).toBe("test-module");
      expect(createCall.data.authorId).toBe(authorId);
      expect(createCall.data.categories).toEqual({
        create: [{ categoryId: "cat-1" }],
      });
      expect(createCall.data.tags).toEqual({
        create: [{ tagId: "tag-1" }, { tagId: "tag-2" }],
      });
    });

    it("should throw CONFLICT if a module with the same slug already exists", async () => {
      const input = makeCreateInput();

      // Slug already taken
      prisma.module.findUnique.mockResolvedValue(makeMockModule());

      await expect(service.create("user-1", input)).rejects.toThrow(TRPCError);
      await expect(service.create("user-1", input)).rejects.toMatchObject({
        code: "CONFLICT",
      });

      // Should not attempt to create the module
      expect(prisma.module.create).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // update
  // -----------------------------------------------------------------------
  describe("update", () => {
    it("should update a module when the user is the author", async () => {
      const userId = "user-1";
      const input = makeUpdateInput();

      prisma.module.findUnique.mockResolvedValue({
        authorId: "user-1",
        status: "DRAFT",
      });

      const updatedModule = makeMockModule({ name: "Updated Module" });
      prisma.module.update.mockResolvedValue(updatedModule);

      const result = await service.update(userId, input);

      expect(result).toEqual(updatedModule);
      expect(prisma.module.findUnique).toHaveBeenCalledWith({
        where: { id: "mod-1" },
        select: { authorId: true, status: true },
      });
      expect(prisma.module.update).toHaveBeenCalledTimes(1);
    });

    it("should throw NOT_FOUND if module does not exist", async () => {
      prisma.module.findUnique.mockResolvedValue(null);

      await expect(service.update("user-1", makeUpdateInput())).rejects.toThrow(TRPCError);
      await expect(service.update("user-1", makeUpdateInput())).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });

    it("should throw FORBIDDEN if user is not the author", async () => {
      prisma.module.findUnique.mockResolvedValue({
        authorId: "user-other",
        status: "DRAFT",
      });

      await expect(service.update("user-1", makeUpdateInput())).rejects.toThrow(TRPCError);
      await expect(service.update("user-1", makeUpdateInput())).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    });

    it("should update categories and tags when provided", async () => {
      const userId = "user-1";
      const input = makeUpdateInput({
        categoryIds: ["cat-2", "cat-3"],
        tags: ["new-tag"],
      });

      prisma.module.findUnique.mockResolvedValue({
        authorId: "user-1",
        status: "DRAFT",
      });

      prisma.moduleCategory.deleteMany.mockResolvedValue({ count: 1 });
      prisma.moduleTag.deleteMany.mockResolvedValue({ count: 1 });
      prisma.tag.upsert.mockResolvedValue({ id: "tag-new", name: "new-tag", slug: "new-tag" });

      const updatedModule = makeMockModule({ name: "Updated Module" });
      prisma.module.update.mockResolvedValue(updatedModule);

      const result = await service.update(userId, input);

      expect(result).toEqual(updatedModule);

      // Old categories and tags were removed
      expect(prisma.moduleCategory.deleteMany).toHaveBeenCalledWith({
        where: { moduleId: "mod-1" },
      });
      expect(prisma.moduleTag.deleteMany).toHaveBeenCalledWith({
        where: { moduleId: "mod-1" },
      });

      // New tag was upserted
      expect(prisma.tag.upsert).toHaveBeenCalledWith({
        where: { slug: "new-tag" },
        create: { name: "new-tag", slug: "new-tag" },
        update: {},
      });

      // Update call includes new categories and tags
      const updateCall = prisma.module.update.mock.calls[0][0];
      expect(updateCall.data.categories).toEqual({
        create: [{ categoryId: "cat-2" }, { categoryId: "cat-3" }],
      });
      expect(updateCall.data.tags).toEqual({
        create: [{ tagId: "tag-new" }],
      });
    });
  });

  // -----------------------------------------------------------------------
  // publish
  // -----------------------------------------------------------------------
  describe("publish", () => {
    it("should set status to PENDING_REVIEW when module has versions", async () => {
      const userId = "user-1";
      const moduleId = "mod-1";

      prisma.module.findUnique.mockResolvedValue({
        id: moduleId,
        authorId: userId,
        status: "DRAFT",
        versions: [{ id: "ver-1", version: "1.0.0", isLatest: true }],
      });

      const publishedModule = makeMockModule({ status: "PENDING_REVIEW" });
      prisma.module.update.mockResolvedValue(publishedModule);

      const result = await service.publish(userId, moduleId);

      expect(result).toEqual(publishedModule);
      expect(prisma.module.update).toHaveBeenCalledWith({
        where: { id: moduleId },
        data: { status: "PENDING_REVIEW" },
        select: expect.any(Object),
      });
    });

    it("should throw FORBIDDEN if user is not the module owner", async () => {
      prisma.module.findUnique.mockResolvedValue({
        id: "mod-1",
        authorId: "user-other",
        status: "DRAFT",
        versions: [{ id: "ver-1" }],
      });

      await expect(service.publish("user-1", "mod-1")).rejects.toThrow(TRPCError);
      await expect(service.publish("user-1", "mod-1")).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    });

    it("should throw BAD_REQUEST if module has no versions", async () => {
      prisma.module.findUnique.mockResolvedValue({
        id: "mod-1",
        authorId: "user-1",
        status: "DRAFT",
        versions: [],
      });

      await expect(service.publish("user-1", "mod-1")).rejects.toThrow(TRPCError);
      await expect(service.publish("user-1", "mod-1")).rejects.toMatchObject({
        code: "BAD_REQUEST",
      });
    });

    it("should throw NOT_FOUND if module does not exist", async () => {
      prisma.module.findUnique.mockResolvedValue(null);

      await expect(service.publish("user-1", "mod-1")).rejects.toThrow(TRPCError);
      await expect(service.publish("user-1", "mod-1")).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });
  });

  // -----------------------------------------------------------------------
  // archive
  // -----------------------------------------------------------------------
  describe("archive", () => {
    it("should set status to ARCHIVED for an owned module", async () => {
      const userId = "user-1";
      const moduleId = "mod-1";

      prisma.module.findUnique.mockResolvedValue({ authorId: userId });

      const archivedModule = makeMockModule({ status: "ARCHIVED" });
      prisma.module.update.mockResolvedValue(archivedModule);

      const result = await service.archive(userId, moduleId);

      expect(result).toEqual(archivedModule);
      expect(prisma.module.update).toHaveBeenCalledWith({
        where: { id: moduleId },
        data: { status: "ARCHIVED" },
        select: expect.any(Object),
      });
    });

    it("should throw FORBIDDEN if user is not the module owner", async () => {
      prisma.module.findUnique.mockResolvedValue({ authorId: "user-other" });

      await expect(service.archive("user-1", "mod-1")).rejects.toThrow(TRPCError);
      await expect(service.archive("user-1", "mod-1")).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    });

    it("should throw NOT_FOUND if module does not exist", async () => {
      prisma.module.findUnique.mockResolvedValue(null);

      await expect(service.archive("user-1", "mod-1")).rejects.toThrow(TRPCError);
      await expect(service.archive("user-1", "mod-1")).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });
  });

  // -----------------------------------------------------------------------
  // purchase
  // -----------------------------------------------------------------------
  describe("purchase", () => {
    it("should create a free purchase and return success", async () => {
      const userId = "user-buyer";
      const moduleId = "mod-1";

      prisma.module.findUnique.mockResolvedValue({
        id: moduleId,
        status: "PUBLISHED",
        pricingModel: "FREE",
        price: null,
        authorId: "user-author",
      });

      prisma.purchase.findFirst.mockResolvedValue(null);
      prisma.purchase.create.mockResolvedValue({
        id: "purchase-1",
        userId,
        moduleId,
        pricePaid: new Prisma.Decimal(0),
        status: "ACTIVE",
      });
      prisma.module.update.mockResolvedValue({});

      const result = await service.purchase(userId, moduleId);

      expect(result).toEqual({ success: true });

      // Purchase was created with price 0
      expect(prisma.purchase.create).toHaveBeenCalledWith({
        data: {
          userId,
          moduleId,
          pricePaid: expect.any(Prisma.Decimal),
          status: "ACTIVE",
        },
      });

      // Download count was incremented
      expect(prisma.module.update).toHaveBeenCalledWith({
        where: { id: moduleId },
        data: { downloadCount: { increment: 1 } },
      });
    });

    it("should throw BAD_REQUEST for paid module when Stripe is not configured", async () => {
      const userId = "user-buyer";
      const moduleId = "mod-1";

      // Ensure Stripe is not configured
      delete process.env.STRIPE_SECRET_KEY;

      prisma.module.findUnique.mockResolvedValue({
        id: moduleId,
        status: "PUBLISHED",
        pricingModel: "ONE_TIME",
        price: new Prisma.Decimal(10),
        authorId: "user-author",
      });

      prisma.purchase.findFirst.mockResolvedValue(null);

      await expect(service.purchase(userId, moduleId)).rejects.toThrow(TRPCError);
      await expect(service.purchase(userId, moduleId)).rejects.toMatchObject({
        code: "BAD_REQUEST",
      });

      // Should not create a purchase directly
      expect(prisma.purchase.create).not.toHaveBeenCalled();
    });

    it("should throw NOT_FOUND if module is not published", async () => {
      prisma.module.findUnique.mockResolvedValue({
        id: "mod-1",
        status: "DRAFT",
        pricingModel: "FREE",
        price: null,
        authorId: "user-author",
      });

      await expect(service.purchase("user-buyer", "mod-1")).rejects.toThrow(TRPCError);
      await expect(service.purchase("user-buyer", "mod-1")).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });

    it("should throw NOT_FOUND if module does not exist", async () => {
      prisma.module.findUnique.mockResolvedValue(null);

      await expect(service.purchase("user-buyer", "mod-1")).rejects.toThrow(TRPCError);
      await expect(service.purchase("user-buyer", "mod-1")).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });

    it("should throw BAD_REQUEST if user tries to purchase their own module", async () => {
      prisma.module.findUnique.mockResolvedValue({
        id: "mod-1",
        status: "PUBLISHED",
        pricingModel: "FREE",
        price: null,
        authorId: "user-1",
      });

      await expect(service.purchase("user-1", "mod-1")).rejects.toThrow(TRPCError);
      await expect(service.purchase("user-1", "mod-1")).rejects.toMatchObject({
        code: "BAD_REQUEST",
      });
    });

    it("should throw CONFLICT if user already owns the module", async () => {
      prisma.module.findUnique.mockResolvedValue({
        id: "mod-1",
        status: "PUBLISHED",
        pricingModel: "FREE",
        price: null,
        authorId: "user-author",
      });

      prisma.purchase.findFirst.mockResolvedValue({
        id: "purchase-existing",
        userId: "user-buyer",
        moduleId: "mod-1",
        status: "ACTIVE",
      });

      await expect(service.purchase("user-buyer", "mod-1")).rejects.toThrow(TRPCError);
      await expect(service.purchase("user-buyer", "mod-1")).rejects.toMatchObject({
        code: "CONFLICT",
      });

      // Should not create a new purchase
      expect(prisma.purchase.create).not.toHaveBeenCalled();
    });
  });
});
