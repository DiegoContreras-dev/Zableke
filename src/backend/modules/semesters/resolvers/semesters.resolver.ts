import { requirePermission, requireUser } from "@/backend/common/guards/role.guard";
import { SemestersService } from "@/backend/modules/semesters/service/semesters.service";
import type { GraphQLContext } from "@/graphql/context";

const service = new SemestersService();

export const semestersTypeDefs = `
  type AcademicSemester {
    code: ID!
    startDate: String!
    endDate: String!
    status: String!
    months: [Int!]!
    createdAt: String!
    updatedAt: String!
  }

  input CreateAcademicSemesterInput {
    code: String!
    startDate: String
    endDate: String
    months: [Int!]
  }

  extend type Query {
    semesters: [AcademicSemester!]!
    activeSemester: AcademicSemester!
  }

  extend type Mutation {
    createSemester(input: CreateAcademicSemesterInput!): AcademicSemester!
    activateSemester(code: String!): AcademicSemester!
  }
`;

export const semestersResolvers = {
  Query: {
    semesters: (_: unknown, __: unknown, context: GraphQLContext) => {
      requireUser(context.currentUser);
      return service.list();
    },
    activeSemester: (_: unknown, __: unknown, context: GraphQLContext) => {
      requireUser(context.currentUser);
      return service.active();
    },
  },
  Mutation: {
    createSemester: (
      _: unknown,
      args: { input: { code?: string; startDate?: string; endDate?: string; months?: number[] } },
      context: GraphQLContext,
    ) => {
      requirePermission(context.currentUser, "MANAGE_OFFERINGS");
      return service.create(args.input);
    },
    activateSemester: (_: unknown, args: { code: string }, context: GraphQLContext) => {
      requirePermission(context.currentUser, "MANAGE_OFFERINGS");
      return service.activate(args.code);
    },
  },
};
