import type { UserRole } from "../constants/roles";

/**
 * Full user profile as returned by authenticated API endpoints.
 * Contains all fields visible to the user themselves.
 */
export interface UserProfile {
  /** Unique user identifier (cuid). */
  id: string;
  /** User's email address. */
  email: string;
  /** Whether the user's email has been verified. */
  emailVerified: boolean;
  /** Full display name. */
  name: string | null;
  /** Unique username used in URLs and mentions. */
  username: string;
  /** URL to the user's avatar image. */
  avatarUrl: string | null;
  /** Short biography or description. */
  bio: string | null;
  /** The user's platform-level role. */
  role: UserRole;
  /** Current account status (e.g., ACTIVE, SUSPENDED). */
  status: string;
  /** ISO 8601 timestamp of when the account was created. */
  createdAt: string;
  /** ISO 8601 timestamp of the last profile update. */
  updatedAt: string;
}

/**
 * Session data available on the client after authentication.
 * This is the shape returned by NextAuth session callbacks and
 * attached to every authenticated request context.
 */
export interface UserSession {
  /** Unique user identifier. */
  id: string;
  /** User's email address. */
  email: string;
  /** Display name. */
  name: string | null;
  /** Unique username. */
  username: string;
  /** URL to the user's avatar image. */
  avatarUrl: string | null;
  /** The user's platform-level role. */
  role: UserRole;
}

/**
 * Minimal public-facing user information suitable for displaying
 * in module author cards, review bylines, project collaborator lists, etc.
 * Does not include any sensitive or private fields.
 */
export interface PublicUser {
  /** Unique user identifier. */
  id: string;
  /** Display name. */
  name: string | null;
  /** Unique username. */
  username: string;
  /** URL to the user's avatar image. */
  avatarUrl: string | null;
  /** Short biography or description. */
  bio: string | null;
}
