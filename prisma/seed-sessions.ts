/**
 * Seed de sesiones simuladas — Zableke
 * Crea 3 ramos con estudiantes asignados y horarios para la semana actual.
 * Ejecutar: npm run db:seed:sessions
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── Helpers de fecha ─────────────────────────────────────────────────────────

/** Retorna el lunes de la semana actual a medianoche local. */
function getMondayOfCurrentWeek(): Date {
  const d = new Date();
  const day = d.getDay(); // 0 = Dom
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function makeDateTime(
  base: Date,
  daysOffset: number,
  hour: number,
  minute: number
): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + daysOffset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

// ─── Bloques horarios ─────────────────────────────────────────────────────────

const BLOCKS = {
  A: { startH: 8,  startM: 10, endH: 9,  endM: 40 },
  B: { startH: 9,  startM: 55, endH: 11, endM: 25 },
  C: { startH: 11, startM: 40, endH: 13, endM: 10 },
  D: { startH: 14, startM: 30, endH: 16, endM: 0  },
  E: { startH: 16, startM: 15, endH: 17, endM: 45 },
  F: { startH: 18, startM: 0,  endH: 19, endM: 30 },
};

// ─── Estudiantes simulados ────────────────────────────────────────────────────

const STUDENTS = {
  carlos:    { email: "carlos.rojas@alumnos.ucn.cl",       name: "Carlos Rojas" },
  maria:     { email: "maria.gonzalez@alumnos.ucn.cl",     name: "María González" },
  felipe:    { email: "felipe.torres@alumnos.ucn.cl",      name: "Felipe Torres" },
  valentina: { email: "valentina.munoz@alumnos.ucn.cl",    name: "Valentina Muñoz" },
  sebastian: { email: "sebastian.diaz@alumnos.ucn.cl",     name: "Sebastián Díaz" },
  camila:    { email: "camila.perez@alumnos.ucn.cl",       name: "Camila Pérez" },
  matias:    { email: "matias.reyes@alumnos.ucn.cl",       name: "Matías Reyes" },
  sofia:     { email: "sofia.herrera@alumnos.ucn.cl",      name: "Sofía Herrera" },
  nicolas:   { email: "nicolas.vargas@alumnos.ucn.cl",     name: "Nicolás Vargas" },
  isidora:   { email: "isidora.castro@alumnos.ucn.cl",     name: "Isidora Castro" },
  lucas:     { email: "lucas.morales@alumnos.ucn.cl",      name: "Lucas Morales" },
  catalina:  { email: "catalina.soto@alumnos.ucn.cl",      name: "Catalina Soto" },
  antonia:   { email: "antonia.flores@alumnos.ucn.cl",     name: "Antonia Flores" },
};

// ─── Definición de sesiones ───────────────────────────────────────────────────

interface SessionDef {
  title: string;
  description: string;
  /** Días desde el lunes de la semana: 0=Lun, 1=Mar, 2=Mié, 3=Jue, 4=Vie, 5=Sáb */
  dayOffset: number;
  block: (typeof BLOCKS)[keyof typeof BLOCKS];
  students: { email: string; name: string }[];
}

const SESSIONS: SessionDef[] = [
  {
    title: "Programación Orientada a Objetos",
    description:
      "Tutoría de apoyo en conceptos de POO: herencia, polimorfismo y encapsulamiento.",
    dayOffset: 0, // Lunes — Bloque B
    block: BLOCKS.B,
    students: [
      STUDENTS.carlos,
      STUDENTS.maria,
      STUDENTS.felipe,
      STUDENTS.valentina,
      STUDENTS.sebastian,
    ],
  },
  {
    title: "Programación",
    description:
      "Tutoría de fundamentos de programación: algoritmos, estructuras de control y funciones.",
    dayOffset: 2, // Miércoles — Bloque D
    block: BLOCKS.D,
    students: [
      STUDENTS.valentina,
      STUDENTS.camila,
      STUDENTS.matias,
      STUDENTS.sofia,
      STUDENTS.nicolas,
      STUDENTS.isidora,
    ],
  },
  {
    title: "Morfología Humana Aplicada Al Movimiento",
    description:
      "Tutoría de morfología: anatomía funcional, planos corporales y biomecánica básica.",
    dayOffset: 4, // Viernes — Bloque C
    block: BLOCKS.C,
    students: [
      STUDENTS.matias,
      STUDENTS.lucas,
      STUDENTS.catalina,
      STUDENTS.nicolas,
      STUDENTS.antonia,
    ],
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const monday = getMondayOfCurrentWeek();

  // 1. Obtener tutor registrado (debe existir: ejecutar seed principal primero)
  const tutorUser = await prisma.user.findUnique({
    where: { email: "tutor@alumnos.ucn.cl" },
    include: { tutorProfile: true },
  });
  if (!tutorUser) {
    throw new Error(
      'Usuario tutor no encontrado. Ejecuta "npm run db:seed" primero.'
    );
  }
  if (!tutorUser.tutorProfile) {
    throw new Error(
      'Perfil de tutor no encontrado. Ejecuta "npm run db:seed" primero.'
    );
  }
  const tutorId = tutorUser.tutorProfile.id;
  const createdById = tutorUser.id;

  // 2. Upsert sala
  const room = await prisma.room.upsert({
    where: { name_location: { name: "Sala A101", location: "Edificio A" } },
    update: {},
    create: {
      name: "Sala A101",
      location: "Edificio A",
      capacity: 30,
    },
  });

  // 3. Limpiar sesiones simuladas previas (para que el seed sea idempotente)
  const titulos = SESSIONS.map((s) => s.title);
  await prisma.schedule.deleteMany({
    where: {
      tutorId,
      title: { in: titulos },
    },
  });

  // 4. Crear sesiones y asistencias
  for (const session of SESSIONS) {
    const startsAt = makeDateTime(
      monday,
      session.dayOffset,
      session.block.startH,
      session.block.startM
    );
    const endsAt = makeDateTime(
      monday,
      session.dayOffset,
      session.block.endH,
      session.block.endM
    );

    const schedule = await prisma.schedule.create({
      data: {
        tutorId,
        roomId: room.id,
        createdById,
        title: session.title,
        description: session.description,
        startsAt,
        endsAt,
        status: "ACTIVE",
        attendances: {
          create: session.students.map((student) => ({
            studentEmail: student.email,
            studentName: student.name,
            status: "PRESENT",
            markedById: createdById,
          })),
        },
      },
    });

    console.log(
      `  ✓ "${schedule.title}" — ${startsAt.toLocaleDateString("es-CL")} ` +
        `${startsAt.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}` +
        `–${endsAt.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}` +
        ` (${session.students.length} estudiantes)`
    );
  }

  console.log("\nSeed de sesiones completado.");
  console.log(`Semana del lunes ${monday.toLocaleDateString("es-CL")}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
