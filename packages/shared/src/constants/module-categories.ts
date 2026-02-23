/**
 * Represents a default module category used to seed the platform
 * and displayed across the Store UI.
 */
export interface CategoryDefinition {
  /** Human-readable category name. */
  name: string;
  /** URL-safe slug derived from the name. */
  slug: string;
  /** Brief description of what modules in this category provide. */
  description: string;
  /** Lucide icon name used to render the category icon in the UI. */
  iconName: string;
}

/**
 * The 10 default module categories that ship with every FORGE installation.
 * These match the seed data in `packages/db/prisma/seed.ts` and are used
 * for initial database population as well as client-side rendering.
 */
export const DEFAULT_CATEGORIES: readonly CategoryDefinition[] = [
  {
    name: "CRM & Contacts",
    slug: "crm-contacts",
    description: "Customer relationship management and contact tracking",
    iconName: "Users",
  },
  {
    name: "Project Management",
    slug: "project-management",
    description: "Task tracking, Kanban boards, and project planning",
    iconName: "KanbanSquare",
  },
  {
    name: "Fundraising & Donors",
    slug: "fundraising-donors",
    description: "Donation management, campaigns, and donor relations",
    iconName: "Heart",
  },
  {
    name: "HR & Volunteers",
    slug: "hr-volunteers",
    description: "People management, scheduling, and onboarding",
    iconName: "UserCog",
  },
  {
    name: "Finance & Accounting",
    slug: "finance-accounting",
    description: "Expense tracking, budgeting, and financial reporting",
    iconName: "DollarSign",
  },
  {
    name: "Document Management",
    slug: "document-management",
    description: "File storage, versioning, and collaboration",
    iconName: "FileText",
  },
  {
    name: "Communication",
    slug: "communication",
    description: "Messaging, announcements, and team collaboration",
    iconName: "MessageSquare",
  },
  {
    name: "Analytics & Reporting",
    slug: "analytics-reporting",
    description: "Data visualization, dashboards, and KPI tracking",
    iconName: "BarChart3",
  },
  {
    name: "Forms & Surveys",
    slug: "forms-surveys",
    description: "Form builders, surveys, and response analytics",
    iconName: "ClipboardList",
  },
  {
    name: "Notifications",
    slug: "notifications",
    description: "Email, SMS, and push notification services",
    iconName: "Bell",
  },
] as const;
