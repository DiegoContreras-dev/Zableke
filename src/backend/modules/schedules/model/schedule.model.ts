export interface ScheduleView {
  id: string;
  tutorId: string;
  roomId: string;
  roomName: string | null;
  createdById: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConflictInfo {
  conflictingScheduleId: string;
  conflictType: "TUTOR_OVERLAP" | "ROOM_OVERLAP";
  overlappingStart: string;
  overlappingEnd: string;
}
