import { requirePermission, requireRole, requireUser } from "@/backend/common/guards/role.guard";
import { UsersService } from "@/backend/modules/users/service/users.service";
import type { GraphQLContext } from "@/graphql/context";

const usersService = new UsersService();

export const usersTypeDefs = `
  type UserProfile {
    id: ID!
    email: String!
    firstName: String!
    lastName: String!
    phone: String
    bio: String
    linkedinUrl: String
    roles: [String!]!
    isActive: Boolean!
  }

  input UpdateProfileInput {
    firstName: String
    lastName: String
    phone: String
    bio: String
    linkedinUrl: String
  }

  input CreateTutorInput {
    firstName: String!
    lastName: String!
    rut: String!
    email: String!
    career: String!
    entryYear: Int!
    subject: String!
  }

  input UpdateUserAsAdminInput {
    firstName: String
    lastName: String
    phone: String
    career: String
  }

  extend type Query {
    me: UserProfile!
  }

  extend type Mutation {
    updateMyProfile(input: UpdateProfileInput!): UserProfile!
    deleteUser(id: ID!): Boolean!
    createTutor(input: CreateTutorInput!): UserProfile!
    adminUpdateUser(id: ID!, input: UpdateUserAsAdminInput!): UserProfile!
  }
`;

export const usersResolvers = {
  Query: {
    me: async (_: unknown, __: unknown, context: GraphQLContext) => {
      const user = requireUser(context.currentUser);
      return usersService.getMe(user.id);
    },
  },
  Mutation: {
    updateMyProfile: async (
      _: unknown,
      args: { input: unknown },
      context: GraphQLContext
    ) => {
      const user = requireUser(context.currentUser);
      return usersService.updateMyProfile(user.id, args.input);
    },
    deleteUser: async (
      _: unknown,
      args: { id: string },
      context: GraphQLContext
    ) => {
      requireRole(context.currentUser, ["ADMIN"]);
      return usersService.deleteUser(args.id);
    },
    createTutor: async (
      _: unknown,
      args: { input: unknown },
      context: GraphQLContext
    ) => {
      requirePermission(context.currentUser, "MANAGE_TUTORS");
      return usersService.createTutor(args.input);
    },
    adminUpdateUser: async (
      _: unknown,
      args: { id: string; input: unknown },
      context: GraphQLContext
    ) => {
      requireRole(context.currentUser, ["ADMIN"]);
      return usersService.adminUpdateUser(args.id, args.input);
    },
  },
};
