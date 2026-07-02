import assert from "node:assert/strict";
import test from "node:test";

import { syncResponses } from "@/backend/modules/offerings/google-forms/response-sync";

function makeOffering(overrides: Record<string, unknown> = {}) {
  return {
    id: "offering-1",
    slots: [
      {
        id: "slot-1",
        googleFormOptionLabel: "Cálculo I - Lunes 09:55",
        maxCapacity: 30,
        tutor: { isActive: true },
      },
    ],
    ...overrides,
  };
}

function makeClient(overrides: Record<string, unknown> = {}) {
  return {
    getForm: async () => ({
      items: [
        { questionItem: { question: { questionId: "q-name" } }, title: "Nombre completo" },
        { questionItem: { question: { questionId: "q-subject" } }, title: "Asignaturas" },
      ],
    }),
    getResponses: async () => [
      {
        responseId: "resp-1",
        respondentEmail: "estudiante@alumnos.ucn.cl",
        answers: {
          "q-name": { textAnswers: { answers: [{ value: "Juan Pérez" }] } },
          "q-subject": { textAnswers: { answers: [{ value: "Cálculo I - Lunes 09:55" }] } },
        },
      },
    ],
    ...overrides,
  };
}

function makeRepo(overrides: Record<string, unknown> = {}) {
  const createdEnrollments: Record<string, unknown>[] = [];
  return {
    createdEnrollments,
    findGoogleFormLink: async () => ({ formId: "form-1" }),
    findOfferingsBySemester: async () => [makeOffering()],
    hasProcessedResponse: async () => false,
    countEnrollmentsBySlot: async () => 0,
    createEnrollment: async (data: Record<string, unknown>) => {
      createdEnrollments.push(data);
      return { id: "enr-1", ...data };
    },
    markGoogleFormSynced: async () => undefined,
    ...overrides,
  };
}

test("syncResponses omite inscripciones a un slot cuyo tutor está inactivo", async () => {
  const repo = makeRepo({
    findOfferingsBySemester: async () => [
      makeOffering({ slots: [{ id: "slot-1", googleFormOptionLabel: "Cálculo I - Lunes 09:55", maxCapacity: 30, tutor: { isActive: false } }] }),
    ],
  });

  const result = await syncResponses({ semester: "2026-1", client: makeClient() as never, repo: repo as never });

  assert.equal(repo.createdEnrollments.length, 0);
  assert.equal(result.newEnrollments, 0);
  assert.equal(result.skipped, 1);
});

test("syncResponses inscribe normalmente cuando el tutor del slot está activo", async () => {
  const repo = makeRepo();

  const result = await syncResponses({ semester: "2026-1", client: makeClient() as never, repo: repo as never });

  assert.equal(repo.createdEnrollments.length, 1);
  assert.equal(result.newEnrollments, 1);
  assert.equal(result.skipped, 0);
});
