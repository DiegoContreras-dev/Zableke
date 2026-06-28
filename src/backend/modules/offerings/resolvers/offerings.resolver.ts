import { requirePermission, requireUser } from "@/backend/common/guards/role.guard";
import { OfferingsService } from "@/backend/modules/offerings/service/offerings.service";
import type { GraphQLContext } from "@/graphql/context";

const offeringsService = new OfferingsService();

export const offeringsTypeDefs = `
  type TutoringOffering {
    id: ID!
    name: String!
    semester: String!
    status: String!
    slotsCount: Int!
    enrollmentsCount: Int!
    targetCareers: [String!]!
    googleFormQuestionId: String
    createdAt: String!
    updatedAt: String!
    slots: [TutoringSlot!]!
  }

  type TutoringSlot {
    id: ID!
    offeringId: String!
    offeringName: String!
    tutorId: String!
    tutorName: String!
    tutorEmail: String!
    roomName: String
    dayOfWeek: String!
    startTime: String!
    endTime: String!
    maxCapacity: Int!
    enrolledCount: Int!
  }

  type EnrollmentRecord {
    id: ID!
    slotId: String!
    offeringId: String!
    studentEmail: String!
    studentName: String!
    studentRut: String
    studentCareer: String
    studentPhone: String
    source: String!
    googleFormResponseId: String
    enrolledAt: String!
  }

  type GoogleFormResult {
    formUrl: String!
    formEditUrl: String
  }

  type SyncResult {
    newEnrollments: Int!
    skipped: Int!
    errors: [String!]!
  }

  type StudentAttendanceStatus {
    studentEmail: String!
    studentName: String!
    studentCareer: String
    studentPhone: String
    status: String!
  }

  type SlotAttendanceView {
    scheduleId: ID!
    students: [StudentAttendanceStatus!]!
  }

  type TutorOption {
    tutorId: ID!
    userId: String!
    name: String!
    email: String!
  }

  type TutorPerformanceStat {
    tutorId: ID!
    userId: String!
    name: String!
    email: String!
    totalSlots: Int!
    totalStudents: Int!
    totalCapacity: Int!
    fillRate: Float!
    grade: Float!
  }

  type CareerCount {
    career: String!
    count: Int!
  }

  type ReportStats {
    activeOfferingsCount: Int!
    closedOfferingsCount: Int!
    totalSlots: Int!
    totalStudents: Int!
    careerBreakdown: [CareerCount!]!
  }

  input CreateOfferingInput {
    name: String!
    semester: String
    targetCareers: [String!]
  }

  input UpdateOfferingInput {
    name: String
    status: String
    targetCareers: [String!]
  }

  input AddSlotInput {
    offeringId: ID!
    tutorId: String!
    dayOfWeek: String!
    startTime: String!
    endTime: String!
    maxCapacity: Int
    roomName: String
  }

  input CreateEnrollmentInput {
    slotId: ID!
    studentEmail: String!
    studentName: String!
    studentRut: String
    studentCareer: String
    studentPhone: String
    source: String
  }

  extend type Query {
    offerings(semester: String): [TutoringOffering!]!
    offering(id: ID!): TutoringOffering
    myTutoringSlots: [TutoringSlot!]!
    tutoringSlotsByTutor(tutorUserId: ID!): [TutoringSlot!]!
    enrolledStudents(slotId: ID!): [EnrollmentRecord!]!
    attendanceForSlot(slotId: ID!, date: String!): SlotAttendanceView!
    tutorOptions: [TutorOption!]!
    tutorStats: [TutorPerformanceStat!]!
    reportStats(semester: String): ReportStats!
    allEnrollments(semester: String): [EnrollmentRecord!]!
  }

  extend type Mutation {
    createOffering(input: CreateOfferingInput!): TutoringOffering!
    updateOffering(id: ID!, input: UpdateOfferingInput!): TutoringOffering!
    closeOffering(id: ID!): TutoringOffering!
    deleteOffering(id: ID!): Boolean!
    addSlotToOffering(input: AddSlotInput!): TutoringSlot!
    removeSlot(slotId: ID!): Boolean!
    createEnrollment(input: CreateEnrollmentInput!): EnrollmentRecord!
    removeEnrollment(enrollmentId: ID!): Boolean!
    generateGoogleForm(semester: String, existingFormId: String): GoogleFormResult!
    syncFormResponses(semester: String): SyncResult!
  }
`;

