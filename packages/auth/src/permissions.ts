import { UserRole } from "./roles";

/**
 * All actions that can be performed in the FORGE system.
 */
export type Action =
  | "store:browse"
  | "store:purchase"
  | "module:create"
  | "module:publish"
  | "module:review"
  | "deployment:create"
  | "deployment:manage"
  | "hub:create_project"
  | "hub:submit_module"
  | "org:create"
  | "org:manage"
  | "admin:access"
  | "admin:manage_users"
  | "admin:review_modules"
  | "review:write"
  | "agent:use"
  | "agent:create_workflow";

/**
 * Permission map defining which roles are allowed to perform each action.
 *
 * If a role is listed for an action, users with that role can perform it.
 */
export const PERMISSIONS: Record<Action, UserRole[]> = {
  // Store
  "store:browse": [UserRole.USER, UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.ADMIN],
  "store:purchase": [UserRole.USER, UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.ADMIN],

  // Modules
  "module:create": [UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.ADMIN],
  "module:publish": [UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.ADMIN],
  "module:review": [UserRole.ADMIN],

  // Deployments
  "deployment:create": [UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.ADMIN],
  "deployment:manage": [UserRole.ORG_ADMIN, UserRole.ADMIN],

  // Hub
  "hub:create_project": [UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.ADMIN],
  "hub:submit_module": [UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.ADMIN],

  // Organization
  "org:create": [UserRole.ORG_ADMIN, UserRole.ADMIN],
  "org:manage": [UserRole.ORG_ADMIN, UserRole.ADMIN],

  // Admin
  "admin:access": [UserRole.ADMIN],
  "admin:manage_users": [UserRole.ADMIN],
  "admin:review_modules": [UserRole.ADMIN],

  // Reviews
  "review:write": [UserRole.USER, UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.ADMIN],

  // Agent
  "agent:use": [UserRole.USER, UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.ADMIN],
  "agent:create_workflow": [UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.ADMIN],
} as const;
