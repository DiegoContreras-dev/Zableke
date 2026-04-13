"use client";

import { ApolloProvider } from "@apollo/client/react";
import { getApolloClient } from "@/frontend/lib/apollo-client";

export default function ApolloWrapper({ children }: { children: React.ReactNode }) {
  return <ApolloProvider client={getApolloClient()}>{children}</ApolloProvider>;
}