export const offeringsResolvers = {
  Query: {
    offerings: async (_: unknown, args: { semester?: string }, context: GraphQLContext) => {
      requireUser(context.currentUser);
      return offeringsService.getOfferingsBySemester(args.semester);
    },

    offering: async (_: unknown, args: { id: string }, context: GraphQLContext) => {
      requireUser(context.currentUser);
      return offeringsService.getOfferingById(args.id);
    },

    myTutoringSlots: async (_: unknown, __: unknown, context: GraphQLContext) => {
      const user = requirePermission(context.currentUser, "READ_OWN_SCHEDULES");
      return offeringsService.getSlotsByTutor(user.id);
    },

    tutoringSlotsByTutor: async (_: unknown, args: { tutorUserId: string }, context: GraphQLContext) => {
      requirePermission(context.currentUser, "MANAGE_TUTORS");
      return offeringsService.getSlotsByTutor(args.tutorUserId);
    },

    enrolledStudents: async (_: unknown, args: { slotId: string }, context: GraphQLContext) => {
      const user = requireUser(context.currentUser);
      return offeringsService.getEnrolledStudents(args.slotId, user);
    },

    attendanceForSlot: async (
      _: unknown,
      args: { slotId: string; date: string },
      context: GraphQLContext
    ) => {
      const user = requirePermission(context.currentUser, "WRITE_OWN_SCHEDULES");
      return offeringsService.getAttendanceForSlot(args.slotId, args.date, user);
    },

    tutorOptions: async (_: unknown, __: unknown, context: GraphQLContext) => {
      requirePermission(context.currentUser, "MANAGE_OFFERINGS");
      return offeringsService.getTutorOptions();
    },

    tutorStats: async (_: unknown, __: unknown, context: GraphQLContext) => {
      requirePermission(context.currentUser, "MANAGE_TUTORS");
      return offeringsService.getTutorStats();
    },

    reportStats: async (_: unknown, args: { semester?: string }, context: GraphQLContext) => {
      requirePermission(context.currentUser, "MANAGE_OFFERINGS");
      return offeringsService.getReportStats(args.semester);
    },

    allEnrollments: async (_: unknown, args: { semester?: string }, context: GraphQLContext) => {
      requirePermission(context.currentUser, "MANAGE_OFFERINGS");
      return offeringsService.getAllEnrollments(args.semester);
    },
  },

  Mutation: {
    createOffering: async (
      _: unknown,
      args: { input: unknown },
      context: GraphQLContext
    ) => {
      const user = requirePermission(context.currentUser, "MANAGE_OFFERINGS");
      return offeringsService.createOffering(args.input, user.id);
    },

    updateOffering: async (
      _: unknown,
      args: { id: string; input: unknown },
      context: GraphQLContext
    ) => {
      requirePermission(context.currentUser, "MANAGE_OFFERINGS");
      return offeringsService.updateOffering(args.id, args.input);
    },

    closeOffering: async (_: unknown, args: { id: string }, context: GraphQLContext) => {
      requirePermission(context.currentUser, "MANAGE_OFFERINGS");
      return offeringsService.closeOffering(args.id);
    },

    deleteOffering: async (_: unknown, args: { id: string }, context: GraphQLContext) => {
      requirePermission(context.currentUser, "MANAGE_OFFERINGS");
      return offeringsService.deleteOffering(args.id);
    },

    addSlotToOffering: async (
      _: unknown,
      args: { input: unknown },
      context: GraphQLContext
    ) => {
      requirePermission(context.currentUser, "MANAGE_OFFERINGS");
      return offeringsService.addSlot(args.input);
    },

    removeSlot: async (_: unknown, args: { slotId: string }, context: GraphQLContext) => {
      requirePermission(context.currentUser, "MANAGE_OFFERINGS");
      return offeringsService.removeSlot(args.slotId);
    },

    createEnrollment: async (
      _: unknown,
      args: { input: unknown },
      context: GraphQLContext
    ) => {
      requirePermission(context.currentUser, "MANAGE_OFFERINGS");
      return offeringsService.createEnrollment(args.input);
    },

    removeEnrollment: async (_: unknown, args: { enrollmentId: string }, context: GraphQLContext) => {
      requirePermission(context.currentUser, "MANAGE_OFFERINGS");
      return offeringsService.removeEnrollment(args.enrollmentId);
    },

    generateGoogleForm: async (
      _: unknown,
      args: { semester?: string; existingFormId?: string },
      context: GraphQLContext
    ) => {
      requirePermission(context.currentUser, "MANAGE_OFFERINGS");
      return offeringsService.generateGoogleForm(args.semester, args.existingFormId);
    },

    syncFormResponses: async (
      _: unknown,
      args: { semester?: string },
      context: GraphQLContext
    ) => {
      requirePermission(context.currentUser, "MANAGE_OFFERINGS");
      return offeringsService.syncGoogleFormResponses(args.semester);
    },
  },
};
