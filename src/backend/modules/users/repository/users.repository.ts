import { prisma } from "@/infrastructure/prisma/client";
import type { Prisma } from "@prisma/client";

export type UserRecord = Prisma.UserGetPayload<{
  include: { roles: { include: { role: true } } };
}>;

export interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  career?: string | null;
  bio?: string;
  linkedinUrl?: string;
}

export class UsersRepository {
  async findById(id: string): Promise<UserRecord | null> {
    return prisma.user.findUnique({
      where: { id },
      include: { roles: { include: { role: true } } },
    });
  }

  async updateProfile(id: string, data: UpdateProfileInput): Promise<UserRecord> {
    return prisma.user.update({
      where: { id },
      data,
      include: { roles: { include: { role: true } } },
    });
  }

  async adminUpdateUser(id: string, data: { firstName?: string; lastName?: string; phone?: string | null; career?: string | null }): Promise<UserRecord> {
    return prisma.user.update({
      where: { id },
      data,
      include: { roles: { include: { role: true } } },
    });
  }

  async deleteById(id: string): Promise<void> {
    await prisma.user.delete({ where: { id } });
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    return prisma.user.findUnique({
      where: { email },
      include: { roles: { include: { role: true } } },
    });
  }

  async createTutorUser(data: {
    firstName: string;
    lastName: string;
    rut: string;
    email: string;
    career: string;
    entryYear: number;
    tutorRoleId: string;
  }): Promise<UserRecord> {
    return prisma.user.create({
      data: {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        rut: data.rut,
        career: data.career,
        entryYear: data.entryYear,
        isActive: true,
        roles: {
          create: { roleId: data.tutorRoleId },
        },
        tutorProfile: {
          create: { isActive: true },
        },
      },
      include: { roles: { include: { role: true } } },
    });
  }
}
