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

export function buildTutoringFormRequests(offerings: OfferingRecord[]): BuildFormResult {
  const requests: unknown[] = [
    {
      updateFormInfo: {
        info: {
          description: "Formulario de inscripción a tutorías. Completa tus datos y elige un horario por tutoría.",
        },
        updateMask: "description",
      },
    },
    createTextQuestion(0, "Nombre completo"),
    createTextQuestion(1, "Correo institucional"),
    createTextQuestion(2, "Número de teléfono"),
  ];
  const slotLabels: FormSlotLabel[] = [];
  let index = 3;

  offerings
    .filter((offering) => offering.status === "OPEN")
    .forEach((offering) => {
      const options = offering.slots.map((slot) => {
        const label = buildSlotOptionLabel(slot);
        slotLabels.push({ slotId: slot.id, label });
        return { value: label };
      });
      options.push({ value: "No me interesa" });

      requests.push({
        createItem: {
          item: {
            title: offering.name,
            description: `Semestre ${offering.semester}`,
            questionItem: {
              question: {
                required: true,
                choiceQuestion: {
                  type: "RADIO",
                  options,
                  shuffle: false,
                },
              },
            },
          },
          location: { index },
        },
      });
      index += 1;
    });

  return { requests, slotLabels };
}
