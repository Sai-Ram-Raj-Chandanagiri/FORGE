import type { PublicUser } from "./user";

/**
 * Compact module representation used in listing pages (Store browse, search results).
 * Optimized for rendering module cards without fetching full details.
 */
export interface ModuleListItem {
  /** Unique module identifier. */
  id: string;
  /** Module display name. */
  name: string;
  /** URL-safe slug used in routes. */
  slug: string;
  /** Brief description (max 200 characters). */
  shortDescription: string;
  /** Module author information. */
  author: PublicUser;
  /** Current publication status. */
  status: string;
  /** Module type (SINGLE_CONTAINER or MULTI_CONTAINER). */
  type: string;
  /** Pricing model identifier. */
  pricingModel: string;
  /** Price amount, if applicable. `null` for free modules. */
  price: number | null;
  /** ISO 4217 currency code (e.g., "USD"). */
  currency: string;
  /** URL to the module's logo image. */
  logoUrl: string | null;
  /** Whether the module is featured by the platform. */
  featured: boolean;
  /** Total number of times the module has been installed. */
  downloadCount: number;
  /** Average user rating (0.0 to 5.0). */
  averageRating: number;
  /** Total number of reviews. */
  reviewCount: number;
  /** Category slugs associated with this module. */
  categories: string[];
  /** Tag names associated with this module. */
  tags: string[];
  /** ISO 8601 timestamp of when the module was published. */
  publishedAt: string | null;
}

/**
 * Full module detail returned by the Store detail page endpoint.
 * Includes all information needed to render the module detail view.
 */
export interface ModuleDetail extends ModuleListItem {
  /** Full module description, supports Markdown. */
  description: string;
  /** URL to the module's banner image. */
  bannerUrl: string | null;
  /** URL to the module's source code repository. */
  repositoryUrl: string | null;
  /** URL to the module's documentation site. */
  documentationUrl: string | null;
  /** URL to the module's website or landing page. */
  website: string | null;
  /** Available versions of this module, newest first. */
  versions: ModuleVersionInfo[];
  /** Screenshot URLs with optional captions. */
  screenshots: { url: string; caption: string | null }[];
  /** ISO 8601 timestamp of when the module was created. */
  createdAt: string;
  /** ISO 8601 timestamp of the last update. */
  updatedAt: string;
}

/**
 * Version information for a specific release of a module.
 */
export interface ModuleVersionInfo {
  /** Unique version record identifier. */
  id: string;
  /** Semantic version string (e.g., "1.2.3"). */
  version: string;
  /** Release notes or changelog in Markdown format. */
  changelog: string | null;
  /** Docker image reference (e.g., "forge/crm:1.0.0"). */
  dockerImage: string;
  /** URL to the Docker Compose file, if applicable. */
  composeFileUrl: string | null;
  /** JSON Schema describing the configuration options. */
  configSchema: Record<string, unknown> | null;
  /** Minimum resource requirements (cpu, memory). */
  minResources: Record<string, unknown> | null;
  /** File size in bytes. */
  fileSize: number | null;
  /** Whether this is the latest (default) version. */
  isLatest: boolean;
  /** ISO 8601 timestamp of when this version was published. */
  publishedAt: string;
}

/**
 * Input payload for creating a new module via the API.
 */
export interface CreateModuleInput {
  /** Module display name. */
  name: string;
  /** Brief description (max 200 characters). */
  shortDescription: string;
  /** Full description in Markdown format. */
  description: string;
  /** Module type. */
  type: "SINGLE_CONTAINER" | "MULTI_CONTAINER";
  /** Pricing model. */
  pricingModel: "FREE" | "ONE_TIME" | "SUBSCRIPTION_MONTHLY" | "SUBSCRIPTION_YEARLY" | "USAGE_BASED";
  /** Price amount. Required for non-free pricing models. */
  price?: number;
  /** ISO 4217 currency code. Defaults to "USD". */
  currency?: string;
  /** URL to the module's logo image. */
  logoUrl?: string;
  /** URL to the module's source code repository. */
  repositoryUrl?: string;
  /** URL to the module's documentation. */
  documentationUrl?: string;
  /** URL to the module's website. */
  website?: string;
  /** Category slugs to associate with this module. */
  categoryIds: string[];
  /** Tag names to associate with this module. */
  tags: string[];
}

/**
 * Input payload for updating an existing module via the API.
 * All fields are optional; only provided fields will be updated.
 */
export interface UpdateModuleInput {
  /** Updated module display name. */
  name?: string;
  /** Updated brief description (max 200 characters). */
  shortDescription?: string;
  /** Updated full description in Markdown format. */
  description?: string;
  /** Updated pricing model. */
  pricingModel?: "FREE" | "ONE_TIME" | "SUBSCRIPTION_MONTHLY" | "SUBSCRIPTION_YEARLY" | "USAGE_BASED";
  /** Updated price amount. */
  price?: number;
  /** Updated currency code. */
  currency?: string;
  /** Updated logo URL. */
  logoUrl?: string;
  /** Updated banner URL. */
  bannerUrl?: string;
  /** Updated repository URL. */
  repositoryUrl?: string;
  /** Updated documentation URL. */
  documentationUrl?: string;
  /** Updated website URL. */
  website?: string;
  /** Updated category slug list (replaces existing). */
  categoryIds?: string[];
  /** Updated tag name list (replaces existing). */
  tags?: string[];
}
