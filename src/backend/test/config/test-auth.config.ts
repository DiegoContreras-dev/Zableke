import assert from "node:assert/strict";
import test from "node:test";

import { authConfig } from "@/backend/config/auth.config";

test("authConfig has default allowed domains", () => {
  assert.ok(authConfig.allowedDomains.includes("alumnos.ucn.cl"));
  assert.ok(authConfig.allowedDomains.includes("ce.ucn.cl"));
});

test("authConfig has positive session ttl", () => {
  assert.ok(authConfig.sessionTtlMinutes > 0);
});
