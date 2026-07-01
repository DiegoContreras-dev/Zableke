import assert from "node:assert/strict";
import test from "node:test";

import {
  decodeRolesFromToken,
  resolveRequiredRoleRedirect,
} from "@/frontend/modules/auth/services/session";

function makeToken(payload: Record<string, unknown>): string {
  const encode = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj)).toString("base64url");
  return `${encode({ alg: "HS256" })}.${encode(payload)}.signature`;
}

test("decodeRolesFromToken returns roles array from a valid token", () => {
  const token = makeToken({ sub: "1", email: "a@ucn.cl", roles: ["ADMIN", "TUTOR"] });
  assert.deepEqual(decodeRolesFromToken(token), ["ADMIN", "TUTOR"]);
});

test("decodeRolesFromToken returns empty array when roles claim is missing", () => {
  const token = makeToken({ sub: "1", email: "a@ucn.cl" });
  assert.deepEqual(decodeRolesFromToken(token), []);
});

test("decodeRolesFromToken returns empty array for a malformed token", () => {
  assert.deepEqual(decodeRolesFromToken("not-a-jwt"), []);
});

test("decodeRolesFromToken returns empty array for invalid base64 payload", () => {
  assert.deepEqual(decodeRolesFromToken("header.###.signature"), []);
});

test("resolveRequiredRoleRedirect allows access when role matches", () => {
  assert.equal(resolveRequiredRoleRedirect(["ADMIN"], "ADMIN"), null);
});

test("resolveRequiredRoleRedirect sends tutor-only user to /tutor when ADMIN required", () => {
  assert.equal(resolveRequiredRoleRedirect(["TUTOR"], "ADMIN"), "/tutor");
});

test("resolveRequiredRoleRedirect sends admin-only user to /admin when TUTOR required", () => {
  assert.equal(resolveRequiredRoleRedirect(["ADMIN"], "TUTOR"), "/admin");
});

test("resolveRequiredRoleRedirect allows dual-role user into either shell", () => {
  assert.equal(resolveRequiredRoleRedirect(["ADMIN", "TUTOR"], "TUTOR"), null);
  assert.equal(resolveRequiredRoleRedirect(["ADMIN", "TUTOR"], "ADMIN"), null);
});

test("resolveRequiredRoleRedirect sends user with no roles to /login", () => {
  assert.equal(resolveRequiredRoleRedirect([], "ADMIN"), "/login");
});
