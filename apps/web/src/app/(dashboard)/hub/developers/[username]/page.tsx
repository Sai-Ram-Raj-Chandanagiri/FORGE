"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  Calendar,
  Package,
  FolderGit2,
  Star,
  MessageSquare,
  Shield,
  Award,
} from "lucide-react";
import { trpc } from "@/lib/trpc-client";

interface PublishedModule {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  logoUrl: string | null;
  downloadCount: number;
  averageRating: number;
  pricingModel: string;
}

interface ProjectSummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  stars: number;
  _count: { comments: number };
}

interface DeveloperProfile {
  id: string;
  name: string | null;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  role: string;
  createdAt: string;
  stats: {
    modulesPublished: number;
    projects: number;
    reviews: number;
  };
  modules: PublishedModule[];
  projects: ProjectSummary[];
}

const ROLE_BADGES: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  ADMIN: {
    label: "Admin",
    className: "bg-red-500/10 text-red-600 dark:text-red-400",
    icon: Shield,
  },
  MODERATOR: {
    label: "Moderator",
    className: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    icon: Shield,
  },
  DEVELOPER: {
    label: "Developer",
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    icon: Award,
  },
  USER: {
    label: "Member",
    className: "bg-muted text-muted-foreground",
    icon: User,
  },
  DEFAULT: {
    label: "Member",
    className: "bg-muted text-muted-foreground",
    icon: User,
  },
};

export default function DeveloperProfilePage() {
  const { username } = useParams<{ username: string }>();

  const { data: profile, isLoading } =
    trpc.hub.getDeveloperProfile.useQuery({ username }) as {
      data: DeveloperProfile | null | undefined;
      isLoading: boolean;
    };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-32 animate-pulse rounded bg-muted" />
        <div className="flex items-center gap-6">
          <div className="h-20 w-20 animate-pulse rounded-full bg-muted" />
          <div className="space-y-2 flex-1">
            <div className="h-8 w-48 animate-pulse rounded bg-muted" />
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            <div className="h-4 w-64 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl border bg-muted"
            />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-xl border bg-muted" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <User className="mb-4 h-12 w-12 text-muted-foreground/50" />
        <h2 className="text-lg font-semibold">Developer not found</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          No developer with the username &quot;{username}&quot; was found.
        </p>
        <Link
          href="/hub"
          className="mt-4 inline-flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Hub
        </Link>
      </div>
    );
  }

  const roleBadge = (ROLE_BADGES[profile.role] || ROLE_BADGES["DEFAULT"])!;
  const RoleIcon = roleBadge.icon;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/hub"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Hub
      </Link>

      {/* Profile header */}
      <div className="flex flex-col items-center gap-6 rounded-xl border bg-card p-8 sm:flex-row sm:items-start">
        {/* Avatar */}
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={profile.name || profile.username}
              className="h-20 w-20 rounded-full object-cover"
            />
          ) : (
            (profile.name || profile.username).charAt(0).toUpperCase()
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <div className="flex flex-col items-center gap-2 sm:flex-row">
            <h1 className="text-2xl font-bold">
              {profile.name || profile.username}
            </h1>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${roleBadge.className}`}
            >
              <RoleIcon className="h-3 w-3" />
              {roleBadge.label}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            @{profile.username}
          </p>

          {profile.bio && (
            <p className="mt-3 text-sm text-muted-foreground max-w-xl">
              {profile.bio}
            </p>
          )}

          <p className="mt-3 flex items-center justify-center gap-1 text-xs text-muted-foreground sm:justify-start">
            <Calendar className="h-3.5 w-3.5" />
            Member since {new Date(profile.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-5 text-center">
          <Package className="mx-auto mb-2 h-6 w-6 text-primary" />
          <p className="text-2xl font-bold">{profile.stats.modulesPublished}</p>
          <p className="text-xs text-muted-foreground">Modules Published</p>
        </div>
        <div className="rounded-xl border bg-card p-5 text-center">
          <FolderGit2 className="mx-auto mb-2 h-6 w-6 text-primary" />
          <p className="text-2xl font-bold">{profile.stats.projects}</p>
          <p className="text-xs text-muted-foreground">Projects</p>
        </div>
        <div className="rounded-xl border bg-card p-5 text-center">
          <Star className="mx-auto mb-2 h-6 w-6 text-primary" />
          <p className="text-2xl font-bold">{profile.stats.reviews}</p>
          <p className="text-xs text-muted-foreground">Reviews</p>
        </div>
      </div>

      {/* Published Modules */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Package className="h-5 w-5 text-primary" />
          Published Modules
        </h2>

        {profile.modules.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {profile.modules.map((mod) => (
              <Link
                key={mod.id}
                href={`/store/${mod.slug}`}
                className="group rounded-xl border bg-card p-5 transition-all hover:shadow-sm hover:border-primary/20"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-muted">
                    {mod.logoUrl ? (
                      <img
                        src={mod.logoUrl}
                        alt={mod.name}
                        className="h-8 w-8 rounded-md object-contain"
                      />
                    ) : (
                      <Package className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                      {mod.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {mod.pricingModel === "FREE"
                        ? "Free"
                        : mod.pricingModel.replace(/_/g, " ").toLowerCase()}
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                  {mod.shortDescription}
                </p>
                <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    {mod.averageRating.toFixed(1)}
                  </span>
                  <span>
                    {mod.downloadCount.toLocaleString()} downloads
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-10">
            <Package className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No published modules yet.
            </p>
          </div>
        )}
      </section>

      {/* Projects */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <FolderGit2 className="h-5 w-5 text-primary" />
          Projects
        </h2>

        {profile.projects.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {profile.projects.map((project) => (
              <Link
                key={project.id}
                href={`/hub/projects/${project.slug}`}
                className="group rounded-xl border bg-card p-5 transition-all hover:shadow-sm hover:border-primary/20"
              >
                <h3 className="font-semibold group-hover:text-primary transition-colors truncate">
                  {project.name}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                  {project.description || "No description"}
                </p>
                <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    {project.stars}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {project._count.comments}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-10">
            <FolderGit2 className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No projects yet.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
