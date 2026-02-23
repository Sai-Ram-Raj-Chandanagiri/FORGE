"use client";

import {
  Users,
  Upload,
  Package,
  FolderGit2,
  Plus,
  Star,
  MessageSquare,
  Search,
} from "lucide-react";
import Link from "next/link";
import { trpc } from "@/lib/trpc-client";

interface ProjectItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  stars: number;
  status: string;
  createdAt: string;
  author: { id: string; name: string | null; username: string; avatarUrl: string | null };
  tags: { tag: { name: string; slug: string } }[];
  _count: { comments: number; collaborators: number };
}

export default function HubPage() {
  const { data: projectsData, isLoading } = trpc.hub.listProjects.useQuery({
    sortBy: "popular",
    limit: 6,
  }) as { data: { projects: ProjectItem[]; total: number } | undefined; isLoading: boolean };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <Users className="h-8 w-8 text-primary" />
            FORGE Hub
          </h1>
          <p className="mt-1 text-muted-foreground">
            Collaborate with developers, publish modules, and showcase your work.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/hub/projects/new"
            className="inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-medium shadow-sm hover:bg-muted"
          >
            <Plus className="h-4 w-4" />
            New Project
          </Link>
          <Link
            href="/hub/publish"
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
          >
            <Upload className="h-4 w-4" />
            Publish Module
          </Link>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link
          href="/hub/publish"
          className="group rounded-xl border bg-card p-5 transition-colors hover:border-primary/20 hover:shadow-sm"
        >
          <Upload className="mb-2 h-7 w-7 text-primary" />
          <h3 className="font-semibold group-hover:text-primary transition-colors">Publish Module</h3>
          <p className="mt-1 text-xs text-muted-foreground">Submit a module to the FORGE Store.</p>
        </Link>
        <Link
          href="/store/my-modules"
          className="group rounded-xl border bg-card p-5 transition-colors hover:border-primary/20 hover:shadow-sm"
        >
          <Package className="mb-2 h-7 w-7 text-primary" />
          <h3 className="font-semibold group-hover:text-primary transition-colors">My Modules</h3>
          <p className="mt-1 text-xs text-muted-foreground">Manage your published modules.</p>
        </Link>
        <Link
          href="/hub/submissions"
          className="group rounded-xl border bg-card p-5 transition-colors hover:border-primary/20 hover:shadow-sm"
        >
          <FolderGit2 className="mb-2 h-7 w-7 text-primary" />
          <h3 className="font-semibold group-hover:text-primary transition-colors">Submissions</h3>
          <p className="mt-1 text-xs text-muted-foreground">Track your module submissions.</p>
        </Link>
      </div>

      {/* Popular projects */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Popular Projects</h2>
          <Link href="/hub/explore" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-36 animate-pulse rounded-xl border bg-muted" />
            ))}
          </div>
        ) : projectsData && projectsData.projects.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projectsData.projects.map((project) => (
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
                  <span>by {project.author.name || project.author.username}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12">
            <FolderGit2 className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No projects yet. Create the first one!</p>
          </div>
        )}
      </section>
    </div>
  );
}
