import { ApolloClient, ApolloLink, HttpLink, InMemoryCache } from "@apollo/client";
import { getSessionToken } from "@/frontend/modules/auth/services/session";

function createAuthLink(): ApolloLink {
  return new ApolloLink((operation, forward) => {
    const token = getSessionToken();
    if (token) {
      operation.setContext(({ headers = {} }: Record<string, unknown>) => ({
        headers: {
          ...(headers as Record<string, string>),
          authorization: `Bearer ${token}`,
        },
      }));
    }
    return forward(operation);
  });
}

let client: ApolloClient | null = null;

export function getApolloClient(): ApolloClient {
  if (!client) {
    client = new ApolloClient({
      link: ApolloLink.from([
        createAuthLink(),
        new HttpLink({ uri: "/api/graphql" }),
      ]),
      cache: new InMemoryCache(),
    });
  }
  return client;
}
