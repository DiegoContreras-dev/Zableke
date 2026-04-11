import { AuthError } from "@/backend/common/errors/auth.error";
import {
  type RbacPermission,
  type SystemRole,
} from "@/backend/modules/roles/model/rbac.model";
import { RbacService } from "@/backend/modules/roles/service/rbac.service";

export interface CurrentUserLike {
  id: string;
  roles: string[];
}

const rbacService = new RbacService();

export function requireUser(user: CurrentUserLike | null | undefined): CurrentUserLike {
  if (!user) {
    throw new AuthError("Authentication is required", "UNAUTHORIZED", 401);
  }

  return user;
}

export function requireRole(user: CurrentUserLike | null | undefined, roles: SystemRole[]): CurrentUserLike {
  const authenticatedUser = requireUser(user);
  const normalized = rbacService.normalizeRoles(authenticatedUser.roles);

  const hasRole = roles.some((role) => normalized.includes(role));
  if (!hasRole) {
    throw new AuthError("Required role is missing", "FORBIDDEN", 403);
  }

  return authenticatedUser;
}

export function requirePermission(
  user: CurrentUserLike | null | undefined,
  permission: RbacPermission
): CurrentUserLike {
  const authenticatedUser = requireUser(user);
  rbacService.assertPermission(authenticatedUser.roles, permission);
  return authenticatedUser;
}
