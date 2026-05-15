export interface CreateCareerInput {
  name: string;
  schoolName: string;
}

export interface UpdateCareerInput {
  name?: string;
  schoolName?: string;
}

export interface CareerRecord {
  id: string;
  name: string;
  schoolName: string;
  createdAt: Date;
  updatedAt: Date;
}
