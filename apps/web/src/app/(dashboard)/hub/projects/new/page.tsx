"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  FolderGit2,
  Loader2,
  Globe,
  Lock,
  Tag,
  GitBranch,
} from "lucide-react";
import { trpc } from "@/lib/trpc-client";

export default function NewProjectPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [tags, setTags] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createProject = trpc.hub.createProject.useMutation();

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (name.trim().length < 2)
      newErrors.name = "Name must be at least 2 characters";
    if (name.trim().length > 100)
      newErrors.name = "Name must be under 100 characters";
    if (description.trim().length < 10)
      newErrors.description = "Description must be at least 10 characters";
    if (
      repositoryUrl &&
      !repositoryUrl.match(/^https?:\/\/.+/)
    )
      newErrors.repositoryUrl = "Must be a valid URL starting with http(s)://";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const tagList = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      const project = await createProject.mutateAsync({
        name: name.trim(),
        description: description.trim(),
        repositoryUrl: repositoryUrl.trim() || undefined,
        isPublic,
        tags: tagList.length > 0 ? tagList : undefined,
      });
      router.push(`/hub/projects/${project.slug}`);
    } catch {
      // Error displayed via mutation state
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/hub"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Hub
      </Link>

      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <FolderGit2 className="h-7 w-7 text-primary" />
          Create a New Project
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Set up a project to collaborate with other FORGE developers.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border bg-card p-6">
        {/* Name */}
        <div className="grid gap-2">
          <label className="text-sm font-medium">
            Project Name <span className="text-destructive">*</span>
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., My Awesome Module"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name}</p>
          )}
        </div>

        {/* Description */}
        <div className="grid gap-2">
          <label className="text-sm font-medium">
            Description <span className="text-destructive">*</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what this project is about, its goals, and how others can contribute..."
            rows={5}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="flex justify-between">
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description}</p>
            )}
            <p className="ml-auto text-xs text-muted-foreground">
              {description.length} characters
            </p>
          </div>
        </div>

        {/* Repository URL */}
        <div className="grid gap-2">
          <label className="text-sm font-medium">
            <GitBranch className="mr-1 inline h-4 w-4" />
            Repository URL
          </label>
          <input
            value={repositoryUrl}
            onChange={(e) => setRepositoryUrl(e.target.value)}
            placeholder="https://github.com/your-org/your-repo"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {errors.repositoryUrl && (
            <p className="text-xs text-destructive">{errors.repositoryUrl}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Optional. Link to the source code repository.
          </p>
        </div>

        {/* Visibility toggle */}
        <div className="grid gap-2">
          <label className="text-sm font-medium">Visibility</label>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setIsPublic(true)}
              className={`flex items-center gap-3 rounded-lg border p-4 text-left transition-colors ${
                isPublic
                  ? "border-primary bg-primary/5"
                  : "hover:bg-muted"
              }`}
            >
              <Globe className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Public</p>
                <p className="text-xs text-muted-foreground">
                  Anyone can see this project
                </p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setIsPublic(false)}
              className={`flex items-center gap-3 rounded-lg border p-4 text-left transition-colors ${
                !isPublic
                  ? "border-primary bg-primary/5"
                  : "hover:bg-muted"
              }`}
            >
              <Lock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Private</p>
                <p className="text-xs text-muted-foreground">
                  Only collaborators can access
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Tags */}
        <div className="grid gap-2">
          <label className="text-sm font-medium">
            <Tag className="mr-1 inline h-4 w-4" />
            Tags
          </label>
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="e.g., ai, automation, crm, monitoring"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <p className="text-xs text-muted-foreground">
            Comma-separated. Helps others find your project.
          </p>
          {/* Preview tags */}
          {tags.trim() && (
            <div className="flex flex-wrap gap-1">
              {tags
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean)
                .map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
            </div>
          )}
        </div>

        {/* Error from mutation */}
        {createProject.error && (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {createProject.error.message}
          </div>
        )}

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 border-t pt-5">
          <Link
            href="/hub"
            className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium shadow-sm transition-colors hover:bg-muted"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={createProject.isPending}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
          >
            {createProject.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FolderGit2 className="h-4 w-4" />
            )}
            Create Project
          </button>
        </div>
      </form>
    </div>
  );
}
