import { ApolloServer } from "@apollo/server";
import { startServerAndCreateNextHandler } from "@as-integrations/next";
import { NextRequest, NextResponse } from "next/server";

import { createContext } from "@/graphql/context";

const typeDefs = `
  type Query {
    health: String!
  }
`;

const resolvers = {
  Query: {
    health: () => "ok",
  },
};

const server = new ApolloServer({ typeDefs, resolvers });

const graphqlHandler = startServerAndCreateNextHandler<NextRequest>(server, {
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
