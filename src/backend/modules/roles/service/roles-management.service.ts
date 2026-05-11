import { AuthError } from "@/backend/common/errors/auth.error";
import {
  SYSTEM_ROLES,
  type RoleAccessProfile,
  type SystemRole,
} from "@/backend/modules/roles/model/rbac.model";
import {
  RolesRepository,
  type UserWithRolesRecord,
} from "@/backend/modules/roles/repository/roles.repository";
import { RbacService } from "@/backend/modules/roles/service/rbac.service";

export interface UserAccessView {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  roles: string[];
  permissions: string[];
}

export interface CurrentUserAccess {
  id: string;
  email: string;
  roles: string[];
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeRole(role: string): string {
  return role.trim().toUpperCase();
}

function isSystemRole(value: string): value is SystemRole {
  return (SYSTEM_ROLES as readonly string[]).includes(value);
}

export class RolesManagementService {
  constructor(
    private readonly repository = new RolesRepository(),
    private readonly rbacService = new RbacService()
  ) {}

  buildMyAccess(currentUser: CurrentUserAccess): RoleAccessProfile {
    return this.rbacService.buildProfile(currentUser.roles);
  }

  async listUsersAccess(): Promise<UserAccessView[]> {
    const users = await this.repository.listUsersWithRoles();
    return users.map((user) => this.toUserAccessView(user));
  }

  async assignRoleToUser(email: string, role: string): Promise<UserAccessView> {
    const normalizedEmail = normalizeEmail(email);
    const normalizedRole = normalizeRole(role);

    if (!isSystemRole(normalizedRole)) {
      throw new AuthError(`Role '${role}' is not supported`, "INVALID_INPUT", 400);
    }

    const user = await this.repository.findUserByEmail(normalizedEmail);
    if (!user) {
      throw new AuthError("User not found", "RESOURCE_NOT_FOUND", 404);
    }

    const roleRecord = await this.repository.findRoleByName(normalizedRole);
    if (!roleRecord) {
      throw new AuthError("Role not found in database", "RESOURCE_NOT_FOUND", 404);
    }

    await this.repository.assignRoleToUser(user.id, roleRecord.id);

    const updatedUser = await this.repository.findUserByEmail(normalizedEmail);
    if (!updatedUser) {
      throw new AuthError("User not found after role assignment", "RESOURCE_NOT_FOUND", 404);
    }

    return this.toUserAccessView(updatedUser);
  }

  async removeRoleFromUser(email: string, role: string): Promise<UserAccessView> {
    const normalizedEmail = normalizeEmail(email);
    const normalizedRole = normalizeRole(role);

    if (!isSystemRole(normalizedRole)) {
      throw new AuthError(`Role '${role}' is not supported`, "INVALID_INPUT", 400);
    }

    const user = await this.repository.findUserByEmail(normalizedEmail);
    if (!user) {
      throw new AuthError("User not found", "RESOURCE_NOT_FOUND", 404);
    }

    const roleRecord = await this.repository.findRoleByName(normalizedRole);
    if (!roleRecord) {
      throw new AuthError("Role not found in database", "RESOURCE_NOT_FOUND", 404);
    }

    await this.repository.removeRoleFromUser(user.id, roleRecord.id);

    const updatedUser = await this.repository.findUserByEmail(normalizedEmail);
    if (!updatedUser) {
      throw new AuthError("User not found after role removal", "RESOURCE_NOT_FOUND", 404);
    }

    return this.toUserAccessView(updatedUser);
  }

  private toUserAccessView(user: UserWithRolesRecord): UserAccessView {
    const roles = user.roles.map((item) => item.role.name);

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
      roles,
      permissions: this.rbacService.getPermissions(roles),
    };
  }
}
