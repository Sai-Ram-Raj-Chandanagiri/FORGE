"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

/** Maps route segments to display labels */
const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  store: "FORGE Store",
  link: "FORGE Link",
  hub: "FORGE Hub",
  agents: "AI Agents",
  admin: "Admin",
  settings: "Settings",
  // Sub-pages
  "my-modules": "My Modules",
  "my-purchases": "My Purchases",
  checkout: "Checkout",
  success: "Success",
  deploy: "Deploy New",
  workspace: "Workspace",
  billing: "Billing & Usage",
  explore: "Explore",
  projects: "Projects",
  publish: "Publish",
  submissions: "Submissions",
  organizations: "Organizations",
  developers: "Developers",
  chat: "Chat",
  conversations: "Conversations",
  workflows: "Workflows",
  users: "Users",
  audit: "Audit Log",
  new: "New",
};

function formatSegment(segment: string): string {
  return SEGMENT_LABELS[segment] || segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function Breadcrumbs() {
  const pathname = usePathname();

  // Don't show breadcrumbs on dashboard root
  if (pathname === "/dashboard") return null;

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length <= 1) return null;

  const crumbs = segments.map((segment, index) => {
    const href = "/" + segments.slice(0, index + 1).join("/");
    const label = formatSegment(segment);
    const isLast = index === segments.length - 1;

    return { href, label, isLast };
  });

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground">
      <Link
        href="/dashboard"
        className="flex items-center hover:text-foreground transition-colors"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>
      {crumbs.map((crumb) => (
        <span key={crumb.href} className="flex items-center gap-1">
          <ChevronRight className="h-3.5 w-3.5" />
          {crumb.isLast ? (
            <span className="font-medium text-foreground">{crumb.label}</span>
          ) : (
            <Link
              href={crumb.href}
              className="hover:text-foreground transition-colors"
            >
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
