import type { OrgRole } from "../constants/roles";
import type { PublicUser } from "./user";

/**
 * Organization information returned by API endpoints.
 * Represents a team or company account on the platform.
 */
export interface OrgInfo {
  /** Unique organization identifier. */
  id: string;
  /** Organization display name. */
  name: string;
  /** URL-safe slug used in routes. */
  slug: string;
  /** Brief organization description. */
  description: string | null;
  /** URL to the organization's logo image. */
  logoUrl: string | null;
  /** Organization website URL. */
  website: string | null;
  /** ID of the organization owner. */
  ownerId: string;
  /** Total number of members in the organization. */
  memberCount: number;
  /** ISO 8601 timestamp of when the organization was created. */
  createdAt: string;
  /** ISO 8601 timestamp of the last update. */
  updatedAt: string;
}

/**
 * A member entry within an organization, combining user profile
 * information with their organization-specific role.
 */
export interface OrgMember {
  /** Unique membership record identifier. */
  id: string;
  /** The member's public profile information. */
  user: PublicUser;
  /** The member's role within this organization. */
  role: OrgRole;
  /** ISO 8601 timestamp of when the member joined. */
  joinedAt: string;
}

/**
 * Input payload for creating a new organization via the API.
 */
export interface CreateOrgInput {
  /** Organization display name. */
  name: string;
  /** URL-safe slug. Must be unique across all organizations. */
  slug: string;
  /** Brief organization description. */
  description?: string;
  /** URL to the organization's logo image. */
  logoUrl?: string;
  /** Organization website URL. */
  website?: string;
}
