import { prisma } from "@/infrastructure/prisma/client";
import type { CreateCareerInput, UpdateCareerInput, CareerRecord } from "../dto/career.dto";

export class CareersRepository {
  async findAll(): Promise<CareerRecord[]> {
    return prisma.career.findMany({
      orderBy: { name: 'asc' }
    });
  }

  async findById(id: string): Promise<CareerRecord | null> {
    return prisma.career.findUnique({
      where: { id }
    });
  }

  async findByName(name: string): Promise<CareerRecord | null> {
    return prisma.career.findUnique({
      where: { name }
    });
  }

  async create(input: CreateCareerInput): Promise<CareerRecord> {
    return prisma.career.create({
      data: {
        name: input.name,
        schoolName: input.schoolName
      }
    });
  }

  async update(id: string, input: UpdateCareerInput): Promise<CareerRecord> {
    return prisma.career.update({
      where: { id },
      data: input
    });
  }

  async delete(id: string): Promise<boolean> {
    await prisma.career.delete({
      where: { id }
    });
    return true;
  }
}
