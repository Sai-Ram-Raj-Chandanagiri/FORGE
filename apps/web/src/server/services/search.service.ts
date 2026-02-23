import { Prisma, type PrismaClient } from "@forge/db";
import type { SearchModulesInput } from "@/lib/validators/module";

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

export class SearchService {
  constructor(private prisma: PrismaClient) {}

  async searchModules(input: SearchModulesInput) {
    const { query, categorySlug, tags, pricingModel, sortBy, page, limit } = input;

    const where: Prisma.ModuleWhereInput = {
      status: "PUBLISHED",
    };

    // Full-text search on name and shortDescription
    if (query) {
      where.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { shortDescription: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
      ];
    }

    // Category filter
    if (categorySlug) {
      where.categories = {
        some: {
          category: { slug: categorySlug },
        },
      };
    }

    // Tags filter
    if (tags && tags.length > 0) {
      where.tags = {
        some: {
          tag: { slug: { in: tags } },
        },
      };
    }

    // Pricing filter
    if (pricingModel) {
      where.pricingModel = pricingModel;
    }

    // Sort order
    let orderBy: Prisma.ModuleOrderByWithRelationInput;
    switch (sortBy) {
      case "newest":
        orderBy = { publishedAt: "desc" };
        break;
      case "popular":
        orderBy = { downloadCount: "desc" };
        break;
      case "rating":
        orderBy = { averageRating: "desc" };
        break;
      case "name":
        orderBy = { name: "asc" };
        break;
      case "relevance":
      default:
        orderBy = query ? { downloadCount: "desc" } : { featured: "desc" };
        break;
    }

    const skip = (page - 1) * limit;

    const [modules, total] = await Promise.all([
      this.prisma.module.findMany({
        where,
        select: MODULE_LIST_SELECT,
        orderBy,
        skip,
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

  async getFeatured() {
    return this.prisma.module.findMany({
      where: { status: "PUBLISHED", featured: true },
      select: MODULE_LIST_SELECT,
      orderBy: { downloadCount: "desc" },
      take: 6,
    });
  }

  async getPopular() {
    return this.prisma.module.findMany({
      where: { status: "PUBLISHED" },
      select: MODULE_LIST_SELECT,
      orderBy: { downloadCount: "desc" },
      take: 12,
    });
  }

  async getRecentlyPublished() {
    return this.prisma.module.findMany({
      where: { status: "PUBLISHED" },
      select: MODULE_LIST_SELECT,
      orderBy: { publishedAt: "desc" },
      take: 12,
    });
  }

  async getCategories() {
    return this.prisma.category.findMany({
      where: { parentId: null },
      include: {
        children: true,
        _count: {
          select: {
            modules: {
              where: {
                module: { status: "PUBLISHED" },
              },
            },
          },
        },
      },
      orderBy: { sortOrder: "asc" },
    });
  }

  async getCategoryBySlug(slug: string) {
    return this.prisma.category.findUnique({
      where: { slug },
      include: {
        children: true,
        _count: {
          select: {
            modules: {
              where: {
                module: { status: "PUBLISHED" },
              },
            },
          },
        },
      },
    });
  }
}
