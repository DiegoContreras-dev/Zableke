import { requirePermission, requireUser } from "@/backend/common/guards/role.guard";
import { SchedulesService } from "@/backend/modules/schedules/service/schedules.service";
import type { GraphQLContext } from "@/graphql/context";

const schedulesService = new SchedulesService();

export const schedulesTypeDefs = `
  type Schedule {
    id: ID!
    tutorId: String!
    roomId: String!
    roomName: String
    createdById: String!
    title: String!
    description: String
    startsAt: String!
    endsAt: String!
    status: String!
    createdAt: String!
    updatedAt: String!
  }

  input CreateScheduleInput {
    tutorId: String!
    roomId: String!
    title: String!
    description: String
    startsAt: String!
    endsAt: String!
  }

  input UpdateScheduleInput {
    id: ID!
    roomId: String
    title: String
    description: String
    startsAt: String
    endsAt: String
  }

  extend type Query {
    schedule(id: ID!): Schedule
    mySchedules: [Schedule!]!
    allSchedules: [Schedule!]!
  }

  extend type Mutation {
    createSchedule(input: CreateScheduleInput!): Schedule!
    updateSchedule(input: UpdateScheduleInput!): Schedule!
    cancelSchedule(id: ID!): Schedule!
  }
`;

export const schedulesResolvers = {
  Query: {
    schedule: async (_: unknown, args: { id: string }, context: GraphQLContext) => {
      requireUser(context.currentUser);
      return schedulesService.getSchedule(args.id);
    },

    mySchedules: async (_: unknown, __: unknown, context: GraphQLContext) => {
      const user = requireUser(context.currentUser);
      requirePermission(context.currentUser, "READ_OWN_SCHEDULES");
      // tutorId comes from the tutor profile; we pass the userId, service resolves
      return schedulesService.getSchedulesByTutor(user.id);
    },

    allSchedules: async (_: unknown, __: unknown, context: GraphQLContext) => {
      requirePermission(context.currentUser, "READ_ALL_SCHEDULES");
      return schedulesService.getAllSchedules();
    },
  },

  Mutation: {
    createSchedule: async (
      _: unknown,
      args: { input: unknown },
      context: GraphQLContext
    ) => {
      const user = requireUser(context.currentUser);
      requirePermission(context.currentUser, "WRITE_OWN_SCHEDULES");
      return schedulesService.createSchedule(args.input, user.id);
    },

    updateSchedule: async (
      _: unknown,
      args: { input: unknown },
      context: GraphQLContext
    ) => {
      requireUser(context.currentUser);
      requirePermission(context.currentUser, "WRITE_OWN_SCHEDULES");
      return schedulesService.updateSchedule(args.input);
    },

    cancelSchedule: async (
      _: unknown,
      args: { id: string },
      context: GraphQLContext
    ) => {
      requireUser(context.currentUser);
      requirePermission(context.currentUser, "WRITE_OWN_SCHEDULES");
      return schedulesService.cancelSchedule(args.id);
    },
  },
};
