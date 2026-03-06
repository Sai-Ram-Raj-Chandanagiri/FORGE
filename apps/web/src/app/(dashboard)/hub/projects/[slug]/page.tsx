"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Star,
  MessageSquare,
  Tag,
  Users,
  GitBranch,
  Calendar,
  Loader2,
  Send,
  Reply,
  FolderGit2,
  ExternalLink,
} from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import { trpc } from "@/lib/trpc-client";
import type { Collaborator, Comment, ProjectData } from "@/types/hub";

export default function ProjectDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const utils = trpc.useUtils();

  const { data: project, isLoading } = trpc.hub.getProjectBySlug.useQuery({
    slug,
  }) as {
    data: ProjectData | null | undefined;
    isLoading: boolean;
  };

  const starMutation = trpc.hub.starProject.useMutation({
    onSuccess: () => utils.hub.getProjectBySlug.invalidate({ slug }),
  });

  const addCommentMutation = trpc.hub.addComment.useMutation({
    onSuccess: () => {
      utils.hub.getProjectBySlug.invalidate({ slug });
      setCommentBody("");
      setReplyingTo(null);
      setReplyBody("");
    },
  });

  const [commentBody, setCommentBody] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-32 animate-pulse rounded bg-muted" />
        <div className="h-10 w-64 animate-pulse rounded bg-muted" />
        <div className="h-48 animate-pulse rounded-xl border bg-muted" />
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

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <FolderGit2 className="mb-4 h-12 w-12 text-muted-foreground/50" />
        <h2 className="text-lg font-semibold">Project not found</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This project doesn&apos;t exist or you don&apos;t have access.
        </p>
        <BackButton fallback="/hub" label="Back" />
      </div>
    );
  }

  function handleStar() {
    if (!project) return;
    starMutation.mutate({ projectId: project.id });
  }

  function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentBody.trim() || !project) return;
    addCommentMutation.mutate({
      projectId: project.id,
      body: commentBody.trim(),
    });
  }

  function handleReply(e: React.FormEvent, parentId: string) {
    e.preventDefault();
    if (!replyBody.trim() || !project) return;
    addCommentMutation.mutate({
      projectId: project.id,
      body: replyBody.trim(),
      parentId,
    });
  }

  // Separate top-level comments from replies
  const topLevelComments = project.comments.filter((c) => !c.parentId);

  return (
    <div className="space-y-6">
      {/* Back link */}
      <BackButton fallback="/hub" label="Back" />

      {/* Project header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
            <Link
              href={`/hub/developers/${project.author.username}`}
              className="flex items-center gap-2 hover:text-foreground"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                {(
                  project.author.name || project.author.username
                )
                  .charAt(0)
                  .toUpperCase()}
              </div>
              <span className="font-medium">
                {project.author.name || project.author.username}
              </span>
            </Link>
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(project.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Star button */}
        <button
          onClick={handleStar}
          disabled={starMutation.isPending}
          className={`inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-medium shadow-sm transition-colors ${
            project.isStarred
              ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-600 dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20"
              : "hover:bg-muted"
          } disabled:pointer-events-none disabled:opacity-50`}
        >
          <Star
            className={`h-4 w-4 ${
              project.isStarred ? "fill-amber-400 text-amber-400" : ""
            }`}
          />
          {project.isStarred ? "Starred" : "Star"}
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
            {project.stars}
          </span>
        </button>
      </div>

      {/* Description */}
      <section className="rounded-xl border bg-card p-6">
        <h2 className="mb-3 text-lg font-semibold">About</h2>
        <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
          {project.description || "No description provided."}
        </div>

        {/* Repository link */}
        {project.repositoryUrl && (
          <a
            href={project.repositoryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <GitBranch className="h-4 w-4" />
            View Repository
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </section>

      {/* Tags */}
      {project.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {project.tags.map((pt) => (
            <Link
              key={pt.tag.slug}
              href={`/hub/explore?tags=${pt.tag.slug}`}
              className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground hover:bg-muted/80"
            >
              <Tag className="h-3 w-3" />
              {pt.tag.name}
            </Link>
          ))}
        </div>
      )}

      {/* Author & Collaborators */}
      <section className="rounded-xl border bg-card p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Users className="h-5 w-5 text-primary" />
          Team
        </h2>

        {/* Author */}
        <div className="mb-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Owner
          </p>
          <Link
            href={`/hub/developers/${project.author.username}`}
            className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {(project.author.name || project.author.username)
                .charAt(0)
                .toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium">
                {project.author.name || project.author.username}
              </p>
              <p className="text-xs text-muted-foreground">
                @{project.author.username}
              </p>
            </div>
          </Link>
        </div>

        {/* Collaborators */}
        {project.collaborators.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Collaborators
            </p>
            <div className="space-y-1">
              {project.collaborators.map((collab) => (
                <Link
                  key={collab.id}
                  href={`/hub/developers/${collab.user.username}`}
                  className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                    {(collab.user.name || collab.user.username)
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {collab.user.name || collab.user.username}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      @{collab.user.username}
                    </p>
                  </div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {collab.role}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {project.collaborators.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No collaborators yet.
          </p>
        )}
      </section>

      {/* Comments */}
      <section className="rounded-xl border bg-card p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <MessageSquare className="h-5 w-5 text-primary" />
          Comments ({project._count.comments})
        </h2>

        {/* Add comment form */}
        <form onSubmit={handleComment} className="mb-6">
          <textarea
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            placeholder="Write a comment..."
            rows={3}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {addCommentMutation.error && !replyingTo && (
            <p className="mt-1 text-xs text-destructive">
              {addCommentMutation.error.message}
            </p>
          )}
          <div className="mt-2 flex justify-end">
            <button
              type="submit"
              disabled={
                !commentBody.trim() || addCommentMutation.isPending
              }
              className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
            >
              {addCommentMutation.isPending && !replyingTo ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Comment
            </button>
          </div>
        </form>

        {/* Comment list */}
        {topLevelComments.length > 0 ? (
          <div className="space-y-4">
            {topLevelComments.map((comment) => (
              <div key={comment.id} className="border-b pb-4 last:border-0">
                {/* Comment header */}
                <div className="flex items-center gap-3">
                  <Link
                    href={`/hub/developers/${comment.user.username}`}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
                  >
                    {(comment.user.name || comment.user.username)
                      .charAt(0)
                      .toUpperCase()}
                  </Link>
                  <div>
                    <Link
                      href={`/hub/developers/${comment.user.username}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {comment.user.name || comment.user.username}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {new Date(comment.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Comment body */}
                <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
                  {comment.body}
                </p>

                {/* Reply button */}
                <button
                  onClick={() =>
                    setReplyingTo(
                      replyingTo === comment.id ? null : comment.id,
                    )
                  }
                  className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Reply className="h-3 w-3" />
                  Reply
                </button>

                {/* Reply form */}
                {replyingTo === comment.id && (
                  <form
                    onSubmit={(e) => handleReply(e, comment.id)}
                    className="mt-3 ml-8"
                  >
                    <textarea
                      value={replyBody}
                      onChange={(e) => setReplyBody(e.target.value)}
                      placeholder={`Reply to ${comment.user.name || comment.user.username}...`}
                      rows={2}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <div className="mt-2 flex items-center gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setReplyingTo(null);
                          setReplyBody("");
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={
                          !replyBody.trim() || addCommentMutation.isPending
                        }
                        className="inline-flex h-8 items-center gap-1 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
                      >
                        {addCommentMutation.isPending && replyingTo === comment.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Reply className="h-3 w-3" />
                        )}
                        Reply
                      </button>
                    </div>
                  </form>
                )}

                {/* Nested replies */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="mt-3 ml-8 space-y-3 border-l-2 border-muted pl-4">
                    {comment.replies.map((reply) => (
                      <div key={reply.id}>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/hub/developers/${reply.user.username}`}
                            className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground"
                          >
                            {(reply.user.name || reply.user.username)
                              .charAt(0)
                              .toUpperCase()}
                          </Link>
                          <Link
                            href={`/hub/developers/${reply.user.username}`}
                            className="text-xs font-medium hover:underline"
                          >
                            {reply.user.name || reply.user.username}
                          </Link>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(reply.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                          {reply.body}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8">
            <MessageSquare className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No comments yet. Start the conversation!
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
