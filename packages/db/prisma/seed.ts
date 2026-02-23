import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create admin user
  const adminPasswordHash = await hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@forge.dev" },
    update: {},
    create: {
      email: "admin@forge.dev",
      emailVerified: new Date(),
      name: "FORGE Admin",
      username: "admin",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      status: "ACTIVE",
    },
  });
  console.log(`  Admin user: ${admin.email}`);

  // Create demo developer
  const devPasswordHash = await hash("developer123", 12);
  const developer = await prisma.user.upsert({
    where: { email: "developer@forge.dev" },
    update: {},
    create: {
      email: "developer@forge.dev",
      emailVerified: new Date(),
      name: "Demo Developer",
      username: "demodev",
      passwordHash: devPasswordHash,
      role: "DEVELOPER",
      status: "ACTIVE",
      bio: "A demo developer account for testing FORGE modules.",
    },
  });
  console.log(`  Developer user: ${developer.email}`);

  // Create demo user
  const userPasswordHash = await hash("user123", 12);
  const user = await prisma.user.upsert({
    where: { email: "user@forge.dev" },
    update: {},
    create: {
      email: "user@forge.dev",
      emailVerified: new Date(),
      name: "Demo User",
      username: "demouser",
      passwordHash: userPasswordHash,
      role: "USER",
      status: "ACTIVE",
    },
  });
  console.log(`  Regular user: ${user.email}`);

  // Create categories (matching the 10 MVP modules)
  const categories = [
    {
      name: "CRM & Contacts",
      slug: "crm-contacts",
      description: "Customer relationship management and contact tracking",
      iconName: "Users",
      sortOrder: 1,
    },
    {
      name: "Project Management",
      slug: "project-management",
      description: "Task tracking, Kanban boards, and project planning",
      iconName: "KanbanSquare",
      sortOrder: 2,
    },
    {
      name: "Fundraising & Donors",
      slug: "fundraising-donors",
      description: "Donation management, campaigns, and donor relations",
      iconName: "Heart",
      sortOrder: 3,
    },
    {
      name: "HR & Volunteers",
      slug: "hr-volunteers",
      description: "People management, scheduling, and onboarding",
      iconName: "UserCog",
      sortOrder: 4,
    },
    {
      name: "Finance & Accounting",
      slug: "finance-accounting",
      description: "Expense tracking, budgeting, and financial reporting",
      iconName: "DollarSign",
      sortOrder: 5,
    },
    {
      name: "Document Management",
      slug: "document-management",
      description: "File storage, versioning, and collaboration",
      iconName: "FileText",
      sortOrder: 6,
    },
    {
      name: "Communication",
      slug: "communication",
      description: "Messaging, announcements, and team collaboration",
      iconName: "MessageSquare",
      sortOrder: 7,
    },
    {
      name: "Analytics & Reporting",
      slug: "analytics-reporting",
      description: "Data visualization, dashboards, and KPI tracking",
      iconName: "BarChart3",
      sortOrder: 8,
    },
    {
      name: "Forms & Surveys",
      slug: "forms-surveys",
      description: "Form builders, surveys, and response analytics",
      iconName: "ClipboardList",
      sortOrder: 9,
    },
    {
      name: "Notifications",
      slug: "notifications",
      description: "Email, SMS, and push notification services",
      iconName: "Bell",
      sortOrder: 10,
    },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }
  console.log(`  Created ${categories.length} categories`);

  // Create sample tags
  const tagNames = [
    "open-source",
    "ngo",
    "startup",
    "enterprise",
    "saas",
    "automation",
    "ai-powered",
    "real-time",
    "reporting",
    "integration",
    "docker",
    "microservice",
  ];

  for (const name of tagNames) {
    await prisma.tag.upsert({
      where: { slug: name },
      update: {},
      create: { name, slug: name },
    });
  }
  console.log(`  Created ${tagNames.length} tags`);

  // Create a sample module
  const crmCategory = await prisma.category.findUnique({ where: { slug: "crm-contacts" } });

  if (crmCategory) {
    const sampleModule = await prisma.module.upsert({
      where: { slug: "forge-crm" },
      update: {},
      create: {
        name: "FORGE CRM",
        slug: "forge-crm",
        shortDescription: "Lightweight CRM for managing contacts, donors, and clients.",
        description:
          "# FORGE CRM\n\nA comprehensive contact relationship management module designed for NGOs and startups.\n\n## Features\n- Contact management with custom fields\n- Interaction tracking\n- Pipeline management\n- Import/Export capabilities\n- REST API for integrations",
        authorId: developer.id,
        status: "PUBLISHED",
        type: "SINGLE_CONTAINER",
        pricingModel: "FREE",
        featured: true,
        downloadCount: 42,
        averageRating: 4.5,
        reviewCount: 3,
        publishedAt: new Date(),
      },
    });

    await prisma.moduleCategory.upsert({
      where: {
        moduleId_categoryId: {
          moduleId: sampleModule.id,
          categoryId: crmCategory.id,
        },
      },
      update: {},
      create: {
        moduleId: sampleModule.id,
        categoryId: crmCategory.id,
      },
    });

    await prisma.moduleVersion.upsert({
      where: {
        moduleId_version: {
          moduleId: sampleModule.id,
          version: "1.0.0",
        },
      },
      update: {},
      create: {
        moduleId: sampleModule.id,
        version: "1.0.0",
        changelog: "Initial release with core CRM features.",
        dockerImage: "forge/crm:1.0.0",
        configSchema: {
          type: "object",
          properties: {
            DB_HOST: { type: "string", default: "localhost" },
            DB_PORT: { type: "number", default: 5432 },
            ADMIN_EMAIL: { type: "string" },
          },
          required: ["ADMIN_EMAIL"],
        },
        minResources: { cpu: "0.5", memory: "256Mi" },
        isLatest: true,
      },
    });

    console.log(`  Created sample module: ${sampleModule.name}`);
  }

  console.log("Seed completed successfully.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
