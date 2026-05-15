import type { OfferingRecord } from "@/backend/modules/offerings/repository/offerings.repository";

const DAY_LABELS: Record<string, string> = {
  MONDAY: "Lunes",
  TUESDAY: "Martes",
  WEDNESDAY: "Miércoles",
  THURSDAY: "Jueves",
  FRIDAY: "Viernes",
  SATURDAY: "Sábado",
};

export interface CareerInfo {
  name: string;
  schoolName: string;
}

export interface FormSlotLabel {
  slotId: string;
  label: string;
}

export interface BuildFormResult {
  requests: unknown[];
  slotLabels: FormSlotLabel[];
}

/** Grouping of offerings by career for form generation */
export interface CareerOfferingGroup {
  career: string;
  offerings: OfferingRecord[];
}

/**
 * Builds the label for a slot option in the "Asignaturas" question.
 * Matches the real Éxito Académico form format:
 *   "Estadística, Miércoles C, Sala de Tutorías 7 (G6), Tutora Florencia Peña."
 *
 * Since we use time ranges instead of block letters, our format is:
 *   "{Offering}, {Día} {HH:mm}-{HH:mm}, {Sala}, Tutor {Nombre}."
 */
export function buildSlotOptionLabel(
  offeringName: string,
  slot: OfferingRecord["slots"][number]
): string {
  const tutorName = `${slot.tutor.user.firstName} ${slot.tutor.user.lastName}`;
  const day = DAY_LABELS[slot.dayOfWeek] ?? slot.dayOfWeek;
  const room = slot.roomName ?? "PENDIENTE";
  return `${offeringName}, ${day} ${slot.startTime}-${slot.endTime}, ${room}, Tutor ${tutorName}.`;
}

/**
 * Groups offerings by career. Each offering may appear in multiple career groups
 * if it targets multiple careers. Only careers with at least one offering are included.
 */
export function groupOfferingsByCareers(offerings: OfferingRecord[], allCareers: CareerInfo[] = []): CareerOfferingGroup[] {
  const careerMap = new Map<string, OfferingRecord[]>();

  for (const offering of offerings) {
    const careers = (offering as OfferingRecord & { targetCareers?: string[] }).targetCareers ?? [];
    for (const career of careers) {
      const list = careerMap.get(career) ?? [];
      list.push(offering);
      careerMap.set(career, list);
    }
  }

  // Return groups in the database order when available, otherwise alphabetically.
  const careerOrder = allCareers.length > 0
    ? allCareers.map((career) => career.name)
    : [...careerMap.keys()].sort((a, b) => a.localeCompare(b, "es"));

  const groups: CareerOfferingGroup[] = [];
  for (const career of careerOrder) {
    const offeringsForCareer = careerMap.get(career);
    if (offeringsForCareer && offeringsForCareer.length > 0) {
      groups.push({ career, offerings: offeringsForCareer });
    }
  }

  return groups;
}

/** Returns the school/faculty title for a career, or falls back to the career name */
function getSchoolTitle(career: string, allCareers: CareerInfo[]): string {
  return allCareers.find((item) => item.name === career)?.schoolName ?? career.toUpperCase();
}

// ─── Page 1 description (matches the real Éxito Académico form) ───

const FORM_DESCRIPTION = `Estimado(a) estudiante:

En este formulario puedes inscribir las tutorías que se encuentran ofertadas para tu carrera por el Departamento de Éxito Académico en articulación con el programa PACE en la sede Coquimbo. Recuerda ingresar correctamente los datos solicitados.

IMPORTANTE:

• Debes seleccionar en el listado solo aquellas asignaturas que estés cursando en este semestre
• En caso de inscripción, por favor cumplir con la asistencia semanal a la tutoría durante todo el semestre, se hará monitoreo de asistencia y en caso de tres inasistencias injustificadas se eliminará de la nómina.
• En las Tutorías con 2 o más horarios, debe escoger solo uno de los horarios disponibles.
• El formulario permite solo una inscripción de tutoría por respuesta, en caso que necesite inscribir una nueva tutoría, debe responder nuevamente el formulario.
• Para inscribirse a alguna tutoría de Inglés (I, II, III, IV) debe indicar en carrera la opción "Institucional (Tutorías de Inglés)".`;

