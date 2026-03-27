// GraphQL Context
// Provee acceso a Prisma client, usuario autenticado, etc. a todos los resolvers

// import { prisma } from "@/infrastructure/prisma/client";
// import { getServerSession } from "next-auth";

export interface GraphQLContext {
  // prisma: typeof prisma;
  // user?: { id: string; email: string; role: string };
}

export async function createContext(): Promise<GraphQLContext> {
  // TODO: Inyectar prisma client y sesión del usuario
  return {};
}
