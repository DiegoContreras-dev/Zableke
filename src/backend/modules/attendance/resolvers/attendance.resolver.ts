import { requirePermission, requireUser } from "@/backend/common/guards/role.guard";
import { AttendanceService } from "@/backend/modules/attendance/service/attendance.service";
import type { GraphQLContext } from "@/graphql/context";

const attendanceService = new AttendanceService();

export const attendanceTypeDefs = `
  type AttendanceRecord {
    id: ID!
    scheduleId: String!
    studentEmail: String!
    studentName: String
    status: String!
    markedById: String!
    markedAt: String!
    notes: String
  }

  type AttendanceHistoryItem {
    id: ID!
    scheduleId: String!
    scheduleTitle: String!
    scheduleDescription: String
    scheduleStartsAt: String!
    scheduleEndsAt: String!
    scheduleStatus: String!
    roomName: String
    studentEmail: String!
    studentName: String
    status: String!
    markedById: String!
    markedAt: String!
    notes: String
  }

  input StudentAttendanceInput {
    studentEmail: String!
    studentName: String
    status: String!
    notes: String
  }

  input BulkAttendanceInput {
    scheduleId: String!
    attendances: [StudentAttendanceInput!]!
  }

  extend type Query {
    attendancesBySchedule(scheduleId: ID!): [AttendanceRecord!]!
    myAttendanceHistory: [AttendanceHistoryItem!]!
  }

  extend type Mutation {
    recordBulkAttendance(input: BulkAttendanceInput!): [AttendanceRecord!]!
  }
`;

export const attendanceResolvers = {
  Query: {
    attendancesBySchedule: async (
      _: unknown,
      args: { scheduleId: string },
      context: GraphQLContext
    ) => {
      requireUser(context.currentUser);
      return attendanceService.getAttendancesBySchedule(args.scheduleId);
    },

    myAttendanceHistory: async (
      _: unknown,
      __: unknown,
      context: GraphQLContext
    ) => {
      const user = requireUser(context.currentUser);
      return attendanceService.getMyAttendanceHistory(user.id);
    },
  },
  Mutation: {
    recordBulkAttendance: async (
      _: unknown,
      args: { input: unknown },
      context: GraphQLContext
    ) => {
      const user = requireUser(context.currentUser);
      requirePermission(context.currentUser, "WRITE_OWN_SCHEDULES");
      return attendanceService.recordBulkAttendance(args.input, user.id);
    },
  },
};
