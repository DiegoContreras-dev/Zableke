export const SYSTEM_ROLES = ["ADMIN", "TUTOR"] as const;

export type SystemRole = (typeof SYSTEM_ROLES)[number];

export const RBAC_PERMISSIONS = [
  "READ_OWN_SCHEDULES",
  "WRITE_OWN_SCHEDULES",
  "READ_ALL_SCHEDULES",
  "WRITE_ALL_SCHEDULES",
  "MANAGE_TUTORS",
  "VIEW_AUDIT_LOGS",
] as const;

export type RbacPermission = (typeof RBAC_PERMISSIONS)[number];

export interface RoleAccessProfile {
  roles: SystemRole[];
  permissions: RbacPermission[];
}

export const ROLE_PERMISSIONS: Record<SystemRole, readonly RbacPermission[]> = {
  ADMIN: [
    "READ_OWN_SCHEDULES",
    "WRITE_OWN_SCHEDULES",
    "READ_ALL_SCHEDULES",
    "WRITE_ALL_SCHEDULES",
    "MANAGE_TUTORS",
    "VIEW_AUDIT_LOGS",
  ],
  TUTOR: ["READ_OWN_SCHEDULES", "WRITE_OWN_SCHEDULES"],
};
