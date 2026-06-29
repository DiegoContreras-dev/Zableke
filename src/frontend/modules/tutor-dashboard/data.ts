export type SessionStatus = "pendiente" | "en-curso" | "cerrada";

export type TodaySession = {
  id: string;
  attendanceHref?: string;
  course: string;
  section: string;
  room: string;
  modality: "Presencial" | "Online";
  slot: string;
  status: SessionStatus;
};

export type StudentAttendance = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  program: string;
  historicalAttendance: number;
  attendedClasses: number;
  totalClasses: number;
};
