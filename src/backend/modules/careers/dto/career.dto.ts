export interface CreateCareerInput {
  name: string;
  schoolName: string;
  color?: string | null;
}

export interface UpdateCareerInput {
  name?: string;
  schoolName?: string;
  color?: string | null;
}

export interface CareerRecord {
  id: string;
  name: string;
  schoolName: string;
  color: string | null;
  createdAt: Date;
  updatedAt: Date;
}
