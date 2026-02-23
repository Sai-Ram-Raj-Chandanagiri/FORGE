/**
 * User roles in the FORGE system, ordered from most privileged to least.
 */
export const UserRole = {
  ADMIN: "ADMIN",
  ORG_ADMIN: "ORG_ADMIN",
  DEVELOPER: "DEVELOPER",
  USER: "USER",
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

/**
 * Role hierarchy from highest privilege to lowest.
 * Index 0 is the most privileged role.
 */
const ROLE_HIERARCHY: readonly UserRole[] = [
  UserRole.ADMIN,
  UserRole.ORG_ADMIN,
  UserRole.DEVELOPER,
  UserRole.USER,
] as const;

/**
 * Returns the numeric rank of a role in the hierarchy.
 * Lower numbers indicate higher privilege.
 * Returns -1 if the role is not recognized.
 */
function getRoleRank(role: string): number {
  const index = ROLE_HIERARCHY.indexOf(role as UserRole);
  return index === -1 ? -1 : index;
}

/**
 * Checks whether a user's role is at least as privileged as the required role.
 *
 * @param userRole - The role of the user being checked.
 * @param requiredRole - The minimum role required.
 * @returns `true` if the user's role is equal to or more privileged than the required role.
 *
 * @example
 * ```ts
 * isAtLeastRole("ADMIN", "DEVELOPER");    // true
 * isAtLeastRole("USER", "DEVELOPER");     // false
 * isAtLeastRole("DEVELOPER", "DEVELOPER"); // true
 * ```
 */
export function isAtLeastRole(userRole: string, requiredRole: string): boolean {
  const userRank = getRoleRank(userRole);
  const requiredRank = getRoleRank(requiredRole);

  if (userRank === -1 || requiredRank === -1) {
    return false;
  }

  return userRank <= requiredRank;
}

/**
 * Checks if the given role is ADMIN.
 */
export function isAdmin(role: string): boolean {
  return role === UserRole.ADMIN;
}

/**
 * Checks if the given role is DEVELOPER (or higher).
 */
export function isDeveloper(role: string): boolean {
  return isAtLeastRole(role, UserRole.DEVELOPER);
}

/**
 * Checks if the given role allows publishing modules.
 * Only DEVELOPER and ADMIN roles (and ORG_ADMIN, which sits between them) can publish.
 */
export function canPublishModules(role: string): boolean {
  return isAtLeastRole(role, UserRole.DEVELOPER);
}
