import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@forge/db";
import type { CreateReviewInput, UpdateReviewInput } from "@/lib/validators/module";

export class ReviewService {
  constructor(private prisma: PrismaClient) {}

  async create(userId: string, input: CreateReviewInput) {
    const module = await this.prisma.module.findUnique({
      where: { id: input.moduleId },
      select: { id: true, status: true, authorId: true },
    });

    if (!module || module.status !== "PUBLISHED") {
      throw new TRPCError({ code: "NOT_FOUND", message: "Module not found" });
    }

    if (module.authorId === userId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "You cannot review your own module",
      });
    }

    const existing = await this.prisma.review.findUnique({
      where: { userId_moduleId: { userId, moduleId: input.moduleId } },
    });

    if (existing) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "You have already reviewed this module",
      });
    }

    const review = await this.prisma.review.create({
      data: {
        userId,
        moduleId: input.moduleId,
        rating: input.rating,
        title: input.title,
        body: input.body,
      },
      include: {
        user: {
          select: { id: true, name: true, username: true, avatarUrl: true },
        },
      },
    });

    // Recalculate average rating
    await this.recalculateRating(input.moduleId);

    return review;
  }

  async update(userId: string, input: UpdateReviewInput) {
    const review = await this.prisma.review.findUnique({
      where: { userId_moduleId: { userId, moduleId: input.moduleId } },
    });

    if (!review) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Review not found" });
    }

    const updated = await this.prisma.review.update({
      where: { userId_moduleId: { userId, moduleId: input.moduleId } },
      data: {
        ...(input.rating !== undefined && { rating: input.rating }),
        ...(input.title !== undefined && { title: input.title }),
        ...(input.body !== undefined && { body: input.body }),
      },
      include: {
        user: {
          select: { id: true, name: true, username: true, avatarUrl: true },
        },
      },
    });

    if (input.rating !== undefined) {
      await this.recalculateRating(input.moduleId);
    }

    return updated;
  }

  async delete(userId: string, moduleId: string) {
    const review = await this.prisma.review.findUnique({
      where: { userId_moduleId: { userId, moduleId } },
    });

    if (!review) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Review not found" });
    }

    await this.prisma.review.delete({
      where: { userId_moduleId: { userId, moduleId } },
    });

    await this.recalculateRating(moduleId);

    return { success: true };
  }

  async getForModule(moduleId: string, cursor?: string, limit = 10) {
    const reviews = await this.prisma.review.findMany({
      where: { moduleId },
      include: {
        user: {
          select: { id: true, name: true, username: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });

    let nextCursor: string | undefined;
    if (reviews.length > limit) {
      const next = reviews.pop();
      nextCursor = next?.id;
    }

    return { reviews, nextCursor };
  }

  private async recalculateRating(moduleId: string) {
    const result = await this.prisma.review.aggregate({
      where: { moduleId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await this.prisma.module.update({
      where: { id: moduleId },
      data: {
        averageRating: result._avg.rating ?? 0,
        reviewCount: result._count.rating,
      },
    });
  }
}
