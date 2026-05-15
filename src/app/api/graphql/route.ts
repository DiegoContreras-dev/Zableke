import { ApolloServer } from "@apollo/server";
import { startServerAndCreateNextHandler } from "@as-integrations/next";
import { NextRequest, NextResponse } from "next/server";

import { authResolvers, authTypeDefs } from "@/backend/modules/auth/resolvers/auth.resolver";
import { rolesResolvers, rolesTypeDefs } from "@/backend/modules/roles/resolvers/roles.resolver";
import { schedulesResolvers, schedulesTypeDefs } from "@/backend/modules/schedules/resolvers/schedules.resolver";
import { usersResolvers, usersTypeDefs } from "@/backend/modules/users/resolvers/users.resolver";
import { attendanceResolvers, attendanceTypeDefs } from "@/backend/modules/attendance/resolvers/attendance.resolver";
import { offeringsResolvers, offeringsTypeDefs } from "@/backend/modules/offerings/resolvers/offerings.resolver";
import { careersResolvers, careersTypeDefs } from "@/backend/modules/careers/resolvers/careers.resolver";
import { createContext, type GraphQLContext } from "@/graphql/context";

const typeDefs = `
  type Query {
    health: String!
  }

  type Mutation {
    _noop: Boolean
  }

  ${authTypeDefs}
  ${rolesTypeDefs}
  ${schedulesTypeDefs}
  ${usersTypeDefs}
  ${attendanceTypeDefs}
  ${offeringsTypeDefs}
  ${careersTypeDefs}
`;

const resolvers = {
  Query: {
    health: () => "ok",
    ...rolesResolvers.Query,
    ...schedulesResolvers.Query,
    ...usersResolvers.Query,
    ...attendanceResolvers.Query,
    ...offeringsResolvers.Query,
    ...careersResolvers.Query,
  },
  Mutation: {
    ...authResolvers.Mutation,
    ...rolesResolvers.Mutation,
    ...schedulesResolvers.Mutation,
    ...usersResolvers.Mutation,
    ...attendanceResolvers.Mutation,
    ...offeringsResolvers.Mutation,
    ...careersResolvers.Mutation,
  },
};

const server = new ApolloServer<GraphQLContext>({ typeDefs, resolvers });

const graphqlHandler = startServerAndCreateNextHandler<NextRequest, GraphQLContext>(server, {
  context: async (req: NextRequest) => createContext(req),
});

const ALLOWED_ORIGINS = [
  "http://localhost",
  "http://localhost:3000",
  "http://zableke.duckdns.org",
  "http://172.16.13.103",
  "http://172.16.13.103:3000"
];

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const response = await graphqlHandler(request);
  const headers = corsHeaders(origin);
  Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
  return response;
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  const response = NextResponse.json({
    message: "GraphQL endpoint operativo. Usa POST para queries/mutations.",
    path: "/api/graphql",
  });
  const headers = corsHeaders(origin);
  Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
  return response;
}
