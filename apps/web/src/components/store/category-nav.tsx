"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Users,
  ListTodo,
  Heart,
  UserCheck,
  DollarSign,
  FileText,
  MessageSquare,
  BarChart3,
  ClipboardList,
  Bell,
  LayoutGrid,
} from "lucide-react";

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  "crm-contact-management": Users,
  "project-task-management": ListTodo,
  "donor-fundraising": Heart,
  "hr-volunteer-management": UserCheck,
  "financial-expense-tracking": DollarSign,
  "document-management": FileText,
  "communication": MessageSquare,
  "analytics-reporting": BarChart3,
  "form-builder-surveys": ClipboardList,
  "notification-alerts": Bell,
};

interface CategoryNavProps {
  categories: {
    id: string;
    name: string;
    slug: string;
    _count: { modules: number };
  }[];
}

export function CategoryNav({ categories }: CategoryNavProps) {
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get("category");

  return (
    <div className="space-y-1">
      <Link
        href="/store"
        className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
          !activeCategory
            ? "bg-primary/10 font-medium text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      >
        <LayoutGrid className="h-4 w-4" />
        All Modules
      </Link>
      {categories.map((cat) => {
        const Icon = CATEGORY_ICONS[cat.slug] || LayoutGrid;
        const isActive = activeCategory === cat.slug;
        return (
          <Link
            key={cat.id}
            href={`/store?category=${cat.slug}`}
            className={`flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
              isActive
                ? "bg-primary/10 font-medium text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <span className="flex items-center gap-2">
              <Icon className="h-4 w-4" />
              {cat.name}
            </span>
            <span className="text-xs text-muted-foreground/60">{cat._count.modules}</span>
          </Link>
        );
      })}
    </div>
  );
}
