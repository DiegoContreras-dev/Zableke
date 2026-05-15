import { EnrollmentSource } from "@prisma/client";
import { AuthError } from "@/backend/common/errors/auth.error";
import type { GoogleFormsClient } from "@/backend/modules/offerings/google-forms/forms-client";
import type { SyncResultView } from "@/backend/modules/offerings/model/offering.model";
import { OfferingsRepository } from "@/backend/modules/offerings/repository/offerings.repository";

interface ParsedAnswer {
  questionId: string;
  value: string;
}

function answerValue(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const textAnswers = obj.textAnswers as Record<string, unknown> | undefined;
  const answers = textAnswers?.answers;
  if (!Array.isArray(answers)) return null;
  const first = answers[0] as Record<string, unknown> | undefined;
  return typeof first?.value === "string" ? first.value.trim() : null;
}

function parseAnswers(response: Record<string, unknown>): ParsedAnswer[] {
  const answers = response.answers;
  if (!answers || typeof answers !== "object") return [];
  return Object.entries(answers as Record<string, unknown>)
    .map(([questionId, raw]) => {
      const value = answerValue(raw);
      return value ? { questionId, value } : null;
    })
    .filter((item): item is ParsedAnswer => item !== null);
}

export async function syncResponses(params: {
  semester: string;
  client: GoogleFormsClient;
  repo?: OfferingsRepository;
}): Promise<SyncResultView> {
  const repo = params.repo ?? new OfferingsRepository();
  const link = await repo.findGoogleFormLink(params.semester);
  if (!link) {
    throw new AuthError("No Google Form exists for this semester", "RESOURCE_NOT_FOUND", 404);
  }

  const offerings = await repo.findOfferingsBySemester(params.semester);
  const slotByLabel = new Map<string, { id: string; offeringId: string; maxCapacity: number }>();
  offerings.forEach((offering) => {
    offering.slots.forEach((slot) => {
      if (slot.googleFormOptionLabel) {
        slotByLabel.set(slot.googleFormOptionLabel, {
          id: slot.id,
          offeringId: offering.id,
          maxCapacity: slot.maxCapacity,
        });
      }
    });
  });

  const formDef = await params.client.getForm(link.formId);
  const items = (formDef.items as any[]) || [];
  const questionTitles = new Map<string, string>();
  
  items.forEach(item => {
    const qId = item.questionItem?.question?.questionId;
    if (qId && typeof item.title === "string") {
      questionTitles.set(qId, item.title);
    }
  });

  const responses = await params.client.getResponses(link.formId);
  let newEnrollments = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const response of responses) {
    const responseId = typeof response.responseId === "string" ? response.responseId : "";
    if (!responseId || (await repo.hasProcessedResponse(responseId))) {
      skipped += 1;
      continue;
    }

    const parsed = parseAnswers(response);
    
    let studentName = "";
    let studentRut = "";
    // Try native respondentEmail first
    let studentEmail = typeof response.respondentEmail === "string"
      ? response.respondentEmail.trim().toLowerCase()
      : "";
    let studentCareer = "";
    let studentPhone = "";
    const selectedSlots: string[] = [];

    for (const answer of parsed) {
      const title = questionTitles.get(answer.questionId) || "";
      const lowerTitle = title.toLowerCase();
      
      if (lowerTitle.includes("nombre")) {
        studentName = answer.value;
      } else if (lowerTitle.includes("rut")) {
        studentRut = answer.value;
      } else if (lowerTitle.includes("carrera")) {
        studentCareer = answer.value;
      } else if (lowerTitle.includes("teléfono") || lowerTitle.includes("telefono")) {
        studentPhone = answer.value;
      } else if (lowerTitle.includes("compromiso")) {
        // Commitment question, ignore
      } else if (lowerTitle.includes("asignatura")) {
        // Slot selection from "Asignaturas" question
        selectedSlots.push(answer.value);
      } else {
        // Fallback: check if value looks like an email (for correo fields)
        if (!studentEmail && answer.value.includes("@")) {
          studentEmail = answer.value.toLowerCase();
        } else if (answer.value !== "No me interesa") {
          selectedSlots.push(answer.value);
        }
      }
    }

    console.log(`[sync] Response ${responseId}: name="${studentName}" email="${studentEmail}" career="${studentCareer}" slots=[${selectedSlots.join(", ")}]`);

    if (!studentName || !studentEmail.includes("@")) {
      const reason = !studentName ? "nombre vacío" : "email inválido o vacío";
      errors.push(`Respuesta ${responseId}: ${reason} (name="${studentName}", email="${studentEmail}")`);
      skipped += 1;
      continue;
    }

    if (selectedSlots.length === 0) {
      errors.push(`Respuesta ${responseId}: no se seleccionó ninguna asignatura`);
      skipped += 1;
      continue;
    }

    for (const slotLabel of selectedSlots) {
      const slot = slotByLabel.get(slotLabel);
      if (!slot) {
        console.log(`[sync] Response ${responseId}: no slot match for label "${slotLabel}"`);
        console.log(`[sync] Available labels: ${[...slotByLabel.keys()].join(" | ")}`);
        errors.push(`Respuesta ${responseId}: etiqueta de horario no encontrada: "${slotLabel}"`);
        continue;
      }

      const count = await repo.countEnrollmentsBySlot(slot.id);
      if (count >= slot.maxCapacity) {
        skipped += 1;
        continue;
      }

      try {
        await repo.createEnrollment({
          offeringId: slot.offeringId,
          slotId: slot.id,
          studentEmail,
          studentName,
          studentRut,
          studentCareer,
          studentPhone,
          source: EnrollmentSource.GOOGLE_FORM,
          googleFormResponseId: responseId,
        });
        newEnrollments += 1;
      } catch {
        skipped += 1;
      }
    }
  }

  await repo.markGoogleFormSynced(params.semester);
  return { newEnrollments, skipped, errors };
}
