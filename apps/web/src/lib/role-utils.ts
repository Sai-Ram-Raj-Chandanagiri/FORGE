/**
 * Role-check utilities for FORGE RBAC.
 * Case-insensitive to handle mixed casing from Prisma enums.
 */

export function isAdmin(role: string | null | undefined): boolean {
  return role?.toUpperCase() === "ADMIN";
}

export function isOrgAdmin(role: string | null | undefined): boolean {
  const upper = role?.toUpperCase();
  return upper === "ADMIN" || upper === "ORG_ADMIN";
}

export function isDeveloper(role: string | null | undefined): boolean {
  const upper = role?.toUpperCase();
  return upper === "ADMIN" || upper === "ORG_ADMIN" || upper === "DEVELOPER";
}
