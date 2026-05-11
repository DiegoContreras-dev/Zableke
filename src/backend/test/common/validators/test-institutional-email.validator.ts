import assert from "node:assert/strict";
import test from "node:test";

import {
  getEmailDomain,
  normalizeEmail,
  validateInstitutionalEmail,
} from "@/backend/common/validators/institutional-email.validator";

test("normalizeEmail trims and lowercases", () => {
  assert.equal(normalizeEmail("  USER@UCN.CL "), "user@ucn.cl");
});

test("getEmailDomain extracts domain", () => {
  assert.equal(getEmailDomain("name@ucn.cl"), "ucn.cl");
  assert.equal(getEmailDomain("invalid"), null);
});

test("validateInstitutionalEmail accepts allowed domains", () => {
  const result = validateInstitutionalEmail("tutor@ucn.cl", ["ucn.cl"]);

  assert.equal(result.ok, true);
  assert.equal(result.domain, "ucn.cl");
});

test("validateInstitutionalEmail rejects disallowed domains", () => {
  const result = validateInstitutionalEmail("test@gmail.com", ["ucn.cl"]);

  assert.equal(result.ok, false);
  assert.equal(result.domain, "gmail.com");
});
