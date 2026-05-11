import { prisma } from "@/infrastructure/prisma/client";
import type { Prisma } from "@prisma/client";

export type UserRecord = Prisma.UserGetPayload<{
  include: { roles: { include: { role: true } } };
}>;

export interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
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

  async deleteById(id: string): Promise<void> {
    await prisma.user.delete({ where: { id } });
  }
}