// ─── Commitment text for the radio question ───

const COMMITMENT_DESCRIPTION = `Antes de inscribirme en las tutorías, declaro que comprendo la importancia de este espacio de acompañamiento académico voluntario y de cupos limitados y me comprometo a participar de manera responsable. Por ello, asumo los siguientes compromisos:

Asistir regularmente a las tutorías programadas. Entiendo que si falto a tres tutorías consecutivas sin justificación, seré eliminado/a de la lista y mi cupo será liberado para otro/a estudiante.

Mantener una comunicación oportuna con mi tutor/a, informando y justificando cualquier inasistencia cuando corresponda.

Participar con respeto y disposición, contribuyendo a un clima de buen trato, colaboración y respeto dentro de las tutorías.

Cumplir responsablemente con este espacio de apoyo académico, entendiendo que su adecuado funcionamiento depende del compromiso de quienes participamos.

Declaro que estoy en conocimiento de que el incumplimiento de estos compromisos podrá implicar mi eliminación de la lista de tutorías y la notificación a la Jefatura de Carrera correspondiente`;

// ─── Helper to create a text question ───

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

/**
 * Phase 1 — Builds the first batch of requests for the Google Form.
 *
 * Replicates the real Éxito Académico form:
 *
 * Page 1 (intro + compromiso):
 *   [0] updateFormInfo → long description
 *   [1] Commitment question (radio: ME COMPROMETO / NO ME COMPROMETO)
 *
 * Page 2 (Datos Personales):
 *   [2] Page break "Datos Personales"
 *   [3] Nombre y Apellidos (text)
 *   [4] RUT (Sin puntos ni guion) (text)
 *   [5] Número de teléfono (569XXXXXXXX) (text)
 *   [6] Carrera (radio — routing wired in Phase 2)
 *
 * Page 3+ (one section per career):
 *   [7]   Page break "ESCUELA DE INGENIERÍA (ITI)"
 *          desc: "Asignaturas de Ingeniería en Tecnologías de Información"
 *   [8]   Page break for next career...
 *   ...
 */
export function buildPhase1Requests(careerGroups: CareerOfferingGroup[], allCareers: CareerInfo[]): unknown[] {
  const requests: unknown[] = [
    // ── [0] Form description (Page 1 body text) ──
    {
      updateFormInfo: {
        info: {
          description: FORM_DESCRIPTION,
        },
        updateMask: "description",
      },
    },

    // ── [1] Commitment radio question (Page 1) ──
    {
      createItem: {
        item: {
          title: "¡IMPORTANTE LEER COMPROMISO!",
          description: COMMITMENT_DESCRIPTION,
          questionItem: {
            question: {
              required: true,
              choiceQuestion: {
                type: "RADIO",
                options: [
                  { value: "ME COMPROMETO" },
                  { value: "NO ME COMPROMETO" },
                ],
                shuffle: false,
              },
            },
          },
        },
        location: { index: 0 },
      },
    },

    // ── [2] Page break "Datos Personales" (Page 2) ──
    {
      createItem: {
        item: {
          title: "Datos Personales",
          pageBreakItem: {},
        },
        location: { index: 1 },
      },
    },

    // ── [3–6] Personal data text questions (Page 2) ──
    createTextQuestion(2, "Nombre y Apellidos"),
    createTextQuestion(3, "RUT (Sin puntos ni guion)"),
    createTextQuestion(4, "Correo electrónico"),
    createTextQuestion(5, "Número de teléfono (569XXXXXXXX)"),

    // ── [7] Carrera radio question (Page 2) ── routing added in Phase 2
    {
      createItem: {
        item: {
          title: "Carrera",
          questionItem: {
            question: {
              required: true,
              choiceQuestion: {
                type: "RADIO",
                options: allCareers.map((career) => ({ value: career.name })),
                shuffle: false,
              },
            },
          },
        },
        location: { index: 6 },
      },
    },
  ];

  // ── [8+] One section page break per career group ──
  // Title = school name (e.g. "ESCUELA DE INGENIERÍA (ITI)")
  // Description = "Asignaturas de {career name}"
  let currentIndex = 7;
  careerGroups.forEach((group) => {
    requests.push({
      createItem: {
        item: {
          title: getSchoolTitle(group.career, allCareers),
          description: `Asignaturas de ${group.career}`,
          pageBreakItem: {},
        },
        location: { index: currentIndex++ },
      },
    });
  });

  return requests;
}

