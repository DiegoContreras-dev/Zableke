import assert from "node:assert/strict";
import test from "node:test";

import { toView } from "@/backend/modules/users/service/users.service";
import type { UserRecord } from "@/backend/modules/users/repository/users.repository";

function buildRecord(overrides: Partial<UserRecord> = {}): UserRecord {
  return {
    id: "user-1",
    email: "tutor@alumnos.ucn.cl",
    firstName: "Ana",
    lastName: "Soto",
    rut: null,
    career: "Ingeniería Civil Industrial",
    entryYear: null,
    phone: null,
    bio: null,
    linkedinUrl: null,
    avatarUrl: null,
    passwordHash: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    roles: [],
    ...overrides,
  } as UserRecord;
}

test("toView incluye la carrera real del usuario", () => {
  const view = toView(buildRecord({ career: "Ingeniería Civil Industrial" }));
  assert.equal(view.career, "Ingeniería Civil Industrial");
});

test("toView retorna career null si el usuario no la tiene", () => {
  const view = toView(buildRecord({ career: null }));
  assert.equal(view.career, null);
});
