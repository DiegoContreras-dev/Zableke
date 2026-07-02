export interface EnrollmentView {
  id: string;
  slotId: string;
  offeringId: string;
  studentEmail: string;
  studentName: string;
  studentRut: string | null;
  studentCareer: string | null;
  studentPhone: string | null;
  source: string;
  googleFormResponseId: string | null;
  enrolledAt: string;
}

export interface SlotView {
  id: string;
  offeringId: string;
  offeringName: string;
  tutorId: string;
  tutorName: string;
  tutorEmail: string;
  roomName: string | null;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  maxCapacity: number;
  enrolledCount: number;
}

export interface OfferingView {
  id: string;
  name: string;
  semester: string;
  status: string;
  slotsCount: number;
  enrollmentsCount: number;
  targetCareers: string[];
  googleFormQuestionId: string | null;
  createdAt: string;
  updatedAt: string;
  slots: SlotView[];
}

export interface GoogleFormLinkView {
  formUrl: string;
  formEditUrl: string | null;
}

export interface GoogleFormLinkFullView {
  id: string;
  semester: string;
  formId: string;
  formUrl: string;
  formEditUrl: string | null;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SyncResultView {
  newEnrollments: number;
  skipped: number;
  errors: string[];
}

export interface StudentAttendanceStatusView {
  studentEmail: string;
  studentName: string;
  studentPhone: string | null;
  status: string;
}

export interface SlotAttendanceView {
  scheduleId: string;
  students: StudentAttendanceStatusView[];
}

export interface TutorOptionView {
  tutorId: string;
  userId: string;
  name: string;
  email: string;
}

export interface TutorStatView {
  tutorId: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  totalSlots: number;
  totalStudents: number;
  totalCapacity: number;
  fillRate: number;
  grade: number;
}
