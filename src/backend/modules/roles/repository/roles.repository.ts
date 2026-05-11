import { prisma } from "@/infrastructure/prisma/client";
import type { Prisma, PrismaClient } from "@prisma/client";

type PrismaLike = Pick<PrismaClient, "user" | "role" | "userRole">;

export type UserWithRolesRecord = Prisma.UserGetPayload<{
  include: {
    roles: {
      include: {
        role: true;
      };
    };
  };
}>;

export class RolesRepository {
  constructor(private readonly prismaClient: PrismaLike = prisma) {}

  async findUserByEmail(email: string): Promise<UserWithRolesRecord | null> {
    return this.prismaClient.user.findUnique({
      where: { email },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });
  }

  async listUsersWithRoles(): Promise<UserWithRolesRecord[]> {
    return this.prismaClient.user.findMany({
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });
  }

  async findRoleByName(name: string): Promise<{ id: string; name: string } | null> {
    return this.prismaClient.role.findUnique({
      where: { name },
      select: { id: true, name: true },
    });
  }

  async assignRoleToUser(userId: string, roleId: string): Promise<void> {
    await this.prismaClient.userRole.upsert({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
      update: {},
      create: {
        userId,
        roleId,
      },
    });
  }

  async removeRoleFromUser(userId: string, roleId: string): Promise<void> {
    await this.prismaClient.userRole.deleteMany({
      where: {
        userId,
        roleId,
      },
    });
  }
}
