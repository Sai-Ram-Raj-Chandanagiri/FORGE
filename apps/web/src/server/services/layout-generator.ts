/**
 * Auto-Layout Generator
 * Generates a PlatformLayoutConfig automatically from deployed modules
 * when no custom layout exists. Uses heuristics based on module categories/tags.
 */

import type { PlatformLayoutConfig, SidebarItem, SidebarGroup } from "./workspace-dashboard";

export interface DeployedModule {
  slug: string;
  name: string;
  category?: string;
  tags?: string[];
}

/** Grouping heuristics: map keywords to sidebar group names */
const GROUP_KEYWORDS: [string[], string][] = [
  [["auth", "security", "login", "sso"], "Core"],
  [["crm", "contacts", "users", "people", "donor", "volunteer", "member", "customer"], "People"],
  [["finance", "billing", "donation", "payment", "invoice", "accounting"], "Finance"],
  [["project", "task", "planning", "kanban", "sprint"], "Work"],
  [["report", "analytics", "chart", "dashboard", "metrics", "statistics"], "Analytics"],
  [["email", "chat", "communication", "message", "notification", "sms"], "Communication"],
];

/** Icon mapping: map keywords to Lucide icon names */
const ICON_KEYWORDS: [string[], string][] = [
  [["auth", "login", "security", "sso"], "shield"],
  [["donor", "donation", "charity", "fundrais"], "heart"],
  [["volunteer", "user", "people", "member", "customer", "contact", "crm"], "users"],
  [["report", "analytics", "chart", "metric", "statistic", "dashboard"], "bar-chart"],
  [["project", "task", "kanban", "sprint"], "folder"],
  [["email", "message", "chat", "notification"], "mail"],
  [["payment", "invoice", "billing", "finance", "accounting"], "credit-card"],
  [["workflow", "automation", "pipeline"], "zap"],
  [["settings", "config", "admin"], "settings"],
];

function matchKeywords(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

function inferGroup(module: DeployedModule): string {
  const searchText = `${module.slug} ${module.name} ${module.category || ""} ${(module.tags || []).join(" ")}`;

  for (const [keywords, group] of GROUP_KEYWORDS) {
    if (matchKeywords(searchText, keywords)) return group;
  }
  return "Modules";
}

function inferIcon(module: DeployedModule): string {
  const searchText = `${module.slug} ${module.name} ${module.category || ""} ${(module.tags || []).join(" ")}`;

  for (const [keywords, icon] of ICON_KEYWORDS) {
    if (matchKeywords(searchText, keywords)) return icon;
  }
  return "box";
}

function inferLabel(module: DeployedModule): string {
  // Convert slug to human-readable: "donor-manager" → "Donor Manager"
  return module.name || module.slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function generateAutoLayout(
  modules: DeployedModule[],
  platformName?: string,
): PlatformLayoutConfig {
  const sidebar: SidebarItem[] = modules.map((mod, idx) => ({
    moduleSlug: mod.slug,
    label: inferLabel(mod),
    icon: inferIcon(mod),
    group: inferGroup(mod),
    order: idx + 1,
  }));

  // Collect unique groups and order them
  const groupNames = Array.from(new Set(sidebar.map((s) => s.group)));
  const groups: SidebarGroup[] = groupNames.map((name, idx) => ({
    name,
    order: idx + 1,
  }));

  return {
    theme: {
      brandName: platformName || "My Platform",
      primaryColor: "#6366f1",
      logoUrl: null,
    },
    homepage: "dashboard",
    sidebar,
    groups,
  };
}
