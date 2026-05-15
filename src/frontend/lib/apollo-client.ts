import { ApolloClient, ApolloLink, HttpLink, InMemoryCache } from "@apollo/client";

/**
 * Apollo Client configured for HttpOnly cookie-based authentication.
 * The session cookie is sent automatically by the browser on same-origin
 * requests (credentials: "same-origin"), so no Authorization header is needed.
 */

let client: ApolloClient | null = null;

export function getApolloClient(): ApolloClient {
  if (!client) {
    client = new ApolloClient({
      link: ApolloLink.from([
        new HttpLink({
          uri: "/api/graphql",
          credentials: "same-origin", // sends HttpOnly cookies automatically
        }),
      ]),
      cache: new InMemoryCache(),
    });
  }
  return client;
}
