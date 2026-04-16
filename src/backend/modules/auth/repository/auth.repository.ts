import { prisma } from "@/infrastructure/prisma/client";
import type { Prisma, PrismaClient } from "@prisma/client";

type PrismaLike = Pick<PrismaClient, "user" | "role" | "userRole">;

export type AuthUserRecord = Prisma.UserGetPayload<{
  include: {
    roles: {
      include: {
        role: true;
      };
    };
  };
}>;

export interface CreateAuthUserInput {
  email: string;
  firstName: string;
  lastName: string;
  /** Nombre del rol a asignar automáticamente (ej: "TUTOR", "ADMIN") */
  roleName?: string;
}

export class AuthRepository {
  constructor(private readonly prismaClient: PrismaLike = prisma) {}

  async findByEmail(email: string): Promise<AuthUserRecord | null> {
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

  async create(data: CreateAuthUserInput): Promise<AuthUserRecord> {
    const user = await this.prismaClient.user.create({
      data: {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (data.roleName) {
      const role = await this.prismaClient.role.findUnique({
        where: { name: data.roleName },
      });
      if (role) {
        await this.prismaClient.userRole.create({
          data: { userId: user.id, roleId: role.id },
        });
        // Re-fetch with roles populated
        return this.prismaClient.user.findUniqueOrThrow({
          where: { id: user.id },
          include: { roles: { include: { role: true } } },
        }) as Promise<AuthUserRecord>;
      }
    }

    return user;
  }
}
