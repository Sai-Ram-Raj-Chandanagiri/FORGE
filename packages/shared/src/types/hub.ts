import type { PublicUser } from "./user";

/**
 * Compact project representation used in listing pages (Hub browse, search results).
 */
export interface ProjectInfo {
  /** Unique project identifier. */
  id: string;
  /** Project author information. */
  author: PublicUser;
  /** Project display name. */
  name: string;
  /** URL-safe slug used in routes. */
  slug: string;
  /** Brief project description. */
  description: string | null;
  /** Current project status (ACTIVE, ARCHIVED, DRAFT). */
  status: string;
  /** Whether the project is publicly visible. */
  isPublic: boolean;
  /** Number of stars/favorites the project has received. */
  stars: number;
  /** Tag names associated with this project. */
  tags: string[];
  /** ISO 8601 timestamp of when the project was created. */
  createdAt: string;
  /** ISO 8601 timestamp of the last update. */
  updatedAt: string;
}

/**
 * Full project detail returned by the Hub detail page endpoint.
 * Includes all information needed to render the project detail view.
 */
export interface ProjectDetail extends ProjectInfo {
  /** URL to the project's README file. */
  readmeUrl: string | null;
  /** URL to the project's source code repository. */
  repositoryUrl: string | null;
  /** List of project collaborators with their roles. */
  collaborators: {
    /** Collaborator's public profile. */
    user: PublicUser;
    /** Collaborator's role (e.g., "contributor", "maintainer"). */
    role: string;
    /** ISO 8601 timestamp of when they joined the project. */
    joinedAt: string;
  }[];
}

/**
 * Input payload for creating a new Hub project via the API.
 */
export interface CreateProjectInput {
  /** Project display name. */
  name: string;
  /** URL-safe slug. Must be unique across all projects. */
  slug: string;
  /** Brief project description. */
  description?: string;
  /** URL to the project's README file. */
  readmeUrl?: string;
  /** URL to the project's source code repository. */
  repositoryUrl?: string;
  /** Whether the project should be publicly visible. Defaults to true. */
  isPublic?: boolean;
  /** Tag names to associate with this project. */
  tags?: string[];
}

/**
 * Store submission information as returned by API endpoints.
 * Represents a Hub project's submission to the Store for review.
 */
export interface SubmissionInfo {
  /** Unique submission identifier. */
  id: string;
  /** ID of the user who created the submission. */
  userId: string;
  /** ID of the resulting module, if the submission was approved. */
  moduleId: string | null;
  /** Application name as it will appear in the Store. */
  appName: string;
  /** Company or organization name. */
  companyName: string;
  /** Semantic version string for this submission. */
  version: string;
  /** Detailed description of the application. */
  about: string;
  /** Changelog or release notes for this version. */
  changelog: string | null;
  /** Additional information for reviewers. */
  extraInfo: string | null;
  /** Labels/tags associated with the submission. */
  labels: string[];
  /** URL to the uploaded module file or Docker image reference. */
  fileUrl: string;
  /** Current review status. */
  status: "DRAFT" | "SUBMITTED" | "IN_REVIEW" | "CHANGES_REQUESTED" | "APPROVED" | "REJECTED";
  /** Reviewer notes, if any. */
  reviewNotes: string | null;
  /** ISO 8601 timestamp of when the submission was reviewed. */
  reviewedAt: string | null;
  /** ID of the user who reviewed the submission. */
  reviewedBy: string | null;
  /** ISO 8601 timestamp of when the submission was created. */
  submittedAt: string;
  /** ISO 8601 timestamp of the last update. */
  updatedAt: string;
}
