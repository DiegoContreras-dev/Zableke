import { requireUser } from "@/backend/common/guards/role.guard";
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

  extend type Query {
    me: UserProfile!
  }

  extend type Mutation {
    updateMyProfile(input: UpdateProfileInput!): UserProfile!
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
  },
};
