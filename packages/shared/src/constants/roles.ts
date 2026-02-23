/**
 * User roles matching the Prisma schema `UserRole` enum.
 * Defines the global platform-level roles assigned to each user account.
 */
export enum UserRole {
  /** Platform administrator with full system access. */
  ADMIN = "ADMIN",
  /** Organization-level administrator who manages their own organization. */
  ORG_ADMIN = "ORG_ADMIN",
  /** Developer who can publish and manage modules on the Store. */
  DEVELOPER = "DEVELOPER",
  /** Standard end-user with basic access to the platform. */
  USER = "USER",
}

/**
 * Organization membership roles matching the Prisma schema `OrgRole` enum.
 * Defines the role a user holds within a specific organization.
 */
export enum OrgRole {
  /** Organization owner with full control, including deletion. */
  OWNER = "OWNER",
  /** Organization administrator who can manage members and settings. */
  ADMIN = "ADMIN",
  /** Standard organization member with read/write access. */
  MEMBER = "MEMBER",
  /** Read-only viewer within the organization. */
  VIEWER = "VIEWER",
}

/**
 * Platform-level role hierarchy ordered from highest privilege to lowest.
 * Used for authorization checks where higher roles inherit lower-role permissions.
 *
 * @example
 * ```ts
 * const userIndex = ROLE_HIERARCHY.indexOf(UserRole.DEVELOPER);
 * const requiredIndex = ROLE_HIERARCHY.indexOf(UserRole.USER);
 * const hasAccess = userIndex <= requiredIndex; // lower index = higher privilege
 * ```
 */
export const ROLE_HIERARCHY: readonly UserRole[] = [
  UserRole.ADMIN,
  UserRole.ORG_ADMIN,
  UserRole.DEVELOPER,
  UserRole.USER,
] as const;

/**
 * Organization-level role hierarchy ordered from highest privilege to lowest.
 */
export const ORG_ROLE_HIERARCHY: readonly OrgRole[] = [
  OrgRole.OWNER,
  OrgRole.ADMIN,
  OrgRole.MEMBER,
  OrgRole.VIEWER,
] as const;

/**
 * Checks whether the given user role meets or exceeds the required role
 * based on the platform role hierarchy.
 *
 * @param userRole - The role the user currently holds.
 * @param requiredRole - The minimum role required for access.
 * @returns `true` if the user's role is equal to or higher than the required role.
 */
export function hasMinimumRole(
  userRole: UserRole,
  requiredRole: UserRole,
): boolean {
  const userIndex = ROLE_HIERARCHY.indexOf(userRole);
  const requiredIndex = ROLE_HIERARCHY.indexOf(requiredRole);
  return userIndex !== -1 && requiredIndex !== -1 && userIndex <= requiredIndex;
}

/**
 * Checks whether the given organization role meets or exceeds the required role
 * based on the organization role hierarchy.
 *
 * @param memberRole - The role the member currently holds within the organization.
 * @param requiredRole - The minimum role required for the action.
 * @returns `true` if the member's role is equal to or higher than the required role.
 */
export function hasMinimumOrgRole(
  memberRole: OrgRole,
  requiredRole: OrgRole,
): boolean {
  const memberIndex = ORG_ROLE_HIERARCHY.indexOf(memberRole);
  const requiredIndex = ORG_ROLE_HIERARCHY.indexOf(requiredRole);
  return (
    memberIndex !== -1 && requiredIndex !== -1 && memberIndex <= requiredIndex
  );
}
