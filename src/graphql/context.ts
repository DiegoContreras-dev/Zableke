import type { NextRequest } from "next/server";

import { ensurePrismaConnected, prisma } from "@/infrastructure/prisma/client";

interface CurrentUserContext {
  id: string;
  email: string;
  roles: string[];
}

export interface GraphQLContext {
  prisma: typeof prisma;
  requestId: string;
  ip: string | null;
  userAgent: string | null;
  currentUser: CurrentUserContext | null;
}

export async function createContext(
  request?: Pick<NextRequest, "headers">
): Promise<GraphQLContext> {
  await ensurePrismaConnected();

  const currentUserEmailHeader = request?.headers?.get("x-user-email")?.trim().toLowerCase() ?? null;

  let currentUser: CurrentUserContext | null = null;
  if (currentUserEmailHeader) {
    const user = await prisma.user.findUnique({
      where: { email: currentUserEmailHeader },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (user && user.isActive) {
      currentUser = {
        id: user.id,
        email: user.email,
        roles: user.roles.map((item) => item.role.name),
      };
    }
  }

  return {
    prisma,
    requestId: crypto.randomUUID(),
    ip: request?.headers?.get("x-forwarded-for") ?? null,
    userAgent: request?.headers?.get("user-agent") ?? null,
    currentUser,
  };
}
