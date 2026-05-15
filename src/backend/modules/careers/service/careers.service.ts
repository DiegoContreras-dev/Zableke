import { AuthError } from "@/backend/common/errors/auth.error";
import { CareersRepository } from "../repository/careers.repository";
import type { CreateCareerInput, UpdateCareerInput, CareerRecord } from "../dto/career.dto";
import { prisma } from "@/infrastructure/prisma/client";

export class CareersService {
  private repo = new CareersRepository();

  async getCareers(): Promise<CareerRecord[]> {
    return this.repo.findAll();
  }

  async getCareerById(id: string): Promise<CareerRecord> {
    const career = await this.repo.findById(id);
    if (!career) throw new AuthError("Career not found", "RESOURCE_NOT_FOUND", 404);
    return career;
  }

  async createCareer(input: CreateCareerInput): Promise<CareerRecord> {
    const existing = await this.repo.findByName(input.name.trim());
    if (existing) {
      throw new AuthError(`La carrera '${input.name}' ya existe`, "INVALID_INPUT", 400);
    }
    return this.repo.create({
      name: input.name.trim(),
      schoolName: input.schoolName.trim()
    });
  }

  async updateCareer(id: string, input: UpdateCareerInput): Promise<CareerRecord> {
    const oldCareer = await this.getCareerById(id);
    const newName = input.name?.trim();
    const newSchoolName = input.schoolName?.trim();

    if (newName && newName !== oldCareer.name) {
      const existing = await this.repo.findByName(newName);
      if (existing) {
        throw new AuthError(`La carrera '${newName}' ya existe`, "INVALID_INPUT", 400);
      }
    }

    const updated = await this.repo.update(id, {
      name: newName,
      schoolName: newSchoolName
    });

    // Handle cascading updates if the name changed
    if (newName && newName !== oldCareer.name) {
      await this.handleCareerNameChange(oldCareer.name, newName);
    }

    return updated;
  }

  async deleteCareer(id: string): Promise<boolean> {
    const career = await this.getCareerById(id);
    
    // Step 1: Remove this career from all offerings
    const affectedOfferings = await prisma.tutoringOffering.findMany({
      where: { targetCareers: { has: career.name } }
    });

    for (const offering of affectedOfferings) {
      const newTargets = offering.targetCareers.filter(c => c !== career.name);
      if (newTargets.length === 0) {
        // Option B edge case: Delete offering if it has no more careers
        await prisma.tutoringOffering.delete({ where: { id: offering.id } });
      } else {
        await prisma.tutoringOffering.update({
          where: { id: offering.id },
          data: { targetCareers: newTargets }
        });
      }
    }

    // Step 2: Delete enrollments related to this career
    await prisma.enrollment.deleteMany({
      where: { studentCareer: career.name }
    });

    // Step 3: Delete the career itself
    return this.repo.delete(id);
  }

  private async handleCareerNameChange(oldName: string, newName: string) {
    // 1. Update targetCareers arrays in TutoringOffering
    const affectedOfferings = await prisma.tutoringOffering.findMany({
      where: { targetCareers: { has: oldName } }
    });

    for (const offering of affectedOfferings) {
      const newTargets = offering.targetCareers.map(c => c === oldName ? newName : c);
      await prisma.tutoringOffering.update({
        where: { id: offering.id },
        data: { targetCareers: newTargets }
      });
    }

    // 2. Update Enrollments
    await prisma.enrollment.updateMany({
      where: { studentCareer: oldName },
      data: { studentCareer: newName }
    });
  }
}
