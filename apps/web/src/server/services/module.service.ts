import { TRPCError } from "@trpc/server";
import { Prisma, type PrismaClient } from "@forge/db";
import type { CreateModuleInput, UpdateModuleInput, CreateVersionInput } from "@/lib/validators/module";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const MODULE_LIST_SELECT = {
  id: true,
  name: true,
  slug: true,
  shortDescription: true,
  status: true,
  type: true,
  pricingModel: true,
  price: true,
  currency: true,
  logoUrl: true,
  featured: true,
  downloadCount: true,
  averageRating: true,
  reviewCount: true,
  publishedAt: true,
  createdAt: true,
  author: {
    select: {
      id: true,
      name: true,
      username: true,
      avatarUrl: true,
    },
  },
  categories: {
    select: {
      category: {
        select: { name: true, slug: true },
      },
    },
  },
  tags: {
    select: {
      tag: {
        select: { name: true, slug: true },
      },
    },
  },
} satisfies Prisma.ModuleSelect;

export class ModuleService {
  constructor(private prisma: PrismaClient) {}

  async create(authorId: string, input: CreateModuleInput) {
    const slug = slugify(input.name);

    const existing = await this.prisma.module.findUnique({ where: { slug } });
    if (existing) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "A module with a similar name already exists",
      });
    }

    // Ensure tags exist or create them
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

    const module = await this.prisma.module.create({
      data: {
        name: input.name,
        slug,
        shortDescription: input.shortDescription,
        description: input.description,
        type: input.type,
        pricingModel: input.pricingModel,
        price: input.price ? new Prisma.Decimal(input.price) : null,
        currency: input.currency,
        logoUrl: input.logoUrl || null,
        repositoryUrl: input.repositoryUrl || null,
        documentationUrl: input.documentationUrl || null,
        website: input.website || null,
        authorId,
        categories: {
          create: input.categoryIds.map((categoryId) => ({ categoryId })),
        },
        tags: {
          create: tagRecords.map((tag) => ({ tagId: tag.id })),
        },
      },
      select: MODULE_LIST_SELECT,
    });

    return module;
  }

  async update(userId: string, input: UpdateModuleInput) {
    const module = await this.prisma.module.findUnique({
      where: { id: input.id },
      select: { authorId: true, status: true },
    });

    if (!module) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Module not found" });
    }

    if (module.authorId !== userId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "You can only edit your own modules" });
    }

    const { id, categoryIds, tags, ...updateData } = input;

    const data: Prisma.ModuleUpdateInput = {
      ...(updateData.name !== undefined && { name: updateData.name }),
      ...(updateData.shortDescription !== undefined && {
        shortDescription: updateData.shortDescription,
      }),
      ...(updateData.description !== undefined && { description: updateData.description }),
      ...(updateData.pricingModel !== undefined && { pricingModel: updateData.pricingModel }),
      ...(updateData.price !== undefined && { price: new Prisma.Decimal(updateData.price) }),
      ...(updateData.currency !== undefined && { currency: updateData.currency }),
      ...(updateData.logoUrl !== undefined && { logoUrl: updateData.logoUrl || null }),
      ...(updateData.bannerUrl !== undefined && { bannerUrl: updateData.bannerUrl || null }),
      ...(updateData.repositoryUrl !== undefined && {
        repositoryUrl: updateData.repositoryUrl || null,
      }),
      ...(updateData.documentationUrl !== undefined && {
        documentationUrl: updateData.documentationUrl || null,
      }),
      ...(updateData.website !== undefined && { website: updateData.website || null }),
    };

    if (categoryIds) {
      await this.prisma.moduleCategory.deleteMany({ where: { moduleId: id } });
      data.categories = {
        create: categoryIds.map((categoryId) => ({ categoryId })),
      };
    }

    if (tags) {
      await this.prisma.moduleTag.deleteMany({ where: { moduleId: id } });
      const tagRecords = await Promise.all(
        tags.map(async (tagName) => {
          const tagSlug = slugify(tagName);
          return this.prisma.tag.upsert({
            where: { slug: tagSlug },
            create: { name: tagName, slug: tagSlug },
            update: {},
          });
        }),
      );
      data.tags = {
        create: tagRecords.map((tag) => ({ tagId: tag.id })),
      };
    }

    return this.prisma.module.update({
      where: { id },
      data,
      select: MODULE_LIST_SELECT,
    });
  }

  async publish(userId: string, moduleId: string) {
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
      include: { versions: { where: { isLatest: true } } },
    });

    if (!module) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Module not found" });
    }

    if (module.authorId !== userId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "You can only publish your own modules" });
    }

    if (module.versions.length === 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Module must have at least one version before publishing",
      });
    }

    return this.prisma.module.update({
      where: { id: moduleId },
      data: {
        status: "PENDING_REVIEW",
      },
      select: MODULE_LIST_SELECT,
    });
  }

  async archive(userId: string, moduleId: string) {
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
      select: { authorId: true },
    });

    if (!module) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Module not found" });
    }

    if (module.authorId !== userId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "You can only archive your own modules" });
    }

    return this.prisma.module.update({
      where: { id: moduleId },
      data: { status: "ARCHIVED" },
      select: MODULE_LIST_SELECT,
    });
  }

  async createVersion(userId: string, input: CreateVersionInput) {
    const module = await this.prisma.module.findUnique({
      where: { id: input.moduleId },
      select: { authorId: true },
    });

    if (!module) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Module not found" });
    }

    if (module.authorId !== userId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You can only add versions to your own modules",
      });
    }

    // Mark existing latest as non-latest
    await this.prisma.moduleVersion.updateMany({
      where: { moduleId: input.moduleId, isLatest: true },
      data: { isLatest: false },
    });

    return this.prisma.moduleVersion.create({
      data: {
        moduleId: input.moduleId,
        version: input.version,
        changelog: input.changelog,
        dockerImage: input.dockerImage,
        composeFileUrl: input.composeFileUrl || null,
        configSchema: (input.configSchema as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        minResources: (input.minResources as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        isLatest: true,
      },
    });
  }

  async getBySlug(slug: string) {
    const module = await this.prisma.module.findUnique({
      where: { slug },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
            bio: true,
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
          orderBy: { publishedAt: "desc" },
        },
        screenshots: {
          orderBy: { sortOrder: "asc" },
        },
        reviews: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    if (!module || (module.status !== "PUBLISHED" && module.status !== "APPROVED")) {
      return null;
    }

    return module;
  }

  async getBySlugForAuthor(slug: string, userId: string) {
    const module = await this.prisma.module.findUnique({
      where: { slug },
      include: {
        author: {
          select: { id: true, name: true, username: true, avatarUrl: true },
        },
        categories: {
          include: { category: { select: { id: true, name: true, slug: true } } },
        },
        tags: {
          include: { tag: { select: { id: true, name: true, slug: true } } },
        },
        versions: { orderBy: { publishedAt: "desc" } },
        screenshots: { orderBy: { sortOrder: "asc" } },
      },
    });

    if (!module) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Module not found" });
    }

    if (module.authorId !== userId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
    }

    return module;
  }

  async getMyModules(userId: string) {
    return this.prisma.module.findMany({
      where: { authorId: userId },
      select: {
        ...MODULE_LIST_SELECT,
        status: true,
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  async getMyPurchases(userId: string) {
    return this.prisma.purchase.findMany({
      where: { userId, status: "ACTIVE" },
      include: {
        module: {
          select: MODULE_LIST_SELECT,
        },
      },
      orderBy: { purchasedAt: "desc" },
    });
  }

  async purchase(userId: string, moduleId: string) {
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
      select: { id: true, status: true, pricingModel: true, price: true, authorId: true },
    });

    if (!module || module.status !== "PUBLISHED") {
      throw new TRPCError({ code: "NOT_FOUND", message: "Module not found or not available" });
    }

    if (module.authorId === userId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "You cannot purchase your own module",
      });
    }

    const existingPurchase = await this.prisma.purchase.findFirst({
      where: { userId, moduleId, status: "ACTIVE" },
    });

    if (existingPurchase) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "You already own this module",
      });
    }

    const purchase = await this.prisma.purchase.create({
      data: {
        userId,
        moduleId,
        pricePaid: module.price ?? new Prisma.Decimal(0),
        status: "ACTIVE",
      },
    });

    // Increment download count
    await this.prisma.module.update({
      where: { id: moduleId },
      data: { downloadCount: { increment: 1 } },
    });

    return purchase;
  }
}
