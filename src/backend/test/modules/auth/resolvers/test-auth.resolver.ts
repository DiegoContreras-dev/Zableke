import assert from "node:assert/strict";
import test from "node:test";

import { authResolvers, authTypeDefs } from "@/backend/modules/auth/resolvers/auth.resolver";

test("authTypeDefs includes authenticateWithEmail mutation", () => {
  assert.ok(authTypeDefs.includes("authenticateWithEmail"));
});

test("authResolvers exposes Mutation.authenticateWithEmail", () => {
  assert.equal(typeof authResolvers.Mutation.authenticateWithEmail, "function");
});
