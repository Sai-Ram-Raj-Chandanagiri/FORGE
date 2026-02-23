import type { Action } from "./permissions";
import { PERMISSIONS } from "./permissions";
import { isAtLeastRole } from "./roles";
import type { UserRole } from "./roles";

/**
 * Checks if a user with the given role can perform the specified action.
 *
 * @param userRole - The role of the user.
 * @param action - The action to check.
 * @returns `true` if the user's role is listed in the permissions for the action.
 *
 * @example
 * ```ts
 * canPerform("DEVELOPER", "module:publish"); // true
 * canPerform("USER", "admin:access");        // false
 * ```
 */
export function canPerform(userRole: string, action: Action): boolean {
  const allowedRoles = PERMISSIONS[action];
  if (!allowedRoles) {
    return false;
  }
  return allowedRoles.includes(userRole as UserRole);
}

/**
 * Throws an error if the user's role is not at least the required role.
 *
 * @param userRole - The role of the user.
 * @param requiredRole - The minimum role required.
 * @throws {Error} If the user's role is insufficient.
 *
 * @example
 * ```ts
 * requireRole("ADMIN", "DEVELOPER"); // passes
 * requireRole("USER", "DEVELOPER");  // throws Error
 * ```
 */
export function requireRole(userRole: string, requiredRole: string): void {
  if (!isAtLeastRole(userRole, requiredRole)) {
    throw new Error(
      `Insufficient role: required "${requiredRole}" but user has "${userRole}"`,
    );
  }
}

/**
 * Throws an error if the user's role does not have permission for the action.
 *
 * @param userRole - The role of the user.
 * @param action - The action to perform.
 * @throws {Error} If the user's role is not allowed to perform the action.
 *
 * @example
 * ```ts
 * requirePermission("ADMIN", "admin:access");  // passes
 * requirePermission("USER", "admin:access");   // throws Error
 * ```
 */
export function requirePermission(userRole: string, action: Action): void {
  if (!canPerform(userRole, action)) {
    throw new Error(
      `Permission denied: role "${userRole}" cannot perform action "${action}"`,
    );
  }
}
