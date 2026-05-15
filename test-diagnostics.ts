import { ServiceAccountFormsClient } from "./src/backend/modules/offerings/google-forms/forms-client";
import { groupOfferingsByCareers, buildPhase1Requests, buildPhase2Requests } from "./src/backend/modules/offerings/google-forms/form-builder";
import type { OfferingRecord } from "./src/backend/modules/offerings/repository/offerings.repository";
import { PrismaClient } from "@prisma/client";

type GoogleFormsBatchReply = {
  createItem?: {
    itemId?: string;
    questionId?: Array<{ questionId?: string }>;
  };
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function run() {
  console.log("Starting diagnostics...");
  const prisma = new PrismaClient();
  try {
    const client = new ServiceAccountFormsClient();
    console.log("Creating test form...");
    const newForm = await client.createForm("Diagnostic Form");
    const existingFormId = newForm.formId;
    console.log(`Created form ID: ${existingFormId}`);

    const openOfferings = await prisma.tutoringOffering.findMany({
      where: { semester: "2026-1" },
      include: {
        slots: {
          include: {
            tutor: { include: { user: true } },
          },
        },
      },
    });
    
    const allCareers = await prisma.career.findMany({ orderBy: { name: "asc" } });
    const careerGroups = groupOfferingsByCareers(openOfferings as unknown as OfferingRecord[], allCareers);
    const phase1Requests = buildPhase1Requests(careerGroups, allCareers);
    
    console.log("Executing Phase 1...");
    let phase1Result;
    try {
      phase1Result = await client.batchUpdateForm(existingFormId, phase1Requests);
      console.log("Phase 1 Success.");
    } catch (error: unknown) {
      console.error("Phase 1 Failed:", errorMessage(error));
      return;
    }

    const replies = Array.isArray(phase1Result.replies)
      ? (phase1Result.replies as GoogleFormsBatchReply[])
      : [];
    const carreraReply = replies[7];
    const carreraQuestionId = carreraReply?.createItem?.questionId?.[0]?.questionId;
    const carreraItemId = carreraReply?.createItem?.itemId;
    if (!carreraItemId) {
      throw new Error("Failed to read Carrera item ID from Google Forms API");
    }
    
    const careerSectionIds: string[] = [];
    for (let i = 0; i < careerGroups.length; i++) {
      const reply = replies[8 + i];
      const itemId = reply?.createItem?.itemId;
      if (!itemId) {
        throw new Error("Failed to read career section ID from Google Forms API");
      }
      careerSectionIds.push(itemId);
    }

    const phase2 = buildPhase2Requests(careerGroups, careerSectionIds, carreraQuestionId ?? "", carreraItemId, allCareers);
    console.log("Executing Phase 2...", JSON.stringify(phase2.requests, null, 2));
    try {
      await client.batchUpdateForm(existingFormId, phase2.requests);
      console.log("Phase 2 Success.");
    } catch (error: unknown) {
      console.error("Phase 2 Failed:", errorMessage(error));
      return;
    }

    console.log("Done.");
  } finally {
    await prisma.$disconnect();
  }
}

run();
