import { AuthError } from "@/backend/common/errors/auth.error";
import {
  ROLE_PERMISSIONS,
  RBAC_PERMISSIONS,
  SYSTEM_ROLES,
  type RbacPermission,
  type RoleAccessProfile,
  type SystemRole,
} from "@/backend/modules/roles/model/rbac.model";

function isSystemRole(value: string): value is SystemRole {
  return (SYSTEM_ROLES as readonly string[]).includes(value);
}

function isPermission(value: string): value is RbacPermission {
  return (RBAC_PERMISSIONS as readonly string[]).includes(value);
}

export class RbacService {
  normalizeRoles(rawRoles: string[]): SystemRole[] {
    const unique = new Set<SystemRole>();

    for (const rawRole of rawRoles) {
      const normalized = rawRole.trim().toUpperCase();
      if (isSystemRole(normalized)) {
        unique.add(normalized);
      }
    }

    return Array.from(unique);
  }

  getPermissions(roles: string[]): RbacPermission[] {
    const normalizedRoles = this.normalizeRoles(roles);
    const permissionSet = new Set<RbacPermission>();

    for (const role of normalizedRoles) {
      for (const permission of ROLE_PERMISSIONS[role]) {
        permissionSet.add(permission);
      }
    }

    return Array.from(permissionSet);
  }

  buildProfile(roles: string[]): RoleAccessProfile {
    const normalizedRoles = this.normalizeRoles(roles);

    return {
      roles: normalizedRoles,
      permissions: this.getPermissions(normalizedRoles),
    };
  }

  hasPermission(roles: string[], permission: RbacPermission): boolean {
    if (!isPermission(permission)) {
      return false;
    }

    return this.getPermissions(roles).includes(permission);
  }

  assertPermission(roles: string[], permission: RbacPermission): void {
    if (!this.hasPermission(roles, permission)) {
      throw new AuthError(
        `Permission '${permission}' is required for this action`,
        "FORBIDDEN",
        403
      );
    }
  }
}
