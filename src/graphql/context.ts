import type { NextRequest } from "next/server";

import { ensurePrismaConnected, prisma } from "@/infrastructure/prisma/client";

export interface GraphQLContext {
  prisma: typeof prisma;
  requestId: string;
  ip: string | null;
  userAgent: string | null;
}

export async function createContext(
  request?: Pick<NextRequest, "headers">
): Promise<GraphQLContext> {
  await ensurePrismaConnected();

  return {
    prisma,
    requestId: crypto.randomUUID(),
    ip: request?.headers?.get("x-forwarded-for") ?? null,
    userAgent: request?.headers?.get("user-agent") ?? null,
  };
}
