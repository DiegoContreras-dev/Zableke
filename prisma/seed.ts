import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPasswordHash = await bcrypt.hash("admin123", 10);

  const [adminRole, tutorRole] = await Promise.all([
    prisma.role.upsert({
      where: { name: "ADMIN" },
      update: {},
      create: {
        name: "ADMIN",
        description: "Coordinador o jefatura con control total del sistema",
      },
    }),
    prisma.role.upsert({
      where: { name: "TUTOR" },
      update: {},
      create: {
        name: "TUTOR",
        description: "Tutor con gestión de su propio calendario",
      },
    }),
  ]);

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@ce.ucn.cl" },
    update: {
      firstName: "Admin",
      lastName: "UCN",
      passwordHash: adminPasswordHash,
      isActive: true,
    },
    create: {
      email: "admin@ce.ucn.cl",
      firstName: "Admin",
      lastName: "UCN",
      passwordHash: adminPasswordHash,
      isActive: true,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: adminRole.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "tutor@alumnos.ucn.cl" },
    update: {
      firstName: "Tutor",
      lastName: "Demo",
      isActive: true,
    },
    create: {
      email: "tutor@alumnos.ucn.cl",
      firstName: "Tutor",
      lastName: "Demo",
      isActive: true,
      roles: {
        create: [{ roleId: tutorRole.id }],
      },
      tutorProfile: {
        create: {
          department: "General",
        },
      },
    },
  });

  const victorPasswordHash = await bcrypt.hash("victor123", 10);
  const victorUser = await prisma.user.upsert({
    where: { email: "victor.jopia01@alumnos.ucn.cl" },
    update: {
      firstName: "Víctor",
      lastName: "Jopia",
      passwordHash: victorPasswordHash,
      isActive: true,
    },
    create: {
      email: "victor.jopia01@alumnos.ucn.cl",
      firstName: "Víctor",
      lastName: "Jopia",
      passwordHash: victorPasswordHash,
      isActive: true,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: victorUser.id, roleId: tutorRole.id } },
    update: {},
    create: { userId: victorUser.id, roleId: tutorRole.id },
  });

  await prisma.tutor.upsert({
    where: { userId: victorUser.id },
    update: {},
    create: { userId: victorUser.id, department: "General" },
  });

  // ── Oferta POO + slot con Víctor + estudiantes demo ──────────────────────

  const victorTutor = await prisma.tutor.findUnique({ where: { userId: victorUser.id } });
  if (!victorTutor) throw new Error("Tutor de Víctor no encontrado");

  const pooOffering = await prisma.tutoringOffering.upsert({
    where: { id: "seed-poo-offering" },
    update: { name: "Programación Orientada a Objetos", status: "OPEN" },
    create: {
      id: "seed-poo-offering",
      name: "Programación Orientada a Objetos",
      semester: "2026-1",
      status: "OPEN",
      createdById: adminUser.id,
    },
  });

  const pooSlot = await prisma.tutoringSlot.upsert({
    where: { id: "seed-poo-slot-1" },
    update: {},
    create: {
      id: "seed-poo-slot-1",
      offeringId: pooOffering.id,
      tutorId: victorTutor.id,
      dayOfWeek: "WEDNESDAY",
      startTime: "14:30",
      endTime: "16:00",
      maxCapacity: 30,
      roomName: "Lab 3 — Edificio Nicholson",
    },
  });

  const demoStudents = [
    { email: "camila.rojas@alumnos.ucn.cl",   name: "Camila Rojas Soto",       phone: "+56912345001" },
    { email: "matias.silva@alumnos.ucn.cl",    name: "Matías Silva Morales",    phone: "+56912345002" },
    { email: "valentina.perez@alumnos.ucn.cl", name: "Valentina Pérez Díaz",    phone: "+56912345003" },
    { email: "nicolas.fuentes@alumnos.ucn.cl", name: "Nicolás Fuentes Araya",  phone: null },
    { email: "isidora.leon@alumnos.ucn.cl",    name: "Isidora León Castillo",   phone: "+56912345005" },
    { email: "benjamin.torres@alumnos.ucn.cl", name: "Benjamín Torres Núñez",  phone: null },
    { email: "sofia.mendez@alumnos.ucn.cl",    name: "Sofía Méndez Bravo",      phone: "+56912345007" },
    { email: "diego.vargas@alumnos.ucn.cl",    name: "Diego Vargas Espinoza",   phone: "+56912345008" },
  ];

  for (let i = 0; i < demoStudents.length; i++) {
    const s = demoStudents[i]!;
    await prisma.enrollment.upsert({
      where: { id: `seed-poo-enroll-${i + 1}` },
      update: {},
      create: {
        id: `seed-poo-enroll-${i + 1}`,
        slotId: pooSlot.id,
        offeringId: pooOffering.id,
        studentEmail: s.email,
        studentName: s.name,
        studentPhone: s.phone,
        source: "MANUAL",
      },
    });
  }

  console.log("Seed ejecutado correctamente: roles y usuarios base creados.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

