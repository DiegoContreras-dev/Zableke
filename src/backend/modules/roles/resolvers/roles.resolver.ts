import { requirePermission, requireUser } from "@/backend/common/guards/role.guard";
import { RbacService } from "@/backend/modules/roles/service/rbac.service";
import {
  RolesManagementService,
  type CurrentUserAccess,
} from "@/backend/modules/roles/service/roles-management.service";
import type { GraphQLContext } from "@/graphql/context";

const rbacService = new RbacService();
const rolesManagementService = new RolesManagementService();

export const rolesTypeDefs = `
  type RoleAccessProfile {
    roles: [String!]!
    permissions: [String!]!
  }

  type UserAccess {
    id: ID!
    email: String!
    firstName: String!
    lastName: String!
    isActive: Boolean!
    roles: [String!]!
    permissions: [String!]!
  }

  extend type Query {
    roleAccessPreview(roles: [String!]!): RoleAccessProfile!
    myAccess: RoleAccessProfile!
    usersAccess: [UserAccess!]!
  }

  extend type Mutation {
    assignRoleToUser(email: String!, role: String!): UserAccess!
    removeRoleFromUser(email: String!, role: String!): UserAccess!
  }
`;

export const rolesResolvers = {
  Query: {
    roleAccessPreview: (_: unknown, args: { roles: string[] }) => {
      return rbacService.buildProfile(args.roles);
    },
    myAccess: (_: unknown, __: unknown, context: GraphQLContext) => {
      const user = requireUser(context.currentUser);

      return rolesManagementService.buildMyAccess(user as CurrentUserAccess);
    },
    usersAccess: async (_: unknown, __: unknown, context: GraphQLContext) => {
      requirePermission(context.currentUser, "READ_ALL_SCHEDULES");
      return rolesManagementService.listUsersAccess();
    },
  },
  Mutation: {
    assignRoleToUser: async (
      _: unknown,
      args: { email: string; role: string },
      context: GraphQLContext
    ) => {
      requirePermission(context.currentUser, "MANAGE_TUTORS");
      return rolesManagementService.assignRoleToUser(args.email, args.role);
    },
    removeRoleFromUser: async (
      _: unknown,
      args: { email: string; role: string },
      context: GraphQLContext
    ) => {
      requirePermission(context.currentUser, "MANAGE_TUTORS");
      return rolesManagementService.removeRoleFromUser(args.email, args.role);
    },
  },
};
