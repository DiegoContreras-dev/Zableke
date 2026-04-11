import { prisma } from "@/infrastructure/prisma/client";
import type { Prisma, PrismaClient } from "@prisma/client";

type PrismaLike = Pick<PrismaClient, "user">;

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
    return this.prismaClient.user.create({
      data,
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });
  }
}
