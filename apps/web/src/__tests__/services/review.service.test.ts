import { createMockPrismaClient } from "@forge/db";
import { ReviewService } from "@/server/services/review.service";
import { TRPCError } from "@trpc/server";

describe("ReviewService", () => {
  let prisma: ReturnType<typeof createMockPrismaClient>;
  let service: ReviewService;

  const userId = "user-1";
  const moduleId = "module-1";

  beforeEach(() => {
    prisma = createMockPrismaClient();
    service = new ReviewService(prisma);
  });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------
  describe("create", () => {
    const input = {
      moduleId,
      rating: 5,
      title: "Great module",
      body: "Really enjoyed using this.",
    };

    it("should create a review and recalculate the rating", async () => {
      prisma.module.findUnique.mockResolvedValue({
        id: moduleId,
        status: "PUBLISHED",
        authorId: "other-user",
      });
      prisma.review.findUnique.mockResolvedValue(null);

      const createdReview = {
        id: "review-1",
        userId,
        moduleId,
        rating: 5,
        title: input.title,
        body: input.body,
        user: { id: userId, name: "Test User", username: "testuser", avatarUrl: null },
      };
      prisma.review.create.mockResolvedValue(createdReview);
      prisma.review.aggregate.mockResolvedValue({
        _avg: { rating: 4 },
        _count: { rating: 1 },
      });
      prisma.module.update.mockResolvedValue({});

      const result = await service.create(userId, input);

      expect(result).toEqual(createdReview);
      expect(prisma.review.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId,
            moduleId,
            rating: input.rating,
            title: input.title,
            body: input.body,
          }),
        }),
      );
      // Verify recalculation happened
      expect(prisma.review.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({ where: { moduleId } }),
      );
      expect(prisma.module.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: moduleId },
          data: { averageRating: 4, reviewCount: 1 },
        }),
      );
    });

    it("should throw NOT_FOUND if the module is not published", async () => {
      prisma.module.findUnique.mockResolvedValue({
        id: moduleId,
        status: "DRAFT",
        authorId: "other-user",
      });

      await expect(service.create(userId, input)).rejects.toThrow(TRPCError);
      await expect(service.create(userId, input)).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });

    it("should throw NOT_FOUND if the module does not exist", async () => {
      prisma.module.findUnique.mockResolvedValue(null);

      await expect(service.create(userId, input)).rejects.toThrow(TRPCError);
      await expect(service.create(userId, input)).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });

    it("should throw BAD_REQUEST when reviewing own module", async () => {
      prisma.module.findUnique.mockResolvedValue({
        id: moduleId,
        status: "PUBLISHED",
        authorId: userId, // same as caller
      });

      await expect(service.create(userId, input)).rejects.toThrow(TRPCError);
      await expect(service.create(userId, input)).rejects.toMatchObject({
        code: "BAD_REQUEST",
      });
    });

    it("should throw CONFLICT if the user already reviewed the module", async () => {
      prisma.module.findUnique.mockResolvedValue({
        id: moduleId,
        status: "PUBLISHED",
        authorId: "other-user",
      });
      prisma.review.findUnique.mockResolvedValue({
        id: "existing-review",
        userId,
        moduleId,
      });

      await expect(service.create(userId, input)).rejects.toThrow(TRPCError);
      await expect(service.create(userId, input)).rejects.toMatchObject({
        code: "CONFLICT",
      });
    });
  });

  // ---------------------------------------------------------------------------
  // update
  // ---------------------------------------------------------------------------
  describe("update", () => {
    const input = {
      moduleId,
      rating: 3,
      title: "Updated title",
      body: "Updated body",
    };

    it("should update the review and recalculate rating when rating changes", async () => {
      prisma.review.findUnique.mockResolvedValue({
        id: "review-1",
        userId,
        moduleId,
        rating: 5,
        title: "Old title",
      });

      const updatedReview = {
        id: "review-1",
        userId,
        moduleId,
        rating: input.rating,
        title: input.title,
        body: input.body,
        user: { id: userId, name: "Test User", username: "testuser", avatarUrl: null },
      };
      prisma.review.update.mockResolvedValue(updatedReview);
      prisma.review.aggregate.mockResolvedValue({
        _avg: { rating: 3 },
        _count: { rating: 1 },
      });
      prisma.module.update.mockResolvedValue({});

      const result = await service.update(userId, input);

      expect(result).toEqual(updatedReview);
      expect(prisma.review.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_moduleId: { userId, moduleId } },
        }),
      );
      expect(prisma.review.aggregate).toHaveBeenCalled();
    });

    it("should update without recalculating when rating is not provided", async () => {
      const inputNoRating = { moduleId, title: "New title" };

      prisma.review.findUnique.mockResolvedValue({
        id: "review-1",
        userId,
        moduleId,
        rating: 5,
        title: "Old title",
      });

      const updatedReview = {
        id: "review-1",
        userId,
        moduleId,
        rating: 5,
        title: "New title",
        user: { id: userId, name: "Test User", username: "testuser", avatarUrl: null },
      };
      prisma.review.update.mockResolvedValue(updatedReview);

      const result = await service.update(userId, inputNoRating);

      expect(result).toEqual(updatedReview);
      expect(prisma.review.aggregate).not.toHaveBeenCalled();
    });

    it("should throw NOT_FOUND if the review does not exist", async () => {
      prisma.review.findUnique.mockResolvedValue(null);

      await expect(service.update(userId, input)).rejects.toThrow(TRPCError);
      await expect(service.update(userId, input)).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });
  });

  // ---------------------------------------------------------------------------
  // delete
  // ---------------------------------------------------------------------------
  describe("delete", () => {
    it("should delete the review and recalculate the rating", async () => {
      prisma.review.findUnique.mockResolvedValue({
        id: "review-1",
        userId,
        moduleId,
      });
      prisma.review.delete.mockResolvedValue({});
      prisma.review.aggregate.mockResolvedValue({
        _avg: { rating: null },
        _count: { rating: 0 },
      });
      prisma.module.update.mockResolvedValue({});

      const result = await service.delete(userId, moduleId);

      expect(result).toEqual({ success: true });
      expect(prisma.review.delete).toHaveBeenCalledWith({
        where: { userId_moduleId: { userId, moduleId } },
      });
      expect(prisma.review.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({ where: { moduleId } }),
      );
      // When avg is null it should fall back to 0
      expect(prisma.module.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { averageRating: 0, reviewCount: 0 },
        }),
      );
    });

    it("should throw NOT_FOUND if the review does not exist", async () => {
      prisma.review.findUnique.mockResolvedValue(null);

      await expect(service.delete(userId, moduleId)).rejects.toThrow(TRPCError);
      await expect(service.delete(userId, moduleId)).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });
  });
});
