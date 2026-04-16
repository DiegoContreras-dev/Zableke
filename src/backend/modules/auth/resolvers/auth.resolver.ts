import { AuthService } from "@/backend/modules/auth/service/auth.service";

const authService = new AuthService();

export const authTypeDefs = `
  type AuthUser {
    id: ID!
    email: String!
    firstName: String!
    lastName: String!
    isActive: Boolean!
    roles: [String!]!
  }

  type AuthSession {
    user: AuthUser!
    token: String!
    issuedAt: String!
    expiresAt: String!
  }

  input LoginWithEmailInput {
    email: String!
    firstName: String
    lastName: String
  }

  extend type Mutation {
    authenticateWithEmail(input: LoginWithEmailInput!): AuthSession!
    authenticateWithGoogle(idToken: String!): AuthSession!
  }
`;

export const authResolvers = {
  Mutation: {
    authenticateWithEmail: async (
      _: unknown,
      args: { input: unknown }
    ) => authService.authenticate(args.input),
    authenticateWithGoogle: async (
      _: unknown,
      args: { idToken: string }
    ) => authService.authenticateWithGoogle(args.idToken),
  },
};
