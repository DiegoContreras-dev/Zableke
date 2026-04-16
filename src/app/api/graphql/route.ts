import { ApolloServer } from "@apollo/server";
import { startServerAndCreateNextHandler } from "@as-integrations/next";
import { NextRequest, NextResponse } from "next/server";

import { authResolvers, authTypeDefs } from "@/backend/modules/auth/resolvers/auth.resolver";
import { rolesResolvers, rolesTypeDefs } from "@/backend/modules/roles/resolvers/roles.resolver";
import { schedulesResolvers, schedulesTypeDefs } from "@/backend/modules/schedules/resolvers/schedules.resolver";
import { usersResolvers, usersTypeDefs } from "@/backend/modules/users/resolvers/users.resolver";
import { attendanceResolvers, attendanceTypeDefs } from "@/backend/modules/attendance/resolvers/attendance.resolver";
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
`;

const resolvers = {
  Query: {
    health: () => "ok",
    ...rolesResolvers.Query,
    ...schedulesResolvers.Query,
    ...usersResolvers.Query,
    ...attendanceResolvers.Query,
  },
  Mutation: {
    ...authResolvers.Mutation,
    ...rolesResolvers.Mutation,
    ...schedulesResolvers.Mutation,
    ...usersResolvers.Mutation,
    ...attendanceResolvers.Mutation,
  },
};

const server = new ApolloServer<GraphQLContext>({ typeDefs, resolvers });

const graphqlHandler = startServerAndCreateNextHandler<NextRequest, GraphQLContext>(server, {
  context: async (req: NextRequest) => createContext(req),
});

export async function POST(request: NextRequest) {
  return graphqlHandler(request);
}

export async function GET() {
  return NextResponse.json({
    message: "GraphQL endpoint operativo. Usa POST para queries/mutations.",
    path: "/api/graphql",
  });
}
