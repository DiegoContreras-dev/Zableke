import assert from "node:assert/strict";
import test from "node:test";

import { OfferingsService } from "@/backend/modules/offerings/service/offerings.service";

function makeOfferingRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "offering-1",
    name: "Cálculo I",
    semester: "2026-1",
    status: "OPEN",
    googleFormQuestionId: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    slots: [{ id: "slot-1", dayOfWeek: "MONDAY" }],
    _count: { slots: 1, enrollments: 0 },
    ...overrides,
  };
}

function makeRepoMock(overrides: Record<string, unknown> = {}) {
  return {
    findOfferingsBySemester: async () => [makeOfferingRecord()],
    ...overrides,
  };
}

function makeSemestersMock() {
  return {
    activeCode: async () => "2026-1",
    assertWritable: async () => ({ code: "2026-1", status: "ACTIVE" }),
  };
}

test("generateGoogleForm exige googleAccessToken cuando no hay existingFormId (creación de formulario nuevo)", async () => {
  const service = new OfferingsService(
    makeRepoMock() as never,
    makeSemestersMock() as never,
  );

  await assert.rejects(
    () => service.generateGoogleForm("2026-1", undefined, undefined),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.equal((err as { code?: string }).code, "GOOGLE_AUTHORIZATION_REQUIRED");
      return true;
    },
  );
});
