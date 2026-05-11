import assert from "node:assert/strict";
import test from "node:test";

import { AuthError } from "@/backend/common/errors/auth.error";
import { parseLoginWithEmailInput } from "@/backend/modules/auth/dto/login-with-email.dto";

test("parseLoginWithEmailInput parses valid payload", () => {
  const result = parseLoginWithEmailInput({
    email: "tutor@ucn.cl",
    firstName: "Diego",
    lastName: "Contreras",
  });

  assert.equal(result.email, "tutor@ucn.cl");
  assert.equal(result.firstName, "Diego");
  assert.equal(result.lastName, "Contreras");
});

test("parseLoginWithEmailInput throws when email is missing", () => {
  assert.throws(
    () => parseLoginWithEmailInput({ firstName: "NoEmail" }),
    (error) => error instanceof AuthError && error.code === "INVALID_INPUT"
  );
});
