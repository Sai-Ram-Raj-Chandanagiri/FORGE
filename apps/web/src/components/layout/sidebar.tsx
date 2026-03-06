"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Store,
  Link2,
  Users,
  Bot,
  Settings,
  LayoutDashboard,
  Shield,
  Cpu,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
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
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isAdmin as checkAdmin } from "@/lib/role-utils";
import { trpc } from "@/lib/trpc-client";
import { useState, useEffect } from "react";

interface SubItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

interface PillarItem {
  name: string;
  href: string;
  icon: LucideIcon;
  subItems: SubItem[];
}

const pillars: PillarItem[] = [
  {
    name: "FORGE Store",
    href: "/store",
    icon: Store,
    subItems: [
      { name: "Browse", href: "/store", icon: ShoppingBag },
      { name: "My Modules", href: "/store/my-modules", icon: Package },
      { name: "My Purchases", href: "/store/my-purchases", icon: CreditCard },
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
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedPillar, setExpandedPillar] = useState<string | null>(null);

  const adminUser = checkAdmin(session?.user?.role);

  // Auto-expand the pillar matching the current pathname
  useEffect(() => {
    const match = pillars.find(
      (p) => pathname === p.href || pathname.startsWith(p.href + "/"),
    );
    if (match) {
      setExpandedPillar(match.name);
    }
  }, [pathname]);

  const togglePillar = (name: string) => {
    setExpandedPillar((prev) => (prev === name ? null : name));
  };

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r bg-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-64",
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b px-4">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <Cpu className="h-6 w-6 text-sidebar-primary" />
            <span className="text-lg font-bold text-sidebar-foreground">FORGE</span>
          </Link>
        )}
        {collapsed && (
          <Link href="/dashboard" className="mx-auto">
            <Cpu className="h-6 w-6 text-sidebar-primary" />
          </Link>
        )}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "rounded-md p-1 text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
            collapsed && "mx-auto mt-2",
          )}
        >
          <ChevronLeft
            className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")}
          />
        </button>
      </div>

      {/* Main navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
        {/* Dashboard — standalone */}
        <Link
          href="/dashboard"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            pathname === "/dashboard"
              ? "bg-sidebar-accent text-sidebar-primary"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
            collapsed && "justify-center px-2",
          )}
          title={collapsed ? "Dashboard" : undefined}
        >
          <LayoutDashboard className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span>Dashboard</span>}
        </Link>

        {/* Pillar sections */}
        {pillars.map((pillar) => {
          const isPillarActive =
            pathname === pillar.href || pathname.startsWith(pillar.href + "/");
          const isExpanded = expandedPillar === pillar.name;

          return (
            <div key={pillar.name}>
              {/* Pillar header */}
              {collapsed ? (
                <Link
                  href={pillar.href}
                  className={cn(
                    "flex items-center justify-center rounded-lg px-2 py-2.5 text-sm font-medium transition-colors",
                    isPillarActive
                      ? "bg-sidebar-accent text-sidebar-primary"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                  )}
                  title={pillar.name}
                >
                  <pillar.icon className="h-5 w-5 flex-shrink-0" />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => togglePillar(pillar.name)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isPillarActive
                      ? "bg-sidebar-accent/50 text-sidebar-primary"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                  )}
                >
                  <pillar.icon className="h-5 w-5 flex-shrink-0" />
                  <span className="flex-1 text-left">{pillar.name}</span>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              )}

              {/* Sub-items */}
              {!collapsed && isExpanded && (
                <div className="ml-4 mt-1 space-y-0.5 border-l border-sidebar-accent pl-2">
                  {pillar.subItems.map((sub) => {
                    const isSubActive = pathname === sub.href;
                    return (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        className={cn(
                          "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                          isSubActive
                            ? "bg-sidebar-accent text-sidebar-primary font-medium"
                            : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                        )}
                      >
                        <sub.icon className="h-4 w-4 flex-shrink-0" />
                        <span>{sub.name}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Admin — conditional */}
        {adminUser && <AdminNavItem pathname={pathname} collapsed={collapsed} />}
      </nav>

      {/* Bottom navigation */}
      <div className="border-t px-2 py-4">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            pathname.startsWith("/settings")
              ? "bg-sidebar-accent text-sidebar-primary"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
            collapsed && "justify-center px-2",
          )}
          title={collapsed ? "Settings" : undefined}
        >
          <Settings className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span>Settings</span>}
        </Link>
      </div>
    </aside>
  );
}

/** Admin nav item with pending review count badge */
function AdminNavItem({ pathname, collapsed }: { pathname: string; collapsed: boolean }) {
  const { data } = trpc.admin.getReviewQueue.useQuery(
    { page: 1, limit: 1 },
    { refetchInterval: 60_000 },
  ) as { data: { total: number } | undefined };

  const pendingCount = data?.total ?? 0;

  return (
    <Link
      href="/admin"
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
        pathname.startsWith("/admin")
          ? "bg-sidebar-accent text-sidebar-primary"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
        collapsed && "justify-center px-2",
      )}
      title={collapsed ? `Admin${pendingCount > 0 ? ` (${pendingCount})` : ""}` : undefined}
    >
      <div className="relative">
        <Shield className="h-5 w-5 flex-shrink-0" />
        {pendingCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {pendingCount > 99 ? "99+" : pendingCount}
          </span>
        )}
      </div>
      {!collapsed && <span>Admin</span>}
    </Link>
  );
}
