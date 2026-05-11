import type { OfferingRecord } from "@/backend/modules/offerings/repository/offerings.repository";

const DAY_LABELS: Record<string, string> = {
  MONDAY: "Lunes",
  TUESDAY: "Martes",
  WEDNESDAY: "Miércoles",
  THURSDAY: "Jueves",
  FRIDAY: "Viernes",
  SATURDAY: "Sábado",
};

export interface FormSlotLabel {
  slotId: string;
  label: string;
}

export interface BuildFormResult {
  requests: unknown[];
  slotLabels: FormSlotLabel[];
}

export function buildSlotOptionLabel(slot: OfferingRecord["slots"][number]): string {
  const tutorName = `${slot.tutor.user.firstName} ${slot.tutor.user.lastName}`;
  const room = slot.roomName ? ` · Sala ${slot.roomName}` : "";
  return `${DAY_LABELS[slot.dayOfWeek] ?? slot.dayOfWeek} ${slot.startTime}-${slot.endTime} · ${tutorName}${room}`;
}

function createTextQuestion(index: number, title: string, required = true) {
  return {
    createItem: {
      item: {
        title,
        questionItem: {
          question: {
            required,
            textQuestion: { paragraph: false },
          },
        },
      },
      location: { index },
    },
  };
}

export function buildPhase1Requests(offerings: OfferingRecord[]): unknown[] {
  const requests: unknown[] = [
    {
      updateFormInfo: {
        info: {
          description: "Formulario de inscripción a tutorías. Completa tus datos y elige un horario.",
        },
        updateMask: "description",
      },
    },
    createTextQuestion(0, "Nombre completo"),
    createTextQuestion(1, "RUT (Ej: 12.345.678-9)"),
    createTextQuestion(2, "Correo institucional"),
    createTextQuestion(3, "Carrera"),
    createTextQuestion(4, "Número de teléfono"),
  ];

  // Page 2: Selection
  requests.push({
    createItem: {
      item: {
        title: "Selección de Tutoría",
        pageBreakItem: {}
      },
      location: { index: 5 }
    }
  });

  let currentIndex = 6;
  offerings.forEach(offering => {
    requests.push({
      createItem: {
        item: {
          title: `Tutoría de ${offering.name}`,
          pageBreakItem: {}
        },
        location: { index: currentIndex++ }
      }
    });
  });

  return requests;
}

export function buildPhase2Requests(
  offerings: OfferingRecord[],
  sectionIds: string[]
): BuildFormResult {
  const requests: unknown[] = [];
  const slotLabels: FormSlotLabel[] = [];

  const selectionOptions = offerings.map((offering, idx) => ({
    value: offering.name,
    goToSectionId: sectionIds[idx] // The generated IDs from Phase 1
  }));

  requests.push({
    createItem: {
      item: {
        title: "¿A qué tutoría deseas inscribirte?",
        questionItem: {
          question: {
            required: true,
            choiceQuestion: {
              type: "RADIO",
              options: selectionOptions,
              shuffle: false,
            }
          }
        }
      },
      location: { index: 6 } // Right after the "Selección de Tutoría" page break
    }
  });

  // Calculate current index. 
  // Phase 1 created 5 texts + 1 main section + N offering sections = 6 + N items.
  // We just added the selection question, so we have 6 + N + 1 items.
  // The first offering section was at index 6 in Phase 1. Now it has shifted to index 7 because we inserted the selection question at index 6.
  // We need to insert the slot questions right AFTER each offering section.
  let currentIndex = 7; 
  
  offerings.forEach((offering, idx) => {
    currentIndex++; // skip over the section break itself

    const slotOptions = offering.slots.map(slot => {
      const label = buildSlotOptionLabel(slot);
      slotLabels.push({ slotId: slot.id, label });
      return { 
        value: label,
        goToAction: "SUBMIT_FORM" 
      };
    });

    requests.push({
      createItem: {
        item: {
          title: "Selecciona el horario y paralelo",
          questionItem: {
            question: {
              required: true,
              choiceQuestion: {
                type: "RADIO",
                options: slotOptions,
                shuffle: false
              }
            }
          }
        },
        location: { index: currentIndex++ }
      }
    });
  });

  return { requests, slotLabels };
}
