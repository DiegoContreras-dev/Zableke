import assert from "node:assert/strict";
import test from "node:test";

import { AuthError } from "@/backend/common/errors/auth.error";

test("AuthError stores code and status", () => {
  const error = new AuthError("forbidden", "EMAIL_NOT_ALLOWED", 403);

  assert.equal(error.name, "AuthError");
  assert.equal(error.message, "forbidden");
  assert.equal(error.code, "EMAIL_NOT_ALLOWED");
  assert.equal(error.statusCode, 403);
});