/**
 * Phase 2 — Wires up career routing and inserts the "Asignaturas" question per career.
 *
 * After Phase 1, the item layout is:
 *   [0] Commitment question
 *   [1] Page break "Datos Personales"
 *   [2] Nombre y Apellidos
 *   [3] RUT
 *   [4] Número de teléfono
 *   [5] Carrera (radio, no routing yet)
 *   [6] Page break career[0]
 *   [7] Page break career[1]
 *   ...
 *
 * Phase 2:
 *   1. Updates the Carrera question with goToSectionId routing per career
 *   2. Inserts ONE "Asignaturas" radio per career section with ALL offerings+slots
 *      as flat options (matching the real form layout)
 */
export function buildPhase2Requests(
  careerGroups: CareerOfferingGroup[],
  careerSectionIds: string[],
  carreraQuestionId: string,
  carreraItemId: string,
  allCareers: CareerInfo[]
): BuildFormResult {
  const requests: unknown[] = [];
  const slotLabels: FormSlotLabel[] = [];

  // ── 1. Update the Carrera question to add routing to career sections ──
  const routedOptions = allCareers.map((career) => {
    const groupIndex = careerGroups.findIndex((g) => g.career === career.name);
    if (groupIndex >= 0) {
      return { value: career.name, goToSectionId: careerSectionIds[groupIndex] };
    }
    // Career with no offerings — submit form directly
    return { value: career.name, goToAction: "SUBMIT_FORM" as const };
  });

  requests.push({
    updateItem: {
      item: {
        itemId: carreraItemId,
        title: "Carrera",
        questionItem: {
          question: {
            questionId: carreraQuestionId,
            required: true,
            choiceQuestion: {
              type: "RADIO",
              options: routedOptions,
              shuffle: false,
            },
          },
        },
      },
      location: { index: 6 },
      updateMask: "*",
    },
  });

  // ── 2. Insert ONE "Asignaturas" radio per career section ──
  // All offerings + their slots for the career are flattened into a single radio.
  // Each option format: "{Offering}, {Day} {Time}, {Room}, Tutor {Name}."
  let currentIndex = 7; // First career section starts at index 7

  careerGroups.forEach((group) => {
    currentIndex++; // Skip the career section's page break

    // Build flat list of slot options from ALL offerings in this career
    const slotOptions: { value: string }[] = [];

    group.offerings.forEach((offering) => {
      offering.slots.forEach((slot) => {
        const label = buildSlotOptionLabel(offering.name, slot);
        slotLabels.push({ slotId: slot.id, label });
        slotOptions.push({ value: label });
      });
    });

    if (slotOptions.length > 0) {
      requests.push({
        createItem: {
          item: {
            title: "Asignaturas",
            questionItem: {
              question: {
                required: true,
                choiceQuestion: {
                  type: "RADIO",
                  options: slotOptions,
                  shuffle: false,
                },
              },
            },
          },
          location: { index: currentIndex++ },
        },
      });
    }
  });

  return { requests, slotLabels };
}
