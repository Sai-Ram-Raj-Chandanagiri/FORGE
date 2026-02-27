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
        dockerImage: "nginx:alpine",
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

  // Create paid modules for testing Stripe integration
  const analyticsCategory = await prisma.category.findUnique({ where: { slug: "analytics" } });

  const paidModule1 = await prisma.module.upsert({
    where: { slug: "forge-analytics-pro" },
    update: {},
    create: {
      name: "FORGE Analytics Pro",
      slug: "forge-analytics-pro",
      shortDescription: "Advanced analytics dashboard with real-time insights and custom reports.",
      description:
        "# FORGE Analytics Pro\n\nEnterprise-grade analytics module for data-driven decision making.\n\n## Features\n- Real-time event tracking\n- Custom report builder\n- Funnel analysis\n- Cohort retention charts\n- REST & GraphQL APIs\n- Export to CSV/PDF",
      authorId: developer.id,
      status: "PUBLISHED",
      type: "SINGLE_CONTAINER",
      pricingModel: "ONE_TIME",
      price: 25.00,
      currency: "USD",
      featured: true,
      downloadCount: 18,
      averageRating: 4.2,
      reviewCount: 5,
      publishedAt: new Date(),
    },
  });

  if (analyticsCategory) {
    await prisma.moduleCategory.upsert({
      where: {
        moduleId_categoryId: {
          moduleId: paidModule1.id,
          categoryId: analyticsCategory.id,
        },
      },
      update: {},
      create: {
        moduleId: paidModule1.id,
        categoryId: analyticsCategory.id,
      },
    });
  }

  await prisma.moduleVersion.upsert({
    where: {
      moduleId_version: {
        moduleId: paidModule1.id,
        version: "2.1.0",
      },
    },
    update: {},
    create: {
      moduleId: paidModule1.id,
      version: "2.1.0",
      changelog: "Added funnel analysis and cohort retention charts.",
      dockerImage: "nginx:alpine",
      configSchema: {
        type: "object",
        properties: {
          ANALYTICS_KEY: { type: "string" },
          RETENTION_DAYS: { type: "number", default: 90 },
        },
        required: ["ANALYTICS_KEY"],
      },
      minResources: { cpu: "1.0", memory: "512Mi" },
      isLatest: true,
    },
  });
  console.log(`  Created paid module: ${paidModule1.name} ($25 ONE_TIME)`);

  const paidModule2 = await prisma.module.upsert({
    where: { slug: "forge-mail-service" },
    update: {},
    create: {
      name: "FORGE Mail Service",
      slug: "forge-mail-service",
      shortDescription: "Transactional email service with templates, queues, and delivery tracking.",
      description:
        "# FORGE Mail Service\n\nReliable transactional email delivery for your applications.\n\n## Features\n- Template engine with Handlebars\n- Email queue with retry logic\n- Delivery & open tracking\n- DKIM/SPF configuration\n- Webhook notifications",
      authorId: developer.id,
      status: "PUBLISHED",
      type: "MULTI_CONTAINER",
      pricingModel: "SUBSCRIPTION_MONTHLY",
      price: 9.99,
      currency: "USD",
      featured: false,
      downloadCount: 7,
      averageRating: 4.8,
      reviewCount: 2,
      publishedAt: new Date(),
    },
  });

  await prisma.moduleVersion.upsert({
    where: {
      moduleId_version: {
        moduleId: paidModule2.id,
        version: "1.0.0",
      },
    },
    update: {},
    create: {
      moduleId: paidModule2.id,
      version: "1.0.0",
      changelog: "Initial release with core email delivery features.",
      dockerImage: "nginx:alpine",
      configSchema: {
        type: "object",
        properties: {
          SMTP_HOST: { type: "string" },
          SMTP_PORT: { type: "number", default: 587 },
          FROM_EMAIL: { type: "string" },
        },
        required: ["SMTP_HOST", "FROM_EMAIL"],
      },
      minResources: { cpu: "0.5", memory: "256Mi" },
      isLatest: true,
    },
  });
  console.log(`  Created paid module: ${paidModule2.name} ($9.99/mo SUBSCRIPTION)`);

  // ===== Hub Projects =====
  const openSourceTag = await prisma.tag.findUnique({ where: { slug: "open-source" } });
  const dockerTag = await prisma.tag.findUnique({ where: { slug: "docker" } });
  const automationTag = await prisma.tag.findUnique({ where: { slug: "automation" } });
  const aiTag = await prisma.tag.findUnique({ where: { slug: "ai-powered" } });

  const project1 = await prisma.project.upsert({
    where: { slug: "forge-crm-extensions" },
    update: {},
    create: {
      name: "FORGE CRM Extensions",
      slug: "forge-crm-extensions",
      description:
        "Community extensions pack for FORGE CRM — adds bulk import, advanced filters, and pipeline analytics.",
      authorId: developer.id,
      isPublic: true,
      status: "ACTIVE",
      stars: 12,
      repositoryUrl: "https://github.com/demo/forge-crm-extensions",
      tags: {
        create: [
          ...(openSourceTag ? [{ tagId: openSourceTag.id }] : []),
          ...(dockerTag ? [{ tagId: dockerTag.id }] : []),
        ],
      },
    },
  });
  console.log(`  Created project: ${project1.name}`);

  const project2 = await prisma.project.upsert({
    where: { slug: "donor-analytics-dashboard" },
    update: {},
    create: {
      name: "Donor Analytics Dashboard",
      slug: "donor-analytics-dashboard",
      description:
        "A real-time analytics dashboard for tracking donor engagement, campaign ROI, and fundraising trends. Built with Chart.js and FORGE modules.",
      authorId: developer.id,
      isPublic: true,
      status: "ACTIVE",
      stars: 8,
      tags: {
        create: [
          ...(aiTag ? [{ tagId: aiTag.id }] : []),
          ...(automationTag ? [{ tagId: automationTag.id }] : []),
        ],
      },
    },
  });
  console.log(`  Created project: ${project2.name}`);

  const project3 = await prisma.project.upsert({
    where: { slug: "volunteer-scheduler-pro" },
    update: {},
    create: {
      name: "Volunteer Scheduler Pro",
      slug: "volunteer-scheduler-pro",
      description:
        "Smart volunteer scheduling tool with shift management, availability tracking, and automated reminders. Ideal for NGOs managing large volunteer pools.",
      authorId: admin.id,
      isPublic: true,
      status: "ACTIVE",
      stars: 5,
      tags: {
        create: [
          ...(automationTag ? [{ tagId: automationTag.id }] : []),
        ],
      },
    },
  });
  console.log(`  Created project: ${project3.name}`);

  // ===== Sample Submission (for admin review testing) =====
  await prisma.submission.upsert({
    where: { id: "seed-submission-1" },
    update: {},
    create: {
      id: "seed-submission-1",
      userId: developer.id,
      appName: "Expense Tracker Lite",
      companyName: "Demo Dev Studio",
      version: "1.0.0",
      about:
        "A lightweight expense tracking module for small teams. Features include receipt scanning, category-based reporting, and CSV export. Perfect for NGOs needing simple financial oversight.",
      changelog: "Initial release with core expense tracking features.",
      labels: ["finance", "reporting", "ngo"],
      fileUrl: "nginx:alpine",
      status: "SUBMITTED",
    },
  });
  console.log("  Created sample submission: Expense Tracker Lite");

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
