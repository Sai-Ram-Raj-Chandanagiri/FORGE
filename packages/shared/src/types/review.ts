import type { PublicUser } from "./user";

/**
 * Review information as returned by API endpoints.
 * Represents a user's rating and feedback for a specific module.
 */
export interface ReviewInfo {
  /** Unique review identifier. */
  id: string;
  /** The reviewer's public profile. */
  user: PublicUser;
  /** ID of the module being reviewed. */
  moduleId: string;
  /** Rating value from 1 (lowest) to 5 (highest). */
  rating: number;
  /** Optional review title or summary. */
  title: string | null;
  /** Optional review body text. */
  body: string | null;
  /** ISO 8601 timestamp of when the review was created. */
  createdAt: string;
  /** ISO 8601 timestamp of the last update. */
  updatedAt: string;
}

/**
 * Input payload for creating a new review via the API.
 * Each user may only submit one review per module.
 */
export interface CreateReviewInput {
  /** ID of the module to review. */
  moduleId: string;
  /** Rating value from 1 (lowest) to 5 (highest). */
  rating: number;
  /** Optional review title or summary. */
  title?: string;
  /** Optional review body text. */
  body?: string;
}
