/**
 * Sidebar navigation configuration.
 * Pure data — no React imports — so it can be unit-tested without a DOM.
 *
 * Adding a new page: add it to the relevant pillar's `subItems` here and
 * the sidebar will render the link automatically.
 */

import {
  Store,
  Link2,
  Users,
  Bot,
  ShoppingBag,
  Package,
  Rocket,
  PlusCircle,
  Boxes,
  CreditCard,
  FolderOpen,
  Compass,
  Upload,
  ClipboardList,
  Building2,
  MessageSquare,
  History,
  Workflow,
  Layers,
  Globe,
  Sparkles,
  ShieldCheck,
  CalendarClock,
  CheckSquare,
  UserCog,
  Plug,
  Coins,
  LineChart,
  type LucideIcon,
} from "lucide-react";

export interface SubItem {
  /** Display label */
  name: string;
  /** Absolute pathname under the dashboard */
  href: string;
  /** Lucide icon */
  icon: LucideIcon;
}

export interface PillarItem {
  name: string;
  href: string;
  icon: LucideIcon;
  subItems: SubItem[];
}

/**
 * Top-level pillar nav. Order matters — this is the visible order in the
 * sidebar.
 */
export const pillars: PillarItem[] = [
  {
    name: "FORGE Store",
    href: "/store",
    icon: Store,
    subItems: [
      { name: "Browse", href: "/store", icon: ShoppingBag },
      // Phase 8.3 — Agent marketplace
      { name: "Agent Marketplace", href: "/store/agents", icon: Sparkles },
      { name: "My Modules", href: "/store/my-modules", icon: Package },
      { name: "My Purchases", href: "/store/my-purchases", icon: CreditCard },
      { name: "Blueprints", href: "/store/blueprints", icon: Globe },
    ],
  },
  {
    name: "FORGE Link",
    href: "/link",
    icon: Link2,
    subItems: [
      { name: "Deployments", href: "/link", icon: Rocket },
      { name: "Deploy New", href: "/link/deploy", icon: PlusCircle },
      { name: "Workspace", href: "/link/workspace", icon: Boxes },
      { name: "Billing & Usage", href: "/link/billing", icon: CreditCard },
      { name: "My Blueprints", href: "/link/blueprints", icon: Layers },
    ],
  },
  {
    name: "FORGE Hub",
    href: "/hub",
    icon: Users,
    subItems: [
      { name: "Projects", href: "/hub", icon: FolderOpen },
      { name: "Explore", href: "/hub/explore", icon: Compass },
      { name: "Publish", href: "/hub/publish", icon: Upload },
      { name: "Submissions", href: "/hub/submissions", icon: ClipboardList },
      { name: "Organizations", href: "/hub/organizations", icon: Building2 },
    ],
  },
  {
    name: "AI Agents",
    href: "/agents",
    icon: Bot,
    subItems: [
      { name: "Chat", href: "/agents/chat", icon: MessageSquare },
      { name: "Conversations", href: "/agents/conversations", icon: History },
      { name: "Workflows", href: "/agents/workflows", icon: Workflow },
      // Phase 8.1 — Autonomy + personality + governance
      { name: "Approvals", href: "/agents/approvals", icon: CheckSquare },
      { name: "Scheduled Tasks", href: "/agents/schedule", icon: CalendarClock },
      { name: "Personality", href: "/agents/settings", icon: UserCog },
      { name: "Governance", href: "/agents/governance", icon: ShieldCheck },
      // Phase 8.4 — MCP connections
      { name: "MCP Connections", href: "/agents/connections", icon: Plug },
    ],
  },
];

/**
 * Standalone (non-pillar) top-level links shown above the pillars.
 */
export interface StandaloneLink {
  name: string;
  href: string;
  icon: LucideIcon;
  /** Match a pathname against this link */
  match: (pathname: string) => boolean;
}

export const standaloneTopLinks: StandaloneLink[] = [
  // Phase 8.2 — Predictive insights
  {
    name: "Insights",
    href: "/dashboard/insights",
    icon: LineChart,
    match: (p) => p === "/dashboard/insights",
  },
];

/**
 * Standalone links shown in the bottom (settings) section of the sidebar.
 */
export const standaloneBottomLinks: StandaloneLink[] = [
  // Phase 8.4 — Credits
  {
    name: "Credits",
    href: "/settings/credits",
    icon: Coins,
    match: (p) => p.startsWith("/settings/credits"),
  },
];

/**
 * Flat list of every navigable href in the sidebar. Used by tests to
 * verify nothing is dead-linked and every Phase 8 page is reachable.
 */
export function getAllNavHrefs(): string[] {
  const hrefs = new Set<string>();
  hrefs.add("/dashboard");
  hrefs.add("/settings");
  for (const link of standaloneTopLinks) hrefs.add(link.href);
  for (const link of standaloneBottomLinks) hrefs.add(link.href);
  for (const pillar of pillars) {
    hrefs.add(pillar.href);
    for (const sub of pillar.subItems) hrefs.add(sub.href);
  }
  return Array.from(hrefs);
}
