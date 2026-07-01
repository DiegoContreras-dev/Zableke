import { requirePermission, requireUser } from "@/backend/common/guards/role.guard";
import type { GraphQLContext } from "@/graphql/context";
import { CareersService } from "../service/careers.service";
import type { CreateCareerInput, UpdateCareerInput } from "../dto/career.dto";

const careersService = new CareersService();

export const careersTypeDefs = `
  type Career {
    id: ID!
    name: String!
    schoolName: String!
    color: String
    createdAt: String!
    updatedAt: String!
  }

  input CreateCareerInput {
    name: String!
    schoolName: String!
    color: String
  }

  input UpdateCareerInput {
    name: String
    schoolName: String
    color: String
  }

  extend type Query {
    careers: [Career!]!
    career(id: ID!): Career!
  }

  extend type Mutation {
    createCareer(input: CreateCareerInput!): Career!
    updateCareer(id: ID!, input: UpdateCareerInput!): Career!
    deleteCareer(id: ID!): Boolean!
  }
`;

export const careersResolvers = {
  Query: {
    careers: async (_: unknown, __: unknown, context: GraphQLContext) => {
      requireUser(context.currentUser);
      return careersService.getCareers();
    },

    career: async (_: unknown, args: { id: string }, context: GraphQLContext) => {
      requireUser(context.currentUser);
      return careersService.getCareerById(args.id);
    },
  },

  Mutation: {
    createCareer: async (
      _: unknown,
      args: { input: CreateCareerInput },
      context: GraphQLContext
    ) => {
      requirePermission(context.currentUser, "MANAGE_OFFERINGS");
      return careersService.createCareer(args.input);
    },

    updateCareer: async (
      _: unknown,
      args: { id: string; input: UpdateCareerInput },
      context: GraphQLContext
    ) => {
      requirePermission(context.currentUser, "MANAGE_OFFERINGS");
      return careersService.updateCareer(args.id, args.input);
    },

    deleteCareer: async (_: unknown, args: { id: string }, context: GraphQLContext) => {
      requirePermission(context.currentUser, "MANAGE_OFFERINGS");
      return careersService.deleteCareer(args.id);
    },
  },
};
