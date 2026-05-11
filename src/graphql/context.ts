import type { NextRequest } from "next/server";
import { verifyToken } from "@/backend/common/utils/jwt";
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

  let currentUser: CurrentUserContext | null = null;

  const authHeader = request?.headers?.get("authorization") ?? null;
  const token =
    authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

  if (token) {
    const payload = await verifyToken(token);
    if (payload?.sub && payload.email) {
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        include: { roles: { include: { role: true } } },
      });
      if (user?.isActive) {
        currentUser = {
          id: user.id,
          email: user.email,
          roles: user.roles.map((item) => item.role.name),
        };
      }
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
